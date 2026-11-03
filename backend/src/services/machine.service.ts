import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../middleware/auth';

const prisma = new PrismaClient();

export class MachineService {
  async findAll(query: { search?: string; status?: string; page?: string; limit?: string }, tenant?: TenantContext) {
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
        { serialNumber: { contains: query.search } },
        { type: { contains: query.search } },
      ];
    }
    if (query.status) where.status = query.status;

    const [machines, total] = await Promise.all([
      prisma.machine.findMany({
        where,
        include: {
          gpsDevice: { include: { positions: { orderBy: { timestamp: 'desc' }, take: 1 } } },
          workSessions: { where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, take: 1 },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.machine.count({ where }),
    ]);

    const result = machines.map((m: any) => ({
      ...m,
      currentPosition: m.gpsDevice?.positions?.[0] || null,
      todaySession: m.workSessions[0] || null,
      gpsDevice: m.gpsDevice ? { ...m.gpsDevice, positions: undefined } : null,
      workSessions: undefined,
    }));

    return { data: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, tenant?: TenantContext) {
    const machine = await prisma.machine.findUnique({
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

    if (!machine) return null;
    if (tenant?.companyId && machine.companyId && machine.companyId !== tenant.companyId) {
      return null;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySession = await prisma.workSession.findFirst({ where: { machineId: id, date: { gte: todayStart } } });

    return {
      ...machine,
      currentPosition: machine.gpsDevice?.positions?.[0] || null,
      gpsDevice: machine.gpsDevice ? { ...machine.gpsDevice, positions: undefined, events: undefined } : null,
      recentEvents: machine.gpsDevice?.events || [],
      todaySession,
      workWeek: machine.workSessions,
    };
  }
}
