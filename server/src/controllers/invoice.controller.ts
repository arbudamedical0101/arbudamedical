import { Request, Response } from 'express';
import { Sale } from '../models/Sale';
import { getSettings } from '../models/Settings';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { buildInvoicePdf } from '../services/invoicePdf';

export const getInvoicePdf = asyncHandler(async (req: Request, res: Response) => {
  const sale = await Sale.findById(req.params.id).populate('doctorId', 'name registrationNo');
  if (!sale) throw ApiError.notFound('Sale not found');
  const settings = await getSettings();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="invoice-${sale.invoiceNo}.pdf"`);
  buildInvoicePdf(sale, settings, res);
});
