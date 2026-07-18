import { Request, Response } from 'express';
import { SalesReturn, ISalesReturnItem } from '../models/SalesReturn';
import { Sale } from '../models/Sale';
import { Batch } from '../models/Batch';
import { Customer } from '../models/Customer';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { withTransaction } from '../utils/withTransaction';
import { recordAudit } from '../utils/audit';
import { nextSequence } from '../utils/sequence';
import { getSettings } from '../models/Settings';

export const listReturns = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (req.query.saleId) filter.saleId = req.query.saleId;
  const [data, total] = await Promise.all([
    SalesReturn.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit),
    SalesReturn.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const getReturn = asyncHandler(async (req: Request, res: Response) => {
  const ret = await SalesReturn.findById(req.params.id);
  if (!ret) throw ApiError.notFound('Return not found');
  res.json({ data: ret });
});

export const createReturn = asyncHandler(async (req: Request, res: Response) => {
  const { saleId, items, refundMode, reason } = req.body as {
    saleId: string;
    items: { medicineId: string; batchId: string; qty: number }[];
    refundMode: 'cash' | 'card' | 'upi' | 'credit-adjustment';
    reason?: string;
  };

  const result = await withTransaction(async (session) => {
    const sale = await Sale.findById(saleId).session(session ?? null);
    if (!sale) throw ApiError.notFound('Sale not found');

    // How much of each line has already been returned?
    const priorReturns = await SalesReturn.find({ saleId }).session(session ?? null);
    const returnedQty = new Map<string, number>();
    for (const r of priorReturns) {
      for (const it of r.items) {
        const key = `${it.medicineId}-${it.batchId}`;
        returnedQty.set(key, (returnedQty.get(key) ?? 0) + it.qty);
      }
    }

    const settings = await getSettings();
    const returnItems: ISalesReturnItem[] = [];
    let refundTotal = 0;

    for (const reqItem of items) {
      const key = `${reqItem.medicineId}-${reqItem.batchId}`;
      const saleLine = sale.items.find(
        (l) => String(l.medicineId) === reqItem.medicineId && String(l.batchId) === reqItem.batchId
      );
      if (!saleLine) throw ApiError.badRequest('Item not found on the original invoice');

      const alreadyReturned = returnedQty.get(key) ?? 0;
      const returnable = saleLine.qty - alreadyReturned;
      if (reqItem.qty > returnable) {
        throw ApiError.badRequest(
          `Cannot return ${reqItem.qty} of ${saleLine.name}; only ${returnable} remaining`
        );
      }

      // Refund proportional to what was actually charged for the line.
      const perUnit = saleLine.lineTotal / saleLine.qty;
      const refundAmount = +(perUnit * reqItem.qty).toFixed(2);
      refundTotal += refundAmount;

      // Restore batch stock.
      await Batch.findByIdAndUpdate(
        reqItem.batchId,
        { $inc: { qtyInStock: reqItem.qty } },
        { session: session ?? undefined }
      );

      returnItems.push({
        medicineId: saleLine.medicineId,
        batchId: saleLine.batchId,
        name: saleLine.name,
        batchNo: saleLine.batchNo,
        qty: reqItem.qty,
        rate: saleLine.rate,
        gstRate: saleLine.gstRate,
        refundAmount,
      });
    }
    refundTotal = +refundTotal.toFixed(2);

    const returnNo = await nextSequence('salesReturn', settings.returnPrefix, session);
    const [created] = await SalesReturn.create(
      [
        {
          returnNo,
          saleId: sale._id,
          saleInvoiceNo: sale.invoiceNo,
          customerId: sale.customerId,
          items: returnItems,
          refundTotal,
          refundMode,
          reason,
          createdBy: req.user!.sub,
        },
      ],
      { session: session ?? undefined }
    );

    // Update sale status (fully vs partially returned).
    const totalReturnedUnits =
      [...returnedQty.values()].reduce((a, b) => a + b, 0) +
      returnItems.reduce((a, b) => a + b.qty, 0);
    const totalSoldUnits = sale.items.reduce((a, b) => a + b.qty, 0);
    sale.status = totalReturnedUnits >= totalSoldUnits ? 'returned' : 'partially-returned';
    await sale.save({ session: session ?? undefined });

    // If refunding against khata, reduce the customer's outstanding balance.
    if (refundMode === 'credit-adjustment' && sale.customerId) {
      const customer = await Customer.findById(sale.customerId).session(session ?? null);
      if (customer) {
        customer.creditBalance = +Math.max(0, customer.creditBalance - refundTotal).toFixed(2);
        customer.creditLedger.push({
          type: 'return',
          amount: refundTotal,
          ref: returnNo,
          note: `Return against ${sale.invoiceNo}`,
          date: new Date(),
        });
        await customer.save({ session: session ?? undefined });
      }
    }

    return created;
  });

  await recordAudit({
    user: req.user,
    action: 'sale.return',
    entity: 'SalesReturn',
    entityId: String(result._id),
    meta: { saleId, refundTotal: result.refundTotal, refundMode },
  });
  res.status(201).json({ data: result });
});
