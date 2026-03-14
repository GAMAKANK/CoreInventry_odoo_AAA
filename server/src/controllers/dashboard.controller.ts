import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { getLowStockAlerts } from '../services/stock.service';
import { ok } from '../utils/response';

export async function getDashboard(_req: AuthRequest, res: Response): Promise<void> {
  const [
    totalProducts,
    totalWarehouses,
    pendingReceipts,
    pendingDeliveries,
    pendingTransfers,
    recentMovements,
    lowStockAlerts,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.warehouse.count({ where: { isActive: true } }),
    prisma.receipt.count({ where: { status: 'DRAFT' } }),
    prisma.delivery.count({ where: { status: 'DRAFT' } }),
    prisma.transfer.count({ where: { status: 'DRAFT' } }),
    prisma.stockMovement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product:  { select: { sku: true, name: true } },
        location: { select: { code: true, warehouse: { select: { name: true } } } },
      },
    }),
    getLowStockAlerts(),
  ]);

  ok(res, {
    kpis: { totalProducts, totalWarehouses, pendingReceipts, pendingDeliveries, pendingTransfers },
    lowStockAlerts,
    recentMovements,
  });
}
