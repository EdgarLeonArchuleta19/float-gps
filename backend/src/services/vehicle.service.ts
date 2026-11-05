import { PrismaClient } from '@prisma/client';
import { pageParams } from '../utils/pagination';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { canAccessUnit, unitFilter, unitStatusFilter } from './unitAccess';
import { number, text } from '../utils/validate';

const prisma = new PrismaClient();

const STATUSES = ['MOVING', 'STOPPED', 'OFFLINE', 'ALERT'];
const SORTABLE = ['name', 'plate', 'type', 'status', 'createdAt'];

// Whitelist plus type/length checks: spreading the raw body let a client pick
// any companyId, and unchecked types reached Prisma as 500 errors.
function pickVehicleFields(data: any, creating = false) {
  const picked: Record<string, unknown> = {};
  const optional = (key: string, label: string, max: number) => {
    if (data?.[key] === undefined) return;
    picked[key] = data[key] === null || data[key] === '' ? null : text(data[key], label, 1, max);
  };
  if (creating || data?.name !== undefined) picked.name = text(data?.name, 'El nombre', 1, 80);
  if (creating || data?.plate !== undefined) picked.plate = text(data?.plate, 'La placa', 1, 20).toUpperCase();
  if (creating || data?.type !== undefined) picked.type = text(data?.type, 'El tipo', 1, 40);
  optional('brand', 'La marca', 60);
  optional('vehicleModel', 'El modelo', 60);
  optional('color', 'El color', 40);
  if (data?.year !== undefined) picked.year = data.year === null || data.year === '' ? null : Math.round(number(data.year, 'El año', 1950, 2100));
  if (data?.status !== undefined) {
    if (!STATUSES.includes(data.status)) throw new AppError('Estado no válido', 400);
    picked.status = data.status;
  }
  return picked as any;
}

// Mutations must only touch vehicles of the caller's company. Not-found and
// foreign vehicles answer the same 404 so ids from other tenants can't be probed.
async function assertVehicleInTenant(id: string, tenant?: TenantContext) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { companyId: true, isActive: true, deletedAt: true } });
  if (!vehicle || vehicle.deletedAt || (tenant?.companyId && vehicle.companyId !== tenant.companyId)) {
    throw new AppError('Unidad no encontrada', 404);
  }
  return vehicle;
}

function assertGpsInTenant(device: { companyId: string | null } | null, companyId: string | null) {
  if (device && device.companyId && companyId && device.companyId !== companyId) {
    throw new AppError('Ese GPS pertenece a otra empresa', 403);
  }
}

