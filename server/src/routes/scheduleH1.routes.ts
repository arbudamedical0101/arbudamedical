import { Router } from 'express';
import * as ctrl from '../controllers/scheduleH1.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('pharmacist'), ctrl.listH1Entries);
router.get('/export', requireRole('pharmacist'), ctrl.exportH1Register);

export default router;
