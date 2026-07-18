import { Request, Response } from 'express';
import { Doctor } from '../models/Doctor';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { recordAudit } from '../utils/audit';

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (p.search) filter.name = { $regex: p.search, $options: 'i' };
  if (req.query.active !== undefined) filter.active = req.query.active === 'true';
  const [data, total] = await Promise.all([
    Doctor.find(filter).sort({ name: 1 }).skip(p.skip).limit(p.limit),
    Doctor.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  res.json({ data: doctor });
});

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await Doctor.create(req.body);
  await recordAudit({ user: req.user, action: 'doctor.create', entity: 'Doctor', entityId: String(doctor._id) });
  res.status(201).json({ data: doctor });
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!doctor) throw ApiError.notFound('Doctor not found');
  res.json({ data: doctor });
});

export const deleteDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  await recordAudit({ user: req.user, action: 'doctor.delete', entity: 'Doctor', entityId: String(req.params.id) });
  res.json({ data: { id: req.params.id } });
});
