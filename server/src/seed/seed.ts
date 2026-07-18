import mongoose from 'mongoose';
import dayjs from 'dayjs';
import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { User, hashPassword } from '../models/User';
import { Medicine } from '../models/Medicine';
import { Batch } from '../models/Batch';
import { Supplier } from '../models/Supplier';
import { Doctor } from '../models/Doctor';
import { Customer } from '../models/Customer';
import { Settings } from '../models/Settings';
import { Counter } from '../models/Counter';

/* eslint-disable no-console */

interface MedSeed {
  name: string;
  composition: string;
  manufacturer: string;
  category: string;
  schedule: 'OTC' | 'H' | 'H1' | 'X';
  hsnCode: string;
  gstRate: number;
  packSize: string;
  unit: string;
  barcode: string;
  reorderLevel: number;
  rackLocation: string;
  mrp: number;
  purchaseRate: number;
  saleRate: number;
}

const MEDICINES: MedSeed[] = [
  { name: 'Paracetamol 500mg', composition: 'Paracetamol 500mg', manufacturer: 'Cipla', category: 'Analgesic', schedule: 'OTC', hsnCode: '3004', gstRate: 12, packSize: '10 tablets', unit: 'strip', barcode: '8901234500011', reorderLevel: 30, rackLocation: 'A1', mrp: 30, purchaseRate: 18, saleRate: 30 },
  { name: 'Azithromycin 500mg', composition: 'Azithromycin 500mg', manufacturer: 'Sun Pharma', category: 'Antibiotic', schedule: 'H1', hsnCode: '3004', gstRate: 12, packSize: '3 tablets', unit: 'strip', barcode: '8901234500028', reorderLevel: 15, rackLocation: 'B2', mrp: 90, purchaseRate: 55, saleRate: 90 },
  { name: 'Amoxicillin 250mg', composition: 'Amoxicillin 250mg', manufacturer: 'Cipla', category: 'Antibiotic', schedule: 'H', hsnCode: '3004', gstRate: 12, packSize: '10 capsules', unit: 'strip', barcode: '8901234500035', reorderLevel: 20, rackLocation: 'B1', mrp: 65, purchaseRate: 40, saleRate: 65 },
  { name: 'Cetirizine 10mg', composition: 'Cetirizine 10mg', manufacturer: 'Dr Reddy', category: 'Antihistamine', schedule: 'OTC', hsnCode: '3004', gstRate: 12, packSize: '10 tablets', unit: 'strip', barcode: '8901234500042', reorderLevel: 25, rackLocation: 'A2', mrp: 25, purchaseRate: 12, saleRate: 25 },
  { name: 'Metformin 500mg', composition: 'Metformin 500mg', manufacturer: 'USV', category: 'Antidiabetic', schedule: 'H', hsnCode: '3004', gstRate: 12, packSize: '15 tablets', unit: 'strip', barcode: '8901234500059', reorderLevel: 20, rackLocation: 'C1', mrp: 45, purchaseRate: 26, saleRate: 45 },
  { name: 'Amlodipine 5mg', composition: 'Amlodipine 5mg', manufacturer: 'Lupin', category: 'Antihypertensive', schedule: 'H', hsnCode: '3004', gstRate: 12, packSize: '10 tablets', unit: 'strip', barcode: '8901234500066', reorderLevel: 20, rackLocation: 'C2', mrp: 40, purchaseRate: 22, saleRate: 40 },
  { name: 'Pantoprazole 40mg', composition: 'Pantoprazole 40mg', manufacturer: 'Alkem', category: 'Antacid', schedule: 'H', hsnCode: '3004', gstRate: 12, packSize: '10 tablets', unit: 'strip', barcode: '8901234500073', reorderLevel: 20, rackLocation: 'C3', mrp: 95, purchaseRate: 58, saleRate: 95 },
  { name: 'ORS Powder', composition: 'Oral Rehydration Salts', manufacturer: 'FDC', category: 'Electrolyte', schedule: 'OTC', hsnCode: '3004', gstRate: 5, packSize: '21.8g sachet', unit: 'sachet', barcode: '8901234500080', reorderLevel: 40, rackLocation: 'D1', mrp: 22, purchaseRate: 13, saleRate: 22 },
  { name: 'Vitamin C 500mg', composition: 'Ascorbic Acid 500mg', manufacturer: 'Abbott', category: 'Supplement', schedule: 'OTC', hsnCode: '3004', gstRate: 18, packSize: '15 tablets', unit: 'strip', barcode: '8901234500097', reorderLevel: 30, rackLocation: 'D2', mrp: 110, purchaseRate: 70, saleRate: 110 },
  { name: 'Cough Syrup 100ml', composition: 'Dextromethorphan + CPM', manufacturer: 'Glenmark', category: 'Cough', schedule: 'H', hsnCode: '3004', gstRate: 12, packSize: '100 ml', unit: 'bottle', barcode: '8901234500103', reorderLevel: 15, rackLocation: 'E1', mrp: 85, purchaseRate: 52, saleRate: 85 },
  { name: 'Insulin Glargine', composition: 'Insulin Glargine 100IU/ml', manufacturer: 'Sanofi', category: 'Antidiabetic', schedule: 'H', hsnCode: '3004', gstRate: 5, packSize: '3 ml pen', unit: 'pen', barcode: '8901234500110', reorderLevel: 10, rackLocation: 'FRIDGE', mrp: 320, purchaseRate: 245, saleRate: 320 },
  { name: 'Alprazolam 0.5mg', composition: 'Alprazolam 0.5mg', manufacturer: 'Torrent', category: 'Anxiolytic', schedule: 'X', hsnCode: '3004', gstRate: 12, packSize: '10 tablets', unit: 'strip', barcode: '8901234500127', reorderLevel: 10, rackLocation: 'LOCKER', mrp: 55, purchaseRate: 30, saleRate: 55 },
  { name: 'Ibuprofen 400mg', composition: 'Ibuprofen 400mg', manufacturer: 'Abbott', category: 'Analgesic', schedule: 'OTC', hsnCode: '3004', gstRate: 12, packSize: '10 tablets', unit: 'strip', barcode: '8901234500134', reorderLevel: 25, rackLocation: 'A3', mrp: 35, purchaseRate: 19, saleRate: 35 },
  { name: 'Levocetirizine 5mg', composition: 'Levocetirizine 5mg', manufacturer: 'Mankind', category: 'Antihistamine', schedule: 'OTC', hsnCode: '3004', gstRate: 12, packSize: '10 tablets', unit: 'strip', barcode: '8901234500141', reorderLevel: 25, rackLocation: 'A2', mrp: 48, purchaseRate: 28, saleRate: 48 },
  { name: 'Montelukast 10mg', composition: 'Montelukast 10mg', manufacturer: 'Cipla', category: 'Respiratory', schedule: 'H', hsnCode: '3004', gstRate: 12, packSize: '10 tablets', unit: 'strip', barcode: '8901234500158', reorderLevel: 15, rackLocation: 'E2', mrp: 130, purchaseRate: 82, saleRate: 130 },
];

