import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../models/User';

// Restrict a route to one or more roles. Admin always allowed implicitly.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'admin' || roles.includes(req.user.role)) {
      return next();
    }
    next(ApiError.forbidden('You do not have permission to perform this action'));
  };
}
