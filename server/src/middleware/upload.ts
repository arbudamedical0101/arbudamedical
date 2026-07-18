import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

if (!fs.existsSync(env.uploadDir)) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = `rx-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, base + ext);
  },
});

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const uploadPrescription = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Only JPG, PNG, WEBP or PDF files are allowed'));
    }
  },
});
