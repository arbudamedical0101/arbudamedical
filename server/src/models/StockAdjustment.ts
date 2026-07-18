import mongoose, { Document, Schema, Types } from 'mongoose';

export type AdjustmentType = 'damage' | 'expiry' | 'correction';

export interface IStockAdjustment extends Document {
  _id: Types.ObjectId;
  batchId: Types.ObjectId;
  medicineId: Types.ObjectId;
  type: AdjustmentType;
  qtyChange: number; // negative for write-off, can be +/- for correction
  qtyBefore: number;
  qtyAfter: number;
  reason: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const stockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    type: { type: String, enum: ['damage', 'expiry', 'correction'], required: true },
    qtyChange: { type: Number, required: true },
    qtyBefore: { type: Number, required: true },
    qtyAfter: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

stockAdjustmentSchema.index({ createdAt: -1 });

export const StockAdjustment = mongoose.model<IStockAdjustment>(
  'StockAdjustment',
  stockAdjustmentSchema
);
