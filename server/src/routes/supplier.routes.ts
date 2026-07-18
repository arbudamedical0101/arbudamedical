import { Router } from 'express';
import * as ctrl from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { supplierSchema, supplierUpdateSchema } from '../validators/master.validators';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listSuppliers);
router.get('/:id', ctrl.getSupplier);
router.post('/', requireRole('pharmacist'), validate(supplierSchema), ctrl.createSupplier);
router.patch('/:id', requireRole('pharmacist'), validate(supplierUpdateSchema), ctrl.updateSupplier);
router.delete('/:id', requireRole('admin'), ctrl.deleteSupplier);

export default router;
