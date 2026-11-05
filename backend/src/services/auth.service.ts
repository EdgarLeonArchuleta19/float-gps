import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { signToken, safeEqual, type TenantContext } from '../middleware/auth';
import { tenantLoginLimiter, accountLoginLimiter, passwordChangeLimiter, passwordResetRequestLimiter } from '../middleware/rateLimit';
import { sendEmail } from './email.service';
import crypto from 'crypto';
import { config } from '../config';
import { normalizePlan } from '../utils/plans';
import { permissionsFor } from '../utils/permissions';
import { assertStrongPassword, PASSWORD_MIN_LENGTH } from '../utils/passwordPolicy';
import { escapeHtml } from '../utils/html';

const prisma = new PrismaClient();

const DUMMY_HASH = bcrypt.hashSync('floa-timing-guard', 10);
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;

// Codes are stored hashed with a server secret and the user id, so a database
// leak doesn't reveal usable codes.
function hashResetCode(userId: string, code: string) {
  return crypto.createHmac('sha256', config.jwtSecret).update(`${userId}:${code}`).digest('hex');
}


export interface LoginContext {
  ip: string;
  userAgent?: string | null;
}

async function verifyPassword(plain: string, hash: string | undefined) {
  try {
    return await bcrypt.compare(plain, hash || DUMMY_HASH);
  } catch {
    return false;
  }
}

const SESSION_INCLUDE = {
  company: { select: { name: true, slug: true, plan: true, maxUnits: true, isActive: true, deletedAt: true } },
  customRole: { select: { name: true, permissions: true } },
} as const;

function sessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string | null;
  mustChangePassword: boolean;
  company: { name: string; slug: string; plan: string; maxUnits: number } | null;
  customRole: { name: string; permissions: string[] } | null;
}) {
  return {
    id: user.id,
    mustChangePassword: user.mustChangePassword,
    email: user.email,
    name: user.name,
    role: user.role,
    roleName: user.role === 'admin' ? 'Administrador' : user.customRole?.name || null,
    permissions: permissionsFor(user.role, user.customRole),
    companyId: user.companyId,
    companyName: user.company?.name || null,
    companySlug: user.company?.slug || null,
    plan: user.company ? normalizePlan(user.company.plan) : null,
    maxUnits: user.company?.maxUnits ?? null,
  };
}

export class AuthService {
  async me(tenant: TenantContext) {
    if (tenant.support) return this.supportSessionUser(tenant);
    const user = await prisma.user.findUnique({ where: { id: tenant.userId }, include: SESSION_INCLUDE });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    return sessionUser(user);
  }

  // In Support Mode the app runs as the team member inside the company, with
  // the permissions their team role allows there.
  private async supportSessionUser(tenant: TenantContext) {
    const company = await prisma.company.findUnique({
      where: { id: tenant.companyId || '' },
      select: { name: true, slug: true, plan: true, maxUnits: true },
    });
    if (!company) throw new AppError('Empresa no encontrada', 404);
    return {
      id: tenant.userId,
      mustChangePassword: false,
      email: tenant.email,
      name: tenant.name || tenant.email,
      role: tenant.role,
      roleName: 'Soporte floaGPS',
      permissions: tenant.permissions,
      companyId: tenant.companyId,
      companyName: company.name,
      companySlug: company.slug,
      plan: normalizePlan(company.plan),
      maxUnits: company.maxUnits,
    };
  }

