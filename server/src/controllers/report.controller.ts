import { Request, Response } from 'express';
import dayjs from 'dayjs';
import { Types } from 'mongoose';
import { Sale } from '../models/Sale';
import { Purchase } from '../models/Purchase';
import { Batch } from '../models/Batch';
import { StockAdjustment } from '../models/StockAdjustment';
import { SalesReturn } from '../models/SalesReturn';
import { getSettings } from '../models/Settings';
import { asyncHandler } from '../utils/asyncHandler';
import { exportExcel, exportPdfTable, ExportColumn } from '../utils/exporters';

function range(req: Request) {
  const from = req.query.from
    ? dayjs(String(req.query.from)).startOf('day').toDate()
    : dayjs().startOf('month').toDate();
  const to = req.query.to
    ? dayjs(String(req.query.to)).endOf('day').toDate()
    : dayjs().endOf('day').toDate();
  return { from, to };
}

async function emit(
  req: Request,
  res: Response,
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  summary?: Record<string, unknown>
) {
  const format = String(req.query.format ?? 'json');
  if (format === 'excel') return exportExcel(res, filename, title, columns, rows);
  if (format === 'pdf') {
    const sub = summary ? Object.entries(summary).map(([k, v]) => `${k}: ${v}`).join('   ') : undefined;
    return exportPdfTable(res, filename, title, columns, rows, sub);
  }
  return res.json({ data: { rows, columns, summary } });
}

// --- 1. Period sales report ---
export const salesReport = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = range(req);
  const sales = await Sale.find({ createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 });
  const rows = sales.map((s) => ({
    invoiceNo: s.invoiceNo,
    date: dayjs(s.createdAt).format('DD/MM/YYYY HH:mm'),
    customer: s.customerName ?? 'Walk-in',
    taxable: s.subTotal.toFixed(2),
    gst: s.gstTotal.toFixed(2),
    discount: s.billDiscountAmount.toFixed(2),
    total: s.grandTotal.toFixed(2),
    status: s.status,
  }));
  const summary = {
    bills: sales.length,
    taxable: sales.reduce((a, s) => a + s.subTotal, 0).toFixed(2),
    gst: sales.reduce((a, s) => a + s.gstTotal, 0).toFixed(2),
    total: sales.reduce((a, s) => a + s.grandTotal, 0).toFixed(2),
  };
  const columns: ExportColumn[] = [
    { header: 'Invoice', key: 'invoiceNo' },
    { header: 'Date', key: 'date' },
    { header: 'Customer', key: 'customer' },
    { header: 'Taxable', key: 'taxable' },
    { header: 'GST', key: 'gst' },
    { header: 'Discount', key: 'discount' },
    { header: 'Total', key: 'total' },
    { header: 'Status', key: 'status' },
  ];
  await emit(req, res, 'sales-report', 'Sales Report', columns, rows, summary);
});

// --- 2. GST summary (GSTR-1 ready), grouped by GST rate ---
export const gstSummary = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = range(req);
  const agg = await Sale.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.gstRate',
        taxable: { $sum: '$items.taxableValue' },
        cgst: { $sum: '$items.cgst' },
        sgst: { $sum: '$items.sgst' },
        total: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const rows = agg.map((g) => ({
    gstRate: `${g._id}%`,
    taxable: g.taxable.toFixed(2),
    cgst: g.cgst.toFixed(2),
    sgst: g.sgst.toFixed(2),
    totalTax: (g.cgst + g.sgst).toFixed(2),
    total: g.total.toFixed(2),
  }));
  const summary = {
    taxable: agg.reduce((a, g) => a + g.taxable, 0).toFixed(2),
    cgst: agg.reduce((a, g) => a + g.cgst, 0).toFixed(2),
    sgst: agg.reduce((a, g) => a + g.sgst, 0).toFixed(2),
  };
  const columns: ExportColumn[] = [
    { header: 'GST Rate', key: 'gstRate' },
    { header: 'Taxable Value', key: 'taxable' },
    { header: 'CGST', key: 'cgst' },
    { header: 'SGST', key: 'sgst' },
    { header: 'Total Tax', key: 'totalTax' },
    { header: 'Invoice Value', key: 'total' },
  ];
  await emit(req, res, 'gst-summary', 'GST Summary (GSTR-1)', columns, rows, summary);
});

