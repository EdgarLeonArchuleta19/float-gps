import { PrismaClient } from '@prisma/client';
import { pageParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { number, text } from '../utils/validate';
import { forgetCompanyGeofences, unitsInside } from '../tracker/geofenceWatch';
import { companyUnits, idList } from './unitSelection';

const prisma = new PrismaClient();

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ALERT_ON = ['ENTER', 'EXIT', 'BOTH'];

const TARGETS = { targets: { select: { vehicleId: true, machineId: true, groupId: true } } } as const;

// Whitelist plus validation so clients can't set companyId (or other columns)
// and the color, which reaches map styles, is always a plain hex value.
function pickGeofenceFields(data: any, creating = false) {
  const picked: Record<string, unknown> = {};
  if (creating || data?.name !== undefined) picked.name = text(data?.name, 'El nombre', 1, 80);
  if (creating || data?.type !== undefined) picked.type = text(data?.type, 'El tipo', 1, 40);
  if (data?.color !== undefined) {
    if (typeof data.color !== 'string' || !HEX_COLOR.test(data.color)) throw new AppError('Color no válido', 400);
    picked.color = data.color;
  }
  if (creating || data?.radius !== undefined) picked.radius = number(data?.radius, 'El radio', 50, 50000);
  if (creating || data?.centerLat !== undefined) picked.centerLat = number(data?.centerLat, 'La latitud', -90, 90);
  if (creating || data?.centerLng !== undefined) picked.centerLng = number(data?.centerLng, 'La longitud', -180, 180);
  if (data?.alertOn !== undefined) {
    if (!ALERT_ON.includes(data.alertOn)) throw new AppError('Elige cuándo avisar: al entrar, al salir o ambos', 400);
    picked.alertOn = data.alertOn;
  }
  if (data?.allUnits !== undefined) picked.allUnits = data.allUnits !== false;
  return picked as any;
}

// Which units a geofence watches: all of them, or the picked units and groups
// of the same company.
async function parseTargets(data: any, companyId: string) {
  if (data?.allUnits !== false) return [];
  const units = await companyUnits(data, companyId);
  const groupIds = idList(data.groupIds);
  if (groupIds.length) {
    const found = await prisma.unitGroup.count({ where: { id: { in: groupIds }, companyId, deletedAt: null } });
    if (found !== groupIds.length) throw new AppError('Algún grupo no pertenece a tu empresa', 400);
  }
  const rows = [
    ...units.vehicleIds.map((vehicleId) => ({ vehicleId })),
    ...units.machineIds.map((machineId) => ({ machineId })),
    ...groupIds.map((groupId) => ({ groupId })),
  ];
  if (!rows.length) throw new AppError('Elige al menos una unidad o grupo, o marca "Todas las unidades"', 400);
  return rows;
}

function withTargets<T extends { targets: { vehicleId: string | null; machineId: string | null; groupId: string | null }[] }>(geofence: T) {
  const { targets, ...rest } = geofence;
  return {
    ...rest,
    vehicleIds: targets.map((t) => t.vehicleId).filter(Boolean) as string[],
    machineIds: targets.map((t) => t.machineId).filter(Boolean) as string[],
    groupIds: targets.map((t) => t.groupId).filter(Boolean) as string[],
  };
}

// Geofences of another company answer 404, same as missing ones.
async function assertGeofenceInTenant(id: string, tenant?: TenantContext) {
  const geofence = await prisma.geofence.findUnique({ where: { id }, select: { companyId: true, isActive: true, deletedAt: true } });
  const hidden = !geofence?.isActive && tenant?.permissions !== null;
  if (!geofence || geofence.deletedAt || hidden || (tenant?.companyId && geofence.companyId !== tenant.companyId)) {
    throw new AppError('Geocerca no encontrada', 404);
  }
  return geofence;
}

export class GeofenceService {
  async findAll(tenant?: TenantContext) {
    const companyFilter = tenant?.companyId ? { companyId: tenant.companyId } : {};
    const visible = tenant?.permissions === null ? {} : { isActive: true };

    const geofences = await prisma.geofence.findMany({
      where: { ...companyFilter, ...visible, deletedAt: null },
      include: { events: { orderBy: { timestamp: 'desc' }, take: 5 }, ...TARGETS },
      orderBy: { name: 'asc' },
    });
    return geofences.map((gf) => ({ ...withTargets(gf), unitsInside: unitsInside(gf.id) }));
  }

  async findById(id: string, tenant?: TenantContext) {
    await assertGeofenceInTenant(id, tenant);
    const geofence = await prisma.geofence.findUnique({
      where: { id },
      include: { events: { orderBy: { timestamp: 'desc' }, take: 50 }, ...TARGETS },
    });
    return geofence ? { ...withTargets(geofence), unitsInside: unitsInside(geofence.id) } : null;
  }

  async create(data: any, tenant?: TenantContext) {
    const companyId = tenant?.companyId;
    if (!companyId) throw new AppError('Entra a una empresa para crear geocercas', 400);
    const targets = await parseTargets(data, companyId);
    const geofence = await prisma.geofence.create({
      data: { ...pickGeofenceFields(data, true), companyId, targets: { create: targets } },
      include: TARGETS,
    });
    forgetCompanyGeofences(companyId);
    return withTargets(geofence);
  }

  async update(id: string, data: any, tenant?: TenantContext) {
    const existing = await assertGeofenceInTenant(id, tenant);
    const companyId = existing.companyId!;
    const targets = data?.allUnits === undefined ? null : await parseTargets(data, companyId);
    const geofence = await prisma.$transaction(async (tx) => {
      if (targets) {
        await tx.geofenceTarget.deleteMany({ where: { geofenceId: id } });
        if (targets.length) await tx.geofenceTarget.createMany({ data: targets.map((t) => ({ ...t, geofenceId: id })) });
      }
      return tx.geofence.update({ where: { id }, data: pickGeofenceFields(data), include: TARGETS });
    });
    forgetCompanyGeofences(companyId);
    return withTargets(geofence);
  }

  async setActive(id: string, active: unknown, tenant?: TenantContext) {
    const existing = await assertGeofenceInTenant(id, tenant);
    if (typeof active !== 'boolean') throw new AppError('Indica si la geocerca queda activa', 400);
    const geofence = await prisma.geofence.update({ where: { id }, data: { isActive: active } });
    forgetCompanyGeofences(existing.companyId);
    return geofence;
  }

  // Soft delete: the geofence and its event history stay for support to restore.
  async delete(id: string, tenant?: TenantContext) {
    const geofence = await assertGeofenceInTenant(id, tenant);
    if (geofence.isActive) throw new AppError('Desactiva la geocerca antes de borrarla', 409);
    return prisma.geofence.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getGeofenceEvents(
    query: { geofenceId?: string; startDate?: string; endDate?: string; page?: string; limit?: string },
    tenant?: TenantContext
  ) {
    const { page, limit, skip } = pageParams(query, 20);

    const where: any = {};
    if (query.geofenceId) where.geofenceId = query.geofenceId;
    if (tenant?.companyId) {
      where.geofence = { companyId: tenant.companyId, deletedAt: null };
    }
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const [events, total] = await Promise.all([
      prisma.geofenceEvent.findMany({
        where,
        include: { geofence: true },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.geofenceEvent.count({ where }),
    ]);

    return { data: events, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
