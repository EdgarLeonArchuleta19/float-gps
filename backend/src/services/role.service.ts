import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { sanitizePermissions } from '../utils/permissions';
import { ensureSystemRoles } from './systemRoles';
import { nameKey } from '../utils/nameKey';

const prisma = new PrismaClient();

const ROLE_INCLUDE = {
  units: { select: { vehicleId: true, machineId: true } },
  _count: { select: { users: { where: { deletedAt: null } } } },
} satisfies Prisma.RoleInclude;

type RoleRow = Prisma.RoleGetPayload<{ include: typeof ROLE_INCLUDE }>;

interface RoleInput {
  name?: unknown;
  permissions?: unknown;
  allUnits?: unknown;
  vehicleIds?: unknown;
  machineIds?: unknown;
}

function toDto(role: RoleRow) {
  return {
    id: role.id,
    name: role.name,
    permissions: sanitizePermissions(role.permissions),
    allUnits: role.allUnits,
    isActive: role.isActive,
    systemKey: role.systemKey,
    vehicleIds: role.units.map((u) => u.vehicleId).filter(Boolean) as string[],
    machineIds: role.units.map((u) => u.machineId).filter(Boolean) as string[],
    userCount: role._count.users,
    createdAt: role.createdAt,
  };
}

function requireCompany(tenant: TenantContext): string {
  if (!tenant.companyId) throw new AppError('Entra a una empresa para administrar sus roles', 400);
  return tenant.companyId;
}

function idList(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && !!v))] : [];
}

// Roles of another company (or already deleted) answer 404, same as missing ones.
async function findTenantRole(id: string, companyId: string) {
  const role = await prisma.role.findUnique({ where: { id }, select: { companyId: true, systemKey: true, isActive: true, deletedAt: true } });
  if (!role || role.companyId !== companyId || role.deletedAt) throw new AppError('Rol no encontrado', 404);
  return role;
}

async function findEditableRole(id: string, companyId: string) {
  const role = await findTenantRole(id, companyId);
  if (role.systemKey) throw new AppError('Los roles predeterminados no se pueden editar, desactivar ni borrar', 403);
  return role;
}

async function assertWithoutUsers(id: string, action: string) {
  const users = await prisma.user.count({ where: { roleId: id, deletedAt: null } });
  if (users) throw new AppError(`Este rol tiene ${users} usuario(s). Cámbialos de rol antes de ${action}lo.`, 409);
}

async function parseInput(data: RoleInput, companyId: string) {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (name.length < 2 || name.length > 60) throw new AppError('El nombre del rol debe tener entre 2 y 60 caracteres', 400);

  const allUnits = data.allUnits !== false;
  const vehicleIds = allUnits ? [] : idList(data.vehicleIds);
  const machineIds = allUnits ? [] : idList(data.machineIds);
  if (!allUnits && !vehicleIds.length && !machineIds.length) {
    throw new AppError('Selecciona al menos una unidad o elige "Todas las unidades"', 400);
  }

  const [vehicles, machines] = await Promise.all([
    prisma.vehicle.count({ where: { id: { in: vehicleIds }, companyId, deletedAt: null } }),
    prisma.machine.count({ where: { id: { in: machineIds }, companyId, deletedAt: null } }),
  ]);
  if (vehicles !== vehicleIds.length || machines !== machineIds.length) {
    throw new AppError('Alguna unidad no pertenece a tu empresa', 403);
  }

  return { name, permissions: sanitizePermissions(data.permissions), allUnits, vehicleIds, machineIds };
}

function unitRows(vehicleIds: string[], machineIds: string[]) {
  return [...vehicleIds.map((vehicleId) => ({ vehicleId })), ...machineIds.map((machineId) => ({ machineId }))];
}

function duplicateName(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new AppError('Ya existe un rol con ese nombre (sin importar mayúsculas, acentos o espacios)', 409);
  }
  throw err;
}

export class RoleService {
  async findAll(tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    await ensureSystemRoles(companyId);
    const roles = await prisma.role.findMany({ where: { companyId, deletedAt: null }, include: ROLE_INCLUDE, orderBy: { name: 'asc' } });
    const order = (r: RoleRow) => ['admin', 'operator', 'viewer'].indexOf(r.systemKey || '');
    return roles.sort((a, b) => (order(a) < 0 ? 99 : order(a)) - (order(b) < 0 ? 99 : order(b))).map(toDto);
  }

  async findById(id: string, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    await findTenantRole(id, companyId);
    return toDto(await prisma.role.findUniqueOrThrow({ where: { id }, include: ROLE_INCLUDE }));
  }

  async create(data: RoleInput, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    const input = await parseInput(data, companyId);
    const role = await prisma.role
      .create({
        data: {
          name: input.name,
          nameKey: nameKey(input.name),
          permissions: input.permissions,
          allUnits: input.allUnits,
          companyId,
          units: { create: unitRows(input.vehicleIds, input.machineIds) },
        },
        include: ROLE_INCLUDE,
      })
      .catch(duplicateName);
    return toDto(role);
  }

  async update(id: string, data: RoleInput, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    await findEditableRole(id, companyId);
    const input = await parseInput(data, companyId);
    const role = await prisma
      .$transaction(async (tx) => {
        await tx.roleUnit.deleteMany({ where: { roleId: id } });
        return tx.role.update({
          where: { id },
          data: {
            name: input.name,
            nameKey: nameKey(input.name),
            permissions: input.permissions,
            allUnits: input.allUnits,
            units: { create: unitRows(input.vehicleIds, input.machineIds) },
          },
          include: ROLE_INCLUDE,
        });
      })
      .catch(duplicateName);
    return toDto(role);
  }

  async setActive(id: string, active: unknown, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    await findEditableRole(id, companyId);
    if (typeof active !== 'boolean') throw new AppError('Indica si el rol queda activo', 400);
    if (!active) await assertWithoutUsers(id, 'desactivar');
    return toDto(await prisma.role.update({ where: { id }, data: { isActive: active }, include: ROLE_INCLUDE }));
  }

  // Soft delete: the row stays for history and support can restore it. The
  // name is released (nameKey cleared) so a new role can reuse it.
  async remove(id: string, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    const role = await findEditableRole(id, companyId);
    if (role.isActive) throw new AppError('Desactiva el rol antes de borrarlo', 409);
    await assertWithoutUsers(id, 'borrar');
    await prisma.role.update({ where: { id }, data: { deletedAt: new Date(), nameKey: null } });
    return { message: 'Rol borrado' };
  }
}
