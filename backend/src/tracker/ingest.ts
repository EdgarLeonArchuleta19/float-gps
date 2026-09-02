import { PrismaClient } from '@prisma/client';
import { TrackerFix } from './protocol';

const prisma = new PrismaClient();

export interface IngestSummary {
  deviceFound: boolean;
  deviceId?: string;
  inserted: number;
  duplicates: number;
  discarded: number;
  events: string[];
  unitStatus?: string;
}

function isReasonableTimestamp(ts: number): boolean {
  const now = Date.now();
  return ts > now - 6 * 60 * 60 * 1000 && ts < now + 60 * 60 * 1000;
}

export async function ingestFixes(fixes: TrackerFix[]): Promise<IngestSummary> {
  const summary: IngestSummary = { deviceFound: false, inserted: 0, duplicates: 0, discarded: 0, events: [] };
  if (fixes.length === 0) return summary;

  const imei = fixes[0].imei;
  const device = await prisma.gpsDevice.findUnique({
    where: { imei },
    include: { vehicle: true, machine: true },
  });
  if (!device) return summary;
  summary.deviceFound = true;
  summary.deviceId = device.id;

  const last = await prisma.gpsPosition.findFirst({
    where: { gpsDeviceId: device.id },
    orderBy: { timestamp: 'desc' },
  });
  let lastTs = last ? last.timestamp.getTime() : 0;
  let lastIgnition: boolean | null = last ? last.ignition : null;

  for (const fix of fixes) {
    const ts = fix.timestamp.getTime();
    if (ts <= lastTs) {
      summary.duplicates += 1;
      continue;
    }
    if (!isReasonableTimestamp(ts)) {
      summary.discarded += 1;
      continue;
    }
    lastTs = ts;

    await prisma.gpsPosition.create({
      data: {
        latitude: fix.latitude,
        longitude: fix.longitude,
        speed: fix.speed,
        altitude: fix.altitude,
        heading: fix.heading,
        satellites: fix.satellites,
        ignition: fix.ignition ?? false,
        voltage: fix.voltage,
        timestamp: fix.timestamp,
        gpsDeviceId: device.id,
      },
    });
    summary.inserted += 1;

    const ign = fix.ignition ?? false;
    if (lastIgnition !== null && ign !== lastIgnition) {
      const type = ign ? 'IGNITION_ON' : 'IGNITION_OFF';
      await prisma.trackingEvent.create({
        data: {
          type,
          severity: 'INFO',
          message: type,
          latitude: fix.latitude,
          longitude: fix.longitude,
          speed: fix.speed,
          timestamp: fix.timestamp,
          gpsDeviceId: device.id,
        },
      });
      summary.events.push(type);
    }
    lastIgnition = ign;
  }

  await prisma.gpsDevice.update({
    where: { id: device.id },
    data: { lastReportAt: new Date() },
  });

  if (device.vehicleId || device.machineId) {
    const latest = await prisma.gpsPosition.findFirst({
      where: { gpsDeviceId: device.id },
      orderBy: { timestamp: 'desc' },
    });
    if (latest) {
      const status = latest.speed > 5 ? 'MOVING' : 'STOPPED';
      if (device.vehicleId) {
        await prisma.vehicle.update({ where: { id: device.vehicleId }, data: { status } });
      } else if (device.machineId) {
        await prisma.machine.update({ where: { id: device.machineId }, data: { status } });
      }
      summary.unitStatus = status;
    }
  }

  return summary;
}