import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AppError } from '../middleware/errorHandler';
import type { StaffContext } from '../middleware/staffAuth';
import { isStaffRole } from '../utils/staffRoles';
import { assertStrongPassword, generateTemporaryPassword, STAFF_PASSWORD_MIN_LENGTH } from '../utils/passwordPolicy';

const prisma = new PrismaClient();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TEAM_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

// The team always keeps at least one active owner, so nobody can lock the
// company out of its own console.
async function assertAnotherOwner(id: string) {
  const owners = await prisma.staffUser.count({ where: { role: 'owner', isActive: true, id: { not: id } } });
  if (owners === 0) throw new AppError('El equipo debe conservar al menos un Dueño activo.', 409);
}

async function findMember(id: string) {
  const member = await prisma.staffUser.findUnique({ where: { id } });
  if (!member) throw new AppError('Integrante no encontrado', 404);
  return member;
}

// Team members are never deleted: deactivating closes their sessions and
// keeps their history in the audit log.
export class TeamService {
  list() {
    return prisma.staffUser.findMany({ orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }], select: TEAM_SELECT });
  }

  async create(data: { name?: string; email?: string; role?: string; password?: string }) {
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    if (name.length < 2) throw new AppError('Escribe el nombre del integrante', 400);
    if (!EMAIL_PATTERN.test(email)) throw new AppError('Escribe un correo válido', 400);
    if (!isStaffRole(data.role)) throw new AppError('Elige un rol del equipo', 400);
    const password = String(data.password || '') || generateTemporaryPassword();
    assertStrongPassword(password, 'La contraseña', STAFF_PASSWORD_MIN_LENGTH);
    if (await prisma.staffUser.findUnique({ where: { email }, select: { id: true } })) {
      throw new AppError('Ya hay un integrante con ese correo', 409);
    }
    const member = await prisma.staffUser.create({
      data: { name, email, role: data.role, password: await bcrypt.hash(password, 10) },
      select: TEAM_SELECT,
    });
    return { member, temporaryPassword: data.password ? null : password };
  }

  async update(id: string, data: { name?: string; role?: string }, actor: StaffContext) {
    const member = await findMember(id);
    const name = data.name !== undefined ? String(data.name).trim() : member.name;
    if (name.length < 2) throw new AppError('Escribe el nombre del integrante', 400);
    let role = member.role;
    if (data.role !== undefined && data.role !== member.role) {
      if (!isStaffRole(data.role)) throw new AppError('Elige un rol del equipo', 400);
      if (id === actor.id) throw new AppError('No puedes cambiar tu propio rol', 403);
      if (member.role === 'owner') await assertAnotherOwner(id);
      role = data.role;
    }
    return prisma.staffUser.update({
      where: { id },
      data: { name, role, ...(role !== member.role ? { tokenVersion: { increment: 1 } } : {}) },
      select: TEAM_SELECT,
    });
  }

  async setActive(id: string, active: unknown, actor: StaffContext) {
    const member = await findMember(id);
    const isActive = active === true;
    if (id === actor.id) throw new AppError('No puedes desactivar tu propia cuenta', 403);
    if (!isActive && member.role === 'owner') await assertAnotherOwner(id);
    if (!isActive) await prisma.supportSession.updateMany({ where: { staffId: id, endedAt: null }, data: { endedAt: new Date() } });
    return prisma.staffUser.update({
      where: { id },
      data: { isActive, tokenVersion: { increment: 1 } },
      select: TEAM_SELECT,
    });
  }

  async resetPassword(id: string, actor: StaffContext) {
    if (id === actor.id) throw new AppError('Cambia tu contraseña desde "Mi cuenta"', 403);
    await findMember(id);
    const password = generateTemporaryPassword();
    await prisma.staffUser.update({
      where: { id },
      data: { password: await bcrypt.hash(password, 10), tokenVersion: { increment: 1 } },
    });
    return { temporaryPassword: password };
  }
}
