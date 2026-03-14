import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { confirmReceipt } from '../services/stock.service';
import { generateDocNumber } from '../utils/docNumber';
import { ok, created, fail } from '../utils/response';

const INCLUDE = {
  lines: {
    include: {
      product:  { select: { id: true, sku: true, name: true, unit: true } },
      location: { select: { id: true, code: true, name: true, warehouse: { select: { name: true } } } },
    },
  },
  createdBy: { select: { id: true, name: true } },
};

export async function listReceipts(req: AuthRequest, res: Response): Promise<void> {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [receipts, total] = await Promise.all([
    prisma.receipt.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
    prisma.receipt.count({ where }),
  ]);
  ok(res, { receipts, total });
}

export async function getReceipt(req: AuthRequest, res: Response): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id }, include: INCLUDE });
  if (!receipt) { fail(res, 'Receipt not found', 404); return; }
  ok(res, receipt);
}

export async function createReceipt(req: AuthRequest, res: Response): Promise<void> {
  const { supplierName, notes, lines } = req.body;
  const receipt = await prisma.receipt.create({
    data: {
      documentNumber: generateDocNumber('REC'),
      supplierName,
      notes,
      createdById: req.user!.userId,
      lines: { create: lines },
    },
    include: INCLUDE,
  });
  created(res, receipt);
}

export async function confirmReceiptHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    await confirmReceipt(req.params.id);
    const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id }, include: INCLUDE });
    ok(res, receipt);
  } catch (err: unknown) {
    fail(res, err instanceof Error ? err.message : 'Confirm failed');
  }
}

export async function cancelReceipt(req: AuthRequest, res: Response): Promise<void> {
  const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
  if (!receipt) { fail(res, 'Receipt not found', 404); return; }
  if (receipt.status === 'CONFIRMED') { fail(res, 'Cannot cancel a confirmed receipt'); return; }
  await prisma.receipt.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  ok(res, { message: 'Receipt cancelled' });
}
