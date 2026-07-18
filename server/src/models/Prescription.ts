import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPrescription extends Document {
  _id: Types.ObjectId;
  saleId?: Types.ObjectId;
  patientName: string;
  patientPhone?: string;
  doctorId?: Types.ObjectId;
  doctorName?: string;
  imagePath: string; // relative path under /uploads
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const prescriptionSchema = new Schema<IPrescription>(
  {
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale', index: true },
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, trim: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    doctorName: { type: String, trim: true },
    imagePath: { type: String, required: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

prescriptionSchema.index({ createdAt: -1 });

export const Prescription = mongoose.model<IPrescription>('Prescription', prescriptionSchema);
