import { Request, Response } from 'express';
import dayjs from 'dayjs';
import { PipelineStage } from 'mongoose';
import { Batch } from '../models/Batch';
import { Medicine } from '../models/Medicine';
import { getSettings } from '../models/Settings';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';

// List batches (stock view) joined with medicine info.
export const listBatches = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const match: Record<string, unknown> = {};
  if (req.query.medicineId) match.medicineId = req.query.medicineId;
  if (req.query.inStock === 'true') match.qtyInStock = { $gt: 0 };

  const pipeline: PipelineStage[] = [{ $match: match }];
  pipeline.push({
    $lookup: { from: 'medicines', localField: 'medicineId', foreignField: '_id', as: 'medicine' },
  });
  pipeline.push({ $unwind: '$medicine' });
  if (p.search) {
    pipeline.push({
      $match: {
        $or: [
          { 'medicine.name': { $regex: p.search, $options: 'i' } },
          { batchNo: { $regex: p.search, $options: 'i' } },
        ],
      },
    });
  }
  const dataPipeline: PipelineStage[] = [
    ...pipeline,
    { $sort: { expiry: 1 } },
    { $skip: p.skip },
    { $limit: p.limit },
  ];
  const countPipeline: PipelineStage[] = [...pipeline, { $count: 'total' }];

  const [data, countRes] = await Promise.all([
    Batch.aggregate(dataPipeline),
    Batch.aggregate(countPipeline),
  ]);
  const total = countRes[0]?.total ?? 0;
  res.json(paginated(data, total, p));
});

// Low-stock, near-expiry and expired alerts.
export const getAlerts = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getSettings();
  const today = dayjs().startOf('day').toDate();
  const nearExpiryCutoff = dayjs().add(settings.nearExpiryDays, 'day').toDate();

  // Near-expiry (not yet expired) and expired batches with stock.
  const [nearExpiry, expired] = await Promise.all([
    Batch.aggregate([
      { $match: { qtyInStock: { $gt: 0 }, expiry: { $gte: today, $lte: nearExpiryCutoff } } },
      { $lookup: { from: 'medicines', localField: 'medicineId', foreignField: '_id', as: 'medicine' } },
      { $unwind: '$medicine' },
      { $sort: { expiry: 1 } },
    ]),
    Batch.aggregate([
      { $match: { qtyInStock: { $gt: 0 }, expiry: { $lt: today } } },
      { $lookup: { from: 'medicines', localField: 'medicineId', foreignField: '_id', as: 'medicine' } },
      { $unwind: '$medicine' },
      { $sort: { expiry: 1 } },
    ]),
  ]);

  // Low stock: total qty across batches < reorderLevel.
  const stockByMedicine = await Batch.aggregate([
    { $group: { _id: '$medicineId', totalQty: { $sum: '$qtyInStock' } } },
  ]);
  const qtyMap = new Map<string, number>(stockByMedicine.map((s) => [String(s._id), s.totalQty]));
  const medicines = await Medicine.find({ active: true });
  const lowStock = medicines
    .map((m) => ({
      medicine: m,
      totalQty: qtyMap.get(String(m._id)) ?? 0,
      reorderLevel: m.reorderLevel,
    }))
    .filter((x) => x.totalQty <= x.reorderLevel)
    .sort((a, b) => a.totalQty - b.totalQty);

  res.json({
    data: {
      nearExpiryDays: settings.nearExpiryDays,
      counts: { lowStock: lowStock.length, nearExpiry: nearExpiry.length, expired: expired.length },
      lowStock,
      nearExpiry,
      expired,
    },
  });
});

// Stock valuation at purchase rate and MRP.
export const getValuation = asyncHandler(async (_req: Request, res: Response) => {
  const [totals] = await Batch.aggregate([
    { $match: { qtyInStock: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        atPurchase: { $sum: { $multiply: ['$qtyInStock', '$purchaseRate'] } },
        atMrp: { $sum: { $multiply: ['$qtyInStock', '$mrp'] } },
        atSaleRate: { $sum: { $multiply: ['$qtyInStock', '$saleRate'] } },
        totalUnits: { $sum: '$qtyInStock' },
        batchCount: { $sum: 1 },
      },
    },
  ]);
  res.json({
    data: totals ?? { atPurchase: 0, atMrp: 0, atSaleRate: 0, totalUnits: 0, batchCount: 0 },
  });
});
