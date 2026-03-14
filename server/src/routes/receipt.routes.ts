import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth.middleware';
import { listReceipts, getReceipt, createReceipt, confirmReceiptHandler, cancelReceipt } from '../controllers/receipt.controller';

const router = Router();
router.use(authenticate);
router.get ('/',               listReceipts);
router.get ('/:id',            getReceipt);
router.post('/',               createReceipt);
router.post('/:id/confirm',    requireManager, confirmReceiptHandler);
router.post('/:id/cancel',     requireManager, cancelReceipt);
export default router;
