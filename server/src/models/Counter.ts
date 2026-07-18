import mongoose, { Schema } from 'mongoose';

export interface ICounter {
  _id: string; // counter name, e.g. "salesReturn"
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);
