import { Router } from 'express';
import * as ctrl from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();
router.use(authenticate);
// Reports are for pharmacist/admin only (cashier bills but doesn't see margins).
router.use(requireRole('pharmacist'));

router.get('/sales', ctrl.salesReport);
router.get('/gst', ctrl.gstSummary);
router.get('/purchases', ctrl.purchaseRegister);
router.get('/profit', ctrl.profitReport);
router.get('/expiry', ctrl.expiryReport);
router.get('/movers', ctrl.moversReport);
router.get('/stock-ledger', ctrl.stockLedger);

export default router;
