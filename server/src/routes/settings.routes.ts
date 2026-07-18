import { Router } from 'express';
import * as ctrl from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { settingsSchema } from '../validators/master.validators';

const router = Router();

// Public store info for the storefront landing page — no auth required.
router.get('/public', ctrl.getPublicStoreInfo);

router.use(authenticate);

router.get('/', ctrl.getStoreSettings);
router.patch('/', requireRole('admin'), validate(settingsSchema), ctrl.updateStoreSettings);

export default router;
