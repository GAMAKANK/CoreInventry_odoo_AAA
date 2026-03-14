import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth.middleware';
import { listAdjustments, getAdjustment, createAdjustment, confirmAdjustmentHandler, cancelAdjustment } from '../controllers/adjustment.controller';

const router = Router();
router.use(authenticate);
router.get ('/',            listAdjustments);
router.get ('/:id',         getAdjustment);
router.post('/',            requireManager, createAdjustment);
router.post('/:id/confirm', requireManager, confirmAdjustmentHandler);
router.post('/:id/cancel',  requireManager, cancelAdjustment);
export default router;
