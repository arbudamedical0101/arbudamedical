import { Router } from 'express';
import * as ctrl from '../controllers/stockAdjustment.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { stockAdjustmentSchema } from '../validators/stock.validators';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('pharmacist'), ctrl.listAdjustments);
router.post('/', requireRole('pharmacist'), validate(stockAdjustmentSchema), ctrl.createAdjustment);

export default router;
