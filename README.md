# CoreInventry_-odoo---AAA

CoreInventory – Inventory Management System

CoreInventory is a modular Inventory Management System (IMS) designed to digitize and streamline stock management for businesses.
It replaces manual registers, Excel sheets, and scattered tracking methods with a centralized, real-time web application.

The system enables inventory managers and warehouse staff to efficiently manage products, track stock movements, and monitor warehouse operations.
 
  # CoreInventory

> Production-grade Inventory Management System — Node.js + PostgreSQL + React

---

## Overview

CoreInventory replaces manual registers and Excel sheets with a centralized warehouse management application. It supports multi-warehouse stock tracking with a fully immutable ledger — stock is never edited directly, every change is a movement record.

### Users
| Role | Capabilities |
|------|-------------|
| **Manager** | Create, confirm, cancel all documents; manage products, categories, warehouses |
| **Staff** | View all data, create draft documents |

---

## Architecture

```
coreinventory/
├── client/                  # React + Vite + Tailwind CSS
│   └── src/
│       ├── api/             # Axios API client (typed functions)
│       ├── components/
│       │   ├── layout/      # Sidebar, Layout wrapper
│       │   └── ui/          # Modal, Badge, Spinner, Table utils
│       ├── context/         # AuthContext (JWT state)
│       ├── hooks/           # useDocumentActions (confirm/cancel)
│       └── pages/           # One file per module
│
└── server/                  # Node.js + Express + Prisma
    └── src/
        ├── config/          # Prisma singleton
        ├── controllers/     # Request handlers (thin layer)
        ├── middleware/       # JWT auth, RBAC, error handler
        ├── routes/          # Express routers
        ├── services/        # Business logic (StockService)
        └── utils/           # JWT, response helpers, doc numbers
```

### Key architectural decisions

**Immutable ledger** — There is no `stock_quantity` field on products or locations. All stock is derived by summing `stock_movements`. This gives a full audit trail and makes it impossible to silently corrupt inventory.

**Transaction safety** — Every confirm operation (receipt / delivery / transfer / adjustment) runs inside a Prisma `$transaction`. If any line fails (e.g. insufficient stock), the entire operation rolls back.

**RBAC at the route layer** — The `requireManager` middleware is applied per-route, not per-controller. Staff can read everything and create drafts; only managers can confirm or cancel documents.

**Layered separation** — Routes call Controllers, Controllers call Services. The `StockService` is the only place that writes to `stock_movements`. No controller writes stock directly.

---

## Database Schema

```
users           → authentication and role assignment
categories      → product grouping
products        → SKU-based catalogue with reorder levels
warehouses      → physical or logical warehouse sites
locations       → bins/zones within warehouses
receipts        → goods-in documents (increase stock on confirm)
receipt_lines   → line items: product + location + qty
deliveries      → goods-out documents (decrease stock on confirm)
delivery_lines  → line items: product + location + qty
transfers       → inter-location movements (debit + credit on confirm)
transfer_lines  → product + fromLocation + toLocation + qty
adjustments     → stock corrections (cycle count, damage, etc.)
adjustment_lines→ product + location + before/after/delta
stock_movements → IMMUTABLE LEDGER — one row per stock change
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| PostgreSQL | ≥ 14 |
| npm | ≥ 9 |

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd coreinventory

# Install root + both workspaces
npm run install:all
```

### 2. Configure the server environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/coreinventory"
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES="8h"
PORT=4000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

### 3. Create the PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE coreinventory;"
```

Or using pgAdmin / your preferred GUI tool.

### 4. Run migrations and seed

```bash
# From project root:
npm run db:migrate    # applies all Prisma migrations
npm run db:seed       # loads demo users, products, warehouses
```

The seed creates:
- **manager@coreinventory.com** / `manager123` (MANAGER role)
- **staff@coreinventory.com** / `staff123` (STAFF role)
- 3 categories, 5 products, 2 warehouses, 3 locations

### 5. Start the development servers

```bash
# From project root — starts both simultaneously:
npm run dev
```

| Service | URL |
|---------|-----|
| React frontend | http://localhost:5173 |
| Express API | http://localhost:4000 |
| Prisma Studio | `npm run db:studio` (in server/) |

---

## API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/auth/register` | — | Register new user |
| GET  | `/api/auth/me` | ✓ | Current user profile |

