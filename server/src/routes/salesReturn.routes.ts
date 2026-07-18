import { Router } from 'express';
import * as ctrl from '../controllers/salesReturn.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { createReturnSchema } from '../validators/salesReturn.validators';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listReturns);
router.get('/:id', ctrl.getReturn);
router.post('/', requireRole('pharmacist'), validate(createReturnSchema), ctrl.createReturn);

export default router;
