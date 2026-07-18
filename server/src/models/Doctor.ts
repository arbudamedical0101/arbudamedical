import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctor extends Document {
  name: string;
  registrationNo?: string;
  contact?: string;
  qualification?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const doctorSchema = new Schema<IDoctor>(
  {
    name: { type: String, required: true, trim: true },
    registrationNo: { type: String, trim: true },
    contact: { type: String, trim: true },
    qualification: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

doctorSchema.index({ name: 1 });

export const Doctor = mongoose.model<IDoctor>('Doctor', doctorSchema);
