import { Router } from 'express';
import * as ctrl from '../controllers/customer.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import {
  customerSchema,
  customerUpdateSchema,
  customerPaymentSchema,
} from '../validators/master.validators';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listCustomers);
router.get('/:id', ctrl.getCustomer);
router.post('/', validate(customerSchema), ctrl.createCustomer);
router.patch('/:id', validate(customerUpdateSchema), ctrl.updateCustomer);
router.post('/:id/payments', requireRole('pharmacist'), validate(customerPaymentSchema), ctrl.recordPayment);
router.delete('/:id', requireRole('admin'), ctrl.deleteCustomer);

export default router;
