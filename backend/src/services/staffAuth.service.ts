import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { staffLoginLimiter, passwordChangeLimiter } from '../middleware/rateLimit';
import { signStaffToken, type StaffContext } from '../middleware/staffAuth';
import { writeAudit } from './audit.service';
import { staffPermissions } from '../utils/staffRoles';
import { assertStrongPassword, STAFF_PASSWORD_MIN_LENGTH } from '../utils/passwordPolicy';

const prisma = new PrismaClient();

const DUMMY_HASH = bcrypt.hashSync('floa-staff-timing-guard', 10);
const GENERIC = 'Credenciales de la consola inválidas';

export interface StaffLoginContext {
  ip: string;
  userAgent?: string | null;
}

export function publicStaff(staff: { id: string; email: string; name: string; role: string }) {
  return { id: staff.id, email: staff.email, name: staff.name, role: staff.role, permissions: staffPermissions(staff.role) };
}

export async function passwordMatches(plain: string, hash: string | undefined) {
  try {
    return await bcrypt.compare(plain || '', hash || DUMMY_HASH);
  } catch {
    return false;
  }
}

export class StaffAuthService {
  async login(email: string, password: string, ctx: StaffLoginContext) {
    if (!email || !password) throw new AppError('Correo y contraseña son obligatorios', 400);
    const normalized = String(email).trim().toLowerCase();
    const keys = [`staff:${normalized}`, `staff-ip:${ctx.ip}`];
    staffLoginLimiter.assertAllowed(keys, 'Consola bloqueada temporalmente por intentos fallidos.');

    const staff = await prisma.staffUser.findUnique({ where: { email: normalized } });
    const ok = await passwordMatches(password, staff?.password);
    if (!staff || !ok || !staff.isActive) {
      staffLoginLimiter.recordFailure(keys);
      await writeAudit({
        actorId: staff?.id,
        actorEmail: normalized,
        action: 'STAFF_LOGIN_FAILED',
        success: false,
        details: { reason: !staff ? 'cuenta_no_valida' : !ok ? 'password' : 'desactivado' },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new AppError(GENERIC, 401);
    }

    staffLoginLimiter.clear(keys);
    const updated = await prisma.staffUser.update({ where: { id: staff.id }, data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip } });
    await writeAudit({ actorId: staff.id, actorEmail: staff.email, actorRole: staff.role, action: 'STAFF_LOGIN_SUCCESS', ip: ctx.ip, userAgent: ctx.userAgent });
    return { token: signStaffToken(updated), staff: publicStaff(updated) };
  }

  async changePassword(staff: StaffContext, currentPassword: string, newPassword: string, ctx: StaffLoginContext) {
    const record = await prisma.staffUser.findUnique({ where: { id: staff.id } });
    if (!record) throw new AppError('Cuenta no encontrada', 404);
    const keys = [`staff-change:${staff.id}`];
    passwordChangeLimiter.assertAllowed(keys, 'Demasiados intentos para cambiar la contraseña.');
    if (!(await passwordMatches(currentPassword, record.password))) {
      passwordChangeLimiter.recordFailure(keys);
      throw new AppError('La contraseña actual es incorrecta', 400);
    }
    passwordChangeLimiter.clear(keys);
    assertStrongPassword(newPassword, 'La nueva contraseña', STAFF_PASSWORD_MIN_LENGTH);
    if (await passwordMatches(newPassword, record.password)) {
      throw new AppError('La nueva contraseña debe ser distinta a la actual', 400);
    }
    const updated = await prisma.staffUser.update({
      where: { id: staff.id },
      data: { password: await bcrypt.hash(newPassword, 10), tokenVersion: { increment: 1 } },
    });
    await writeAudit({ actorId: staff.id, actorEmail: staff.email, actorRole: staff.role, action: 'STAFF_PASSWORD_CHANGED', ip: ctx.ip, userAgent: ctx.userAgent });
    return { message: 'Contraseña actualizada correctamente', token: signStaffToken(updated) };
  }

  async logoutAll(staff: StaffContext, ctx: StaffLoginContext) {
    await prisma.staffUser.update({ where: { id: staff.id }, data: { tokenVersion: { increment: 1 } } });
    await prisma.supportSession.updateMany({ where: { staffId: staff.id, endedAt: null }, data: { endedAt: new Date() } });
    await writeAudit({ actorId: staff.id, actorEmail: staff.email, actorRole: staff.role, action: 'STAFF_REVOKE_ALL_SESSIONS', ip: ctx.ip, userAgent: ctx.userAgent });
    return { message: 'Se cerraron todas tus sesiones de la consola.' };
  }
}
