import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.action) filter.action = req.query.action;
  if (p.search) filter.action = { $regex: p.search, $options: 'i' };
  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});
