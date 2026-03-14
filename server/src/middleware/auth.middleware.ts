import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { fail } from '../utils/response';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    fail(res, 'Authentication required', 401);
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    fail(res, 'Invalid or expired token', 401);
  }
}

export function requireManager(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'MANAGER') {
    fail(res, 'Manager access required', 403);
    return;
  }
  next();
}
