import { Request, Response } from 'express';
import { Medicine } from '../models/Medicine';
import { Batch } from '../models/Batch';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { recordAudit } from '../utils/audit';

export const listMedicines = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  if (req.query.schedule) filter.schedule = req.query.schedule;
  if (p.search) {
    filter.$or = [
      { name: { $regex: p.search, $options: 'i' } },
      { composition: { $regex: p.search, $options: 'i' } },
      { barcode: p.search },
    ];
  }
  const [data, total] = await Promise.all([
    Medicine.find(filter).sort({ name: 1 }).skip(p.skip).limit(p.limit),
    Medicine.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const getMedicine = asyncHandler(async (req: Request, res: Response) => {
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) throw ApiError.notFound('Medicine not found');
  const batches = await Batch.find({ medicineId: medicine._id }).sort({ expiry: 1 });
  res.json({ data: { medicine, batches } });
});

export const createMedicine = asyncHandler(async (req: Request, res: Response) => {
  const medicine = await Medicine.create(req.body);
  await recordAudit({ user: req.user, action: 'medicine.create', entity: 'Medicine', entityId: String(medicine._id) });
  res.status(201).json({ data: medicine });
});

export const updateMedicine = asyncHandler(async (req: Request, res: Response) => {
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!medicine) throw ApiError.notFound('Medicine not found');
  await recordAudit({ user: req.user, action: 'medicine.update', entity: 'Medicine', entityId: String(medicine._id), meta: req.body });
  res.json({ data: medicine });
});

export const deleteMedicine = asyncHandler(async (req: Request, res: Response) => {
  const inStock = await Batch.exists({ medicineId: req.params.id, qtyInStock: { $gt: 0 } });
  if (inStock) throw ApiError.conflict('Cannot delete a medicine that still has stock. Deactivate it instead.');
  const medicine = await Medicine.findByIdAndDelete(req.params.id);
  if (!medicine) throw ApiError.notFound('Medicine not found');
  await recordAudit({ user: req.user, action: 'medicine.delete', entity: 'Medicine', entityId: String(req.params.id) });
  res.json({ data: { id: req.params.id } });
});
