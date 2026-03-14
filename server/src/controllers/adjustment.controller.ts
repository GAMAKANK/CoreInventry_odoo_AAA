import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { confirmAdjustment } from '../services/stock.service';
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

export async function listAdjustments(req: AuthRequest, res: Response): Promise<void> {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [adjustments, total] = await Promise.all([
    prisma.adjustment.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
    prisma.adjustment.count({ where }),
  ]);
  ok(res, { adjustments, total });
}

export async function getAdjustment(req: AuthRequest, res: Response): Promise<void> {
  const adjustment = await prisma.adjustment.findUnique({ where: { id: req.params.id }, include: INCLUDE });
  if (!adjustment) { fail(res, 'Adjustment not found', 404); return; }
  ok(res, adjustment);
}

export async function createAdjustment(req: AuthRequest, res: Response): Promise<void> {
  const { reason, notes, lines } = req.body;
  const adjustment = await prisma.adjustment.create({
    data: {
      documentNumber: generateDocNumber('ADJ'),
      reason,
      notes,
      createdById: req.user!.userId,
      lines: { create: lines },
    },
    include: INCLUDE,
  });
  created(res, adjustment);
}

export async function confirmAdjustmentHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    await confirmAdjustment(req.params.id);
    const adjustment = await prisma.adjustment.findUnique({ where: { id: req.params.id }, include: INCLUDE });
    ok(res, adjustment);
  } catch (err: unknown) {
    fail(res, err instanceof Error ? err.message : 'Confirm failed');
  }
}

export async function cancelAdjustment(req: AuthRequest, res: Response): Promise<void> {
  const adjustment = await prisma.adjustment.findUnique({ where: { id: req.params.id } });
  if (!adjustment) { fail(res, 'Adjustment not found', 404); return; }
  if (adjustment.status === 'CONFIRMED') { fail(res, 'Cannot cancel a confirmed adjustment'); return; }
  await prisma.adjustment.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  ok(res, { message: 'Adjustment cancelled' });
}
