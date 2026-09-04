import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { signToken } from '../middleware/auth';

const prisma = new PrismaClient();

export class AuthService {
  async login(email: string, password: string) {
    if (!email || !password) {
      throw new AppError('Correo y contraseña son obligatorios', 400);
    }

    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      throw new AppError('Credenciales incorrectas', 401);
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch {
      valid = false;
    }
    if (!valid) {
      throw new AppError('Credenciales incorrectas', 401);
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const valid = await bcrypt.compare(currentPassword, user.password).catch(() => false);
    if (!valid) throw new AppError('La contraseña actual es incorrecta', 401);
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}