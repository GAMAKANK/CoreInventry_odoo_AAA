import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth.middleware';
import { listTransfers, getTransfer, createTransfer, confirmTransferHandler, cancelTransfer } from '../controllers/transfer.controller';

const router = Router();
router.use(authenticate);
router.get ('/',            listTransfers);
router.get ('/:id',         getTransfer);
router.post('/',            createTransfer);
router.post('/:id/confirm', requireManager, confirmTransferHandler);
router.post('/:id/cancel',  requireManager, cancelTransfer);
export default router;
