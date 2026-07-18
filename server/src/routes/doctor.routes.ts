import { Router } from 'express';
import * as ctrl from '../controllers/doctor.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { doctorSchema, doctorUpdateSchema } from '../validators/master.validators';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listDoctors);
router.get('/:id', ctrl.getDoctor);
router.post('/', requireRole('pharmacist'), validate(doctorSchema), ctrl.createDoctor);
router.patch('/:id', requireRole('pharmacist'), validate(doctorUpdateSchema), ctrl.updateDoctor);
router.delete('/:id', requireRole('admin'), ctrl.deleteDoctor);

export default router;
