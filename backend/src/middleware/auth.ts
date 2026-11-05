import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AppError } from './errorHandler';
import { getClientIp, writeAudit } from '../services/audit.service';
import { permissionsFor, type Permission } from '../utils/permissions';
import { historyCutoff, normalizePlan, type Plan } from '../utils/plans';
import { isStaffToken, resolveStaff, staffNetworkAllowed } from './staffAuth';
import { supportPermissions } from '../utils/staffRoles';

const prisma = new PrismaClient();

const APP_AUDIENCE = 'floa-app';

const TEMPORARY_PASSWORD_ROUTES = new Set(['GET /api/auth/me', 'POST /api/auth/change-password', 'POST /api/notifications/devices/remove']);

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null;
  tokenVersion?: number;
}

export interface SupportContext {
  staffId: string;
  staffRole: string;
  sessionId: string;
}

export interface TenantContext {
  userId: string;
  email: string;
  name?: string;
  role: string;
  companyId: string | null;
  roleId: string | null;
  permissions: string[] | null;
  restrictToUserUnits: boolean;
  unitsByUser: boolean;
  plan: Plan;
  support: SupportContext | null;
}

export function getTenant(req: Request): TenantContext {
  return (req as any).tenant || {
    userId: '',
    email: '',
    role: 'viewer',
    companyId: null,
    roleId: null,
    permissions: [],
    restrictToUserUnits: false,
    unitsByUser: false,
    plan: 'EMPRESA',
    support: null,
  };
}

export function signToken(payload: AuthPayload, expiresIn: string = '7d'): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn, audience: APP_AUDIENCE } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwtSecret, { audience: APP_AUDIENCE }) as AuthPayload;
}

export function safeEqual(a: string, b: string): boolean {
  const left = crypto.createHash('sha256').update(a || '').digest();
  const right = crypto.createHash('sha256').update(b || '').digest();
  return crypto.timingSafeEqual(left, right) && !!a && !!b;
}

const SUPPORT_ENDED = 'La sesión de soporte terminó. Vuelve a entrar desde la consola.';

