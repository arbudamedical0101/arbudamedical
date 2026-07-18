import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Purchase, IPurchaseItem } from '../models/Purchase';
import { Batch } from '../models/Batch';
import { Medicine } from '../models/Medicine';
import { Supplier } from '../models/Supplier';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { withTransaction } from '../utils/withTransaction';
import { recordAudit } from '../utils/audit';

export const listPurchases = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (req.query.supplierId) filter.supplierId = req.query.supplierId;
  if (req.query.from || req.query.to) {
    filter.invoiceDate = {};
    if (req.query.from) (filter.invoiceDate as Record<string, unknown>).$gte = new Date(String(req.query.from));
    if (req.query.to) (filter.invoiceDate as Record<string, unknown>).$lte = new Date(String(req.query.to));
  }
  const [data, total] = await Promise.all([
    Purchase.find(filter).populate('supplierId', 'name gstin').sort({ invoiceDate: -1 }).skip(p.skip).limit(p.limit),
    Purchase.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const getPurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await Purchase.findById(req.params.id)
    .populate('supplierId', 'name gstin address contact')
    .populate('items.medicineId', 'name unit');
  if (!purchase) throw ApiError.notFound('Purchase not found');
  res.json({ data: purchase });
});

export const createPurchase = asyncHandler(async (req: Request, res: Response) => {
  const { supplierId, invoiceNo, invoiceDate, notes, items } = req.body;

  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw ApiError.notFound('Supplier not found');

  // Validate all medicines up front (clearer error than failing mid-transaction).
  const medicineIds = [...new Set(items.map((i: IPurchaseItem) => String(i.medicineId)))];
  const medicineCount = await Medicine.countDocuments({ _id: { $in: medicineIds } });
  if (medicineCount !== medicineIds.length) throw ApiError.badRequest('One or more medicines do not exist');

  const purchase = await withTransaction(async (session) => {
    let subTotal = 0;
    let gstTotal = 0;
    const processedItems: IPurchaseItem[] = [];

    for (const item of items as IPurchaseItem[]) {
      const lineBase = item.qty * item.purchaseRate;
      const lineGst = +(lineBase * (item.gstRate / 100)).toFixed(2);
      subTotal += lineBase;
      gstTotal += lineGst;

      // Upsert the batch (medicine + batchNo + expiry is the natural key).
      const batch = await Batch.findOneAndUpdate(
        { medicineId: item.medicineId, batchNo: item.batchNo, expiry: new Date(item.expiry) },
        {
          $inc: { qtyInStock: item.qty },
          $set: { mrp: item.mrp, purchaseRate: item.purchaseRate, saleRate: item.saleRate },
        },
        { new: true, upsert: true, session: session ?? undefined, setDefaultsOnInsert: true }
      );

      processedItems.push({ ...item, batchId: batch._id as Types.ObjectId });
    }

    const [created] = await Purchase.create(
      [
        {
          supplierId,
          invoiceNo,
          invoiceDate,
          notes,
          items: processedItems,
          subTotal: +subTotal.toFixed(2),
          gstTotal: +gstTotal.toFixed(2),
          grandTotal: +(subTotal + gstTotal).toFixed(2),
          createdBy: req.user!.sub,
        },
      ],
      { session: session ?? undefined }
    );
    return created;
  });

  await recordAudit({
    user: req.user,
    action: 'purchase.create',
    entity: 'Purchase',
    entityId: String(purchase._id),
    meta: { invoiceNo, items: items.length, grandTotal: purchase.grandTotal },
  });
  res.status(201).json({ data: purchase });
});
