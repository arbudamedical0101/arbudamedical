import { Request, Response } from 'express';
import dayjs from 'dayjs';
import { ScheduleH1Entry } from '../models/ScheduleH1Entry';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { exportExcel, exportPdfTable, ExportColumn } from '../utils/exporters';

function buildFilter(req: Request): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (req.query.schedule) filter.schedule = req.query.schedule;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) (filter.date as Record<string, unknown>).$gte = dayjs(String(req.query.from)).startOf('day').toDate();
    if (req.query.to) (filter.date as Record<string, unknown>).$lte = dayjs(String(req.query.to)).endOf('day').toDate();
  }
  const search = String(req.query.search ?? '').trim();
  if (search) {
    filter.$or = [
      { drugName: { $regex: search, $options: 'i' } },
      { patientName: { $regex: search, $options: 'i' } },
      { doctorName: { $regex: search, $options: 'i' } },
      { invoiceNo: { $regex: search, $options: 'i' } },
    ];
  }
  return filter;
}

export const listH1Entries = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter = buildFilter(req);
  const [data, total] = await Promise.all([
    ScheduleH1Entry.find(filter).sort({ date: -1 }).skip(p.skip).limit(p.limit),
    ScheduleH1Entry.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

const H1_COLUMNS: ExportColumn[] = [
  { header: 'Date', key: 'date', width: 20 },
  { header: 'Invoice', key: 'invoiceNo', width: 16 },
  { header: 'Drug', key: 'drugName', width: 28 },
  { header: 'Sch', key: 'schedule', width: 8 },
  { header: 'Qty', key: 'qty', width: 8 },
  { header: 'Batch', key: 'batchNo', width: 14 },
  { header: 'Patient', key: 'patientName', width: 22 },
  { header: 'Phone', key: 'patientPhone', width: 16 },
  { header: 'Doctor', key: 'doctorName', width: 22 },
  { header: 'Rx Ref', key: 'prescriptionRef', width: 16 },
];

export const exportH1Register = asyncHandler(async (req: Request, res: Response) => {
  const filter = buildFilter(req);
  const entries = await ScheduleH1Entry.find(filter).sort({ date: -1 }).limit(10000);
  const rows = entries.map((e) => ({
    date: dayjs(e.date).format('DD/MM/YYYY'),
    invoiceNo: e.invoiceNo,
    drugName: e.drugName,
    schedule: e.schedule,
    qty: e.qty,
    batchNo: e.batchNo,
    patientName: e.patientName ?? '',
    patientPhone: e.patientPhone ?? '',
    doctorName: e.doctorName ?? '',
    prescriptionRef: e.prescriptionRef ?? '',
  }));

  const format = String(req.query.format ?? 'excel');
  if (format === 'pdf') {
    return exportPdfTable(res, 'schedule-h1-register', 'Schedule H1 Register', H1_COLUMNS, rows);
  }
  return exportExcel(res, 'schedule-h1-register', 'H1 Register', H1_COLUMNS, rows);
});
