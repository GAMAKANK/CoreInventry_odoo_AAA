import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth.middleware';
import { listDeliveries, getDelivery, createDelivery, confirmDeliveryHandler, cancelDelivery } from '../controllers/delivery.controller';

const router = Router();
router.use(authenticate);
router.get ('/',            listDeliveries);
router.get ('/:id',         getDelivery);
router.post('/',            createDelivery);
router.post('/:id/confirm', requireManager, confirmDeliveryHandler);
router.post('/:id/cancel',  requireManager, cancelDelivery);
export default router;
