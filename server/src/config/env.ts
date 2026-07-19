import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '5000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // When true, boot an in-memory MongoDB replica set (no install needed).
  useMemoryDb: process.env.USE_MEMORY_DB === 'true',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'https://arbudamedical.vercel.app',
  mongoUri: required('MONGODB_URI', 'mongodb://localhost:27017/pharmacy?replicaSet=rs0'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@pharmacy.local',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
  },
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
};
