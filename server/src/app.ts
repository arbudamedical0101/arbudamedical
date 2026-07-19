import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';

const START_TIME = new Date();

function dbStateLabel(state: number) {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][state] ?? 'unknown';
}

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = [env.clientOrigin, 'http://localhost:5173', 'http://localhost:3000'];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // Handle all OPTIONS preflight requests
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!env.isProd) app.use(morgan('dev'));

  // Serve uploaded prescription images
  app.use('/uploads', express.static(env.uploadDir));

  // ── Root health / status page ─────────────────────────────────────────────
  app.get('/', (_req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbConnected = dbState === 1;
    const uptimeMs = Date.now() - START_TIME.getTime();
    const uptimeSec = Math.floor(uptimeMs / 1000);
    const uptimeStr = `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`;

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Arbuda Medical API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 40px 48px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .logo { font-size: 28px; font-weight: 700; color: #38bdf8; margin-bottom: 4px; }
    .subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 0;
      border-bottom: 1px solid #1e293b;
    }
    .row:not(:last-child) { border-bottom: 1px solid #334155; }
    .label { color: #94a3b8; font-size: 14px; }
    .value { font-weight: 600; font-size: 14px; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
    }
    .ok   { background: #052e16; color: #4ade80; border: 1px solid #16a34a; }
    .err  { background: #2d0a0a; color: #f87171; border: 1px solid #dc2626; }
    .dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse 1.5s infinite; }
    .dot-ok  { background: #4ade80; }
    .dot-err { background: #f87171; animation: none; }
    @keyframes pulse {
      0%,100% { opacity: 1; } 50% { opacity: 0.3; }
    }
    .footer { margin-top: 28px; font-size: 12px; color: #475569; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🏥 Arbuda Medical</div>
    <div class="subtitle">Backend API Server</div>

    <div class="row">
      <span class="label">Server Status</span>
      <span class="badge ok"><span class="dot dot-ok"></span>Running</span>
    </div>
    <div class="row">
      <span class="label">Database</span>
      <span class="badge ${dbConnected ? 'ok' : 'err'}">
        <span class="dot ${dbConnected ? 'dot-ok' : 'dot-err'}"></span>
        ${dbStateLabel(dbState)}
      </span>
    </div>
    <div class="row">
      <span class="label">Environment</span>
      <span class="value">${env.nodeEnv}</span>
    </div>
    <div class="row">
      <span class="label">Node.js</span>
      <span class="value">${process.version}</span>
    </div>
    <div class="row">
      <span class="label">Uptime</span>
      <span class="value">${uptimeStr}</span>
    </div>
    <div class="row">
      <span class="label">Time (UTC)</span>
      <span class="value">${new Date().toUTCString()}</span>
    </div>

    <div class="footer">GET /api/health &nbsp;·&nbsp; All API routes at /api/*</div>
  </div>
</body>
</html>`);
  });

  app.get('/api/health', (_req, res) => {
    const dbState = mongoose.connection.readyState;
    res.json({
      status: 'ok',
      db: dbStateLabel(dbState),
      dbConnected: dbState === 1,
      uptime: process.uptime(),
      time: new Date().toISOString(),
    });
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
