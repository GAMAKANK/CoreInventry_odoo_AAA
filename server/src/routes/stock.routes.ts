// stock.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getStockLevels, getStockMovements } from '../controllers/misc.controllers';

const router = Router();
router.use(authenticate);
router.get('/levels',    getStockLevels);
router.get('/movements', getStockMovements);
export default router;
