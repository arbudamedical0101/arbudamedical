import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISalesReturnItem {
  medicineId: Types.ObjectId;
  batchId: Types.ObjectId;
  name: string;
  batchNo: string;
  qty: number;
  rate: number;
  gstRate: number;
  refundAmount: number;
}

export interface ISalesReturn extends Document {
  _id: Types.ObjectId;
  returnNo: string;
  saleId: Types.ObjectId;
  saleInvoiceNo: string;
  customerId?: Types.ObjectId;
  items: ISalesReturnItem[];
  refundTotal: number;
  refundMode: 'cash' | 'card' | 'upi' | 'credit-adjustment';
  reason?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const returnItemSchema = new Schema<ISalesReturnItem>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    name: { type: String, required: true },
    batchNo: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0 },
    refundAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const salesReturnSchema = new Schema<ISalesReturn>(
  {
    returnNo: { type: String, required: true, unique: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
    saleInvoiceNo: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    items: { type: [returnItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    refundTotal: { type: Number, required: true, min: 0 },
    refundMode: {
      type: String,
      enum: ['cash', 'card', 'upi', 'credit-adjustment'],
      default: 'cash',
    },
    reason: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

salesReturnSchema.index({ createdAt: -1 });

export const SalesReturn = mongoose.model<ISalesReturn>('SalesReturn', salesReturnSchema);
