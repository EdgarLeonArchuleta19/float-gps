import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AppError } from './errorHandler';
import { masterKeyLimiter } from './rateLimit';
import { getClientIp, writeAudit } from '../services/audit.service';
import { permissionsFor, type Permission } from '../utils/permissions';

const prisma = new PrismaClient();

export type TokenScope = 'tenant' | 'owner_portal';

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null;
  scope?: TokenScope;
  tokenVersion?: number;
}

export interface TenantContext {
  userId: string;
  email: string;
  role: string;
  companyId: string | null;
  isSuperAdmin: boolean;
  roleId: string | null;
  permissions: string[] | null;
  restrictToUserUnits: boolean;
}

export function getTenant(req: Request): TenantContext {
  return (req as any).tenant || {
    userId: '',
    email: '',
    role: 'viewer',
    companyId: null,
    isSuperAdmin: false,
    roleId: null,
    permissions: [],
    restrictToUserUnits: false,
  };
}

export function signToken(payload: AuthPayload, expiresIn: string = '7d'): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwtSecret) as AuthPayload;
}

export function safeEqual(a: string, b: string): boolean {
  const left = crypto.createHash('sha256').update(a || '').digest();
  const right = crypto.createHash('sha256').update(b || '').digest();
  return crypto.timingSafeEqual(left, right) && !!a && !!b;
}

export async function authRequired(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return next(new AppError('No autenticado. Token requerido.', 401));
  }

  let payload: AuthPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(new AppError('Token inválido o expirado.', 401));
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true,
        companyId: true,
        tokenVersion: true,
        isActive: true,
        deletedAt: true,
        company: { select: { isActive: true, deletedAt: true } },
        customRole: { select: { id: true, permissions: true, allUnits: true } },
      },
    });

    if (!dbUser || dbUser.deletedAt || !dbUser.isActive || dbUser.company?.deletedAt || dbUser.role !== payload.role || (payload.tokenVersion ?? 0) !== dbUser.tokenVersion) {
      return next(new AppError('Sesión revocada. Inicia sesión nuevamente.', 401));
    }

    const isOwner = dbUser.role === 'superadmin';
    if (isOwner && payload.scope !== 'owner_portal') {
      return next(new AppError('Sesión de administración inválida. Accede desde la consola de dueño.', 401));
    }
    if (!isOwner && payload.scope === 'owner_portal') {
      return next(new AppError('Token inválido para este recurso.', 401));
    }

    const supportHeader = req.headers['x-support-company-id'];
    let supportCompanyId: string | null = null;
    if (isOwner && typeof supportHeader === 'string' && supportHeader.trim()) {
      const supportCompany = await prisma.company.findUnique({
        where: { id: supportHeader.trim() },
        select: { id: true, deletedAt: true },
      });
      if (!supportCompany || supportCompany.deletedAt) {
        return next(new AppError('La empresa de soporte no existe.', 404));
      }
      supportCompanyId = supportCompany.id;
    }

    // Every company filter keys off companyId, so a non-owner account without
    // a company would otherwise match no filter and see every tenant's data.
    if (!isOwner && !dbUser.companyId) {
      return next(new AppError('Tu cuenta no está asignada a ninguna empresa.', 403));
    }

    const isMember = !isOwner && dbUser.role !== 'admin';
    if (isMember && !dbUser.customRole) {
      return next(new AppError('Tu cuenta no tiene un rol asignado. Contacta al administrador.', 403));
    }

    if (!isOwner && dbUser.company && !dbUser.company.isActive) {
      return next(new AppError('La cuenta de esta empresa se encuentra suspendida temporalmente.', 403));
    }

    (req as any).user = payload;
    (req as any).tenant = {
      userId: dbUser.id,
      email: payload.email,
      role: dbUser.role,
      companyId: supportCompanyId || dbUser.companyId || null,
      isSuperAdmin: isOwner && !supportCompanyId,
      roleId: dbUser.customRole?.id || null,
      permissions: permissionsFor(dbUser.role, dbUser.customRole),
      restrictToUserUnits: isMember && !dbUser.customRole!.allUnits,
    } satisfies TenantContext;

    next();
  } catch (err) {
    next(err);
  }
}

export function adminRequired(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return next(new AppError('Acceso no autorizado. Se requiere rol admin.', 403));
  }
  next();
}

// Passes when the caller's role grants any of the given sections.
export function permissionRequired(...anyOf: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { permissions } = getTenant(req);
    if (permissions === null || anyOf.some((p) => permissions.includes(p))) return next();
    next(new AppError('Tu rol no tiene acceso a esta sección.', 403));
  };
}

export function superAdminRequired(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user as AuthPayload | undefined;
  if (!user || user.role !== 'superadmin' || user.scope !== 'owner_portal') {
    return next(new AppError('Acceso restringido exclusivamente al Dueño del Sistema.', 403));
  }
  if (req.headers['x-support-company-id']) {
    return next(new AppError('Sal del Modo Soporte para usar la consola de dueño.', 403));
  }
  next();
}

export function ownerIpAllowed(req: Request, _res: Response, next: NextFunction) {
  if (config.ownerAllowedIps.length === 0) return next();
  const ip = getClientIp(req);
  if (!config.ownerAllowedIps.includes(ip)) {
    return next(new AppError('Recurso no disponible.', 404));
  }
  next();
}

export function masterKeyRequired(action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthPayload | undefined;
    const ip = getClientIp(req);
    const keys = [`mk:${ip}`, `mk:${user?.userId || 'anon'}`];
    try {
      masterKeyLimiter.assertAllowed(keys, 'Demasiados intentos con la clave maestra.');
    } catch (err) {
      return next(err);
    }

    const provided = String(req.headers['x-owner-master-key'] || '');
    if (!safeEqual(provided, config.ownerMasterKey)) {
      masterKeyLimiter.recordFailure(keys);
      await writeAudit({
        actorId: user?.userId,
        actorEmail: user?.email || 'desconocido',
        action: `${action}_MASTER_KEY_REJECTED`,
        targetId: req.params.id || null,
        success: false,
        ip,
        userAgent: req.headers['user-agent'] || null,
      });
      return next(new AppError('Clave maestra incorrecta. Acción cancelada.', 403));
    }

    masterKeyLimiter.clear(keys);
    next();
  };
}
