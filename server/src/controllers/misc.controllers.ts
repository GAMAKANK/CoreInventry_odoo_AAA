// ─── Category Controller ──────────────────────────────────────────────────────
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { getAllStockLevels } from '../services/stock.service';
import { ok, created, fail } from '../utils/response';

export async function listCategories(_req: AuthRequest, res: Response): Promise<void> {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  ok(res, categories);
}

export async function createCategory(req: AuthRequest, res: Response): Promise<void> {
  const { name, description } = req.body;
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) { fail(res, 'Category already exists'); return; }
  const category = await prisma.category.create({ data: { name, description } });
  created(res, category);
}

export async function updateCategory(req: AuthRequest, res: Response): Promise<void> {
  const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
  ok(res, category);
}

// ─── Warehouse Controller ─────────────────────────────────────────────────────

export async function listWarehouses(_req: AuthRequest, res: Response): Promise<void> {
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    include: { locations: true },
    orderBy: { name: 'asc' },
  });
  ok(res, warehouses);
}

export async function getWarehouse(req: AuthRequest, res: Response): Promise<void> {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: req.params.id },
    include: { locations: true },
  });
  if (!warehouse) { fail(res, 'Warehouse not found', 404); return; }
  ok(res, warehouse);
}

export async function createWarehouse(req: AuthRequest, res: Response): Promise<void> {
  const { code, name, address } = req.body;
  const existing = await prisma.warehouse.findUnique({ where: { code } });
  if (existing) { fail(res, 'Warehouse code already exists'); return; }
  const warehouse = await prisma.warehouse.create({ data: { code, name, address } });
  created(res, warehouse);
}

export async function updateWarehouse(req: AuthRequest, res: Response): Promise<void> {
  const warehouse = await prisma.warehouse.update({ where: { id: req.params.id }, data: req.body });
  ok(res, warehouse);
}

// ─── Location Controller ──────────────────────────────────────────────────────

export async function listLocations(req: AuthRequest, res: Response): Promise<void> {
  const { warehouseId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (warehouseId) where.warehouseId = warehouseId;

  const locations = await prisma.location.findMany({
    where,
    include: { warehouse: { select: { id: true, name: true, code: true } } },
    orderBy: { code: 'asc' },
  });
  ok(res, locations);
}

export async function createLocation(req: AuthRequest, res: Response): Promise<void> {
  const { code, name, warehouseId } = req.body;
  const existing = await prisma.location.findUnique({ where: { warehouseId_code: { warehouseId, code } } });
  if (existing) { fail(res, 'Location code already exists in this warehouse'); return; }
  const location = await prisma.location.create({
    data: { code, name, warehouseId },
    include: { warehouse: { select: { id: true, name: true } } },
  });
  created(res, location);
}

// ─── Stock Controller ─────────────────────────────────────────────────────────

export async function getStockLevels(_req: AuthRequest, res: Response): Promise<void> {
  const levels = await getAllStockLevels();
  ok(res, levels);
}

export async function getStockMovements(req: AuthRequest, res: Response): Promise<void> {
  const { productId, locationId, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: Record<string, unknown> = {};
  if (productId)  where.productId  = productId;
  if (locationId) where.locationId = locationId;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product:  { select: { sku: true, name: true } },
        location: { select: { code: true, name: true, warehouse: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip, take: parseInt(limit),
    }),
    prisma.stockMovement.count({ where }),
  ]);
  ok(res, { movements, total });
}
