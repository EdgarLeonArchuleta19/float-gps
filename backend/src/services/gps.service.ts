import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export class GpsService {
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

  async getTracking(gpsDeviceId: string, query: { startDate?: string; endDate?: string }) {
    const date = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 86400000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    if (Number.isNaN(date.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError('Rango de fechas inválido', 400);
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
