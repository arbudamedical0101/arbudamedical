import { Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { getPageParams, paginated } from '../utils/query';
import { recordAudit } from '../utils/audit';

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const p = getPageParams(req);
  const filter: Record<string, unknown> = {};
  if (p.search) {
    filter.$or = [
      { name: { $regex: p.search, $options: 'i' } },
      { phone: { $regex: p.search, $options: 'i' } },
    ];
  }
  if (req.query.withCredit === 'true') filter.creditBalance = { $gt: 0 };
  const [data, total] = await Promise.all([
    Customer.find(filter).select('-creditLedger').sort({ name: 1 }).skip(p.skip).limit(p.limit),
    Customer.countDocuments(filter),
  ]);
  res.json(paginated(data, total, p));
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  res.json({ data: customer });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.create(req.body);
  res.status(201).json({ data: customer });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!customer) throw ApiError.notFound('Customer not found');
  res.json({ data: customer });
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  if (customer.creditBalance > 0) throw ApiError.conflict('Cannot delete a customer with an outstanding balance');
  await customer.deleteOne();
  await recordAudit({ user: req.user, action: 'customer.delete', entity: 'Customer', entityId: String(req.params.id) });
  res.json({ data: { id: req.params.id } });
});

// Record a khata payment (reduces outstanding balance).
export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, mode, ref, note } = req.body;
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  if (amount > customer.creditBalance) {
    throw ApiError.badRequest(`Payment (${amount}) exceeds outstanding balance (${customer.creditBalance})`);
  }
  customer.creditBalance = +(customer.creditBalance - amount).toFixed(2);
  customer.creditLedger.push({
    type: 'payment',
    amount,
    ref: ref ?? `${mode.toUpperCase()} payment`,
    note,
    date: new Date(),
  });
  await customer.save();
  await recordAudit({ user: req.user, action: 'customer.payment', entity: 'Customer', entityId: String(customer._id), meta: { amount, mode } });
  res.json({ data: customer });
});
