import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwtSecret) as AuthPayload;
}

export function authRequired(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return next(new AppError('No autenticado. Token requerido.', 401));
  }
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    return next(new AppError('Token inválido o expirado.', 401));
  }
}

export function adminRequired(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || user.role !== 'admin') {
    return next(new AppError('Acceso no autorizado. Se requiere rol admin.', 403));
  }
  next();
}