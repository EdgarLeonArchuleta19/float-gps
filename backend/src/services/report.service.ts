import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../middleware/auth';
import { CompanyService } from './company.service';
import { haversineKm, isWorkingTime } from '../utils/workSchedule';
import { gpsDeviceFilter, linkedUnitFilter } from './unitAccess';

const companyService = new CompanyService();
// Gaps longer than this between two points are not counted as driven distance.
const MAX_SEGMENT_GAP_MS = 30 * 60 * 1000;

const prisma = new PrismaClient();

function applyCompanySessionFilter(where: any, tenant?: TenantContext) {
  const scope = linkedUnitFilter(tenant);
  if (scope) where.AND = [...(where.AND || []), scope];
}

export class ReportService {
  async getDailyReport(query: { vehicleId?: string; machineId?: string; date?: string }, tenant?: TenantContext) {
    const date = query.date ? new Date(query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const where: any = {
      date: { gte: date, lte: endDate },
    };

    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.machineId) where.machineId = query.machineId;
    applyCompanySessionFilter(where, tenant);

    const sessions = await prisma.workSession.findMany({
      where,
      include: {
        vehicle: true,
        machine: true,
      },
      orderBy: { startTime: 'asc' },
    });

    return sessions.map((s) => ({
      unitName: s.vehicle?.name || s.machine?.name || 'Desconocido',
      unitType: s.vehicle ? 'VEHICLE' : 'MACHINE',
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      totalHours: s.totalHours,
      kilometers: s.kilometers,
      idleHours: s.idleHours,
      movingHours: s.movingHours,
    }));
  }

  async getWeeklyReport(query: { vehicleId?: string; machineId?: string }, tenant?: TenantContext) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const where: any = { date: { gte: startDate } };
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.machineId) where.machineId = query.machineId;
    applyCompanySessionFilter(where, tenant);

    const sessions = await prisma.workSession.findMany({
      where,
      include: { vehicle: true, machine: true },
      orderBy: { date: 'asc' },
    });

    const grouped: Record<string, any> = {};
    for (const s of sessions) {
      const name = s.vehicle?.name || s.machine?.name || 'Desconocido';
      if (!grouped[name]) {
        grouped[name] = { unitName: name, unitType: s.vehicle ? 'VEHICLE' : 'MACHINE', totalHours: 0, totalKm: 0, days: 0 };
      }
      grouped[name].totalHours += s.totalHours;
      grouped[name].totalKm += s.kilometers;
      grouped[name].days++;
    }

    return Object.values(grouped);
  }

  async getMonthlyReport(query: { vehicleId?: string; machineId?: string }, tenant?: TenantContext) {
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const where: any = { date: { gte: startDate } };
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.machineId) where.machineId = query.machineId;
    applyCompanySessionFilter(where, tenant);

    const sessions = await prisma.workSession.findMany({
      where,
      include: { vehicle: true, machine: true },
      orderBy: { date: 'asc' },
    });

    const grouped: Record<string, any> = {};
    for (const s of sessions) {
      const name = s.vehicle?.name || s.machine?.name || 'Desconocido';
      if (!grouped[name]) {
        grouped[name] = { unitName: name, unitType: s.vehicle ? 'VEHICLE' : 'MACHINE', totalHours: 0, totalKm: 0, days: 0 };
      }
      grouped[name].totalHours += s.totalHours;
      grouped[name].totalKm += s.kilometers;
      grouped[name].days++;
    }

    return Object.values(grouped);
  }

  async getHoursReport(
    query: { vehicleId?: string; machineId?: string; startDate?: string; endDate?: string },
    tenant?: TenantContext
  ) {
    const where: any = {};
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.machineId) where.machineId = query.machineId;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }
    applyCompanySessionFilter(where, tenant);

    const sessions = await prisma.workSession.findMany({
      where,
      include: { vehicle: true, machine: true },
    });

    const grouped: Record<string, any> = {};
    for (const s of sessions) {
      const name = s.vehicle?.name || s.machine?.name || 'Desconocido';
      if (!grouped[name]) {
        grouped[name] = { unitName: name, totalHours: 0, totalKm: 0, totalIdle: 0, totalMoving: 0, days: 0 };
      }
      grouped[name].totalHours += s.totalHours;
      grouped[name].totalKm += s.kilometers;
      grouped[name].totalIdle += s.idleHours;
      grouped[name].totalMoving += s.movingHours;
      grouped[name].days++;
    }

    return Object.values(grouped);
  }

  async getEventsReport(
    query: { vehicleId?: string; machineId?: string; startDate?: string; endDate?: string },
    tenant?: TenantContext
  ) {
    const where: any = {};
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }
    const gpsFilter: any = {};
    if (query.vehicleId) gpsFilter.vehicleId = query.vehicleId;
    if (query.machineId) gpsFilter.machineId = query.machineId;
    const scope = gpsDeviceFilter(tenant);
    if (scope) gpsFilter.AND = [scope];
    if (Object.keys(gpsFilter).length > 0) {
      where.gpsDevice = gpsFilter;
    }

    const events = await prisma.trackingEvent.findMany({
      where,
      include: { gpsDevice: { include: { vehicle: true, machine: true } } },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });

    return events.map((e) => ({
      ...e,
      unitName: e.gpsDevice.vehicle?.name || e.gpsDevice.machine?.name || 'Desconocido',
    }));
  }

  // Kilometres driven outside the company's working hours, per unit, for the
  // requested range (defaults to today). A segment counts as off-hours when it
  // starts outside the schedule.
  async getOffHoursReport(query: { startDate?: string; endDate?: string }, tenant?: TenantContext) {
    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = query.endDate ? new Date(query.endDate) : new Date(new Date().setHours(23, 59, 59, 999));
    const schedule = await companyService.getSchedule(tenant);

    const deviceWhere: any = { OR: [{ vehicleId: { not: null } }, { machineId: { not: null } }] };
    const scope = linkedUnitFilter(tenant);
    if (scope) deviceWhere.AND = [scope];
    const devices = await prisma.gpsDevice.findMany({ where: deviceWhere, include: { vehicle: true, machine: true } });
    if (!devices.length) return [];

    const positions = await prisma.gpsPosition.findMany({
      where: { gpsDeviceId: { in: devices.map((d) => d.id) }, timestamp: { gte: start, lte: end } },
      orderBy: [{ gpsDeviceId: 'asc' }, { timestamp: 'asc' }],
      select: { gpsDeviceId: true, latitude: true, longitude: true, timestamp: true },
    });

    const km: Record<string, number> = {};
    for (let i = 1; i < positions.length; i++) {
      const a = positions[i - 1];
      const b = positions[i];
      if (a.gpsDeviceId !== b.gpsDeviceId) continue;
      if (b.timestamp.getTime() - a.timestamp.getTime() > MAX_SEGMENT_GAP_MS) continue;
      if (isWorkingTime(a.timestamp, schedule)) continue;
      km[a.gpsDeviceId] = (km[a.gpsDeviceId] || 0) + haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
    }

    return devices.map((d) => ({
      unitId: d.vehicleId || d.machineId,
      unitType: d.vehicleId ? 'VEHICLE' : 'MACHINE',
      unitName: d.vehicle?.name || d.machine?.name || 'Desconocido',
      offHoursKm: parseFloat((km[d.id] || 0).toFixed(1)),
    }));
  }
}
