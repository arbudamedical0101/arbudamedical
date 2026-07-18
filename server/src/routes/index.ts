import { Router } from 'express';
import authRoutes from './auth.routes';
import medicineRoutes from './medicine.routes';
import supplierRoutes from './supplier.routes';
import customerRoutes from './customer.routes';
import doctorRoutes from './doctor.routes';
import settingsRoutes from './settings.routes';
import batchRoutes from './batch.routes';
import purchaseRoutes from './purchase.routes';
import saleRoutes from './sale.routes';
import salesReturnRoutes from './salesReturn.routes';
import stockAdjustmentRoutes from './stockAdjustment.routes';
import prescriptionRoutes from './prescription.routes';
import scheduleH1Routes from './scheduleH1.routes';
import reportRoutes from './report.routes';
import dashboardRoutes from './dashboard.routes';
import auditRoutes from './audit.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/medicines', medicineRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/doctors', doctorRoutes);
router.use('/settings', settingsRoutes);
router.use('/batches', batchRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/sales', saleRoutes);
router.use('/sales-returns', salesReturnRoutes);
router.use('/stock-adjustments', stockAdjustmentRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/schedule-h1', scheduleH1Routes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
