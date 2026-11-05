import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { assertStrongPassword } from '../utils/passwordPolicy';

const prisma = new PrismaClient();

// Every company user holds one of the company's roles. Picking the system
// "Administrador" role makes the account a company admin; any other role makes
// it a regular member limited by that role's permissions and units.

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  roleId: true,
  companyId: true,
  isActive: true,
  createdAt: true,
  customRole: { select: { name: true, systemKey: true } },
} as const;

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  roleId: string | null;
  companyId: string | null;
  isActive: boolean;
  createdAt: Date;
  customRole: { name: string; systemKey: string | null } | null;
};

function toDto(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    roleId: u.roleId,
    roleName: u.customRole?.name || (u.role === 'admin' ? 'Administrador' : 'Sin rol'),
    companyId: u.companyId,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

function requireCompany(tenant?: TenantContext): string {
  if (!tenant?.companyId) throw new AppError('Entra a una empresa para administrar sus usuarios', 400);
  return tenant.companyId;
}

// Admins may only manage regular users of their own company. The owner account
// and users of other tenants answer 404 so they can't be probed or deleted.
async function findTenantUser(id: string, companyId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === 'superadmin' || user.companyId !== companyId || user.deletedAt) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return user;
}

async function resolveRole(roleId: unknown, companyId: string): Promise<{ roleId: string; role: 'admin' | 'member' }> {
  if (typeof roleId !== 'string' || !roleId) throw new AppError('Asigna un rol al usuario', 400);
  const found = await prisma.role.findUnique({ where: { id: roleId }, select: { companyId: true, systemKey: true, isActive: true, deletedAt: true } });
  if (!found || found.companyId !== companyId || found.deletedAt) throw new AppError('El rol no existe en tu empresa', 400);
  if (!found.isActive) throw new AppError('Ese rol está desactivado; reactívalo o elige otro', 400);
  return { roleId, role: found.systemKey === 'admin' ? 'admin' : 'member' };
}

async function assertNotLastAdmin(userId: string, companyId: string) {
  const otherAdmins = await prisma.user.count({ where: { companyId, role: 'admin', isActive: true, deletedAt: null, NOT: { id: userId } } });
  if (!otherAdmins) throw new AppError('La empresa debe conservar al menos un administrador activo', 400);
}

function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length < 2 || name.length > 80) throw new AppError('El nombre debe tener entre 2 y 80 caracteres', 400);
  return name;
}

export class UserService {
  async findAll(tenant?: TenantContext) {
    const companyId = requireCompany(tenant);
    const users = await prisma.user.findMany({
      where: { companyId, role: { not: 'superadmin' }, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: USER_SELECT,
    });
    return users.map(toDto);
  }

  async create(data: { email?: unknown; password?: unknown; name?: unknown; roleId?: unknown }, tenant?: TenantContext) {
    const companyId = requireCompany(tenant);
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = typeof data.password === 'string' ? data.password : '';
    const name = cleanName(data.name);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('El email no es válido', 400);
    assertStrongPassword(password);
    const assigned = await resolveRole(data.roleId, companyId);

    const existing = await prisma.user.findUnique({ where: { email }, select: { deletedAt: true, isActive: true } });
    if (existing?.deletedAt) throw new AppError('Ese correo pertenece a un usuario borrado. Contacta a soporte para recuperarlo.', 409);
    if (existing) throw new AppError(existing.isActive ? 'Ya existe un usuario con ese email' : 'Ya existe un usuario desactivado con ese email; reactívalo', 409);

    const user = await prisma.user.create({
      data: { email, password: await bcrypt.hash(password, 10), name, ...assigned, companyId },
      select: USER_SELECT,
    });
    return toDto(user);
  }

  async update(id: string, data: { name?: unknown; roleId?: unknown }, tenant?: TenantContext) {
    const companyId = requireCompany(tenant);
    const user = await findTenantUser(id, companyId);
    const changes: { name?: string; roleId?: string; role?: string } = {};
    if (data.name !== undefined) changes.name = cleanName(data.name);
    if (data.roleId !== undefined && data.roleId !== user.roleId) {
      if (tenant?.userId === id) throw new AppError('No puedes cambiar tu propio rol', 400);
      const assigned = await resolveRole(data.roleId, companyId);
      if (user.role === 'admin' && assigned.role !== 'admin') await assertNotLastAdmin(id, companyId);
      Object.assign(changes, assigned);
    }
    const updated = await prisma.user.update({ where: { id }, data: changes, select: USER_SELECT });
    return toDto(updated);
  }

  // Deactivating signs the user out everywhere (tokenVersion) and blocks login.
  async setActive(id: string, active: unknown, tenant?: TenantContext) {
    const companyId = requireCompany(tenant);
    const user = await findTenantUser(id, companyId);
    if (typeof active !== 'boolean') throw new AppError('Indica si el usuario queda activo', 400);
    if (tenant?.userId === id) throw new AppError('No puedes desactivar tu propia cuenta', 400);
    if (active && user.roleId) await resolveRole(user.roleId, companyId);
    if (!active && user.role === 'admin') await assertNotLastAdmin(id, companyId);
    const updated = await prisma.user.update({
      where: { id },
      data: active ? { isActive: true } : { isActive: false, tokenVersion: { increment: 1 } },
      select: USER_SELECT,
    });
    return toDto(updated);
  }

  // Soft delete: the account disappears from the app but stays in the database
  // so support can restore it; only already deactivated users can be deleted.
  async remove(id: string, tenant?: TenantContext) {
    const companyId = requireCompany(tenant);
    const user = await findTenantUser(id, companyId);
    if (tenant?.userId === id) throw new AppError('No puedes borrar tu propia cuenta', 400);
    if (user.isActive) throw new AppError('Desactiva al usuario antes de borrarlo', 409);
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), tokenVersion: { increment: 1 } } });
    return { message: 'Usuario borrado' };
  }
}
