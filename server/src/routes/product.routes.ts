import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth.middleware';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller';

const router = Router();
router.use(authenticate);
router.get   ('/',    listProducts);
router.get   ('/:id', getProduct);
router.post  ('/',    requireManager, createProduct);
router.put   ('/:id', requireManager, updateProduct);
router.delete('/:id', requireManager, deleteProduct);
export default router;
