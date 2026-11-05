import { PrismaClient } from '@prisma/client';
import { DEFAULT_MAX_UNITS, normalizePlan } from '../utils/plans';
import bcrypt from 'bcryptjs';
import { ensureSystemRoles } from './systemRoles';
import { AppError } from '../middleware/errorHandler';
import { assertStrongPassword, generateTemporaryPassword } from '../utils/passwordPolicy';

const prisma = new PrismaClient();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'empresa';
}

// Everything the floaGPS team console manages across companies: companies,
// their first admin, client users and the GPS inventory.
export class ConsoleService {
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
      prisma.user.count({ where: { companyId: { not: null }, deletedAt: null } }),
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

  // A new customer is either Personal (one person: their name is the account
  // name and they are its only user) or Empresarial (business data, RFC and
  // a first administrator). Either way the first login is created here.
  async createCompany(data: Record<string, unknown>) {
    const plan = data.plan === 'PERSONAL' ? 'PERSONAL' : data.plan === 'EMPRESA' ? 'EMPRESA' : null;
    if (!plan) throw new AppError('Elige si el cliente es Personal o Empresarial', 400);
    const field = (key: string, label: string, max: number, required = true) => {
      const value = typeof data[key] === 'string' ? (data[key] as string).trim() : '';
      if (required && !value) throw new AppError(`${label} es obligatorio`, 400);
      if (value.length > max) throw new AppError(`${label} es demasiado largo`, 400);
      return value || null;
    };

    const adminName = field('adminName', plan === 'PERSONAL' ? 'El nombre del cliente' : 'El nombre del administrador', 80)!;
    const adminEmail = field('adminEmail', 'El correo de acceso', 120)!.toLowerCase();
    if (!EMAIL_PATTERN.test(adminEmail)) throw new AppError('El correo de acceso no es válido', 400);
    const adminPassword = typeof data.adminPassword === 'string' ? data.adminPassword : '';
    assertStrongPassword(adminPassword, 'La contraseña de acceso');
    const contactPhone = field('contactPhone', 'El teléfono', 30)!;
    if (contactPhone.replace(/\D/g, '').length < 10) throw new AppError('El teléfono debe tener al menos 10 dígitos', 400);

    const business =
      plan === 'EMPRESA'
        ? {
            name: field('name', 'El nombre comercial', 80)!,
            legalName: field('legalName', 'La razón social', 120)!,
            taxId: field('taxId', 'El RFC', 13)!.toUpperCase(),
            contactEmail: field('contactEmail', 'El correo de la empresa', 120)!.toLowerCase(),
            address: field('address', 'La dirección', 250)!,
            website: field('website', 'El sitio web', 120, false),
          }
        : { name: adminName, legalName: null, taxId: null, contactEmail: adminEmail, address: field('address', 'La dirección', 250, false), website: null };
    if (business.taxId && !RFC_PATTERN.test(business.taxId)) throw new AppError('El RFC no tiene un formato válido (12 o 13 caracteres)', 400);
    if (!EMAIL_PATTERN.test(business.contactEmail)) throw new AppError('El correo de la empresa no es válido', 400);

    const requestedUnits = Number(data.maxUnits);
    const maxUnits = Number.isInteger(requestedUnits) && requestedUnits > 0 && requestedUnits <= 10000 ? requestedUnits : DEFAULT_MAX_UNITS[plan];
    if (await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } })) {
      throw new AppError(`El correo ${adminEmail} ya está registrado en el sistema`, 409);
    }

    return prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          ...business,
          slug: `${slugify(business.name)}-${Math.random().toString(36).slice(2, 6)}`,
          contactPhone,
          plan,
          maxUnits,
          notes: field('notes', 'Las notas', 500, false),
          isActive: true,
        },
      });
      const roles = await ensureSystemRoles(company.id, tx);
      const admin = await tx.user.create({
        data: { email: adminEmail, name: adminName, password: await bcrypt.hash(adminPassword, 10), role: 'admin', roleId: roles.admin, companyId: company.id },
        select: { id: true, email: true, name: true, role: true },
      });
      return { company, admin };
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

  async listAllUsers() {
    return prisma.user.findMany({
      where: { companyId: { not: null }, deletedAt: null },
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
    if (!user || !user.companyId || user.deletedAt) throw new AppError('Usuario no encontrado', 404);

    const custom = (newPassword || '').trim();
    if (custom) assertStrongPassword(custom, 'La nueva contraseña');
    const passwordToSet = custom || generateTemporaryPassword();

    const hash = await bcrypt.hash(passwordToSet, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash, tokenVersion: { increment: 1 }, mustChangePassword: true },
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
    if (!user || !user.companyId || user.deletedAt) throw new AppError('Usuario no encontrado', 404);
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
    const moving = data.companyId !== undefined && (data.companyId || null) !== existing.companyId;
    if (moving && (existing.vehicleId || existing.machineId)) {
      throw new AppError('Desvincula el GPS de su unidad antes de pasarlo a otro cliente', 409);
    }

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
