import { PrismaClient } from '@prisma/client';
import { pageParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { number, text } from '../utils/validate';

const prisma = new PrismaClient();

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

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
  return picked as any;
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
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    const vehicles = await prisma.vehicle.findMany({ where: { isActive: true, deletedAt: null, ...companyFilter } });
    const machines = await prisma.machine.findMany({ where: { isActive: true, deletedAt: null, ...companyFilter } });

    return geofences.map((gf) => {
      const totalUnits = vehicles.length + machines.length;
      const unitsInside = Math.floor(Math.random() * totalUnits * 0.6);
      const unitsOutside = totalUnits - unitsInside;

      return {
        ...gf,
        unitsInside,
        unitsOutside,
        totalUnits,
      };
    });
  }

  async findById(id: string, tenant?: TenantContext) {
    await assertGeofenceInTenant(id, tenant);
    const geofence = await prisma.geofence.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });
    return geofence;
  }

  async create(data: any, tenant?: TenantContext) {
    return prisma.geofence.create({
      data: {
        ...pickGeofenceFields(data, true),
        companyId: (tenant?.isSuperAdmin ? data.companyId : null) || tenant?.companyId || null,
      },
    });
  }

  async update(id: string, data: any, tenant?: TenantContext) {
    await assertGeofenceInTenant(id, tenant);
    return prisma.geofence.update({ where: { id }, data: pickGeofenceFields(data) });
  }

  async setActive(id: string, active: unknown, tenant?: TenantContext) {
    await assertGeofenceInTenant(id, tenant);
    if (typeof active !== 'boolean') throw new AppError('Indica si la geocerca queda activa', 400);
    return prisma.geofence.update({ where: { id }, data: { isActive: active } });
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
