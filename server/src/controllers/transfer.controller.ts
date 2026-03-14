import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { confirmTransfer } from '../services/stock.service';
import { generateDocNumber } from '../utils/docNumber';
import { ok, created, fail } from '../utils/response';

const INCLUDE = {
  lines: {
    include: {
      product:      { select: { id: true, sku: true, name: true, unit: true } },
      fromLocation: { select: { id: true, code: true, name: true, warehouse: { select: { name: true } } } },
      toLocation:   { select: { id: true, code: true, name: true, warehouse: { select: { name: true } } } },
    },
  },
  createdBy: { select: { id: true, name: true } },
};

export async function listTransfers(req: AuthRequest, res: Response): Promise<void> {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [transfers, total] = await Promise.all([
    prisma.transfer.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
    prisma.transfer.count({ where }),
  ]);
  ok(res, { transfers, total });
}

export async function getTransfer(req: AuthRequest, res: Response): Promise<void> {
  const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id }, include: INCLUDE });
  if (!transfer) { fail(res, 'Transfer not found', 404); return; }
  ok(res, transfer);
}

export async function createTransfer(req: AuthRequest, res: Response): Promise<void> {
  const { notes, lines } = req.body;
  const transfer = await prisma.transfer.create({
    data: {
      documentNumber: generateDocNumber('TRF'),
      notes,
      createdById: req.user!.userId,
      lines: { create: lines },
    },
    include: INCLUDE,
  });
  created(res, transfer);
}

export async function confirmTransferHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    await confirmTransfer(req.params.id);
    const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id }, include: INCLUDE });
    ok(res, transfer);
  } catch (err: unknown) {
    fail(res, err instanceof Error ? err.message : 'Confirm failed');
  }
}

export async function cancelTransfer(req: AuthRequest, res: Response): Promise<void> {
  const transfer = await prisma.transfer.findUnique({ where: { id: req.params.id } });
  if (!transfer) { fail(res, 'Transfer not found', 404); return; }
  if (transfer.status === 'CONFIRMED') { fail(res, 'Cannot cancel a confirmed transfer'); return; }
  await prisma.transfer.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  ok(res, { message: 'Transfer cancelled' });
}
