import { z } from 'zod';

const purchaseItemSchema = z.object({
  medicineId: z.string().min(1),
  batchNo: z.string().min(1),
  expiry: z.coerce.date(),
  qty: z.number().int().positive(),
  purchaseRate: z.number().min(0),
  mrp: z.number().min(0),
  saleRate: z.number().min(0),
  gstRate: z.number().min(0).max(100),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  invoiceNo: z.string().min(1),
  invoiceDate: z.coerce.date(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one line item is required'),
});
