import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  gstin?: string;
  contact?: string;
  email?: string;
  address?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    gstin: { type: String, trim: true, uppercase: true },
    contact: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

supplierSchema.index({ name: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
