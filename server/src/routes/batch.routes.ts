import { Router } from 'express';
import * as ctrl from '../controllers/batch.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listBatches);
router.get('/alerts', ctrl.getAlerts);
router.get('/valuation', ctrl.getValuation);

export default router;
