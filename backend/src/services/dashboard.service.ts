import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {
  async getStats() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [totalVehicles, totalMachines, vehicleStats, machineStats] = await Promise.all([
      prisma.vehicle.count({ where: { isActive: true } }),
      prisma.machine.count({ where: { isActive: true } }),
      prisma.vehicle.groupBy({ by: ['status'], where: { isActive: true }, _count: true }),
      prisma.machine.groupBy({ by: ['status'], where: { isActive: true }, _count: true }),
    ]);

    const vehicleStatusMap = Object.fromEntries(vehicleStats.map(v => [v.status, v._count]));
    const machineStatusMap = Object.fromEntries(machineStats.map(m => [m.status, m._count]));

    const activeVehicles = (vehicleStatusMap['MOVING'] || 0) + (vehicleStatusMap['STOPPED'] || 0);
    const activeMachines = (machineStatusMap['MOVING'] || 0) + (machineStatusMap['STOPPED'] || 0);
    const vehiclesOn = (vehicleStatusMap['MOVING'] || 0) + (vehicleStatusMap['STOPPED'] || 0);
    const vehiclesOff = (vehicleStatusMap['OFFLINE'] || 0);
    const alertsCount = (vehicleStatusMap['ALERT'] || 0) + (machineStatusMap['ALERT'] || 0);

    const todaySessions = await prisma.workSession.findMany({
      where: { date: { gte: todayStart } },
    });

    const totalHoursToday = todaySessions.reduce((sum, s) => sum + s.totalHours, 0);
    const totalKmToday = todaySessions.reduce((sum, s) => sum + s.kilometers, 0);

    const hours = Math.floor(totalHoursToday);
    const minutes = Math.floor((totalHoursToday - hours) * 60);

    const recentEvents = await prisma.trackingEvent.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: { gpsDevice: { include: { vehicle: true, machine: true } } },
    });

    const vehiclesWithAlerts = await prisma.vehicle.findMany({
      where: { status: 'ALERT', isActive: true },
      include: { gpsDevice: true },
    });

    return {
      totalUnits: totalVehicles + totalMachines,
      totalVehicles,
      totalMachines,
      activeVehicles,
      activeMachines,
      vehiclesOn,
      vehiclesOff,
      machinesOn: (machineStatusMap['MOVING'] || 0) + (machineStatusMap['STOPPED'] || 0),
      machinesOff: machineStatusMap['OFFLINE'] || 0,
      alertsCount,
      alertUnits: vehiclesWithAlerts,
      hoursWorkedToday: `${hours}h ${minutes}m`,
      totalHoursToday,
      kilometersToday: parseFloat(totalKmToday.toFixed(1)),
      recentEvents,
      vehicleStatus: {
        moving: vehicleStatusMap['MOVING'] || 0,
        stopped: vehicleStatusMap['STOPPED'] || 0,
        offline: vehicleStatusMap['OFFLINE'] || 0,
        alert: vehicleStatusMap['ALERT'] || 0,
      },
      machineStatus: {
        moving: machineStatusMap['MOVING'] || 0,
        stopped: machineStatusMap['STOPPED'] || 0,
        offline: machineStatusMap['OFFLINE'] || 0,
        alert: machineStatusMap['ALERT'] || 0,
      },
    };
  }
}
