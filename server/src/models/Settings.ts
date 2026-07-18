import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  key: string; // always "default" — single settings document
  storeName: string;
  address: string;
  phone?: string;
  email?: string;
  mapEmbedUrl?: string; // Google Maps embed src URL for the storefront map
  drugLicenseNo: string;
  gstin: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  purchasePrefix: string;
  returnPrefix: string;
  nearExpiryDays: number; // default 90
  defaultGstRate: number;
  footerNote?: string;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: 'default', unique: true },
    storeName: { type: String, default: 'My Pharmacy' },
    address: { type: String, default: '' },
    phone: { type: String },
    email: { type: String },
    mapEmbedUrl: { type: String, default: '' },
    drugLicenseNo: { type: String, default: '' },
    gstin: { type: String, default: '' },
    invoicePrefix: { type: String, default: 'INV' },
    nextInvoiceNumber: { type: Number, default: 1 },
    purchasePrefix: { type: String, default: 'PUR' },
    returnPrefix: { type: String, default: 'RET' },
    nearExpiryDays: { type: Number, default: 90 },
    defaultGstRate: { type: Number, default: 12 },
    footerNote: { type: String, default: 'Get well soon!' },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export async function getSettings(): Promise<ISettings> {
  let s = await Settings.findOne({ key: 'default' });
  if (!s) {
    s = await Settings.create({ key: 'default' });
  }
  return s;
}