export async function seedData() {
  console.log('[seed] clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Medicine.deleteMany({}),
    Batch.deleteMany({}),
    Supplier.deleteMany({}),
    Doctor.deleteMany({}),
    Customer.deleteMany({}),
    Settings.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // --- Settings ---
  await Settings.create({
    key: 'default',
    storeName: 'Arbuda Medical and General Store, Ramseen',
    address: 'Ramseen, Jalore, Rajasthan',
    phone: '+91 81073 37934',
    email: '',
    mapEmbedUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3615.714921287445!2d72.53431320190431!3d25.009801088839914!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3943198c293fc4a5%3A0x1368e21390fd137f!2sARBUDA%20MEDICAL%20%26%20GENERAL%20STORE!5e0!3m2!1sen!2sin!4v1784381578985!5m2!1sen!2sin',
    drugLicenseNo: '',
    gstin: '',
    invoicePrefix: 'INV',
    nextInvoiceNumber: 1,
    purchasePrefix: 'PUR',
    returnPrefix: 'RET',
    nearExpiryDays: 90,
    defaultGstRate: 12,
    footerNote: 'Wishing you good health! Medicines once sold are not returnable without a valid reason.',
  });

  // --- Users ---
  const adminPass = await hashPassword(env.seed.adminPassword);
  const staffPass = await hashPassword('Staff@123');
  await User.create([
    { name: 'Store Admin', email: env.seed.adminEmail, passwordHash: adminPass, role: 'admin' },
    { name: 'Priya Pharmacist', email: 'pharmacist@pharmacy.local', passwordHash: staffPass, role: 'pharmacist' },
    { name: 'Ravi Cashier', email: 'cashier@pharmacy.local', passwordHash: staffPass, role: 'cashier' },
  ]);

  // --- Suppliers ---
  await Supplier.create([
    { name: 'MediDistributors Pvt Ltd', gstin: '29AAACM1234A1Z1', contact: '+91 98800 11111', email: 'sales@medidist.in', address: 'Peenya Industrial Area, Bengaluru' },
    { name: 'HealthLine Agencies', gstin: '29AAACH5678B1Z2', contact: '+91 98800 22222', email: 'orders@healthline.in', address: 'Yeshwanthpur, Bengaluru' },
    { name: 'Karnataka Pharma Supplies', gstin: '29AAACK9012C1Z3', contact: '+91 98800 33333', email: 'info@kps.in', address: 'Rajajinagar, Bengaluru' },
  ]);

  // --- Doctors ---
  await Doctor.create([
    { name: 'Dr. Anil Kumar', registrationNo: 'KMC-45678', contact: '+91 98450 10101', qualification: 'MBBS, MD' },
    { name: 'Dr. Sunita Rao', registrationNo: 'KMC-78901', contact: '+91 98450 20202', qualification: 'MBBS' },
    { name: 'Dr. Imran Sheikh', registrationNo: 'KMC-33445', contact: '+91 98450 30303', qualification: 'MBBS, DNB' },
  ]);

  // --- Customers ---
  await Customer.create([
    { name: 'Suresh Babu', phone: '9000000001', address: 'Indiranagar, Bengaluru', creditBalance: 0 },
    { name: 'Lakshmi Devi', phone: '9000000002', address: 'Jayanagar, Bengaluru', creditBalance: 0 },
  ]);

  // --- Medicines + Batches ---
  console.log('[seed] creating medicines + batches...');
  for (const m of MEDICINES) {
    const med = await Medicine.create({
      name: m.name,
      composition: m.composition,
      manufacturer: m.manufacturer,
      category: m.category,
      schedule: m.schedule,
      hsnCode: m.hsnCode,
      gstRate: m.gstRate,
      packSize: m.packSize,
      unit: m.unit,
      barcode: m.barcode,
      reorderLevel: m.reorderLevel,
      rackLocation: m.rackLocation,
    });

    // A healthy batch (far expiry) and a near-expiry batch to exercise alerts.
    await Batch.create([
      {
        medicineId: med._id,
        batchNo: `B${med.barcode?.slice(-4)}A`,
        expiry: dayjs().add(18, 'month').toDate(),
        mrp: m.mrp,
        purchaseRate: m.purchaseRate,
        saleRate: m.saleRate,
        qtyInStock: 80,
      },
      {
        medicineId: med._id,
        batchNo: `B${med.barcode?.slice(-4)}B`,
        expiry: dayjs().add(45, 'day').toDate(), // near-expiry (< 90 days)
        mrp: m.mrp,
        purchaseRate: m.purchaseRate,
        saleRate: m.saleRate,
        qtyInStock: 12,
      },
    ]);
  }

  // One expired batch for the expiry/alerts demo.
  const para = await Medicine.findOne({ name: 'Paracetamol 500mg' });
  if (para) {
    await Batch.create({
      medicineId: para._id,
      batchNo: 'B0011EXP',
      expiry: dayjs().subtract(20, 'day').toDate(),
      mrp: 30,
      purchaseRate: 18,
      saleRate: 30,
      qtyInStock: 5,
    });
  }

  console.log('[seed] done.');
  console.log('  Admin     :', env.seed.adminEmail, '/', env.seed.adminPassword);
  console.log('  Pharmacist: pharmacist@pharmacy.local / Staff@123');
  console.log('  Cashier   : cashier@pharmacy.local / Staff@123');
}

// CLI entry: `npm run seed`. Connects, seeds, disconnects.
if (require.main === module) {
  (async () => {
    await connectDB();
    await seedData();
    await disconnectDB();
    await mongoose.connection.close();
  })()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] failed', err);
      process.exit(1);
    });
}
