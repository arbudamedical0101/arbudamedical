import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPurchaseItem {
  medicineId: Types.ObjectId;
  batchNo: string;
  expiry: Date;
  qty: number;
  purchaseRate: number;
  mrp: number;
  saleRate: number;
  gstRate: number;
  batchId?: Types.ObjectId; // batch created/updated by this line
}

export interface IPurchase extends Document {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  invoiceNo: string;
  invoiceDate: Date;
  items: IPurchaseItem[];
  subTotal: number; // sum of qty*purchaseRate
  gstTotal: number;
  grandTotal: number;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseItemSchema = new Schema<IPurchaseItem>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    batchNo: { type: String, required: true, trim: true },
    expiry: { type: Date, required: true },
    qty: { type: Number, required: true, min: 1 },
    purchaseRate: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    saleRate: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, min: 0, max: 100 },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
  },
  { _id: false }
);

const purchaseSchema = new Schema<IPurchase>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    invoiceNo: { type: String, required: true, trim: true },
    invoiceDate: { type: Date, required: true },
    items: { type: [purchaseItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    subTotal: { type: Number, required: true, default: 0 },
    gstTotal: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

purchaseSchema.index({ invoiceDate: -1 });
purchaseSchema.index({ supplierId: 1, invoiceNo: 1 });

export const Purchase = mongoose.model<IPurchase>('Purchase', purchaseSchema);
