import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReportService {
  async getDailyReport(query: { vehicleId?: string; machineId?: string; date?: string }) {
    const date = query.date ? new Date(query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const where: any = {
      date: { gte: date, lte: endDate },
    };

    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.machineId) where.machineId = query.machineId;

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

  async getWeeklyReport(query: { vehicleId?: string; machineId?: string }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const where: any = { date: { gte: startDate } };
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.machineId) where.machineId = query.machineId;

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

  async getMonthlyReport(query: { vehicleId?: string; machineId?: string }) {
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const where: any = { date: { gte: startDate } };
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.machineId) where.machineId = query.machineId;

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

  async getHoursReport(query: { vehicleId?: string; machineId?: string; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.machineId) where.machineId = query.machineId;
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

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

  async getEventsReport(query: { vehicleId?: string; machineId?: string; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }
    if (query.vehicleId || query.machineId) {
      where.gpsDevice = {};
      if (query.vehicleId) where.gpsDevice.vehicleId = query.vehicleId;
      if (query.machineId) where.gpsDevice.machineId = query.machineId;
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
}
