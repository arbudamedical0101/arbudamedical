import { Request, Response } from 'express';
import { HeldBill } from '../models/HeldBill';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export const listHeldBills = asyncHandler(async (_req: Request, res: Response) => {
  const data = await HeldBill.find().sort({ createdAt: -1 }).limit(50);
  res.json({ data });
});

export const holdBill = asyncHandler(async (req: Request, res: Response) => {
  const { label, payload } = req.body;
  const held = await HeldBill.create({
    label: label || `Held ${new Date().toLocaleTimeString()}`,
    payload,
    createdBy: req.user!.sub,
    createdByName: req.user!.name,
  });
  res.status(201).json({ data: held });
});

export const recallHeldBill = asyncHandler(async (req: Request, res: Response) => {
  const held = await HeldBill.findById(req.params.id);
  if (!held) throw ApiError.notFound('Held bill not found');
  res.json({ data: held });
});

export const deleteHeldBill = asyncHandler(async (req: Request, res: Response) => {
  const held = await HeldBill.findByIdAndDelete(req.params.id);
  if (!held) throw ApiError.notFound('Held bill not found');
  res.json({ data: { id: req.params.id } });
});
