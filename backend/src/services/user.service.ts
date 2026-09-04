import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

const VALID_ROLES = ['admin', 'viewer', 'operator'];

export class UserService {
  async findAll() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        units: { select: { vehicleId: true, machineId: true } },
      },
    });
    return users.map((u) => ({
      id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt, updatedAt: u.updatedAt,
      units: u.units.map((x) => ({ vehicleId: x.vehicleId, machineId: x.machineId })),
    }));
  }

  async create(data: { email?: string; password?: string; name?: string; role?: string; vehicleIds?: string[]; machineIds?: string[] }) {
    const email = (data.email || '').trim().toLowerCase();
    const name = (data.name || '').trim();
    const password = data.password || '';

    if (!email || !name || !password) {
      throw new AppError('Email, nombre y contraseña son obligatorios', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('El email no es válido', 400);
    }
    if (password.length < 6) {
      throw new AppError('La contraseña debe tener al menos 6 caracteres', 400);
    }

    const role = VALID_ROLES.includes(data.role || '') ? data.role! : 'viewer';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Ya existe un usuario con ese email', 409);
    }

    // Contraseña protegida con bcrypt
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email, password: hash, name, role,
        units: {
          create: [
            ...(data.vehicleIds?.map((vehicleId) => ({ vehicleId })) ?? []),
            ...(data.machineIds?.map((machineId) => ({ machineId })) ?? []),
          ],
        },
      },
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
  }

  async getUserUnits(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const assignments = await prisma.userUnit.findMany({
      where: { userId: id },
      select: { vehicleId: true, machineId: true },
    });

    return {
      vehicleIds: assignments.map((a) => a.vehicleId).filter(Boolean) as string[],
      machineIds: assignments.map((a) => a.machineId).filter(Boolean) as string[],
    };
  }

  async updateUnits(id: string, vehicleIds: string[], machineIds: string[]) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    await prisma.$transaction(async (tx) => {
      await tx.userUnit.deleteMany({ where: { userId: id } });
      if (vehicleIds.length > 0) {
        await tx.userUnit.createMany({
          data: vehicleIds.map((vehicleId) => ({ userId: id, vehicleId })),
        });
      }
      if (machineIds.length > 0) {
        await tx.userUnit.createMany({
          data: machineIds.map((machineId) => ({ userId: id, machineId })),
        });
      }
    });

    return this.getUserUnits(id);
  }

  async remove(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    await prisma.user.delete({ where: { id } });
    return { message: 'Usuario eliminado' };
  }
}
