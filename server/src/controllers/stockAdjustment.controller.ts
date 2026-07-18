import { Request, Response } from 'express';
import { Batch } from '../models/Batch';
import { StockAdjustment } from '../models/StockAdjustment';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { withTransaction } from '../utils/withTransaction';
import { recordAudit } from '../utils/audit';

export const listAdjustments = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (req.query.batchId) filter.batchId = req.query.batchId;
  if (req.query.type) filter.type = req.query.type;
  const [data, total] = await Promise.all([
    StockAdjustment.find(filter)
      .populate('medicineId', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(p.skip)
      .limit(p.limit),
    StockAdjustment.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const createAdjustment = asyncHandler(async (req: Request, res: Response) => {
  const { batchId, type, qtyChange, reason } = req.body;

  const result = await withTransaction(async (session) => {
    const batch = await Batch.findById(batchId).session(session ?? null);
    if (!batch) throw ApiError.notFound('Batch not found');

    const qtyBefore = batch.qtyInStock;
    const qtyAfter = qtyBefore + qtyChange;
    if (qtyAfter < 0) {
      throw ApiError.badRequest(`Adjustment would make stock negative (have ${qtyBefore}, change ${qtyChange})`);
    }
    batch.qtyInStock = qtyAfter;
    await batch.save({ session: session ?? undefined });

    const [adjustment] = await StockAdjustment.create(
      [
        {
          batchId: batch._id,
          medicineId: batch.medicineId,
          type,
          qtyChange,
          qtyBefore,
          qtyAfter,
          reason,
          createdBy: req.user!.sub,
        },
      ],
      { session: session ?? undefined }
    );
    return adjustment;
  });

  await recordAudit({
    user: req.user,
    action: 'stock.adjust',
    entity: 'Batch',
    entityId: batchId,
    meta: { type, qtyChange, reason },
  });
  res.status(201).json({ data: result });
});
