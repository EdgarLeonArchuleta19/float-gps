import { Prisma, PrismaClient } from '@prisma/client';
import { PERMISSIONS, type Permission } from '../utils/permissions';
import { nameKey } from '../utils/nameKey';

const prisma = new PrismaClient();

type Db = PrismaClient | Prisma.TransactionClient;

export type SystemRoleKey = 'admin' | 'operator' | 'viewer';

// Every company gets these roles; they can be assigned but never edited or
// deleted. Picking "admin" makes the user a company administrator.
const SYSTEM_ROLES: { key: SystemRoleKey; name: string; permissions: readonly Permission[] }[] = [
  { key: 'admin', name: 'Administrador', permissions: PERMISSIONS },
  { key: 'operator', name: 'Operador', permissions: PERMISSIONS },
  { key: 'viewer', name: 'Solo lectura', permissions: ['dashboard', 'alerts', 'fleet', 'geofences', 'reports'] },
];

async function freeName(db: Db, companyId: string, name: string, key: SystemRoleKey) {
  const taken = await db.role.findUnique({ where: { companyId_nameKey: { companyId, nameKey: nameKey(name) } }, select: { systemKey: true } });
  return !taken || taken.systemKey === key ? name : `${name} (predeterminado)`;
}

export async function ensureSystemRoles(companyId: string, db: Db = prisma): Promise<Record<SystemRoleKey, string>> {
  const ids = {} as Record<SystemRoleKey, string>;
  for (const def of SYSTEM_ROLES) {
    const existing = await db.role.findUnique({
      where: { companyId_systemKey: { companyId, systemKey: def.key } },
      select: { id: true },
    });
    const data = { permissions: [...def.permissions], allUnits: true, isActive: true, deletedAt: null };
    const name = existing ? null : await freeName(db, companyId, def.name, def.key);
    const role = existing
      ? await db.role.update({ where: { id: existing.id }, data, select: { id: true } })
      : await db.role.create({
          data: { ...data, companyId, systemKey: def.key, name: name!, nameKey: nameKey(name!) },
          select: { id: true },
        });
    await db.roleUnit.deleteMany({ where: { roleId: role.id } });
    ids[def.key] = role.id;
  }
  return ids;
}

// Startup sync: every company has its system roles, admins point at the
// Administrador role and nobody holding that role lacks admin rights.
export async function syncSystemRoles() {
  const unkeyed = await prisma.role.findMany({ where: { nameKey: null, deletedAt: null }, select: { id: true, name: true } });
  for (const role of unkeyed) {
    await prisma.role.update({ where: { id: role.id }, data: { nameKey: nameKey(role.name) } }).catch(() => {
      console.warn(`[ROLES] El rol "${role.name}" repite el nombre de otro rol; renómbralo.`);
    });
  }
  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const { id } of companies) {
    const roles = await ensureSystemRoles(id);
    await prisma.user.updateMany({
      where: { companyId: id, role: 'admin', OR: [{ roleId: null }, { roleId: { not: roles.admin } }] },
      data: { roleId: roles.admin },
    });
    await prisma.user.updateMany({ where: { companyId: id, roleId: roles.admin, role: { not: 'admin' } }, data: { role: 'admin' } });
  }
}
