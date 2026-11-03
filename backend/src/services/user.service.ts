import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { assertStrongPassword } from '../utils/passwordPolicy';

const prisma = new PrismaClient();

// Company admins can only add operators and read-only users; each company's admin
// account is created by the owner from the owner console.
const VALID_ROLES = ['viewer', 'operator'];

// Admins may only manage regular users of their own company. The owner account
// and users of other tenants answer 404 so they can't be probed or deleted.
async function findTenantUser(id: string, tenant?: TenantContext) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === 'superadmin' || (tenant?.companyId && user.companyId !== tenant.companyId)) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return user;
}

export class UserService {
  async findAll(tenant?: TenantContext) {
    const where: any = { role: { not: 'superadmin' } };
    if (tenant?.companyId) {
      where.companyId = tenant.companyId;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        units: { select: { vehicleId: true, machineId: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      companyId: u.companyId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      units: u.units.map((x) => ({ vehicleId: x.vehicleId, machineId: x.machineId })),
    }));
  }

  async create(
    data: { email?: string; password?: string; name?: string; role?: string; vehicleIds?: string[]; machineIds?: string[] },
    tenant?: TenantContext
  ) {
    const email = (data.email || '').trim().toLowerCase();
    const name = (data.name || '').trim();
    const password = data.password || '';

    if (!email || !name || !password) {
      throw new AppError('Email, nombre y contraseña son obligatorios', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('El email no es válido', 400);
    }
    assertStrongPassword(password);

    const role = VALID_ROLES.includes(data.role || '') ? data.role! : 'viewer';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Ya existe un usuario con ese email', 409);
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        role,
        companyId: tenant?.companyId || null,
        units: {
          create: [
            ...(data.vehicleIds?.map((vehicleId) => ({ vehicleId })) ?? []),
            ...(data.machineIds?.map((machineId) => ({ machineId })) ?? []),
          ],
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      createdAt: user.createdAt,
    };
  }

  async getUserUnits(id: string, tenant?: TenantContext) {
    await findTenantUser(id, tenant);

    const assignments = await prisma.userUnit.findMany({
      where: { userId: id },
      select: { vehicleId: true, machineId: true },
    });

    return {
      vehicleIds: assignments.map((a) => a.vehicleId).filter(Boolean) as string[],
      machineIds: assignments.map((a) => a.machineId).filter(Boolean) as string[],
    };
  }

  async updateUnits(id: string, vehicleIds: string[], machineIds: string[], tenant?: TenantContext) {
    await findTenantUser(id, tenant);
    if (tenant?.companyId) {
      const [vehicles, machines] = await Promise.all([
        prisma.vehicle.count({ where: { id: { in: vehicleIds }, companyId: tenant.companyId } }),
        prisma.machine.count({ where: { id: { in: machineIds }, companyId: tenant.companyId } }),
      ]);
      if (vehicles !== vehicleIds.length || machines !== machineIds.length) {
        throw new AppError('Alguna unidad no pertenece a tu empresa', 403);
      }
    }

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

    return this.getUserUnits(id, tenant);
  }

  async remove(id: string, tenant?: TenantContext) {
    await findTenantUser(id, tenant);
    if (tenant?.userId === id) throw new AppError('No puedes eliminar tu propia cuenta', 400);
    await prisma.user.delete({ where: { id } });
    return { message: 'Usuario eliminado' };
  }
}
