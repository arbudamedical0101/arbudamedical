import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentMode = 'cash' | 'card' | 'upi' | 'credit';

export interface ISaleItem {
  medicineId: Types.ObjectId;
  batchId: Types.ObjectId;
  name: string; // snapshot of medicine name at sale time
  batchNo: string;
  expiry: Date;
  hsnCode?: string;
  schedule: string;
  qty: number;
  mrp: number;
  rate: number; // sale rate (GST-inclusive)
  gstRate: number;
  discountPct: number; // line-level discount %
  taxableValue: number; // after discount, GST-exclusive
  cgst: number;
  sgst: number;
  lineTotal: number; // taxable + gst (what customer pays for the line)
}

export interface IPayment {
  mode: PaymentMode;
  amount: number;
  reference?: string;
}

export interface ISale extends Document {
  _id: Types.ObjectId;
  invoiceNo: string;
  customerId?: Types.ObjectId;
  customerName?: string;
  doctorId?: Types.ObjectId;
  items: ISaleItem[];
  payments: IPayment[];
  subTotal: number; // sum of taxable values
  gstTotal: number;
  billDiscountPct: number;
  billDiscountAmount: number;
  roundOff: number;
  grandTotal: number;
  paidTotal: number;
  creditAmount: number; // amount put on khata
  status: 'completed' | 'returned' | 'partially-returned';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    name: { type: String, required: true },
    batchNo: { type: String, required: true },
    expiry: { type: Date, required: true },
    hsnCode: { type: String },
    schedule: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    mrp: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0 },
    discountPct: { type: Number, default: 0, min: 0, max: 100 },
    taxableValue: { type: Number, required: true },
    cgst: { type: Number, required: true },
    sgst: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const paymentSchema = new Schema<IPayment>(
  {
    mode: { type: String, enum: ['cash', 'card', 'upi', 'credit'], required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true },
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    invoiceNo: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, trim: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    items: { type: [saleItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    payments: { type: [paymentSchema], default: [] },
    subTotal: { type: Number, required: true },
    gstTotal: { type: Number, required: true },
    billDiscountPct: { type: Number, default: 0 },
    billDiscountAmount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidTotal: { type: Number, default: 0 },
    creditAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['completed', 'returned', 'partially-returned'],
      default: 'completed',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customerId: 1 });

export const Sale = mongoose.model<ISale>('Sale', saleSchema);
