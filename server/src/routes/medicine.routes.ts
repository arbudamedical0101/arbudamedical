import { Router } from 'express';
import * as ctrl from '../controllers/medicine.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { medicineSchema, medicineUpdateSchema } from '../validators/master.validators';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listMedicines);
router.get('/:id', ctrl.getMedicine);
router.post('/', requireRole('pharmacist'), validate(medicineSchema), ctrl.createMedicine);
router.patch('/:id', requireRole('pharmacist'), validate(medicineUpdateSchema), ctrl.updateMedicine);
router.delete('/:id', requireRole('admin'), ctrl.deleteMedicine);

export default router;
