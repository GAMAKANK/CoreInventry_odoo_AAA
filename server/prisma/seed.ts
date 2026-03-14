// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CoreInventory database...');

  // Users
  const managerHash = await bcrypt.hash('manager123', 10);
  const staffHash   = await bcrypt.hash('staff123', 10);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@coreinventory.com' },
    update: {},
    create: { email: 'manager@coreinventory.com', passwordHash: managerHash, name: 'Alex Manager', role: Role.MANAGER },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@coreinventory.com' },
    update: {},
    create: { email: 'staff@coreinventory.com', passwordHash: staffHash, name: 'Sam Staff', role: Role.STAFF },
  });

  // Categories
  const [electronics, furniture, consumables] = await Promise.all([
    prisma.category.upsert({ where: { name: 'Electronics' }, update: {}, create: { name: 'Electronics', description: 'Electronic components and devices' } }),
    prisma.category.upsert({ where: { name: 'Furniture' },   update: {}, create: { name: 'Furniture',   description: 'Office and warehouse furniture' } }),
    prisma.category.upsert({ where: { name: 'Consumables' }, update: {}, create: { name: 'Consumables', description: 'Office and packaging supplies' } }),
  ]);

  // Products
  const products = await Promise.all([
    prisma.product.upsert({ where: { sku: 'ELEC-001' }, update: {}, create: { sku: 'ELEC-001', name: 'Laptop Pro 15"', categoryId: electronics.id, unit: 'pcs', reorderLevel: 5 } }),
    prisma.product.upsert({ where: { sku: 'ELEC-002' }, update: {}, create: { sku: 'ELEC-002', name: 'Wireless Mouse', categoryId: electronics.id, unit: 'pcs', reorderLevel: 20 } }),
    prisma.product.upsert({ where: { sku: 'FURN-001' }, update: {}, create: { sku: 'FURN-001', name: 'Ergonomic Chair', categoryId: furniture.id, unit: 'pcs', reorderLevel: 3 } }),
    prisma.product.upsert({ where: { sku: 'CONS-001' }, update: {}, create: { sku: 'CONS-001', name: 'A4 Paper Ream', categoryId: consumables.id, unit: 'ream', reorderLevel: 50 } }),
    prisma.product.upsert({ where: { sku: 'CONS-002' }, update: {}, create: { sku: 'CONS-002', name: 'Bubble Wrap Roll', categoryId: consumables.id, unit: 'm', reorderLevel: 100 } }),
  ]);

  // Warehouses & Locations
  const wh1 = await prisma.warehouse.upsert({ where: { code: 'WH-MAIN' }, update: {}, create: { code: 'WH-MAIN', name: 'Main Warehouse', address: '123 Industrial Ave, Delhi' } });
  const wh2 = await prisma.warehouse.upsert({ where: { code: 'WH-NORTH' }, update: {}, create: { code: 'WH-NORTH', name: 'North Hub', address: '45 Logistics Park, Noida' } });

  const [locA, locB, locC] = await Promise.all([
    prisma.location.upsert({ where: { warehouseId_code: { warehouseId: wh1.id, code: 'A-01' } }, update: {}, create: { code: 'A-01', name: 'Aisle A, Shelf 1', warehouseId: wh1.id } }),
    prisma.location.upsert({ where: { warehouseId_code: { warehouseId: wh1.id, code: 'B-01' } }, update: {}, create: { code: 'B-01', name: 'Aisle B, Shelf 1', warehouseId: wh1.id } }),
    prisma.location.upsert({ where: { warehouseId_code: { warehouseId: wh2.id, code: 'N-01' } }, update: {}, create: { code: 'N-01', name: 'North Rack 1',    warehouseId: wh2.id } }),
  ]);

  console.log('✅ Seed complete.');
  console.log('   manager@coreinventory.com / manager123');
  console.log('   staff@coreinventory.com   / staff123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
