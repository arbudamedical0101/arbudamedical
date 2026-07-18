import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBatch extends Document {
  _id: Types.ObjectId;
  medicineId: Types.ObjectId;
  batchNo: string;
  expiry: Date;
  mrp: number;
  purchaseRate: number;
  saleRate: number;
  qtyInStock: number;
  createdAt: Date;
  updatedAt: Date;
}

const batchSchema = new Schema<IBatch>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true, index: true },
    batchNo: { type: String, required: true, trim: true },
    expiry: { type: Date, required: true, index: true },
    mrp: { type: Number, required: true, min: 0 },
    purchaseRate: { type: Number, required: true, min: 0 },
    saleRate: { type: Number, required: true, min: 0 },
    qtyInStock: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

// One logical batch per medicine + batchNo + expiry; purchases top up the same batch.
batchSchema.index({ medicineId: 1, batchNo: 1, expiry: 1 }, { unique: true });

export const Batch = mongoose.model<IBatch>('Batch', batchSchema);
