import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Schedule H1 register — legally mandatory record of every H1 (and H/X) drug
 * dispensed. Auto-created at billing time for qualifying line items.
 */
export interface IScheduleH1Entry extends Document {
  _id: Types.ObjectId;
  date: Date;
  saleId: Types.ObjectId;
  invoiceNo: string;
  medicineId: Types.ObjectId;
  drugName: string;
  schedule: string;
  qty: number;
  batchNo: string;
  patientName?: string;
  patientPhone?: string;
  doctorId?: Types.ObjectId;
  doctorName?: string;
  prescriptionId?: Types.ObjectId;
  prescriptionRef?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleH1Schema = new Schema<IScheduleH1Entry>(
  {
    date: { type: Date, required: true, index: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
    invoiceNo: { type: String, required: true },
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine', required: true },
    drugName: { type: String, required: true },
    schedule: { type: String, required: true },
    qty: { type: Number, required: true },
    batchNo: { type: String, required: true },
    patientName: { type: String, trim: true },
    patientPhone: { type: String, trim: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    doctorName: { type: String, trim: true },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    prescriptionRef: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const ScheduleH1Entry = mongoose.model<IScheduleH1Entry>(
  'ScheduleH1Entry',
  scheduleH1Schema
);
