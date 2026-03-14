import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { confirmDelivery } from '../services/stock.service';
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

export async function listDeliveries(req: AuthRequest, res: Response): Promise<void> {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [deliveries, total] = await Promise.all([
    prisma.delivery.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
    prisma.delivery.count({ where }),
  ]);
  ok(res, { deliveries, total });
}

export async function getDelivery(req: AuthRequest, res: Response): Promise<void> {
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id }, include: INCLUDE });
  if (!delivery) { fail(res, 'Delivery not found', 404); return; }
  ok(res, delivery);
}

export async function createDelivery(req: AuthRequest, res: Response): Promise<void> {
  const { customerName, notes, lines } = req.body;
  const delivery = await prisma.delivery.create({
    data: {
      documentNumber: generateDocNumber('DEL'),
      customerName,
      notes,
      createdById: req.user!.userId,
      lines: { create: lines },
    },
    include: INCLUDE,
  });
  created(res, delivery);
}

export async function confirmDeliveryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    await confirmDelivery(req.params.id);
    const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id }, include: INCLUDE });
    ok(res, delivery);
  } catch (err: unknown) {
    fail(res, err instanceof Error ? err.message : 'Confirm failed');
  }
}

export async function cancelDelivery(req: AuthRequest, res: Response): Promise<void> {
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
  if (!delivery) { fail(res, 'Delivery not found', 404); return; }
  if (delivery.status === 'CONFIRMED') { fail(res, 'Cannot cancel a confirmed delivery'); return; }
  await prisma.delivery.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  ok(res, { message: 'Delivery cancelled' });
}