// A floaGPS team member reaches company data only through an open Support
// Mode session (x-support-session): started from the console with a reason,
// limited in time, tied to one company and to that team member. Every change
// made there is written to the audit log.
async function supportTenant(req: Request, res: Response, token: string): Promise<TenantContext> {
  if (!staffNetworkAllowed(req)) throw new AppError('Recurso no disponible.', 404);
  const staff = await resolveStaff(token);
  if (!staff.permissions.includes('support')) throw new AppError('Tu rol en el equipo no puede entrar a empresas.', 403);
  const sessionId = req.headers['x-support-session'];
  if (typeof sessionId !== 'string' || !sessionId) {
    throw new AppError('Entra a la empresa desde la consola (Modo Soporte).', 403, 'support_ended');
  }
  const session = await prisma.supportSession.findUnique({
    where: { id: sessionId },
    select: { staffId: true, companyId: true, endedAt: true, expiresAt: true, company: { select: { deletedAt: true, plan: true } } },
  });
  if (!session || session.staffId !== staff.id || session.endedAt || session.expiresAt.getTime() <= Date.now() || session.company.deletedAt) {
    throw new AppError(SUPPORT_ENDED, 403, 'support_ended');
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.on('finish', () => {
      writeAudit({
        actorId: staff.id,
        actorEmail: staff.email,
        actorRole: staff.role,
        companyId: session.companyId,
        action: 'SUPPORT_CHANGE',
        targetType: 'request',
        success: res.statusCode < 400,
        details: { method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode, sessionId },
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
      });
    });
  }

  const permissions = supportPermissions(staff.role);
  return {
    userId: staff.id,
    email: staff.email,
    name: staff.name,
    role: permissions === null ? 'admin' : 'member',
    companyId: session.companyId,
    roleId: null,
    permissions,
    restrictToUserUnits: false,
    unitsByUser: false,
    plan: normalizePlan(session.company.plan),
    support: { staffId: staff.id, staffRole: staff.role, sessionId },
  };
}

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return next(new AppError('No autenticado. Token requerido.', 401));
  }

  if (isStaffToken(token)) {
    try {
      (req as any).tenant = await supportTenant(req, res, token);
      return next();
    } catch (err) {
      return next(err);
    }
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
        name: true,
        role: true,
        companyId: true,
        tokenVersion: true,
        isActive: true,
        deletedAt: true,
        ownUnits: true,
        mustChangePassword: true,
        company: { select: { isActive: true, deletedAt: true, plan: true } },
        customRole: { select: { id: true, permissions: true, allUnits: true } },
      },
    });

    if (!dbUser || dbUser.deletedAt || !dbUser.isActive || dbUser.company?.deletedAt || dbUser.role !== payload.role || (payload.tokenVersion ?? 0) !== dbUser.tokenVersion) {
      return next(new AppError('Sesión revocada. Inicia sesión nuevamente.', 401));
    }

    // Every company filter keys off companyId, so an account without a
    // company would otherwise match no filter and see every tenant's data.
    if (!dbUser.companyId) {
      return next(new AppError('Tu cuenta no está asignada a ninguna empresa.', 403));
    }

    const isMember = dbUser.role !== 'admin';
    if (isMember && !dbUser.customRole) {
      return next(new AppError('Tu cuenta no tiene un rol asignado. Contacta al administrador.', 403));
    }

    if (dbUser.company && !dbUser.company.isActive) {
      return next(new AppError('La cuenta de esta empresa se encuentra suspendida temporalmente.', 403));
    }

    // A temporary password only unlocks the screen to replace it.
    if (dbUser.mustChangePassword && !TEMPORARY_PASSWORD_ROUTES.has(`${req.method} ${req.originalUrl.split('?')[0]}`)) {
      return next(new AppError('Crea tu contraseña para continuar.', 403, 'password_change_required'));
    }

    (req as any).tenant = {
      userId: dbUser.id,
      email: payload.email,
      name: dbUser.name,
      role: dbUser.role,
      companyId: dbUser.companyId,
      roleId: dbUser.customRole?.id || null,
      permissions: permissionsFor(dbUser.role, dbUser.customRole),
      restrictToUserUnits: isMember && (dbUser.ownUnits || !dbUser.customRole!.allUnits),
      unitsByUser: isMember && dbUser.ownUnits,
      plan: normalizePlan(dbUser.company?.plan),
      support: null,
    } satisfies TenantContext;

    next();
  } catch (err) {
    next(err);
  }
}

export function adminRequired(req: Request, _res: Response, next: NextFunction) {
  if (getTenant(req).role !== 'admin') {
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

export function planRequired(plan: Plan) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const tenant = getTenant(req);
    if (tenant.plan === plan || tenant.support) return next();
    next(new AppError('Esta sección es parte del plan Empresarial.', 403));
  };
}

// Units and GPS are registered and maintained by the floaGPS team (owner
// console or Support Mode); customers only change name, color and figure.
export function ownerTeamRequired(req: Request, _res: Response, next: NextFunction) {
  if (getTenant(req).support) return next();
  next(new AppError('Los datos de las unidades y del GPS los administra el equipo de floaGPS. Contáctanos para cualquier cambio.', 403));
}

// Personal accounts only see the last 30 days: any earlier start date is
// moved forward, and open-ended queries get the cutoff as their start.
export function historyWindow(req: Request, _res: Response, next: NextFunction) {
  const cutoff = historyCutoff(getTenant(req).plan);
  if (!cutoff) return next();
  const query = req.query as Record<string, unknown>;
  for (const key of ['startDate', 'date']) {
    const raw = query[key];
    if (typeof raw === 'string' && raw && new Date(raw) < cutoff) query[key] = cutoff.toISOString();
  }
  if (typeof query.date !== 'string' && typeof query.startDate !== 'string') query.startDate = cutoff.toISOString();
  next();
}
