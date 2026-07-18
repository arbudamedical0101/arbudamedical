import { Router } from 'express';
import * as ctrl from '../controllers/sale.controller';
import * as held from '../controllers/heldBill.controller';
import { getInvoicePdf } from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSaleSchema, heldBillSchema } from '../validators/sale.validators';

const router = Router();
router.use(authenticate);

// Held bills (define before /:id so "held" isn't treated as an id)
router.get('/held', held.listHeldBills);
router.post('/held', validate(heldBillSchema), held.holdBill);
router.get('/held/:id', held.recallHeldBill);
router.delete('/held/:id', held.deleteHeldBill);

router.get('/lookup', ctrl.lookupForBilling);
router.get('/', ctrl.listSales);
router.post('/', validate(createSaleSchema), ctrl.createSale);
router.get('/:id', ctrl.getSale);
router.get('/:id/invoice.pdf', getInvoicePdf);

export default router;
