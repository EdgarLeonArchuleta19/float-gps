import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ensureSystemRoles } from './systemRoles';
import { AppError } from '../middleware/errorHandler';
import { assertStrongPassword } from '../utils/passwordPolicy';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'empresa';
}

export class OwnerService {
  async getOverview() {
    const [
      companies,
      totalVehicles,
      totalMachines,
      totalGpsDevices,
      linkedGpsDevices,
      totalUsers,
    ] = await Promise.all([
      prisma.company.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            where: { deletedAt: null },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: {
              users: { where: { deletedAt: null } },
              vehicles: { where: { isActive: true, deletedAt: null } },
              machines: { where: { isActive: true, deletedAt: null } },
              geofences: { where: { isActive: true, deletedAt: null } },
              gpsDevices: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.vehicle.count({ where: { isActive: true, deletedAt: null } }),
      prisma.machine.count({ where: { isActive: true, deletedAt: null } }),
      prisma.gpsDevice.count({ where: { deletedAt: null } }),
      prisma.gpsDevice.count({
        where: { deletedAt: null, OR: [{ vehicleId: { not: null } }, { machineId: { not: null } }] },
      }),
      prisma.user.count({ where: { role: { not: 'superadmin' }, deletedAt: null } }),
    ]);

    const activeCompanies = companies.filter((c) => c.isActive).length;
    const suspendedCompanies = companies.length - activeCompanies;

    return {
      metrics: {
        totalCompanies: companies.length,
        activeCompanies,
        suspendedCompanies,
        totalVehicles,
        totalMachines,
        totalUnits: totalVehicles + totalMachines,
        totalGpsDevices,
        linkedGpsDevices,
        availableGpsDevices: totalGpsDevices - linkedGpsDevices,
        totalUsers,
      },
      companies,
    };
  }

  async createCompany(data: {
    name?: string;
    contactEmail?: string;
    contactPhone?: string;
    plan?: string;
    maxUnits?: number;
    notes?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
  }) {
    const name = (data.name || '').trim();
    if (!name) throw new AppError('El nombre de la empresa es obligatorio', 400);

    const baseSlug = slugify(name);
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${baseSlug}-${suffix}`;

    const adminEmail = (data.adminEmail || '').trim().toLowerCase();
    const adminName = (data.adminName || '').trim() || `Admin ${name}`;
    const adminPassword = (data.adminPassword || '').trim();

    if (adminEmail) {
      const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (existingUser) {
        throw new AppError(`El correo ${adminEmail} ya está registrado en el sistema`, 409);
      }
      assertStrongPassword(adminPassword, 'La contraseña del administrador');
    }

    return prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name,
          slug,
          contactEmail: data.contactEmail?.trim() || adminEmail || null,
          contactPhone: data.contactPhone?.trim() || null,
          plan: data.plan || 'PRO',
          maxUnits: Number(data.maxUnits) > 0 ? Number(data.maxUnits) : 50,
          notes: data.notes?.trim() || null,
          isActive: true,
        },
      });

      const roles = await ensureSystemRoles(company.id, tx);
      let createdAdmin = null;
      if (adminEmail && adminPassword) {
        const hash = await bcrypt.hash(adminPassword, 10);
        createdAdmin = await tx.user.create({
          data: {
            email: adminEmail,
            name: adminName,
            password: hash,
            role: 'admin',
            roleId: roles.admin,
            companyId: company.id,
          },
          select: { id: true, email: true, name: true, role: true },
        });
      }

      return { company, admin: createdAdmin };
    });
  }

  async updateCompany(
    id: string,
    data: {
      name?: string;
      contactEmail?: string;
      contactPhone?: string;
      plan?: string;
      maxUnits?: number;
      notes?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new AppError('Empresa no encontrada', 404);

    return prisma.company.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.contactEmail !== undefined ? { contactEmail: data.contactEmail.trim() || null } : {}),
        ...(data.contactPhone !== undefined ? { contactPhone: data.contactPhone.trim() || null } : {}),
        ...(data.plan !== undefined ? { plan: data.plan } : {}),
        ...(data.maxUnits !== undefined ? { maxUnits: Number(data.maxUnits) || 50 } : {}),
        ...(data.notes !== undefined ? { notes: data.notes.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
    });
  }

  async toggleCompanyStatus(id: string) {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new AppError('Empresa no encontrada', 404);

    return prisma.company.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  // Soft delete: the company and everything it owns stay in the database
  // (nothing cascades); its users can no longer sign in until it is restored.
  async deleteCompany(id: string) {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new AppError('Empresa no encontrada', 404);

    await prisma.company.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'Empresa movida a Eliminados' };
  }

  async getCompanyForSupport(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true, deletedAt: true },
    });
    if (!company || company.deletedAt) throw new AppError('Empresa no encontrada', 404);
    return company;
  }

  async listAllUsers() {
    return prisma.user.findMany({
      where: { role: { not: 'superadmin' }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        lastLoginAt: true,
        company: { select: { id: true, name: true, isActive: true, plan: true } },
        customRole: { select: { name: true } },
      },
    });
  }

  async createCompanyUser(data: {
    name?: string;
    email?: string;
    password?: string;
    companyId?: string;
  }) {
    const email = (data.email || '').trim().toLowerCase();
    const name = (data.name || '').trim();
    const password = (data.password || '').trim();
    // The owner only creates each company's admin; the admin then creates the
    // rest of the users with the company's own roles.
    if (!email || !name || !password) {
      throw new AppError('Nombre, correo y contraseña son obligatorios', 400);
    }
    if (!data.companyId || !(await prisma.company.findUnique({ where: { id: data.companyId }, select: { id: true } }))) {
      throw new AppError('Selecciona la empresa del administrador', 400);
    }
    assertStrongPassword(password);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Ya existe un usuario con ese correo electrónico', 409);
    }

    const hash = await bcrypt.hash(password, 10);
    const roles = await ensureSystemRoles(data.companyId);
    return prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role: 'admin',
        roleId: roles.admin,
        companyId: data.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        company: { select: { id: true, name: true } },
      },
    });
  }

  async resetUserPassword(userId: string, newPassword?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404);
    if (user.role === 'superadmin') {
      throw new AppError('La contraseña del Dueño del Sistema solo se cambia desde su propia sesión', 403);
    }

    const passwordToSet =
      newPassword && newPassword.trim().length >= 8
        ? newPassword.trim()
        : 'Floa-' + crypto.randomBytes(5).toString('hex') + '!';

    const hash = await bcrypt.hash(passwordToSet, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash, tokenVersion: { increment: 1 } },
    });

    return {
      userId: user.id,
      email: user.email,
      temporaryPassword: passwordToSet,
      message: 'Contraseña actualizada correctamente',
    };
  }

  async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError('Usuario no encontrado', 404);
    if (user.role === 'superadmin') {
      throw new AppError('No se puede eliminar la cuenta de Dueño del Sistema', 403);
    }
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false, tokenVersion: { increment: 1 } },
    });
    return { message: 'Usuario movido a Eliminados' };
  }

  async listAllGps() {
    return prisma.gpsDevice.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        vehicle: { select: { id: true, name: true, plate: true, companyId: true } },
        machine: { select: { id: true, name: true, serialNumber: true, companyId: true } },
      },
    });
  }

  async createGps(data: {
    imei?: string;
    model?: string;
    simNumber?: string;
    companyId?: string | null;
  }) {
    const imei = (data.imei || '').trim();
    if (!imei) throw new AppError('El IMEI o Unit ID es obligatorio', 400);

    const existing = await prisma.gpsDevice.findUnique({ where: { imei } });
    if (existing) {
      throw new AppError(`El identificador ${imei} ya está registrado en el inventario`, 409);
    }

    return prisma.gpsDevice.create({
      data: {
        imei,
        model: (data.model || 'Cellocator CR300B Lite 3G').trim(),
        simNumber: data.simNumber?.trim() || null,
        companyId: data.companyId || null,
        isActive: true,
      },
      include: {
        company: { select: { id: true, name: true } },
        vehicle: { select: { id: true, name: true, plate: true } },
        machine: { select: { id: true, name: true, serialNumber: true } },
      },
    });
  }

  async updateGps(
    id: string,
    data: {
      imei?: string;
      model?: string;
      simNumber?: string;
      companyId?: string | null;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.gpsDevice.findUnique({ where: { id } });
    if (!existing) throw new AppError('Dispositivo GPS no encontrado', 404);

    return prisma.gpsDevice.update({
      where: { id },
      data: {
        ...(data.imei !== undefined ? { imei: data.imei.trim() } : {}),
        ...(data.model !== undefined ? { model: data.model.trim() } : {}),
        ...(data.simNumber !== undefined ? { simNumber: data.simNumber.trim() || null } : {}),
        ...(data.companyId !== undefined ? { companyId: data.companyId || null } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
      include: {
        company: { select: { id: true, name: true } },
        vehicle: { select: { id: true, name: true, plate: true } },
        machine: { select: { id: true, name: true, serialNumber: true } },
      },
    });
  }

  async deleteGps(id: string) {
    const existing = await prisma.gpsDevice.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new AppError('Dispositivo GPS no encontrado', 404);
    if (existing.vehicleId || existing.machineId) {
      throw new AppError('Desvincula el GPS de su unidad antes de eliminarlo', 409);
    }
    await prisma.gpsDevice.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { message: 'GPS movido a Eliminados' };
  }
}
