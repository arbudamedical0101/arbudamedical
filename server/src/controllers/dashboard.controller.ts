import { Request, Response } from 'express';
import dayjs from 'dayjs';
import { Sale } from '../models/Sale';
import { Batch } from '../models/Batch';
import { Medicine } from '../models/Medicine';
import { Customer } from '../models/Customer';
import { getSettings } from '../models/Settings';
import { asyncHandler } from '../utils/asyncHandler';

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getSettings();
  const todayStart = dayjs().startOf('day').toDate();
  const todayEnd = dayjs().endOf('day').toDate();
  const nearExpiryCutoff = dayjs().add(settings.nearExpiryDays, 'day').toDate();

  const [todayAgg, paymentSplit, expiringSoon, expired, creditAgg, recentSales, stockByMedicine] =
    await Promise.all([
      Sale.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $unwind: '$payments' },
        { $group: { _id: '$payments.mode', total: { $sum: '$payments.amount' } } },
      ]),
      Batch.countDocuments({ qtyInStock: { $gt: 0 }, expiry: { $gte: todayStart, $lte: nearExpiryCutoff } }),
      Batch.countDocuments({ qtyInStock: { $gt: 0 }, expiry: { $lt: todayStart } }),
      Customer.aggregate([{ $group: { _id: null, total: { $sum: '$creditBalance' } } }]),
      Sale.find().sort({ createdAt: -1 }).limit(8).select('invoiceNo grandTotal customerName createdAt'),
      Batch.aggregate([{ $group: { _id: '$medicineId', totalQty: { $sum: '$qtyInStock' } } }]),
    ]);

  // Low-stock count (total qty <= reorder level).
  const qtyMap = new Map<string, number>(stockByMedicine.map((s) => [String(s._id), s.totalQty]));
  const medicines = await Medicine.find({ active: true }).select('reorderLevel');
  const lowStockCount = medicines.filter(
    (m) => (qtyMap.get(String(m._id)) ?? 0) <= m.reorderLevel
  ).length;

  const payments = { cash: 0, card: 0, upi: 0, credit: 0 } as Record<string, number>;
  paymentSplit.forEach((p) => {
    payments[p._id] = +p.total.toFixed(2);
  });

  res.json({
    data: {
      todaySales: +(todayAgg[0]?.total ?? 0).toFixed(2),
      todayBillCount: todayAgg[0]?.count ?? 0,
      paymentSplit: payments,
      lowStockCount,
      expiringSoonCount: expiringSoon,
      expiredCount: expired,
      outstandingCredit: +(creditAgg[0]?.total ?? 0).toFixed(2),
      nearExpiryDays: settings.nearExpiryDays,
      recentSales,
    },
  });
});
