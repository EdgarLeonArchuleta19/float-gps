import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GeofenceService {
  async findAll() {
    const geofences = await prisma.geofence.findMany({
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    });

    const vehicles = await prisma.vehicle.findMany({ where: { isActive: true } });
    const machines = await prisma.machine.findMany({ where: { isActive: true } });

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

  async findById(id: string) {
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

  async create(data: any) {
    return prisma.geofence.create({ data });
  }

  async update(id: string, data: any) {
    return prisma.geofence.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.geofence.delete({ where: { id } });
  }

  async getGeofenceEvents(query: { geofenceId?: string; startDate?: string; endDate?: string; page?: string; limit?: string }) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.geofenceId) where.geofenceId = query.geofenceId;
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
