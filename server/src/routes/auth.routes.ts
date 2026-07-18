import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  updateUserSchema,
} from '../validators/auth.validators';

const router = Router();

router.post('/login', validate(loginSchema), ctrl.login);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.get('/me', authenticate, ctrl.me);

// User management — admin only
router.get('/users', authenticate, requireRole('admin'), ctrl.listUsers);
router.post('/users', authenticate, requireRole('admin'), validate(registerSchema), ctrl.createUser);
router.patch('/users/:id', authenticate, requireRole('admin'), validate(updateUserSchema), ctrl.updateUser);

export default router;
