import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes       from './routes/auth.routes';
import productRoutes    from './routes/product.routes';
import categoryRoutes   from './routes/category.routes';
import warehouseRoutes  from './routes/warehouse.routes';
import locationRoutes   from './routes/location.routes';
import receiptRoutes    from './routes/receipt.routes';
import deliveryRoutes   from './routes/delivery.routes';
import transferRoutes   from './routes/transfer.routes';
import adjustmentRoutes from './routes/adjustment.routes';
import stockRoutes      from './routes/stock.routes';
import dashboardRoutes  from './routes/dashboard.routes';

import { errorHandler } from './middleware/error.middleware';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/products',    productRoutes);
app.use('/api/categories',  categoryRoutes);
app.use('/api/warehouses',  warehouseRoutes);
app.use('/api/locations',   locationRoutes);
app.use('/api/receipts',    receiptRoutes);
app.use('/api/deliveries',  deliveryRoutes);
app.use('/api/transfers',   transferRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/stock',       stockRoutes);
app.use('/api/dashboard',   dashboardRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'CoreInventory API' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 CoreInventory API running on http://localhost:${PORT}`);
});

export default app;
