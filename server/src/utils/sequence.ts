import { ClientSession } from 'mongoose';
import { Settings } from '../models/Settings';
import { Counter } from '../models/Counter';

function pad(n: number): string {
  return String(n).padStart(5, '0');
}

// Atomically reserve the next invoice number from the Settings singleton.
export async function nextInvoiceNumber(session?: ClientSession): Promise<string> {
  const updated = await Settings.findOneAndUpdate(
    { key: 'default' },
    { $inc: { nextInvoiceNumber: 1 } },
    { new: false, upsert: true, session: session ?? undefined }
  );
  const seq = updated?.nextInvoiceNumber ?? 1;
  const prefix = updated?.invoicePrefix ?? 'INV';
  return `${prefix}-${pad(seq)}`;
}

// Atomically reserve the next number for a named counter (e.g. returns).
export async function nextSequence(
  name: string,
  prefix: string,
  session?: ClientSession
): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session: session ?? undefined }
  );
  return `${prefix}-${pad(counter?.seq ?? 1)}`;
}
