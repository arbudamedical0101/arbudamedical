import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  batchId: z.string().min(1),
  type: z.enum(['damage', 'expiry', 'correction']),
  qtyChange: z.number().refine((v) => v !== 0, 'qtyChange cannot be zero'),
  reason: z.string().min(2),
});
