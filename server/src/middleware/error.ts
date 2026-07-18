import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Consistent error response shape: { error: { message, details? } }
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err && typeof err === 'object' && 'name' in err) {
    const e = err as { name?: string; message?: string; code?: number; keyValue?: unknown };
    if (e.name === 'ValidationError') {
      statusCode = 400;
      message = e.message ?? 'Validation error';
    } else if (e.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid identifier';
    } else if (e.code === 11000) {
      statusCode = 409;
      message = 'Duplicate value';
      details = e.keyValue;
    } else if (e.message) {
      message = e.message;
    }
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    },
  });
}
