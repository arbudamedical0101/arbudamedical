import { Request, Response } from 'express';
import { User, hashPassword } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { recordAudit } from '../utils/audit';

function publicUser(u: { _id: unknown; name: string; email: string; role: string; active: boolean }) {
  return { id: String(u._id), name: u.name, email: u.email, role: u.role, active: u.active };
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.active) throw ApiError.unauthorized('Invalid credentials');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const payload = { sub: String(user._id), role: user.role, name: user.name };
  res.json({
    user: publicUser(user),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ sub: String(user._id) }),
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  let decoded: { sub: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  const user = await User.findById(decoded.sub);
  if (!user || !user.active) throw ApiError.unauthorized('User no longer active');

  const payload = { sub: String(user._id), role: user.role, name: user.name };
  res.json({
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken({ sub: String(user._id) }),
  });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub);
  if (!user) throw ApiError.notFound('User not found');
  res.json({ user: publicUser(user) });
});

// --- Admin: user management ---
export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ data: users.map(publicUser) });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw ApiError.conflict('A user with this email already exists');

  const user = await User.create({
    name,
    email,
    role,
    passwordHash: await hashPassword(password),
  });
  await recordAudit({ user: req.user, action: 'user.create', entity: 'User', entityId: String(user._id), meta: { email, role } });
  res.status(201).json({ user: publicUser(user) });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, password, role, active } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = active;
  if (password !== undefined) user.passwordHash = await hashPassword(password);
  await user.save();

  await recordAudit({ user: req.user, action: 'user.update', entity: 'User', entityId: String(user._id) });
  res.json({ user: publicUser(user) });
});
