import { PrismaClient } from '@prisma/client';
import { pageParams } from '../utils/pagination';
import { TenantContext } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { canAccessUnit, unitFilter, unitStatusFilter } from './unitAccess';

const prisma = new PrismaClient();

async function assertMachineInTenant(id: string, tenant: TenantContext) {
  const machine = await prisma.machine.findUnique({ where: { id }, select: { companyId: true, isActive: true, deletedAt: true } });
  if (!machine || machine.deletedAt || (tenant.companyId && machine.companyId !== tenant.companyId)) {
    throw new AppError('Unidad no encontrada', 404);
  }
  return machine;
}

export class MachineService {
  async findAll(query: { search?: string; status?: string; groupId?: string; state?: string; page?: string; limit?: string }, tenant?: TenantContext) {
    const { page, limit, skip } = pageParams(query, 10);

    const where: any = { deletedAt: null, ...unitStatusFilter(query.state, tenant) };
    if (tenant?.companyId) Object.assign(where, unitFilter(tenant));
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { serialNumber: { contains: query.search } },
        { type: { contains: query.search } },
      ];
    }
    if (query.status) where.status = query.status;
    if (typeof query.groupId === 'string' && query.groupId) where.groupId = query.groupId === 'none' ? null : query.groupId;

    const [machines, total] = await Promise.all([
      prisma.machine.findMany({
        where,
        include: {
          group: { select: { id: true, name: true, color: true } },
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
        group: { select: { id: true, name: true, color: true } },
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
    if (tenant && !(await canAccessUnit('machine', id, tenant))) return null;

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

  async setActive(id: string, active: unknown, tenant: TenantContext) {
    await assertMachineInTenant(id, tenant);
    if (typeof active !== 'boolean') throw new AppError('Indica si la unidad queda activa', 400);
    return prisma.machine.update({ where: { id }, data: { isActive: active } });
  }

  // Soft delete, same rules as vehicles: deactivate first, the row and its
  // history stay for support to restore.
  async delete(id: string, tenant: TenantContext) {
    const machine = await assertMachineInTenant(id, tenant);
    if (machine.isActive) throw new AppError('Desactiva la unidad antes de borrarla', 409);
    return prisma.machine.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
