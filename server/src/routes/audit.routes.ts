import { Router } from 'express';
import { listAuditLogs } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();
router.use(authenticate, requireRole('admin'));
router.get('/', listAuditLogs);

export default router;
