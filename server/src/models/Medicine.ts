import mongoose, { Document, Schema, Types } from 'mongoose';

export type DrugSchedule = 'OTC' | 'H' | 'H1' | 'X';

export interface IMedicine extends Document {
  _id: Types.ObjectId;
  name: string;
  composition?: string;
  manufacturer?: string;
  category?: string;
  schedule: DrugSchedule;
  hsnCode?: string;
  gstRate: number; // percent, e.g. 12
  packSize?: string; // e.g. "10 tablets"
  unit: string; // e.g. "strip", "bottle", "tablet"
  barcode?: string;
  reorderLevel: number;
  rackLocation?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const medicineSchema = new Schema<IMedicine>(
  {
    name: { type: String, required: true, trim: true },
    composition: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    category: { type: String, trim: true },
    schedule: { type: String, enum: ['OTC', 'H', 'H1', 'X'], default: 'OTC', required: true },
    hsnCode: { type: String, trim: true },
    gstRate: { type: Number, required: true, min: 0, max: 100, default: 12 },
    packSize: { type: String, trim: true },
    unit: { type: String, trim: true, default: 'strip' },
    barcode: { type: String, trim: true },
    reorderLevel: { type: Number, default: 10, min: 0 },
    rackLocation: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

medicineSchema.index({ name: 'text', composition: 'text', manufacturer: 'text' });
medicineSchema.index({ name: 1 });
medicineSchema.index({ barcode: 1 }, { sparse: true });

export const Medicine = mongoose.model<IMedicine>('Medicine', medicineSchema);
