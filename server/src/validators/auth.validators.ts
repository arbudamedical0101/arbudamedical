import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'pharmacist', 'cashier']),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'pharmacist', 'cashier']).optional(),
  active: z.boolean().optional(),
});
