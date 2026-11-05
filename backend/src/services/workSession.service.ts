import { PrismaClient } from '@prisma/client';
import { haversineKm } from '../utils/workSchedule';

const prisma = new PrismaClient();

const MAX_GAP_MS = 30 * 60 * 1000;
const MAX_SPEED_KMH = 200;
const MOVING_KMH = 3;
const REFRESH_EVERY_MS = 60 * 1000;

const lastRefresh = new Map<string, number>();

interface DeviceRef {
  id: string;
  vehicleId: string | null;
  machineId: string | null;
}

function dayStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Rebuilds one local day of a unit's work session from its stored positions:
// kilometers between consecutive fixes, engine time while ignition is on, and
// that time split into moving and idle. Gaps over 30 minutes are not counted.
async function rebuildDay(device: DeviceRef, day: Date) {
  const start = dayStart(day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const positions = await prisma.gpsPosition.findMany({
    where: { gpsDeviceId: device.id, timestamp: { gte: start, lt: end } },
    orderBy: { timestamp: 'asc' },
    select: { latitude: true, longitude: true, speed: true, ignition: true, timestamp: true },
  });

  let km = 0;
  let engineMs = 0;
  let movingMs = 0;
  let firstOn: Date | null = null;
  let lastOn: Date | null = null;
  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const cur = positions[i];
    const gap = cur.timestamp.getTime() - prev.timestamp.getTime();
    if (gap <= 0 || gap > MAX_GAP_MS) continue;
    const segmentKm = haversineKm(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
    if ((segmentKm / gap) * 3600000 <= MAX_SPEED_KMH) km += segmentKm;
    if (prev.ignition) {
      engineMs += gap;
      if (prev.speed > MOVING_KMH) movingMs += gap;
      firstOn = firstOn || prev.timestamp;
      lastOn = cur.timestamp;
    }
  }
  if (engineMs === 0 && km < 0.05) return;

  const hours = (ms: number) => parseFloat((ms / 3600000).toFixed(2));
  const data = {
    startTime: firstOn || positions[0].timestamp,
    endTime: lastOn || positions[positions.length - 1].timestamp,
    kilometers: parseFloat(km.toFixed(2)),
    totalHours: hours(engineMs),
    movingHours: hours(movingMs),
    idleHours: hours(engineMs - movingMs),
  };
  const owner = device.vehicleId ? { vehicleId: device.vehicleId } : { machineId: device.machineId };
  const existing = await prisma.workSession.findFirst({ where: { ...owner, date: { gte: start, lt: end } }, select: { id: true } });
  if (existing) await prisma.workSession.update({ where: { id: existing.id }, data });
  else await prisma.workSession.create({ data: { ...owner, date: start, ...data } });
}

// Called after new fixes are stored. Live trackers report every few seconds,
// so a day is rebuilt at most once a minute unless a batch spans several days.
export async function refreshWorkSessions(device: DeviceRef, from: Date, to: Date) {
  if (!device.vehicleId && !device.machineId) return;
  const days: Date[] = [];
  for (let d = dayStart(from); d <= to; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  const single = days.length === 1;
  for (const day of days) {
    const key = `${device.id}:${day.getTime()}`;
    if (single && Date.now() - (lastRefresh.get(key) || 0) < REFRESH_EVERY_MS && to.getTime() - from.getTime() < REFRESH_EVERY_MS) continue;
    lastRefresh.set(key, Date.now());
    await rebuildDay(device, day);
  }
}
