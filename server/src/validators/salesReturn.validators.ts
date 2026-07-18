import { z } from 'zod';

const returnItemSchema = z.object({
  medicineId: z.string().min(1),
  batchId: z.string().min(1),
  qty: z.number().int().positive(),
});

export const createReturnSchema = z.object({
  saleId: z.string().min(1),
  items: z.array(returnItemSchema).min(1, 'Select at least one item to return'),
  refundMode: z.enum(['cash', 'card', 'upi', 'credit-adjustment']).default('cash'),
  reason: z.string().optional(),
});
