import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Allowed origins: CLIENT_ORIGIN may be a comma-separated list. Normalise both
  // the configured values and the incoming Origin by stripping any trailing
  // slash, so "https://site.app/" and "https://site.app" are treated the same.
  const normalise = (o: string) => o.trim().replace(/\/+$/, '');
  const allowedOrigins = env.clientOrigin.split(',').map(normalise).filter(Boolean);
  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser requests (curl, health checks) that send no Origin.
        if (!origin || allowedOrigins.includes(normalise(origin))) {
          return callback(null, true);
        }
        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!env.isProd) app.use(morgan('dev'));

  // Serve uploaded prescription images
  app.use('/uploads', express.static(env.uploadDir));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
