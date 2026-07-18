import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { ISale } from '../models/Sale';
import { ISettings } from '../models/Settings';

const money = (n: number) => n.toFixed(2);

// Builds a GST-compliant retail invoice PDF and pipes it to the response stream.
export function buildInvoicePdf(sale: ISale, settings: ISettings, stream: NodeJS.WritableStream): void {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(stream);

  // --- Header: store identity ---
  doc.fontSize(18).font('Helvetica-Bold').text(settings.storeName, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(9).font('Helvetica');
  if (settings.address) doc.text(settings.address, { align: 'center' });
  const contactLine = [settings.phone, settings.email].filter(Boolean).join('  |  ');
  if (contactLine) doc.text(contactLine, { align: 'center' });
  const regLine = [
    settings.gstin ? `GSTIN: ${settings.gstin}` : '',
    settings.drugLicenseNo ? `D.L. No: ${settings.drugLicenseNo}` : '',
  ]
    .filter(Boolean)
    .join('      ');
  if (regLine) doc.font('Helvetica-Bold').text(regLine, { align: 'center' });

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(11).text('TAX INVOICE', { align: 'center' });
  doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke();
  doc.moveDown(0.5);

  // --- Invoice + customer meta ---
  const metaTop = doc.y;
  doc.fontSize(9).font('Helvetica');
  doc.text(`Invoice No: ${sale.invoiceNo}`, 40, metaTop);
  doc.text(`Date: ${dayjs(sale.createdAt).format('DD/MM/YYYY HH:mm')}`, 40, doc.y);
  doc.text(`Customer: ${sale.customerName || 'Walk-in'}`, 320, metaTop);
  if (sale.doctorId && typeof sale.doctorId === 'object' && 'name' in sale.doctorId) {
    doc.text(`Doctor: ${(sale.doctorId as unknown as { name: string }).name}`, 320, doc.y);
  }
  doc.moveDown(1);

  // --- Items table ---
  const cols = { sn: 40, name: 65, batch: 215, exp: 285, hsn: 340, qty: 385, rate: 415, gst: 460, amt: 500 };
  const headerY = doc.y;
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text('#', cols.sn, headerY);
  doc.text('Item', cols.name, headerY);
  doc.text('Batch', cols.batch, headerY);
  doc.text('Exp', cols.exp, headerY);
  doc.text('HSN', cols.hsn, headerY);
  doc.text('Qty', cols.qty, headerY);
  doc.text('Rate', cols.rate, headerY);
  doc.text('GST%', cols.gst, headerY);
  doc.text('Amount', cols.amt, headerY, { width: 55, align: 'right' });
  doc.moveTo(40, doc.y + 1).lineTo(555, doc.y + 1).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(8);
  sale.items.forEach((it, i) => {
    const y = doc.y;
    doc.text(String(i + 1), cols.sn, y);
    doc.text(it.name, cols.name, y, { width: 145 });
    doc.text(it.batchNo, cols.batch, y, { width: 65 });
    doc.text(dayjs(it.expiry).format('MM/YY'), cols.exp, y);
    doc.text(it.hsnCode || '-', cols.hsn, y, { width: 40 });
    doc.text(String(it.qty), cols.qty, y);
    doc.text(money(it.rate), cols.rate, y);
    doc.text(String(it.gstRate), cols.gst, y);
    doc.text(money(it.lineTotal), cols.amt, y, { width: 55, align: 'right' });
    doc.moveDown(0.5);
  });

  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.4);

  // --- Totals ---
  const labelX = 380;
  const valX = 500;
  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    const y = doc.y;
    doc.text(label, labelX, y);
    doc.text(value, valX, y, { width: 55, align: 'right' });
    doc.moveDown(0.4);
  };
  row('Taxable', money(sale.subTotal));
  row('CGST', money(sale.gstTotal / 2));
  row('SGST', money(sale.gstTotal / 2));
  if (sale.billDiscountAmount > 0) row('Bill Discount', `-${money(sale.billDiscountAmount)}`);
  if (sale.roundOff !== 0) row('Round Off', money(sale.roundOff));
  row('GRAND TOTAL', `INR ${money(sale.grandTotal)}`, true);

  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(8);
  const payStr = sale.payments.map((p) => `${p.mode.toUpperCase()}: ${money(p.amount)}`).join('   ');
  doc.text(`Payment: ${payStr}`, 40);
  if (sale.creditAmount > 0) doc.text(`On credit (khata): ${money(sale.creditAmount)}`, 40);

  doc.moveDown(1);
  doc.fontSize(8).fillColor('#555');
  if (settings.footerNote) doc.text(settings.footerNote, { align: 'center' });
  doc.text('This is a computer-generated invoice.', { align: 'center' });

  doc.end();
}