export class VehicleService {
  async findAll(
    query: { search?: string; status?: string; state?: string; page?: string; limit?: string; sortBy?: string; sortOrder?: string },
    tenant?: TenantContext
  ) {
    const { page, limit, skip } = pageParams(query, 10);

    const where: any = { deletedAt: null, ...unitStatusFilter(query.state, tenant) };
    if (tenant?.companyId) Object.assign(where, unitFilter(tenant));

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { plate: { contains: query.search } },
        { type: { contains: query.search } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const orderBy: any = {};
    if (query.sortBy && SORTABLE.includes(query.sortBy)) {
      orderBy[query.sortBy] = query.sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.name = 'asc';
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          gpsDevice: {
            include: {
              positions: { orderBy: { timestamp: 'desc' }, take: 1 },
            },
          },
          workSessions: {
            where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
    ]);

    const result = vehicles.map((v: any) => ({
      ...v,
      currentPosition: v.gpsDevice?.positions?.[0] || null,
      todaySession: v.workSessions[0] || null,
      gpsDevice: v.gpsDevice ? { ...v.gpsDevice, positions: undefined } : null,
      workSessions: undefined,
    }));

    return { data: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, tenant?: TenantContext) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        gpsDevice: {
          include: {
            positions: { orderBy: { timestamp: 'desc' }, take: 1 },
            events: { orderBy: { timestamp: 'desc' }, take: 20 },
          },
        },
        workSessions: {
          where: { date: { gte: new Date(new Date().setDate(new Date().getDate() - 7)) } },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!vehicle) return null;
    if (tenant && !(await canAccessUnit('vehicle', id, tenant))) return null;

    const gpsDeviceId = vehicle.gpsDevice?.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let kmToday = 0;
    if (gpsDeviceId) {
      const todayPositions = await prisma.gpsPosition.findMany({
        where: { gpsDeviceId, timestamp: { gte: todayStart } },
        orderBy: { timestamp: 'asc' },
      });
      for (let i = 1; i < todayPositions.length; i++) {
        kmToday += haversineDistance(
          todayPositions[i - 1].latitude,
          todayPositions[i - 1].longitude,
          todayPositions[i].latitude,
          todayPositions[i].longitude
        );
      }
    }

    const todaySession = await prisma.workSession.findFirst({ where: { vehicleId: id, date: { gte: todayStart } } });

    return {
      ...vehicle,
      currentPosition: vehicle.gpsDevice?.positions?.[0] || null,
      gpsDevice: vehicle.gpsDevice ? { ...vehicle.gpsDevice, positions: undefined, events: undefined } : null,
      recentEvents: vehicle.gpsDevice?.events || [],
      kmToday: parseFloat(kmToday.toFixed(1)),
      todaySession,
      workWeek: vehicle.workSessions,
    };
  }

  async updateStatus(id: string, status: string, tenant?: TenantContext) {
    await assertVehicleInTenant(id, tenant);
    return prisma.vehicle.update({ where: { id }, data: pickVehicleFields({ status }) });
  }

  async create(data: any, tenant?: TenantContext) {
    const { gps } = data;
    // Only accept known fields: spreading the raw body let a client pick any
    // companyId (or other columns) and create units inside another tenant.
    const vehicleData = pickVehicleFields(data, true);
    const companyId = (tenant?.isSuperAdmin ? data.companyId : null) || tenant?.companyId || null;

    if (gps && !gps.imei) {
      throw new AppError('El dispositivo GPS requiere un IMEI', 400);
    }

    let gpsDeviceData: any = null;
    let existingFreeGpsId: string | null = null;

    if (gps && gps.imei) {
      const existing = await prisma.gpsDevice.findUnique({ where: { imei: String(gps.imei).trim() } });
      if (existing && (existing.vehicleId || existing.machineId)) {
        throw new AppError(`El IMEI ${gps.imei} ya está registrado en otro dispositivo`, 409);
      }
      assertGpsInTenant(existing, companyId);
      if (existing) {
        existingFreeGpsId = existing.id;
      } else {
        gpsDeviceData = {
          imei: String(gps.imei).trim(),
          model: gps.model || 'Cellocator CR300B Lite 3G',
          simNumber: gps.simNumber || null,
          isActive: true,
          companyId,
        };
      }
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({
        data: {
          ...vehicleData,
          companyId,
          status: vehicleData.status || 'OFFLINE',
          ...(gpsDeviceData ? { gpsDevice: { create: gpsDeviceData } } : {}),
        },
      });
      if (existingFreeGpsId) {
        await tx.gpsDevice.update({
          where: { id: existingFreeGpsId },
          data: { vehicleId: created.id, companyId },
        });
      }
      return created;
    });
  }

  async update(id: string, data: any, tenant?: TenantContext) {
    await assertVehicleInTenant(id, tenant);
    const { gps } = data;
    const vehicleData = pickVehicleFields(data);

    if (!gps || !gps.imei) {
      return prisma.vehicle.update({ where: { id }, data: vehicleData });
    }

    const existing = await prisma.gpsDevice.findUnique({ where: { imei: String(gps.imei).trim() } });
    if (existing && (existing.machineId || (existing.vehicleId && existing.vehicleId !== id))) {
      throw new AppError(`El IMEI ${gps.imei} ya está vinculado a otra unidad`, 409);
    }
    const current = await prisma.gpsDevice.findUnique({ where: { vehicleId: id }, select: { imei: true } });
    if (current && current.imei !== String(gps.imei).trim()) {
      throw new AppError('Esta unidad ya tiene un GPS; el cambio de equipo lo hace soporte', 409);
    }
    assertGpsInTenant(existing, tenant?.companyId || null);

    return prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.update({ where: { id }, data: vehicleData });
      if (existing && existing.vehicleId === id) {
        await tx.gpsDevice.update({
          where: { id: existing.id },
          data: { model: gps.model || existing.model, simNumber: gps.simNumber ?? existing.simNumber },
        });
      } else if (existing && !existing.vehicleId) {
        await tx.gpsDevice.update({
          where: { id: existing.id },
          data: { vehicleId: id, companyId: vehicle.companyId || tenant?.companyId || null },
        });
      } else {
        await tx.gpsDevice.create({
          data: {
            imei: String(gps.imei).trim(),
            model: gps.model || 'Cellocator CR300B Lite 3G',
            simNumber: gps.simNumber || null,
            isActive: true,
            vehicleId: id,
            companyId: vehicle.companyId || tenant?.companyId || null,
          },
        });
      }
      return vehicle;
    });
  }

  async setActive(id: string, active: unknown, tenant?: TenantContext) {
    await assertVehicleInTenant(id, tenant);
    if (typeof active !== 'boolean') throw new AppError('Indica si la unidad queda activa', 400);
    return prisma.vehicle.update({ where: { id }, data: { isActive: active } });
  }

  // Soft delete: the vehicle, its GPS link and its history stay in the
  // database so support can restore it; only deactivated units can be deleted.
  async delete(id: string, tenant?: TenantContext) {
    const vehicle = await assertVehicleInTenant(id, tenant);
    if (vehicle.isActive) throw new AppError('Desactiva la unidad antes de borrarla', 409);
    return prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
