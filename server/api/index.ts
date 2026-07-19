import serverless from 'serverless-http';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

let handler: ReturnType<typeof serverless>;

const ALLOWED_ORIGINS = [
  'https://arbudamedical.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

export default async function (req: any, res: any) {
  const origin = req.headers?.origin || '';

  // ── Handle CORS preflight IMMEDIATELY — before DB connect or any middleware.
  // This prevents the "Redirect not allowed for preflight" browser error that
  // occurs when a cold-start DB connection delays the OPTIONS response.
  if (req.method === 'OPTIONS') {
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 h
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!handler) {
    await connectDB();
    const app = createApp();
    handler = serverless(app);
  }
  return handler(req, res);
}
