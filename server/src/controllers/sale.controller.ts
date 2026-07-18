import { Request, Response } from 'express';
import dayjs from 'dayjs';
import { ClientSession, Types } from 'mongoose';
import { Sale, ISaleItem, IPayment, PaymentMode } from '../models/Sale';
import { Batch, IBatch } from '../models/Batch';
import { Medicine, IMedicine } from '../models/Medicine';
import { Customer } from '../models/Customer';
import { Doctor } from '../models/Doctor';
import { Prescription } from '../models/Prescription';
import { ScheduleH1Entry } from '../models/ScheduleH1Entry';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { withTransaction } from '../utils/withTransaction';
import { recordAudit } from '../utils/audit';
import { nextInvoiceNumber } from '../utils/sequence';
import { priceBill, RawLine } from '../services/pricing';

const SCHEDULED = new Set(['H', 'H1', 'X']);

interface ResolvedLine {
  medicine: IMedicine;
  batch: IBatch;
  qty: number;
  discountPct: number;
}

async function resolveBatch(
  item: { medicineId: string; batchId?: string; qty: number },
  allowExpired: boolean,
  session: ClientSession | undefined
): Promise<IBatch> {
  const today = dayjs().startOf('day').toDate();
  if (item.batchId) {
    const batch = await Batch.findById(item.batchId).session(session ?? null);
    if (!batch) throw ApiError.notFound(`Batch ${item.batchId} not found`);
    if (String(batch.medicineId) !== String(item.medicineId)) {
      throw ApiError.badRequest('Batch does not belong to the selected medicine');
    }
    return batch;
  }
  // FEFO: earliest-expiry batch with enough stock.
  const expiryFilter = allowExpired ? {} : { expiry: { $gte: today } };
  const batch = await Batch.findOne({
    medicineId: item.medicineId,
    qtyInStock: { $gte: item.qty },
    ...expiryFilter,
  })
    .sort({ expiry: 1 })
    .session(session ?? null);
  if (!batch) {
    const med = await Medicine.findById(item.medicineId).session(session ?? null);
    throw ApiError.badRequest(
      `Insufficient sellable stock for ${med?.name ?? 'medicine'} (need ${item.qty}). Check batches/expiry.`
    );
  }
  return batch;
}

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    customerId?: string;
    customerName?: string;
    doctorId?: string;
    prescriptionId?: string;
    patientName?: string;
    patientPhone?: string;
    billDiscountPct: number;
    items: { medicineId: string; batchId?: string; qty: number; discountPct: number }[];
    payments: { mode: PaymentMode; amount: number; reference?: string }[];
    allowExpired?: boolean;
  };

  const allowExpired = body.allowExpired === true;
  const creditAmount = body.payments
    .filter((p) => p.mode === 'credit')
    .reduce((a, p) => a + p.amount, 0);
  if (creditAmount > 0 && !body.customerId) {
    throw ApiError.badRequest('A customer is required for credit (khata) payments');
  }

  let doctorName: string | undefined;
  if (body.doctorId) {
    const doc = await Doctor.findById(body.doctorId);
    if (!doc) throw ApiError.notFound('Doctor not found');
    doctorName = doc.name;
  }

  const sale = await withTransaction(async (session) => {
    // 1. Resolve batches + medicines.
    const resolved: ResolvedLine[] = [];
    const expiredNames: string[] = [];
    const today = dayjs().startOf('day').toDate();
    for (const item of body.items) {
      const medicine = await Medicine.findById(item.medicineId).session(session ?? null);
      if (!medicine) throw ApiError.notFound(`Medicine ${item.medicineId} not found`);
      const batch = await resolveBatch(item, allowExpired, session);
      if (batch.expiry < today) expiredNames.push(`${medicine.name} (${batch.batchNo})`);
      resolved.push({ medicine, batch, qty: item.qty, discountPct: item.discountPct });
    }
    if (expiredNames.length && !allowExpired) {
      throw ApiError.badRequest(`Expired stock cannot be sold: ${expiredNames.join(', ')}`);
    }

    // 2. Price the bill.
    const rawLines: RawLine[] = resolved.map((r) => ({
      qty: r.qty,
      saleRate: r.batch.saleRate,
      gstRate: r.medicine.gstRate,
      discountPct: r.discountPct,
    }));
    const priced = priceBill(rawLines, body.billDiscountPct);

    // 3. Validate payments cover the total.
    const paymentsSum = body.payments.reduce((a, p) => a + p.amount, 0);
    if (Math.abs(paymentsSum - priced.grandTotal) > 0.5) {
      throw ApiError.badRequest(
        `Payments (${paymentsSum.toFixed(2)}) do not match the bill total (${priced.grandTotal.toFixed(2)})`
      );
    }

    // 4. Decrement stock atomically (guards against overselling).
    for (let i = 0; i < resolved.length; i++) {
      const r = resolved[i];
      const updated = await Batch.findOneAndUpdate(
        { _id: r.batch._id, qtyInStock: { $gte: r.qty } },
        { $inc: { qtyInStock: -r.qty } },
        { new: true, session: session ?? undefined }
      );
      if (!updated) {
        throw ApiError.conflict(`Stock changed for ${r.medicine.name}; please re-scan the item`);
      }
    }

    // 5. Build sale items (snapshot of price + batch + schedule).
    const invoiceNo = await nextInvoiceNumber(session);
    const items: ISaleItem[] = resolved.map((r, i) => {
      const p = priced.lines[i];
      return {
        medicineId: r.medicine._id,
        batchId: r.batch._id,
        name: r.medicine.name,
        batchNo: r.batch.batchNo,
        expiry: r.batch.expiry,
        hsnCode: r.medicine.hsnCode,
        schedule: r.medicine.schedule,
        qty: r.qty,
        mrp: r.batch.mrp,
        rate: p.rate,
        gstRate: p.gstRate,
        discountPct: p.discountPct,
        taxableValue: p.taxableValue,
        cgst: p.cgst,
        sgst: p.sgst,
        lineTotal: p.lineTotal,
      };
    });

    const payments: IPayment[] = body.payments.map((p) => ({
      mode: p.mode,
      amount: p.amount,
      reference: p.reference,
    }));
    const paidTotal = +(priced.grandTotal - creditAmount).toFixed(2);

    const [created] = await Sale.create(
      [
        {
          invoiceNo,
          customerId: body.customerId,
          customerName: body.customerName,
          doctorId: body.doctorId,
          items,
          payments,
          subTotal: priced.subTotal,
          gstTotal: priced.gstTotal,
          billDiscountPct: priced.billDiscountPct,
          billDiscountAmount: priced.billDiscountAmount,
          roundOff: priced.roundOff,
          grandTotal: priced.grandTotal,
          paidTotal,
          creditAmount,
          status: 'completed',
          createdBy: req.user!.sub,
        },
      ],
      { session: session ?? undefined }
    );

    // 6. Credit ledger update.
    if (creditAmount > 0 && body.customerId) {
      const customer = await Customer.findById(body.customerId).session(session ?? null);
      if (!customer) throw ApiError.notFound('Customer not found');
      customer.creditBalance = +(customer.creditBalance + creditAmount).toFixed(2);
      customer.creditLedger.push({
        type: 'credit',
        amount: creditAmount,
        ref: invoiceNo,
        date: new Date(),
      });
      await customer.save({ session: session ?? undefined });
    }

    // 7. Schedule H1 register entries for scheduled drugs.
    const h1Entries = resolved
      .filter((r) => SCHEDULED.has(r.medicine.schedule))
      .map((r) => ({
        date: new Date(),
        saleId: created._id,
        invoiceNo,
        medicineId: r.medicine._id,
        drugName: r.medicine.name,
        schedule: r.medicine.schedule,
        qty: r.qty,
        batchNo: r.batch.batchNo,
        patientName: body.patientName ?? body.customerName,
        patientPhone: body.patientPhone,
        doctorId: body.doctorId,
        doctorName,
        prescriptionId: body.prescriptionId,
        prescriptionRef: body.prescriptionId,
        createdBy: req.user!.sub,
      }));
    if (h1Entries.length) {
      await ScheduleH1Entry.create(h1Entries, { session: session ?? undefined });
    }

    // 8. Link the prescription image to this sale, if supplied.
    if (body.prescriptionId) {
      await Prescription.findByIdAndUpdate(
        body.prescriptionId,
        { saleId: created._id },
        { session: session ?? undefined }
      );
    }

    return created;
  });

  await recordAudit({
    user: req.user,
    action: 'sale.create',
    entity: 'Sale',
    entityId: String(sale._id),
    meta: { invoiceNo: sale.invoiceNo, grandTotal: sale.grandTotal, creditAmount },
  });
  res.status(201).json({ data: sale });
});

