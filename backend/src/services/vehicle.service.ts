import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';

const prisma = new PrismaClient();

const VEHICLE_FIELDS = ['name', 'plate', 'type', 'brand', 'vehicleModel', 'year', 'color', 'status'] as const;

function pickVehicleFields(data: any) {
  const picked: Record<string, unknown> = {};
  for (const key of VEHICLE_FIELDS) {
    if (data?.[key] !== undefined && data[key] !== '') picked[key] = key === 'year' ? Number(data[key]) || null : data[key];
  }
  return picked as any;
}

// Mutations must only touch vehicles of the caller's company. Not-found and
// foreign vehicles answer the same 404 so ids from other tenants can't be probed.
async function assertVehicleInTenant(id: string, tenant?: TenantContext) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, select: { companyId: true } });
  if (!vehicle || (tenant?.companyId && vehicle.companyId !== tenant.companyId)) {
    throw new AppError('Unidad no encontrada', 404);
  }
}

function assertGpsInTenant(device: { companyId: string | null } | null, companyId: string | null) {
  if (device && device.companyId && companyId && device.companyId !== companyId) {
    throw new AppError('Ese GPS pertenece a otra empresa', 403);
  }
}

export class VehicleService {
  async findAll(
    query: { search?: string; status?: string; page?: string; limit?: string; sortBy?: string; sortOrder?: string },
    tenant?: TenantContext
  ) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (tenant?.companyId) {
      where.companyId = tenant.companyId;
    }
    if (tenant?.restrictToUserUnits && tenant.userId) {
      where.userUnits = { some: { userId: tenant.userId } };
    }

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
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
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
    if (tenant?.companyId && vehicle.companyId && vehicle.companyId !== tenant.companyId) {
      return null;
    }

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
    return prisma.vehicle.update({ where: { id }, data: { status } });
  }

  async create(data: any, tenant?: TenantContext) {
    const { gps } = data;
    // Only accept known fields: spreading the raw body let a client pick any
    // companyId (or other columns) and create units inside another tenant.
    const vehicleData = pickVehicleFields(data);
    const companyId = (tenant?.isSuperAdmin ? data.companyId : null) || tenant?.companyId || null;

    if (gps && !gps.imei) {
      throw new Error('El dispositivo GPS requiere un IMEI');
    }

    let gpsDeviceData: any = null;
    let existingFreeGpsId: string | null = null;

    if (gps && gps.imei) {
      const existing = await prisma.gpsDevice.findUnique({ where: { imei: String(gps.imei).trim() } });
      if (existing && (existing.vehicleId || existing.machineId)) {
        throw new Error(`El IMEI ${gps.imei} ya está registrado en otro dispositivo`);
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
    if (existing && existing.vehicleId && existing.vehicleId !== id) {
      throw new Error(`El IMEI ${gps.imei} ya está vinculado a otra unidad`);
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

  async delete(id: string, tenant?: TenantContext) {
    await assertVehicleInTenant(id, tenant);
    return prisma.vehicle.update({ where: { id }, data: { isActive: false } });
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
