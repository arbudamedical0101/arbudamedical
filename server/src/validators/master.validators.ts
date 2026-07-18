import { z } from 'zod';

export const medicineSchema = z.object({
  name: z.string().min(1),
  composition: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  schedule: z.enum(['OTC', 'H', 'H1', 'X']).default('OTC'),
  hsnCode: z.string().optional(),
  gstRate: z.number().min(0).max(100),
  packSize: z.string().optional(),
  unit: z.string().default('strip'),
  barcode: z.string().optional(),
  reorderLevel: z.number().min(0).default(10),
  rackLocation: z.string().optional(),
  active: z.boolean().optional(),
});
export const medicineUpdateSchema = medicineSchema.partial();

export const supplierSchema = z.object({
  name: z.string().min(1),
  gstin: z.string().optional(),
  contact: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  active: z.boolean().optional(),
});
export const supplierUpdateSchema = supplierSchema.partial();

export const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  active: z.boolean().optional(),
});
export const customerUpdateSchema = customerSchema.partial();

export const doctorSchema = z.object({
  name: z.string().min(1),
  registrationNo: z.string().optional(),
  contact: z.string().optional(),
  qualification: z.string().optional(),
  active: z.boolean().optional(),
});
export const doctorUpdateSchema = doctorSchema.partial();

export const settingsSchema = z.object({
  storeName: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  mapEmbedUrl: z.string().optional(),
  drugLicenseNo: z.string().optional(),
  gstin: z.string().optional(),
  invoicePrefix: z.string().optional(),
  nextInvoiceNumber: z.number().int().min(1).optional(),
  purchasePrefix: z.string().optional(),
  returnPrefix: z.string().optional(),
  nearExpiryDays: z.number().int().min(1).max(365).optional(),
  defaultGstRate: z.number().min(0).max(100).optional(),
  footerNote: z.string().optional(),
});

export const customerPaymentSchema = z.object({
  amount: z.number().positive(),
  mode: z.enum(['cash', 'card', 'upi']).default('cash'),
  ref: z.string().optional(),
  note: z.string().optional(),
});
