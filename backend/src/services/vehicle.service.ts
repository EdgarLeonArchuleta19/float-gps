import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class VehicleService {
  async findAll(query: { search?: string; status?: string; page?: string; limit?: string; sortBy?: string; sortOrder?: string }) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

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

  async findById(id: string) {
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
        kmToday += haversineDistance(todayPositions[i - 1].latitude, todayPositions[i - 1].longitude, todayPositions[i].latitude, todayPositions[i].longitude);
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

  async updateStatus(id: string, status: string) {
    return prisma.vehicle.update({ where: { id }, data: { status } });
  }

  async create(data: any) {
    const { gps, ...vehicleData } = data;

    if (gps && !gps.imei) {
      throw new Error('El dispositivo GPS requiere un IMEI');
    }

    let gpsDeviceData: any = null;
    if (gps && gps.imei) {
      const existing = await prisma.gpsDevice.findUnique({ where: { imei: String(gps.imei).trim() } });
      if (existing) {
        throw new Error(`El IMEI ${gps.imei} ya está registrado en otro dispositivo`);
      }
      gpsDeviceData = {
        imei: String(gps.imei).trim(),
        model: gps.model || 'Desconocido',
        simNumber: gps.simNumber || null,
        isActive: true,
      };
    }

    return prisma.vehicle.create({
      data: {
        ...vehicleData,
        status: vehicleData.status || 'OFFLINE',
        ...(gpsDeviceData ? { gpsDevice: { create: gpsDeviceData } } : {}),
      },
    });
  }

  async update(id: string, data: any) {
    const { gps, ...vehicleData } = data;

    if (!gps || !gps.imei) {
      return prisma.vehicle.update({ where: { id }, data: vehicleData });
    }

    const existing = await prisma.gpsDevice.findUnique({ where: { imei: String(gps.imei).trim() } });
    if (existing && existing.vehicleId && existing.vehicleId !== id) {
      throw new Error(`El IMEI ${gps.imei} ya está vinculado a otra unidad`);
    }

    return prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.update({ where: { id }, data: vehicleData });
      if (existing && existing.vehicleId === id) {
        await tx.gpsDevice.update({
          where: { id: existing.id },
          data: { model: gps.model || existing.model, simNumber: gps.simNumber ?? existing.simNumber },
        });
      } else if (existing && !existing.vehicleId) {
        await tx.gpsDevice.update({ where: { id: existing.id }, data: { vehicleId: id } });
      } else {
        await tx.gpsDevice.create({
          data: {
            imei: String(gps.imei).trim(),
            model: gps.model || 'Desconocido',
            simNumber: gps.simNumber || null,
            isActive: true,
            vehicleId: id,
          },
        });
      }
      return vehicle;
    });
  }

  async delete(id: string) {
    return prisma.vehicle.update({ where: { id }, data: { isActive: false } });
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
