/**
 * StockService — CoreInventory's business logic layer.
 *
 * This is the ONLY place that reads or writes stock quantities.
 * All other operations call into this service.
 *
 * Invariants:
 *  - Stock quantity is derived by summing stock_movements for a (product, location)
 *  - No direct mutation of a "stock" field — there is none
 *  - All writes are wrapped in Prisma transactions
 */
import prisma from '../config/prisma';
import { MovementType, DocumentStatus } from '@prisma/client';

// ── Public types ──────────────────────────────────────────────────────────────

export interface StockLevel {
  productId:   string;
  locationId:  string;
  quantity:    number;
  product: { sku: string; name: string; reorderLevel: number };
  location: { code: string; name: string; warehouse: { name: string } };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compute current stock for a (product, location) pair by summing all movements.
 */
export async function getStockLevel(productId: string, locationId: string): Promise<number> {
  const agg = await prisma.stockMovement.aggregate({
    where: { productId, locationId },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

/**
 * Get all stock levels (non-zero) across all products and locations.
 */
export async function getAllStockLevels(): Promise<StockLevel[]> {
  // Use raw aggregation — Prisma doesn't support GROUP BY natively for aggregate
  const rows = await prisma.$queryRaw<
    { product_id: string; location_id: string; quantity: bigint }[]
  >`
    SELECT product_id, location_id, SUM(quantity)::integer AS quantity
    FROM stock_movements
    GROUP BY product_id, location_id
    HAVING SUM(quantity) > 0
    ORDER BY product_id, location_id
  `;

  // Hydrate with relations
  const enriched = await Promise.all(rows.map(async (r) => {
    const [product, location] = await Promise.all([
      prisma.product.findUnique({ where: { id: r.product_id }, select: { sku: true, name: true, reorderLevel: true } }),
      prisma.location.findUnique({ where: { id: r.location_id }, select: { code: true, name: true, warehouse: { select: { name: true } } } }),
    ]);
    return {
      productId:  r.product_id,
      locationId: r.location_id,
      quantity:   Number(r.quantity),
      product:    product!,
      location:   location!,
    };
  }));

  return enriched;
}

// ── Write a ledger entry ──────────────────────────────────────────────────────

interface MovementArgs {
  productId:     string;
  locationId:    string;
  movementType:  MovementType;
  quantity:      number;           // positive = in, negative = out
  referenceType: string;
  referenceId:   string;
  notes?:        string;
}

async function writeMovement(args: MovementArgs, tx: typeof prisma): Promise<void> {
  const currentBalance = await getStockLevel(args.productId, args.locationId);
  const balanceAfter   = currentBalance + args.quantity;

  if (balanceAfter < 0) {
    throw new Error(
      `Insufficient stock: product ${args.productId} at location ${args.locationId} ` +
      `has ${currentBalance}, requested ${Math.abs(args.quantity)}`
    );
  }

  await tx.stockMovement.create({
    data: {
      productId:     args.productId,
      locationId:    args.locationId,
      movementType:  args.movementType,
      quantity:      args.quantity,
      balanceAfter,
      referenceType: args.referenceType,
      referenceId:   args.referenceId,
      notes:         args.notes,
    },
  });
}

// ── Confirm Receipt ───────────────────────────────────────────────────────────

export async function confirmReceipt(receiptId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      include: { lines: true },
    });
    if (receipt.status === DocumentStatus.CONFIRMED)
      throw new Error('Receipt already confirmed');
    if (receipt.status === DocumentStatus.CANCELLED)
      throw new Error('Cannot confirm a cancelled receipt');

    for (const line of receipt.lines) {
      await writeMovement({
        productId:     line.productId,
        locationId:    line.locationId,
        movementType:  MovementType.RECEIPT,
        quantity:      line.quantity,
        referenceType: 'RECEIPT',
        referenceId:   receiptId,
      }, tx as typeof prisma);
    }

    await tx.receipt.update({
      where: { id: receiptId },
      data:  { status: DocumentStatus.CONFIRMED, receivedAt: new Date() },
    });
  });
}

// ── Confirm Delivery ──────────────────────────────────────────────────────────

