import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

// Stream an .xlsx file built from columns + plain row objects.
export async function exportExcel(
  res: Response,
  filename: string,
  sheetName: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(r));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

// Stream a simple landscape PDF table.
export function exportPdfTable(
  res: Response,
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  subtitle?: string
): void {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.fontSize(15).font('Helvetica-Bold').text(title, { align: 'center' });
  if (subtitle) doc.fontSize(9).font('Helvetica').text(subtitle, { align: 'center' });
  doc.moveDown(0.5);

  const pageWidth = doc.page.width - 60;
  const colWidth = pageWidth / columns.length;
  const startX = 30;

  const drawRow = (values: string[], bold: boolean) => {
    const y = doc.y;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
    values.forEach((v, i) => {
      doc.text(v, startX + i * colWidth, y, { width: colWidth - 4, ellipsis: true });
    });
    doc.moveDown(0.6);
    if (doc.y > doc.page.height - 40) {
      doc.addPage();
    }
  };

  drawRow(columns.map((c) => c.header), true);
  doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
  doc.moveDown(0.3);
  rows.forEach((r) => drawRow(columns.map((c) => String(r[c.key] ?? '')), false));

  doc.end();
}
