import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AppError } from './errorHandler';
import { staffStepUpLimiter } from './rateLimit';
import { getClientIp, writeAudit } from '../services/audit.service';
import bcrypt from 'bcryptjs';
import { staffPermissions, type StaffPermission } from '../utils/staffRoles';

const prisma = new PrismaClient();

export const STAFF_AUDIENCE = 'floa-staff';

interface StaffPayload {
  staffId: string;
  role: string;
  tokenVersion: number;
}

export interface StaffContext {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: StaffPermission[];
}

export function signStaffToken(staff: { id: string; role: string; tokenVersion: number }) {
  const payload: StaffPayload = { staffId: staff.id, role: staff.role, tokenVersion: staff.tokenVersion };
  return jwt.sign(payload, config.staffJwtSecret, { expiresIn: config.staffTokenTtl, audience: STAFF_AUDIENCE } as jwt.SignOptions);
}

export function isStaffToken(token: string) {
  const decoded = jwt.decode(token);
  return !!decoded && typeof decoded === 'object' && decoded.aud === STAFF_AUDIENCE;
}

// The console only answers on its own host (STAFF_HOST) and, when
// STAFF_ALLOWED_IPS is set, only from those addresses. Anything else gets a
// plain 404 so the console isn't even discoverable.
export function staffNetworkAllowed(req: Request) {
  if (config.staffHost && req.hostname.toLowerCase() !== config.staffHost) return false;
  return config.staffAllowedIps.length === 0 || config.staffAllowedIps.includes(getClientIp(req));
}

export function staffNetworkRequired(req: Request, _res: Response, next: NextFunction) {
  if (!staffNetworkAllowed(req)) return next(new AppError('Recurso no disponible.', 404));
  next();
}

export async function resolveStaff(token: string): Promise<StaffContext> {
  let payload: StaffPayload;
  try {
    payload = jwt.verify(token, config.staffJwtSecret, { audience: STAFF_AUDIENCE }) as StaffPayload;
  } catch {
    throw new AppError('Sesión de la consola inválida o expirada.', 401);
  }
  const staff = await prisma.staffUser.findUnique({
    where: { id: payload.staffId },
    select: { id: true, email: true, name: true, role: true, isActive: true, tokenVersion: true },
  });
  if (!staff || !staff.isActive || staff.role !== payload.role || staff.tokenVersion !== payload.tokenVersion) {
    throw new AppError('Sesión revocada. Inicia sesión nuevamente.', 401);
  }
  return { id: staff.id, email: staff.email, name: staff.name, role: staff.role, permissions: staffPermissions(staff.role) };
}

export function getStaff(req: Request): StaffContext {
  const staff = (req as any).staff as StaffContext | undefined;
  if (!staff) throw new AppError('No autenticado.', 401);
  return staff;
}

export async function staffRequired(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next(new AppError('No autenticado. Token requerido.', 401));
  try {
    (req as any).staff = await resolveStaff(token);
    next();
  } catch (err) {
    next(err);
  }
}

export function staffCan(...anyOf: StaffPermission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const staff = getStaff(req);
    if (anyOf.some((p) => staff.permissions.includes(p))) return next();
    next(new AppError('Tu rol en el equipo no tiene acceso a esta acción.', 403));
  };
}

export function staffOwnerRequired(req: Request, _res: Response, next: NextFunction) {
  if (getStaff(req).role === 'owner') return next();
  next(new AppError('Solo un Dueño del equipo puede hacer esta acción.', 403));
}

// Delicate actions (deleting, resetting passwords, deactivating team members)
// ask the team member to type their password again (confirmPassword in the
// body), so a console left open alone can't do them.
export function stepUpRequired(action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const staff = getStaff(req);
      const ip = getClientIp(req);
      const keys = [`stepup:${staff.id}`, `stepup-ip:${ip}`];
      staffStepUpLimiter.assertAllowed(keys, 'Demasiados intentos con tu contraseña.');
      const record = await prisma.staffUser.findUnique({ where: { id: staff.id }, select: { password: true } });
      const typed = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';
      const ok = !!record && !!typed && (await bcrypt.compare(typed, record.password).catch(() => false));
      if (!ok) {
        staffStepUpLimiter.recordFailure(keys);
        await writeAudit({
          actorId: staff.id,
          actorEmail: staff.email,
          actorRole: staff.role,
          action: `${action}_PASSWORD_REJECTED`,
          targetId: req.params.id || null,
          success: false,
          ip,
          userAgent: req.headers['user-agent'] || null,
        });
        throw new AppError('Contraseña incorrecta. Acción cancelada.', 403);
      }
      staffStepUpLimiter.clear(keys);
      next();
    } catch (err) {
      next(err);
    }
  };
}
