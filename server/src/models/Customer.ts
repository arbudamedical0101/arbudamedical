import mongoose, { Document, Schema, Types } from 'mongoose';

export type LedgerType = 'credit' | 'payment' | 'return' | 'adjustment';

export interface ICreditLedgerEntry {
  _id?: Types.ObjectId;
  type: LedgerType; // credit = customer owes more; payment/return = customer owes less
  amount: number; // positive number; sign applied by type
  ref?: string; // invoice no / receipt no
  note?: string;
  date: Date;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditBalance: number; // current outstanding khata balance
  creditLedger: ICreditLedgerEntry[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ledgerSchema = new Schema<ICreditLedgerEntry>(
  {
    type: { type: String, enum: ['credit', 'payment', 'return', 'adjustment'], required: true },
    amount: { type: Number, required: true, min: 0 },
    ref: { type: String, trim: true },
    note: { type: String, trim: true },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    creditBalance: { type: Number, default: 0 },
    creditLedger: { type: [ledgerSchema], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ name: 1 });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
