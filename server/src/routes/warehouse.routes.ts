import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth.middleware';
import { listWarehouses, getWarehouse, createWarehouse, updateWarehouse } from '../controllers/misc.controllers';

const router = Router();
router.use(authenticate);
router.get ('/',    listWarehouses);
router.get ('/:id', getWarehouse);
router.post('/',    requireManager, createWarehouse);
router.put ('/:id', requireManager, updateWarehouse);
export default router;
