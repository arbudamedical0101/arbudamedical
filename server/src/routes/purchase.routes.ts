import { Router } from 'express';
import * as ctrl from '../controllers/purchase.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { createPurchaseSchema } from '../validators/purchase.validators';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('pharmacist'), ctrl.listPurchases);
router.get('/:id', requireRole('pharmacist'), ctrl.getPurchase);
router.post('/', requireRole('pharmacist'), validate(createPurchaseSchema), ctrl.createPurchase);

export default router;
