import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { signToken, safeEqual } from '../middleware/auth';
import { tenantLoginLimiter, ownerLoginLimiter, passwordResetRequestLimiter } from '../middleware/rateLimit';
import { sendEmail } from './email.service';
import crypto from 'crypto';
import { writeAudit } from './audit.service';
import { config } from '../config';
import { assertStrongPassword, OWNER_PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH } from '../utils/passwordPolicy';

const prisma = new PrismaClient();

const DUMMY_HASH = bcrypt.hashSync('floa-timing-guard', 10);
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;

// Codes are stored hashed with a server secret and the user id, so a database
// leak doesn't reveal usable codes.
function hashResetCode(userId: string, code: string) {
  return crypto.createHmac('sha256', config.jwtSecret).update(`${userId}:${code}`).digest('hex');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
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

export class AuthService {
  async login(email: string, password: string, ctx: LoginContext) {
    if (!email || !password) {
      throw new AppError('Correo y contraseña son obligatorios', 400);
    }

    const normalized = email.trim().toLowerCase();
    const keys = [`tenant:${normalized}`, `tenant-ip:${ctx.ip}`];
    tenantLoginLimiter.assertAllowed(keys, 'Demasiados intentos fallidos.');

    const user = await prisma.user.findUnique({
      where: { email: normalized },
      include: { company: true },
    });
    const valid = await verifyPassword(password, user?.password);

    if (!user || !valid) {
      tenantLoginLimiter.recordFailure(keys);
      throw new AppError('Credenciales incorrectas', 401);
    }

    if (user.role === 'superadmin') {
      tenantLoginLimiter.recordFailure(keys);
      await writeAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'OWNER_PUBLIC_LOGIN_BLOCKED',
        success: false,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new AppError('Credenciales incorrectas', 401);
    }

    if (user.company && !user.company.isActive) {
      throw new AppError('El acceso de tu empresa se encuentra suspendido temporalmente. Contacta a soporte de FLOA.', 403);
    }

    tenantLoginLimiter.clear(keys);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      scope: 'tenant',
      tokenVersion: user.tokenVersion,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name || null,
        companySlug: user.company?.slug || null,
      },
    };
  }

  async ownerLogin(email: string, password: string, masterKey: string, ctx: LoginContext) {
    const generic = 'Credenciales de administración inválidas';
    if (!email || !password || !masterKey) {
      throw new AppError('Correo, contraseña y clave maestra son obligatorios', 400);
    }

    const normalized = email.trim().toLowerCase();
    const keys = [`owner:${normalized}`, `owner-ip:${ctx.ip}`];
    ownerLoginLimiter.assertAllowed(keys, 'Consola bloqueada temporalmente por intentos fallidos.');

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    const passwordOk = await verifyPassword(password, user?.password);
    const masterOk = safeEqual(String(masterKey), config.ownerMasterKey);

    if (!user || user.role !== 'superadmin' || !passwordOk || !masterOk) {
      ownerLoginLimiter.recordFailure(keys);
      await writeAudit({
        actorId: user?.id,
        actorEmail: normalized,
        action: 'OWNER_LOGIN_FAILED',
        success: false,
        details: {
          reason: !user || user.role !== 'superadmin' ? 'cuenta_no_valida' : !passwordOk ? 'password' : 'clave_maestra',
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new AppError(generic, 401);
    }

    ownerLoginLimiter.clear(keys);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ctx.ip },
    });

    await writeAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'OWNER_LOGIN_SUCCESS',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    const token = signToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: null,
        scope: 'owner_portal',
        tokenVersion: user.tokenVersion,
      },
      config.ownerTokenTtl,
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: null,
        companyName: null,
      },
    };
  }

  async ownerLogoutAll(userId: string, email: string, ctx: LoginContext) {
    await prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    await writeAudit({
      actorId: userId,
      actorEmail: email,
      action: 'OWNER_REVOKE_ALL_SESSIONS',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { message: 'Todas las sesiones de administración fueron cerradas.' };
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
    if (!user || user.role === 'superadmin') return response;

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
    if (!user || user.role === 'superadmin' || !user.resetCodeHash || !user.resetCodeExpiresAt) throw invalid;
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

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) throw new AppError('La contraseña actual es incorrecta', 401);
    const minLength = user.role === 'superadmin' ? OWNER_PASSWORD_MIN_LENGTH : PASSWORD_MIN_LENGTH;
    assertStrongPassword(newPassword, 'La nueva contraseña', minLength);
    if (await verifyPassword(newPassword, user.password)) {
      throw new AppError('La nueva contraseña debe ser distinta a la actual', 400);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
