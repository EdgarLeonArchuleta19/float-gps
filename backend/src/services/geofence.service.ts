import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';

const prisma = new PrismaClient();

const GEOFENCE_FIELDS = ['name', 'type', 'color', 'isActive', 'radius', 'centerLat', 'centerLng', 'points'] as const;

// Whitelist so clients can't set companyId (or other columns) through the body.
function pickGeofenceFields(data: any) {
  const picked: Record<string, unknown> = {};
  for (const key of GEOFENCE_FIELDS) {
    if (data?.[key] !== undefined) picked[key] = data[key];
  }
  return picked as any;
}

// Geofences of another company answer 404, same as missing ones.
async function assertGeofenceInTenant(id: string, tenant?: TenantContext) {
  const geofence = await prisma.geofence.findUnique({ where: { id }, select: { companyId: true } });
  if (!geofence || (tenant?.companyId && geofence.companyId !== tenant.companyId)) {
    throw new AppError('Geocerca no encontrada', 404);
  }
}

export class GeofenceService {
  async findAll(tenant?: TenantContext) {
    const companyFilter = tenant?.companyId ? { companyId: tenant.companyId } : {};

    const geofences = await prisma.geofence.findMany({
      where: companyFilter,
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    const vehicles = await prisma.vehicle.findMany({ where: { isActive: true, ...companyFilter } });
    const machines = await prisma.machine.findMany({ where: { isActive: true, ...companyFilter } });

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
        ...pickGeofenceFields(data),
        companyId: (tenant?.isSuperAdmin ? data.companyId : null) || tenant?.companyId || null,
      },
    });
  }

  async update(id: string, data: any, tenant?: TenantContext) {
    await assertGeofenceInTenant(id, tenant);
    return prisma.geofence.update({ where: { id }, data: pickGeofenceFields(data) });
  }

  async delete(id: string, tenant?: TenantContext) {
    await assertGeofenceInTenant(id, tenant);
    return prisma.geofence.delete({ where: { id } });
  }

  async getGeofenceEvents(
    query: { geofenceId?: string; startDate?: string; endDate?: string; page?: string; limit?: string },
    tenant?: TenantContext
  ) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.geofenceId) where.geofenceId = query.geofenceId;
    if (tenant?.companyId) {
      where.geofence = { companyId: tenant.companyId };
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
