import { Request, Response } from 'express';
import { getSettings, Settings } from '../models/Settings';
import { asyncHandler } from '../utils/asyncHandler';
import { recordAudit } from '../utils/audit';

export const getStoreSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getSettings();
  res.json({ data: settings });
});

// Public: only the safe fields the storefront landing page needs (no auth).
// Deliberately omits drug licence, GSTIN, invoice sequences, etc.
export const getPublicStoreInfo = asyncHandler(async (_req: Request, res: Response) => {
  const s = await getSettings();
  res.json({
    data: {
      storeName: s.storeName,
      address: s.address,
      phone: s.phone ?? '',
      email: s.email ?? '',
      mapEmbedUrl: s.mapEmbedUrl ?? '',
    },
  });
});

export const updateStoreSettings = asyncHandler(async (req: Request, res: Response) => {
  await getSettings(); // ensure the singleton exists
  const settings = await Settings.findOneAndUpdate({ key: 'default' }, req.body, {
    new: true,
    runValidators: true,
  });
  await recordAudit({ user: req.user, action: 'settings.update', entity: 'Settings', meta: req.body });
  res.json({ data: settings });
});