// --- 3. Purchase register ---
export const purchaseRegister = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = range(req);
  const purchases = await Purchase.find({ invoiceDate: { $gte: from, $lte: to } })
    .populate('supplierId', 'name gstin')
    .sort({ invoiceDate: 1 });
  const rows = purchases.map((p) => ({
    invoiceNo: p.invoiceNo,
    date: dayjs(p.invoiceDate).format('DD/MM/YYYY'),
    supplier: (p.supplierId as unknown as { name?: string })?.name ?? '',
    gstin: (p.supplierId as unknown as { gstin?: string })?.gstin ?? '',
    items: p.items.length,
    taxable: p.subTotal.toFixed(2),
    gst: p.gstTotal.toFixed(2),
    total: p.grandTotal.toFixed(2),
  }));
  const summary = {
    bills: purchases.length,
    total: purchases.reduce((a, p) => a + p.grandTotal, 0).toFixed(2),
  };
  const columns: ExportColumn[] = [
    { header: 'Invoice', key: 'invoiceNo' },
    { header: 'Date', key: 'date' },
    { header: 'Supplier', key: 'supplier' },
    { header: 'GSTIN', key: 'gstin' },
    { header: 'Items', key: 'items' },
    { header: 'Taxable', key: 'taxable' },
    { header: 'GST', key: 'gst' },
    { header: 'Total', key: 'total' },
  ];
  await emit(req, res, 'purchase-register', 'Purchase Register', columns, rows, summary);
});

// --- 4. Profit margin per medicine (sale value vs batch cost) ---
export const profitReport = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = range(req);
  const agg = await Sale.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $unwind: '$items' },
    { $lookup: { from: 'batches', localField: 'items.batchId', foreignField: '_id', as: 'batch' } },
    { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$items.medicineId',
        name: { $first: '$items.name' },
        qty: { $sum: '$items.qty' },
        revenue: { $sum: '$items.taxableValue' },
        cost: { $sum: { $multiply: ['$items.qty', { $ifNull: ['$batch.purchaseRate', 0] }] } },
      },
    },
    { $sort: { revenue: -1 } },
  ]);
  const rows = agg.map((g) => {
    const profit = g.revenue - g.cost;
    const margin = g.revenue > 0 ? (profit / g.revenue) * 100 : 0;
    return {
      name: g.name,
      qty: g.qty,
      revenue: g.revenue.toFixed(2),
      cost: g.cost.toFixed(2),
      profit: profit.toFixed(2),
      margin: `${margin.toFixed(1)}%`,
    };
  });
  const totalRevenue = agg.reduce((a, g) => a + g.revenue, 0);
  const totalCost = agg.reduce((a, g) => a + g.cost, 0);
  const summary = {
    revenue: totalRevenue.toFixed(2),
    cost: totalCost.toFixed(2),
    profit: (totalRevenue - totalCost).toFixed(2),
  };
  const columns: ExportColumn[] = [
    { header: 'Medicine', key: 'name' },
    { header: 'Qty Sold', key: 'qty' },
    { header: 'Revenue (taxable)', key: 'revenue' },
    { header: 'Cost', key: 'cost' },
    { header: 'Profit', key: 'profit' },
    { header: 'Margin', key: 'margin' },
  ];
  await emit(req, res, 'profit-report', 'Profit Margin Report', columns, rows, summary);
});

// --- 5. Expiry report (near-expiry + expired stock) ---
export const expiryReport = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getSettings();
  const today = dayjs().startOf('day').toDate();
  const cutoff = dayjs().add(settings.nearExpiryDays, 'day').toDate();
  const batches = await Batch.aggregate([
    { $match: { qtyInStock: { $gt: 0 }, expiry: { $lte: cutoff } } },
    { $lookup: { from: 'medicines', localField: 'medicineId', foreignField: '_id', as: 'medicine' } },
    { $unwind: '$medicine' },
    { $sort: { expiry: 1 } },
  ]);
  const rows = batches.map((b) => ({
    name: b.medicine.name,
    batchNo: b.batchNo,
    expiry: dayjs(b.expiry).format('DD/MM/YYYY'),
    status: b.expiry < today ? 'EXPIRED' : 'NEAR EXPIRY',
    qty: b.qtyInStock,
    value: (b.qtyInStock * b.purchaseRate).toFixed(2),
  }));
  const summary = {
    batches: batches.length,
    valueAtRisk: batches.reduce((a, b) => a + b.qtyInStock * b.purchaseRate, 0).toFixed(2),
  };
  const columns: ExportColumn[] = [
    { header: 'Medicine', key: 'name' },
    { header: 'Batch', key: 'batchNo' },
    { header: 'Expiry', key: 'expiry' },
    { header: 'Status', key: 'status' },
    { header: 'Qty', key: 'qty' },
    { header: 'Value (cost)', key: 'value' },
  ];
  await emit(req, res, 'expiry-report', 'Expiry Report', columns, rows, summary);
});

