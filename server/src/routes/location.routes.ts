// location.routes.ts
import { Router } from 'express';
import { authenticate, requireManager } from '../middleware/auth.middleware';
import { listLocations, createLocation } from '../controllers/misc.controllers';

const router = Router();
router.use(authenticate);
router.get ('/', listLocations);
router.post('/', requireManager, createLocation);
export default router;
