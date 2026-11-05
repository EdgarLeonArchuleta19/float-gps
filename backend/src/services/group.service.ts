import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { nameKey } from '../utils/nameKey';
import { companyUnits, type UnitSelection } from './unitSelection';

const prisma = new PrismaClient();

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const GROUP_INCLUDE = {
  vehicles: { where: { deletedAt: null }, select: { id: true } },
  machines: { where: { deletedAt: null }, select: { id: true } },
} as const;

function requireCompany(tenant: TenantContext): string {
  if (!tenant.companyId) throw new AppError('Entra a una empresa para administrar sus grupos', 400);
  return tenant.companyId;
}

function toDto(group: { id: string; name: string; color: string; isActive: boolean; vehicles: { id: string }[]; machines: { id: string }[] }) {
  return {
    id: group.id,
    name: group.name,
    color: group.color,
    isActive: group.isActive,
    vehicleIds: group.vehicles.map((v) => v.id),
    machineIds: group.machines.map((m) => m.id),
    unitCount: group.vehicles.length + group.machines.length,
  };
}

async function findGroup(id: string, companyId: string) {
  const group = await prisma.unitGroup.findUnique({ where: { id }, select: { companyId: true, isActive: true, deletedAt: true, name: true } });
  if (!group || group.companyId !== companyId || group.deletedAt) throw new AppError('Grupo no encontrado', 404);
  return group;
}

function parseInput(data: { name?: unknown; color?: unknown }) {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (name.length < 2 || name.length > 60) throw new AppError('El nombre del grupo debe tener entre 2 y 60 caracteres', 400);
  const color = typeof data.color === 'string' && HEX_COLOR.test(data.color) ? data.color : '#032347';
  return { name, color, nameKey: nameKey(name) };
}

async function assertFreeName(companyId: string, key: string, exceptId?: string) {
  const clash = await prisma.unitGroup.findUnique({ where: { companyId_nameKey: { companyId, nameKey: key } }, select: { id: true } });
  if (clash && clash.id !== exceptId) throw new AppError('Ya tienes un grupo con ese nombre', 409);
}

// A unit belongs to at most one group: saving a group moves the picked units
// into it and takes out the ones that were unchecked.
async function placeUnits(groupId: string, { vehicleIds, machineIds }: UnitSelection, companyId: string) {
  await prisma.$transaction([
    prisma.vehicle.updateMany({ where: { groupId, id: { notIn: vehicleIds } }, data: { groupId: null } }),
    prisma.machine.updateMany({ where: { groupId, id: { notIn: machineIds } }, data: { groupId: null } }),
    prisma.vehicle.updateMany({ where: { id: { in: vehicleIds }, companyId }, data: { groupId } }),
    prisma.machine.updateMany({ where: { id: { in: machineIds }, companyId }, data: { groupId } }),
  ]);
}

export class GroupService {
  async list(tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    const groups = await prisma.unitGroup.findMany({
      where: { companyId, deletedAt: null, ...(tenant.permissions === null ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
      include: GROUP_INCLUDE,
    });
    return groups.map(toDto);
  }

  async create(data: Record<string, unknown>, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    const input = parseInput(data);
    await assertFreeName(companyId, input.nameKey);
    const units = await companyUnits(data, companyId);
    const group = await prisma.unitGroup.create({ data: { ...input, companyId } });
    await placeUnits(group.id, units, companyId);
    return this.get(group.id);
  }

  async update(id: string, data: Record<string, unknown>, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    await findGroup(id, companyId);
    const input = parseInput(data);
    await assertFreeName(companyId, input.nameKey, id);
    const units = data.vehicleIds !== undefined || data.machineIds !== undefined ? await companyUnits(data, companyId) : null;
    await prisma.unitGroup.update({ where: { id }, data: input });
    if (units) await placeUnits(id, units, companyId);
    return this.get(id);
  }

  async setActive(id: string, active: unknown, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    await findGroup(id, companyId);
    if (typeof active !== 'boolean') throw new AppError('Indica si el grupo queda activo', 400);
    await prisma.unitGroup.update({ where: { id }, data: { isActive: active } });
    return this.get(id);
  }

  // Soft delete: the units leave the group and its name becomes free again.
  async remove(id: string, tenant: TenantContext) {
    const companyId = requireCompany(tenant);
    const group = await findGroup(id, companyId);
    if (group.isActive) throw new AppError('Desactiva el grupo antes de borrarlo', 409);
    await prisma.$transaction([
      prisma.vehicle.updateMany({ where: { groupId: id }, data: { groupId: null } }),
      prisma.machine.updateMany({ where: { groupId: id }, data: { groupId: null } }),
      prisma.unitGroup.update({ where: { id }, data: { deletedAt: new Date(), nameKey: `${nameKey(group.name)}#${id}` } }),
    ]);
    return { message: 'Grupo borrado' };
  }

  private async get(id: string) {
    const group = await prisma.unitGroup.findUniqueOrThrow({ where: { id }, include: GROUP_INCLUDE });
    return toDto(group);
  }
}
