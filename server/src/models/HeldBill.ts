import mongoose, { Document, Schema, Types } from 'mongoose';

// A parked/held cart that can be recalled at the counter.
export interface IHeldBill extends Document {
  _id: Types.ObjectId;
  label: string;
  payload: unknown; // the in-progress cart (items, customer, discounts)
  createdBy: Types.ObjectId;
  createdByName?: string;
  createdAt: Date;
}

const heldBillSchema = new Schema<IHeldBill>(
  {
    label: { type: String, default: 'Held bill' },
    payload: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const HeldBill = mongoose.model<IHeldBill>('HeldBill', heldBillSchema);
