import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class GpsService {
  async listDevices(query: { available?: string; search?: string; imei?: string }) {
    const where: any = {};

    if (query.available === 'true') {
      where.vehicleId = null;
      where.machineId = null;
    }

    if (query.search) {
      where.OR = [
        { imei: { contains: query.search } },
        { model: { contains: query.search } },
      ];
    }

    if (query.imei) {
      where.imei = query.imei.trim();
    }

    const devices = await prisma.gpsDevice.findMany({
      where,
      include: {
        vehicle: { select: { id: true, name: true, plate: true } },
        machine: { select: { id: true, name: true, serialNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return devices.map((d) => ({
      ...d,
      linkedUnit: d.vehicle
        ? { id: d.vehicle.id, name: d.vehicle.name, label: d.vehicle.plate || d.vehicle.name }
        : d.machine
        ? { id: d.machine.id, name: d.machine.name, label: d.machine.serialNumber || d.machine.name }
        : null,
    }));
  }

  async linkDevice(gpsDeviceId: string, body: { vehicleId?: string; machineId?: string; force?: boolean }) {
    const device = await prisma.gpsDevice.findUnique({ where: { id: gpsDeviceId } });
    if (!device) throw new AppError('Dispositivo GPS no encontrado', 404);

    const isVehicle = !!body.vehicleId;
    const targetId = body.vehicleId || body.machineId;
    if (!targetId) throw new AppError('Especifica vehicleId o machineId', 400);
    if (isVehicle === !!body.machineId && body.vehicleId && body.machineId) {
      throw new AppError('Vincula solo a un vehículo o a una máquina', 400);
    }

    if (device.isActive === false) {
      throw new AppError('El dispositivo está inactivo', 400);
    }

    const busyElsewhere = (!!device.vehicleId && (!isVehicle || device.vehicleId !== targetId)) ||
      (!!device.machineId && (isVehicle || device.machineId !== targetId));

    if (busyElsewhere && !body.force) {
      throw new AppError('Este dispositivo ya está vinculado a otra unidad. Confirma para moverlo.', 409);
    }

    return prisma.$transaction(async (tx) => {
      // If the target unit already has another GPS, release it first
      const previousWhere: any = isVehicle
        ? { vehicleId: targetId, NOT: { id: device.id } }
        : { machineId: targetId, NOT: { id: device.id } };
      const previous = await tx.gpsDevice.findFirst({ where: previousWhere });
      if (previous) {
        await tx.gpsDevice.update({
          where: { id: previous.id },
          data: { vehicleId: null, machineId: null },
        });
      }

      return tx.gpsDevice.update({
        where: { id: device.id },
        data: isVehicle ? { vehicleId: targetId, machineId: null } : { machineId: targetId, vehicleId: null },
      });
    });
  }

  async unlinkDevice(gpsDeviceId: string) {
    const device = await prisma.gpsDevice.findUnique({ where: { id: gpsDeviceId } });
    if (!device) throw new AppError('Dispositivo GPS no encontrado', 404);
    return prisma.gpsDevice.update({
      where: { id: gpsDeviceId },
      data: { vehicleId: null, machineId: null },
    });
  }

  async getPositions(gpsDeviceId: string, query: { startDate?: string; endDate?: string; page?: string; limit?: string }) {
    const where: any = { gpsDeviceId };

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const positions = await prisma.gpsPosition.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    return positions;
  }

  async getTracking(gpsDeviceId: string, query: { date?: string; startTime?: string; endTime?: string }) {
    const date = query.date ? new Date(query.date) : new Date();
    date.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    if (query.startTime) {
      const [h, m, s] = query.startTime.split(':').map(Number);
      date.setHours(h, m, s || 0);
    }
    if (query.endTime) {
      const [h, m, s] = query.endTime.split(':').map(Number);
      endDate.setHours(h, m, s || 59);
    }

    const positions = await prisma.gpsPosition.findMany({
      where: {
        gpsDeviceId,
        timestamp: { gte: date, lte: endDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    let totalKm = 0;
    for (let i = 1; i < positions.length; i++) {
      totalKm += haversineDistance(
        positions[i - 1].latitude,
        positions[i - 1].longitude,
        positions[i].latitude,
        positions[i].longitude
      );
    }

    let movingTime = 0;
    let stoppedTime = 0;
    let engineOnTime = 0;
    for (let i = 1; i < positions.length; i++) {
      const diff = (positions[i].timestamp.getTime() - positions[i - 1].timestamp.getTime()) / 3600000;
      if (positions[i].speed > 0) movingTime += diff;
      else stoppedTime += diff;
      if (positions[i].ignition) engineOnTime += diff;
    }

    const events = await prisma.trackingEvent.findMany({
      where: {
        gpsDeviceId,
        timestamp: { gte: date, lte: endDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    return {
      positions,
      summary: {
        totalKm: parseFloat(totalKm.toFixed(1)),
        totalTime: parseFloat((movingTime + stoppedTime).toFixed(2)),
        movingTime: parseFloat(movingTime.toFixed(2)),
        stoppedTime: parseFloat(stoppedTime.toFixed(2)),
        engineOnTime: parseFloat(engineOnTime.toFixed(2)),
        totalPoints: positions.length,
      },
      events,
    };
  }

  async getLatestPosition(gpsDeviceId: string) {
    return prisma.gpsPosition.findFirst({
      where: { gpsDeviceId },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Simula una verificación de conexión (ping) a un dispositivo GPS.
   * No requiere hardware real; valida el IMEI, "responde" como si el
   * dispositivo hiciera un ping y actualiza lastReportAt.
   */
  async testConnection(body: { imei?: string; gpsDeviceId?: string }) {
    let device;
    if (body.gpsDeviceId) {
      device = await prisma.gpsDevice.findUnique({ where: { id: body.gpsDeviceId } });
    } else if (body.imei) {
      device = await prisma.gpsDevice.findUnique({ where: { imei: String(body.imei).trim() } });
    }

    if (!device) {
      throw new AppError('No se encontró un dispositivo GPS con ese IMEI. Regístralo primero.', 404);
    }

    // Simula latencia de la red
    const now = Date.now();
    const pingMs = Math.floor(Math.random() * 120) + 40; // 40-160 ms

    // Simula señal GPS y datos recientes
    const lastPosition = await prisma.gpsPosition.findFirst({
      where: { gpsDeviceId: device.id },
      orderBy: { timestamp: 'desc' },
    });

    const lastReport = device.lastReportAt ? new Date(device.lastReportAt).getTime() : null;
    const lastPosAt = lastPosition ? new Date(lastPosition.timestamp).getTime() : null;
    const nowMinus5 = now - 5 * 60 * 1000;

    const hasLiveData = (lastPosAt != null && lastPosAt >= nowMinus5) || (lastReport != null && lastReport >= nowMinus5);

    // Registra el ping actualizando lastReportAt
    await prisma.gpsDevice.update({
      where: { id: device.id },
      data: { lastReportAt: new Date(now) },
    });

    let linkedUnit = null;
    if (device.vehicleId) {
      const v = await prisma.vehicle.findUnique({ where: { id: device.vehicleId }, select: { name: true, plate: true } });
      linkedUnit = v ? { name: v.name, label: v.plate || v.name } : null;
    } else if (device.machineId) {
      const m = await prisma.machine.findUnique({ where: { id: device.machineId }, select: { name: true, serialNumber: true } });
      linkedUnit = m ? { name: m.name, label: m.serialNumber || m.name } : null;
    }

    return {
      success: true,
      imei: device.imei,
      model: device.model,
      pingMs,
      responded: true,
      message: 'Conexión establecida correctamente. El dispositivo respondió al ping.',
      signal: 'OK',
      hasLiveData,
      lastPositionAt: lastPosAt,
      linkedUnit,
      device: {
        id: device.id,
        imei: device.imei,
        model: device.model,
        simNumber: device.simNumber,
        isActive: device.isActive,
      },
    };
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
