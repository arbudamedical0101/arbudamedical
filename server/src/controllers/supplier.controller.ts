import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { recordAudit } from '../utils/audit';

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (p.search) filter.name = { $regex: p.search, $options: 'i' };
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const [data, total] = await Promise.all([
    Supplier.find(filter).sort({ name: 1 }).skip(p.skip).limit(p.limit),
    Supplier.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  res.json({ data: supplier });
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await Supplier.create(req.body);
  await recordAudit({ user: req.user, action: 'supplier.create', entity: 'Supplier', entityId: String(supplier._id) });
  res.status(201).json({ data: supplier });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!supplier) throw ApiError.notFound('Supplier not found');
  res.json({ data: supplier });
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) throw ApiError.notFound('Supplier not found');
  await recordAudit({ user: req.user, action: 'supplier.delete', entity: 'Supplier', entityId: String(req.params.id) });
  res.json({ data: { id: req.params.id } });
});
