import { Request, Response } from 'express';
import { Prescription } from '../models/Prescription';
import { Doctor } from '../models/Doctor';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';

export const listPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (req.query.saleId) filter.saleId = req.query.saleId;
  if (p.search) filter.patientName = { $regex: p.search, $options: 'i' };
  const [data, total] = await Promise.all([
    Prescription.find(filter).populate('doctorId', 'name').sort({ createdAt: -1 }).skip(p.skip).limit(p.limit),
    Prescription.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const getPrescription = asyncHandler(async (req: Request, res: Response) => {
  const rx = await Prescription.findById(req.params.id).populate('doctorId', 'name registrationNo');
  if (!rx) throw ApiError.notFound('Prescription not found');
  res.json({ data: rx });
});

// Multipart: field "image" (handled by multer) + patient/doctor fields in body.
export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest('A prescription image (field "image") is required');
  const { patientName, patientPhone, doctorId, saleId, notes } = req.body;
  if (!patientName) throw ApiError.badRequest('patientName is required');

  let doctorName: string | undefined;
  if (doctorId) {
    const doc = await Doctor.findById(doctorId);
    doctorName = doc?.name;
  }

  const rx = await Prescription.create({
    patientName,
    patientPhone,
    doctorId: doctorId || undefined,
    doctorName,
    saleId: saleId || undefined,
    notes,
    imagePath: `/uploads/${req.file.filename}`,
    createdBy: req.user!.sub,
  });
  res.status(201).json({ data: rx });
});