  async login(email: string, password: string, ctx: LoginContext) {
    if (!email || !password) {
      throw new AppError('Correo y contraseña son obligatorios', 400);
    }

    const normalized = email.trim().toLowerCase();
    // Each IP gets a tight budget; the per-account budget is much larger so a
    // stranger can't lock someone out with a handful of bad attempts.
    const keys = [`tenant-ip:${ctx.ip}`];
    const accountKeys = [`tenant:${normalized}`];
    tenantLoginLimiter.assertAllowed(keys, 'Demasiados intentos fallidos.');
    accountLoginLimiter.assertAllowed(accountKeys, 'Demasiados intentos fallidos en esta cuenta.');
    const recordFailure = () => {
      tenantLoginLimiter.recordFailure(keys);
      accountLoginLimiter.recordFailure(accountKeys);
    };

    const user = await prisma.user.findUnique({
      where: { email: normalized },
      include: SESSION_INCLUDE,
    });
    const valid = await verifyPassword(password, user?.password);

    if (!user || !valid) {
      recordFailure();
      throw new AppError('Credenciales incorrectas', 401);
    }

    if (user.deletedAt || user.company?.deletedAt) {
      recordFailure();
      throw new AppError('Credenciales incorrectas', 401);
    }
    if (!user.isActive) {
      throw new AppError('Tu cuenta está desactivada. Contacta al administrador de tu empresa.', 403);
    }
    if (user.company && !user.company.isActive) {
      throw new AppError('El acceso de tu empresa se encuentra suspendido temporalmente. Contacta a soporte de FLOA.', 403);
    }

    tenantLoginLimiter.clear(keys);
    accountLoginLimiter.clear(accountKeys);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tokenVersion: user.tokenVersion,
    });

    return { token, user: sessionUser(user) };
  }

  // Step 1 of password recovery: email a short-lived 6-digit code. The
  // password is NOT touched here, so nobody can lock a user out just by
  // knowing their email. The response is identical whether or not the account
  // exists, to avoid leaking which emails are registered.
  async forgotPassword(email: string, ctx: LoginContext) {
    const response = { message: 'Si el correo está registrado, te enviamos un código para restablecer tu contraseña.' };
    if (!email) throw new AppError('El correo es obligatorio', 400);
    const normalized = email.trim().toLowerCase();
    const keys = [`reset:ip:${ctx.ip}`, `reset:email:${normalized}`];
    passwordResetRequestLimiter.assertAllowed(keys, 'Demasiadas solicitudes de recuperación.');
    passwordResetRequestLimiter.recordFailure(keys);

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user || !user.companyId || !user.isActive || user.deletedAt) return response;

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCodeHash: hashResetCode(user.id, code),
        resetCodeExpiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
        resetCodeAttempts: 0,
      },
    });

    const sent = await sendEmail({
      to: user.email,
      idempotencyKey: `password-reset/${user.id}/${hashResetCode(user.id, code).slice(0, 16)}`,
      subject: 'Tu código para restablecer la contraseña · floaGPS',
      html: `
        <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f">
          <h2 style="color:#032347;margin:0 0 8px">Hola, ${escapeHtml(user.name)}</h2>
          <p>Usa este código para restablecer tu contraseña en floaGPS:</p>
          <p style="font-size:30px;font-weight:700;letter-spacing:8px;color:#032347;margin:16px 0">${code}</p>
          <p style="color:#6b7280">Vence en 15 minutos. Si no lo pediste, ignora este correo: tu contraseña no ha cambiado.</p>
        </div>`,
    });
    if (!sent && config.nodeEnv !== 'production') {
      console.log(`[EMAIL-DEV] Código de recuperación para ${user.email}: ${code}`);
    }
    return response;
  }

  // Step 2: verify the code (max 5 tries, 15 min) and set a strong password.
  // Bumping tokenVersion signs the user out of every other session.
  async resetPassword(email: string, code: string, newPassword: string) {
    const invalid = new AppError('El código es inválido o ya venció. Solicita uno nuevo.', 400);
    if (!email || !code || !newPassword) throw new AppError('Correo, código y nueva contraseña son obligatorios', 400);
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !user.companyId || !user.isActive || user.deletedAt || !user.resetCodeHash || !user.resetCodeExpiresAt) throw invalid;
    if (user.resetCodeExpiresAt.getTime() < Date.now() || user.resetCodeAttempts >= RESET_CODE_MAX_ATTEMPTS) throw invalid;

    if (!safeEqual(hashResetCode(user.id, String(code).trim()), user.resetCodeHash)) {
      await prisma.user.update({ where: { id: user.id }, data: { resetCodeAttempts: { increment: 1 } } });
      throw invalid;
    }

    assertStrongPassword(newPassword, 'La nueva contraseña', PASSWORD_MIN_LENGTH);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        tokenVersion: { increment: 1 },
        mustChangePassword: false,
        resetCodeHash: null,
        resetCodeExpiresAt: null,
        resetCodeAttempts: 0,
      },
    });
    passwordResetRequestLimiter.clear([`reset:email:${user.email}`]);
    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    // 400 (not 401) so a typo doesn't log the client out; attempts are limited
    // so a hijacked session can't brute-force the current password. Right
    // after signing in with a temporary password the person just typed it, so
    // it isn't asked again.
    if (!user.mustChangePassword) {
      const keys = [`change:${userId}`];
      passwordChangeLimiter.assertAllowed(keys, 'Demasiados intentos para cambiar la contraseña.');
      const valid = await verifyPassword(currentPassword, user.password);
      if (!valid) {
        passwordChangeLimiter.recordFailure(keys);
        throw new AppError('La contraseña actual es incorrecta', 400);
      }
      passwordChangeLimiter.clear(keys);
    }
    assertStrongPassword(newPassword, 'La nueva contraseña', PASSWORD_MIN_LENGTH);
    if (await verifyPassword(newPassword, user.password)) {
      throw new AppError('La nueva contraseña debe ser distinta a la actual', 400);
    }

    // Bumping tokenVersion signs out every other session; the caller gets a
    // fresh token so the device that changed the password stays logged in.
    const hash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { password: hash, tokenVersion: { increment: 1 }, mustChangePassword: false },
    });

    const token = signToken({
      userId: updated.id,
      email: updated.email,
      role: updated.role,
      companyId: updated.companyId,
      tokenVersion: updated.tokenVersion,
    });

    return { message: 'Contraseña actualizada correctamente', token };
  }
}
