import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth.middleware';
import { listCategories, createCategory, updateCategory } from '../controllers/misc.controllers';

const router = Router();
router.use(authenticate);
router.get ('/',    listCategories);
router.post('/',    requireManager, createCategory);
router.put ('/:id', requireManager, updateCategory);
export default router;
