import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { ok, created, fail } from '../utils/response';

export async function listProducts(req: AuthRequest, res: Response): Promise<void> {
  const { search, categoryId, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = { isActive: true };
  if (categoryId) where.categoryId = categoryId;
  if (search)     where.OR = [
    { sku:  { contains: search, mode: 'insensitive' } },
    { name: { contains: search, mode: 'insensitive' } },
  ];

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      skip, take: parseInt(limit),
    }),
    prisma.product.count({ where }),
  ]);

  ok(res, { products, total, page: parseInt(page), limit: parseInt(limit) });
}

export async function getProduct(req: AuthRequest, res: Response): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!product) { fail(res, 'Product not found', 404); return; }
  ok(res, product);
}

export async function createProduct(req: AuthRequest, res: Response): Promise<void> {
  const { sku, name, description, unit, reorderLevel, categoryId } = req.body;
  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) { fail(res, 'SKU already exists'); return; }

  const product = await prisma.product.create({
    data: { sku, name, description, unit, reorderLevel: reorderLevel ?? 10, categoryId },
    include: { category: true },
  });
  created(res, product);
}

export async function updateProduct(req: AuthRequest, res: Response): Promise<void> {
  const { name, description, unit, reorderLevel, categoryId } = req.body;
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data:  { name, description, unit, reorderLevel, categoryId },
    include: { category: true },
  });
  ok(res, product);
}

export async function deleteProduct(req: AuthRequest, res: Response): Promise<void> {
  await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
  ok(res, { message: 'Product deactivated' });
}
