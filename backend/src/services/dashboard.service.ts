import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../middleware/auth';
import { gpsDeviceFilter, linkedUnitFilter, unitFilter } from './unitAccess';

const prisma = new PrismaClient();

export class DashboardService {
  async getStats(tenant?: TenantContext) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const companyFilter = tenant?.companyId ? { companyId: tenant.companyId } : {};
    const unitScope = tenant?.companyId ? unitFilter(tenant) : {};

    const vehicleWhere: any = { isActive: true, ...unitScope };
    const machineWhere: any = { isActive: true, ...unitScope };
    const geofenceWhere: any = { isActive: true, deletedAt: null, ...companyFilter };

    const [totalVehicles, totalMachines, vehicleStats, machineStats, totalGeofences] = await Promise.all([
      prisma.vehicle.count({ where: vehicleWhere }),
      prisma.machine.count({ where: machineWhere }),
      prisma.vehicle.groupBy({ by: ['status'], where: vehicleWhere, _count: true }),
      prisma.machine.groupBy({ by: ['status'], where: machineWhere, _count: true }),
      prisma.geofence.count({ where: geofenceWhere }),
    ]);

    const vehicleStatusMap = Object.fromEntries(vehicleStats.map(v => [v.status, v._count]));
    const machineStatusMap = Object.fromEntries(machineStats.map(m => [m.status, m._count]));

    const vehiclesMoving = vehicleStatusMap['MOVING'] || 0;
    const vehiclesStopped = vehicleStatusMap['STOPPED'] || 0;
    const vehiclesOffline = vehicleStatusMap['OFFLINE'] || 0;
    const vehiclesAlert = vehicleStatusMap['ALERT'] || 0;

    const machinesMoving = machineStatusMap['MOVING'] || 0;
    const machinesStopped = machineStatusMap['STOPPED'] || 0;
    const machinesOffline = machineStatusMap['OFFLINE'] || 0;
    const machinesAlert = machineStatusMap['ALERT'] || 0;

    const totalMoving = vehiclesMoving + machinesMoving;
    const totalStopped = vehiclesStopped + machinesStopped;
    const totalOffline = vehiclesOffline + machinesOffline;
    const alertsCount = vehiclesAlert + machinesAlert;

    const sessionScope = linkedUnitFilter(tenant);
    const sessionWhere: any = { date: { gte: todayStart }, ...(sessionScope ? { AND: [sessionScope] } : {}) };

    const todaySessions = await prisma.workSession.findMany({
      where: sessionWhere,
    });

    const totalHoursToday = todaySessions.reduce((sum, s) => sum + s.totalHours, 0);
    const totalKmToday = todaySessions.reduce((sum, s) => sum + s.kilometers, 0);
    const totalIdleHoursToday = todaySessions.reduce((sum, s) => sum + (s.idleHours || 0), 0);

    const hours = Math.floor(totalHoursToday);
    const minutes = Math.floor((totalHoursToday - hours) * 60);

    const idleH = Math.floor(totalIdleHoursToday);
    const idleM = Math.floor((totalIdleHoursToday - idleH) * 60);

    const eventScope = gpsDeviceFilter(tenant);
    const eventWhere: any = eventScope ? { gpsDevice: eventScope } : {};

    const recentEvents = await prisma.trackingEvent.findMany({
      where: eventWhere,
      take: 8,
      orderBy: { timestamp: 'desc' },
      include: { gpsDevice: { include: { vehicle: true, machine: true } } },
    });

    const [vehiclesWithAlerts, machinesWithAlerts] = await Promise.all([
      prisma.vehicle.findMany({
        where: { ...vehicleWhere, status: 'ALERT' },
        include: { gpsDevice: true },
      }),
      prisma.machine.findMany({
        where: { ...machineWhere, status: 'ALERT' },
        include: { gpsDevice: true },
      }),
    ]);

    const alertUnits = [
      ...vehiclesWithAlerts.map(v => ({ ...v, unitType: 'vehicle' })),
      ...machinesWithAlerts.map(m => ({ ...m, unitType: 'machine' })),
    ];

    const [activeVehicles, activeMachines] = await Promise.all([
      prisma.vehicle.findMany({
        where: vehicleWhere,
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          gpsDevice: {
            include: {
              positions: {
                take: 1,
                orderBy: { timestamp: 'desc' },
              },
            },
          },
        },
      }),
      prisma.machine.findMany({
        where: machineWhere,
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          gpsDevice: {
            include: {
              positions: {
                take: 1,
                orderBy: { timestamp: 'desc' },
              },
            },
          },
        },
      }),
    ]);

    const statusOrder: Record<string, number> = { MOVING: 0, ALERT: 1, STOPPED: 2, OFFLINE: 3 };

    const combinedUnits = [
      ...activeVehicles.map(u => ({
        id: u.id,
        name: u.name,
        plate: u.plate,
        type: u.type,
        brand: u.brand,
        model: u.vehicleModel,
        year: u.year,
        color: u.color,
        status: u.status,
        unitType: 'vehicle' as const,
        speed: u.gpsDevice?.positions[0]?.speed || 0,
        voltage: u.gpsDevice?.positions[0]?.voltage || null,
        ignition: u.gpsDevice?.positions[0]?.ignition || false,
        heading: u.gpsDevice?.positions[0]?.heading || 0,
        lastReport: u.gpsDevice?.positions[0]?.timestamp || u.updatedAt,
      })),
      ...activeMachines.map(m => ({
        id: m.id,
        name: m.name,
        plate: m.serialNumber || 'MAQ',
        type: m.type,
        brand: m.brand,
        model: m.machineModel,
        year: m.year,
        color: '#EAB308',
        status: m.status,
        unitType: 'machine' as const,
        speed: m.gpsDevice?.positions[0]?.speed || 0,
        voltage: m.gpsDevice?.positions[0]?.voltage || null,
        ignition: m.gpsDevice?.positions[0]?.ignition || false,
        heading: m.gpsDevice?.positions[0]?.heading || 0,
        lastReport: m.gpsDevice?.positions[0]?.timestamp || m.updatedAt,
      })),
    ].sort((a, b) => {
      const diff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (diff !== 0) return diff;
      return b.speed - a.speed;
    });

    const formattedActiveList = combinedUnits.slice(0, 6);

    return {
      totalUnits: totalVehicles + totalMachines,
      totalVehicles,
      totalMachines,
      totalGeofences,
      totalMoving,
      totalStopped,
      totalOffline,
      alertsCount,
      alertUnits,
      activeUnitsList: formattedActiveList,
      hoursWorkedToday: `${hours}h ${minutes}m`,
      idleTimeToday: `${idleH}h ${idleM}m`,
      totalHoursToday,
      kilometersToday: parseFloat(totalKmToday.toFixed(1)),
      recentEvents,
      vehicleStatus: {
        moving: vehiclesMoving,
        stopped: vehiclesStopped,
        offline: vehiclesOffline,
        alert: vehiclesAlert,
      },
      machineStatus: {
        moving: machinesMoving,
        stopped: machinesStopped,
        offline: machinesOffline,
        alert: machinesAlert,
      },
    };
  }
}
