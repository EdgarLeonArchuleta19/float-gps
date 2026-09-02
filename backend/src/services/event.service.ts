import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EventService {
  async findAll(query: { type?: string; unitId?: string; startDate?: string; endDate?: string; page?: string; limit?: string }) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }
    if (query.unitId) {
      where.gpsDevice = {
        OR: [{ vehicleId: query.unitId }, { machineId: query.unitId }],
      };
    }

    const [events, total] = await Promise.all([
      prisma.trackingEvent.findMany({
        where,
        include: { gpsDevice: { include: { vehicle: true, machine: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trackingEvent.count({ where }),
    ]);

    return {
      data: events.map((e: any) => ({
        ...e,
        unitName: e.gpsDevice.vehicle?.name || e.gpsDevice.machine?.name || 'Desconocido',
        unitType: e.gpsDevice.vehicle ? 'VEHICLE' : 'MACHINE',
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
