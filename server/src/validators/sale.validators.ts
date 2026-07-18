import { z } from 'zod';

const saleItemSchema = z.object({
  medicineId: z.string().min(1),
  batchId: z.string().min(1).optional(), // if omitted, FEFO selects the batch
  qty: z.number().int().positive(),
  discountPct: z.number().min(0).max(100).default(0),
});

const paymentSchema = z.object({
  mode: z.enum(['cash', 'card', 'upi', 'credit']),
  amount: z.number().min(0),
  reference: z.string().optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  doctorId: z.string().optional(),
  prescriptionId: z.string().optional(),
  patientName: z.string().optional(),
  patientPhone: z.string().optional(),
  billDiscountPct: z.number().min(0).max(100).default(0),
  items: z.array(saleItemSchema).min(1, 'Add at least one item'),
  payments: z.array(paymentSchema).min(1, 'At least one payment is required'),
  allowExpired: z.boolean().optional(),
});

export const heldBillSchema = z.object({
  label: z.string().optional(),
  payload: z.any(),
});