export const listSales = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (req.query.customerId) filter.customerId = req.query.customerId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) (filter.createdAt as Record<string, unknown>).$gte = dayjs(String(req.query.from)).startOf('day').toDate();
    if (req.query.to) (filter.createdAt as Record<string, unknown>).$lte = dayjs(String(req.query.to)).endOf('day').toDate();
  }
  if (p.search) filter.invoiceNo = { $regex: p.search, $options: 'i' };

  const [data, total] = await Promise.all([
    Sale.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit),
    Sale.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const getSale = asyncHandler(async (req: Request, res: Response) => {
  const sale = await Sale.findById(req.params.id)
    .populate('customerId', 'name phone address creditBalance')
    .populate('doctorId', 'name registrationNo');
  if (!sale) throw ApiError.notFound('Sale not found');
  res.json({ data: sale });
});

// Resolve the FEFO batch + live price for one medicine — used by the POS to
// show batch/expiry/rate the instant an item is added.
export const lookupForBilling = asyncHandler(async (req: Request, res: Response) => {
  const medicineId = String(req.query.medicineId ?? '');
  const qty = Math.max(1, parseInt(String(req.query.qty ?? '1'), 10) || 1);
  if (!Types.ObjectId.isValid(medicineId)) throw ApiError.badRequest('medicineId is required');
  const medicine = await Medicine.findById(medicineId);
  if (!medicine) throw ApiError.notFound('Medicine not found');
  const today = dayjs().startOf('day').toDate();
  const batch = await Batch.findOne({
    medicineId,
    qtyInStock: { $gte: qty },
    expiry: { $gte: today },
  }).sort({ expiry: 1 });
  res.json({
    data: {
      medicine,
      batch,
      available: batch?.qtyInStock ?? 0,
    },
  });
});