// --- 6. Fast / slow movers ---
export const moversReport = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = range(req);
  const order = req.query.order === 'slow' ? 1 : -1;
  const agg = await Sale.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.medicineId',
        name: { $first: '$items.name' },
        qty: { $sum: '$items.qty' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { qty: order } },
    { $limit: 50 },
  ]);
  const rows = agg.map((g, i) => ({
    rank: i + 1,
    name: g.name,
    qtySold: g.qty,
    revenue: g.revenue.toFixed(2),
  }));
  const columns: ExportColumn[] = [
    { header: 'Rank', key: 'rank' },
    { header: 'Medicine', key: 'name' },
    { header: 'Qty Sold', key: 'qtySold' },
    { header: 'Revenue', key: 'revenue' },
  ];
  await emit(req, res, 'movers-report', order === -1 ? 'Fast Movers' : 'Slow Movers', columns, rows);
});

// --- 7. Stock ledger for one medicine (purchases in, sales out, returns, adjustments) ---
export const stockLedger = asyncHandler(async (req: Request, res: Response) => {
  const medicineId = String(req.query.medicineId ?? '');
  if (!Types.ObjectId.isValid(medicineId)) throw new Error('medicineId is required');
  const mid = new Types.ObjectId(medicineId);
  const { from, to } = range(req);
  const inRange = { $gte: from, $lte: to };

  const [purchases, sales, returns, adjustments] = await Promise.all([
    Purchase.aggregate([
      { $match: { invoiceDate: inRange } },
      { $unwind: '$items' },
      { $match: { 'items.medicineId': mid } },
      { $project: { date: '$invoiceDate', ref: '$invoiceNo', type: 'Purchase', qty: '$items.qty' } },
    ]),
    Sale.aggregate([
      { $match: { createdAt: inRange } },
      { $unwind: '$items' },
      { $match: { 'items.medicineId': mid } },
      { $project: { date: '$createdAt', ref: '$invoiceNo', type: 'Sale', qty: { $multiply: ['$items.qty', -1] } } },
    ]),
    SalesReturn.aggregate([
      { $match: { createdAt: inRange } },
      { $unwind: '$items' },
      { $match: { 'items.medicineId': mid } },
      { $project: { date: '$createdAt', ref: '$returnNo', type: 'Sales Return', qty: '$items.qty' } },
    ]),
    StockAdjustment.aggregate([
      { $match: { createdAt: inRange, medicineId: mid } },
      { $project: { date: '$createdAt', ref: '$type', type: 'Adjustment', qty: '$qtyChange' } },
    ]),
  ]);

  const movements = [...purchases, ...sales, ...returns, ...adjustments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let running = 0;
  const rows = movements.map((m) => {
    running += m.qty;
    return {
      date: dayjs(m.date).format('DD/MM/YYYY HH:mm'),
      type: m.type,
      ref: m.ref,
      in: m.qty > 0 ? m.qty : '',
      out: m.qty < 0 ? -m.qty : '',
      balance: running,
    };
  });
  const columns: ExportColumn[] = [
    { header: 'Date', key: 'date' },
    { header: 'Type', key: 'type' },
    { header: 'Reference', key: 'ref' },
    { header: 'In', key: 'in' },
    { header: 'Out', key: 'out' },
    { header: 'Balance', key: 'balance' },
  ];
  await emit(req, res, 'stock-ledger', 'Stock Ledger', columns, rows, { movements: rows.length });
});
