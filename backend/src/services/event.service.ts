import { PrismaClient } from '@prisma/client';
import { pageParams } from '../utils/pagination';
import { TenantContext } from '../middleware/auth';
import { gpsDeviceFilter } from './unitAccess';

const prisma = new PrismaClient();

export class EventService {
  async findAll(
    query: { type?: string; unitId?: string; startDate?: string; endDate?: string; page?: string; limit?: string },
    tenant?: TenantContext
  ) {
    const { page, limit, skip } = pageParams(query, 20);

    const where: any = {};
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const gpsFilter: any = {};
    if (query.unitId) {
      gpsFilter.OR = [{ vehicleId: query.unitId }, { machineId: query.unitId }];
    }
    const scope = gpsDeviceFilter(tenant);
    if (scope) gpsFilter.AND = [scope];
    if (Object.keys(gpsFilter).length > 0) {
      where.gpsDevice = gpsFilter;
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
