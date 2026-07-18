import { Router } from 'express';
import * as ctrl from '../controllers/prescription.controller';
import { authenticate } from '../middleware/auth';
import { uploadPrescription } from '../middleware/upload';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listPrescriptions);
router.get('/:id', ctrl.getPrescription);
router.post('/', uploadPrescription.single('image'), ctrl.createPrescription);

export default router;