export async function confirmDelivery(deliveryId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: { lines: true },
    });
    if (delivery.status === DocumentStatus.CONFIRMED)
      throw new Error('Delivery already confirmed');
    if (delivery.status === DocumentStatus.CANCELLED)
      throw new Error('Cannot confirm a cancelled delivery');

    for (const line of delivery.lines) {
      await writeMovement({
        productId:     line.productId,
        locationId:    line.locationId,
        movementType:  MovementType.DELIVERY,
        quantity:      -line.quantity,  // stock goes out
        referenceType: 'DELIVERY',
        referenceId:   deliveryId,
      }, tx as typeof prisma);
    }

    await tx.delivery.update({
      where: { id: deliveryId },
      data:  { status: DocumentStatus.CONFIRMED, shippedAt: new Date() },
    });
  });
}

// ── Confirm Transfer ──────────────────────────────────────────────────────────

export async function confirmTransfer(transferId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUniqueOrThrow({
      where: { id: transferId },
      include: { lines: true },
    });
    if (transfer.status === DocumentStatus.CONFIRMED)
      throw new Error('Transfer already confirmed');
    if (transfer.status === DocumentStatus.CANCELLED)
      throw new Error('Cannot confirm a cancelled transfer');

    for (const line of transfer.lines) {
      // Debit source
      await writeMovement({
        productId:     line.productId,
        locationId:    line.fromLocationId,
        movementType:  MovementType.TRANSFER_OUT,
        quantity:      -line.quantity,
        referenceType: 'TRANSFER',
        referenceId:   transferId,
      }, tx as typeof prisma);

      // Credit destination
      await writeMovement({
        productId:     line.productId,
        locationId:    line.toLocationId,
        movementType:  MovementType.TRANSFER_IN,
        quantity:      line.quantity,
        referenceType: 'TRANSFER',
        referenceId:   transferId,
      }, tx as typeof prisma);
    }

    await tx.transfer.update({
      where: { id: transferId },
      data:  { status: DocumentStatus.CONFIRMED, transferredAt: new Date() },
    });
  });
}

// ── Confirm Adjustment ────────────────────────────────────────────────────────

export async function confirmAdjustment(adjustmentId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const adjustment = await tx.adjustment.findUniqueOrThrow({
      where: { id: adjustmentId },
      include: { lines: true },
    });
    if (adjustment.status === DocumentStatus.CONFIRMED)
      throw new Error('Adjustment already confirmed');
    if (adjustment.status === DocumentStatus.CANCELLED)
      throw new Error('Cannot confirm a cancelled adjustment');

    for (const line of adjustment.lines) {
      await writeMovement({
        productId:     line.productId,
        locationId:    line.locationId,
        movementType:  MovementType.ADJUSTMENT,
        quantity:      line.delta,
        referenceType: 'ADJUSTMENT',
        referenceId:   adjustmentId,
        notes:         `Adjustment: ${adjustment.reason}`,
      }, tx as typeof prisma);
    }

    await tx.adjustment.update({
      where: { id: adjustmentId },
      data:  { status: DocumentStatus.CONFIRMED, adjustedAt: new Date() },
    });
  });
}

// ── Low stock alerts ──────────────────────────────────────────────────────────

export async function getLowStockAlerts(): Promise<{
  product: { id: string; sku: string; name: string; reorderLevel: number };
  totalQty: number;
}[]> {
  const allLevels = await getAllStockLevels();

  // Aggregate by product across all locations
  const byProduct = new Map<string, { qty: number; product: StockLevel['product'] & { id: string } }>();

  for (const s of allLevels) {
    const existing = byProduct.get(s.productId);
    if (existing) {
      existing.qty += s.quantity;
    } else {
      const product = await prisma.product.findUnique({ where: { id: s.productId }, select: { id: true, sku: true, name: true, reorderLevel: true } });
      byProduct.set(s.productId, { qty: s.quantity, product: product! });
    }
  }

  return Array.from(byProduct.values())
    .filter(p => p.qty <= p.product.reorderLevel)
    .map(p => ({ product: p.product, totalQty: p.qty }));
}