### Products
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/api/products` | ✓ | List (paginated, filterable) |
| GET    | `/api/products/:id` | ✓ | Get one |
| POST   | `/api/products` | Manager | Create |
| PUT    | `/api/products/:id` | Manager | Update |
| DELETE | `/api/products/:id` | Manager | Soft delete |

### Documents (Receipts / Deliveries / Transfers / Adjustments)

All four modules follow the same pattern:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/api/{module}` | ✓ | List (paginated) |
| GET    | `/api/{module}/:id` | ✓ | Get one with lines |
| POST   | `/api/{module}` | ✓ | Create draft |
| POST   | `/api/{module}/:id/confirm` | Manager | Confirm → posts to ledger |
| POST   | `/api/{module}/:id/cancel` | Manager | Cancel draft |

### Stock
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/stock/levels` | ✓ | Current stock by product+location |
| GET | `/api/stock/movements` | ✓ | Full ledger (paginated, filterable) |
| GET | `/api/dashboard` | ✓ | KPIs + alerts + recent activity |

---

## Business Rules

### Stock never goes negative
Before confirming a delivery or transfer-out, the system computes the running balance for that (product, location) pair. If the result would go below zero, the entire transaction is rejected with a descriptive error.

### Confirm is irreversible
Once a document is CONFIRMED, it cannot be cancelled. The ledger entry is immutable. To correct a mistake, create an Adjustment document.

### Document flow
```
DRAFT → CONFIRMED  (posts ledger entries)
DRAFT → CANCELLED  (no ledger effect)
```

### Low stock alerts
A product is flagged as low stock when its total quantity across all locations falls at or below its configured `reorderLevel`.

---

## Folder-by-folder Guide

### `server/src/services/stock.service.ts`
The heart of the system. Contains:
- `getStockLevel(productId, locationId)` — computes live balance
- `getAllStockLevels()` — aggregated view across all locations
- `confirmReceipt / confirmDelivery / confirmTransfer / confirmAdjustment` — each runs a Prisma transaction that validates availability and writes to the ledger
- `getLowStockAlerts()` — products at or below reorder level

### `server/src/middleware/auth.middleware.ts`
- `authenticate` — verifies Bearer JWT, attaches `req.user`
- `requireManager` — rejects non-MANAGER roles with HTTP 403

### `client/src/api/index.ts`
Single file with all typed API calls. The Axios interceptors handle JWT attachment and global 401 redirects.

### `client/src/components/ui/index.tsx`
All shared UI primitives: Modal, StatusBadge, MovementBadge, Spinner, EmptyState, ConfirmDialog, Pagination, QtyCell.

---

## Production Checklist

- [ ] Change `JWT_SECRET` to a cryptographically random string (≥ 32 chars)
- [ ] Set `NODE_ENV=production` in server env
- [ ] Use a managed PostgreSQL instance (Supabase, RDS, Neon, etc.)
- [ ] Run `npm run build:server` and `npm run build:client` for production builds
- [ ] Serve the client build via nginx or a CDN; proxy `/api` to the Express server
- [ ] Add rate limiting (e.g. `express-rate-limit`) to auth endpoints
- [ ] Enable SSL/TLS on the database connection string
- [ ] Set up database backups — the `stock_movements` table is your audit trail

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + DM Sans font |
| State | TanStack Query (server state) + React Context (auth) |
| API client | Axios with interceptors |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 5 |
| Database | PostgreSQL 14+ |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Dev tooling | tsx (hot reload), concurrently |

---

## Demo Credentials

After seeding:

```
Manager:  manager@coreinventory.com / manager123
Staff:    staff@coreinventory.com   / staff123
```

The login page pre-fills the manager credentials for convenience.
