import { PrismaClient } from '@prisma/client';
import haversine from 'haversine-distance';
import { Gt06Fix, Gt06Message, normalizeImei } from './gt06';

const prisma = new PrismaClient();

export interface IngestSummary {
  deviceFound: boolean;
  deviceId?: string;
  imei: string;
  inserted: number;
  duplicates: number;
  discarded: number;
  events: string[];
  unitStatus?: string;
}

export interface TrackerThresholds {
  overspeedKmh: number;
  lowBatteryVolts: number;
  maxAgeHours: number;
}

export const thresholds: TrackerThresholds = {
  overspeedKmh: parseFloat(process.env.TRACKER_OVERSPEED_KMH || '80'),
  lowBatteryVolts: parseFloat(process.env.TRACKER_LOW_BATTERY_V || '11.5'),
  maxAgeHours: parseFloat(process.env.TRACKER_MAX_AGE_H || '48'),
};

interface GeofenceRow {
  id: string;
  name: string;
  radius: number | null;
  centerLat: number | null;
  centerLng: number | null;
}

const insideState = new Map<string, Set<string>>();
const lastOverspeedAt = new Map<string, number>();
const lastLowBatteryAt = new Map<string, number>();

const OVERSPEED_COOLDOWN_MS = 5 * 60 * 1000;
const LOW_BATTERY_COOLDOWN_MS = 30 * 60 * 1000;

let geofenceCache: { at: number; rows: GeofenceRow[] } = { at: 0, rows: [] };
const GEOFENCE_TTL_MS = 60 * 1000;

function isReasonableTimestamp(ts: number): boolean {
  const now = Date.now();
  const window = thresholds.maxAgeHours * 60 * 60 * 1000;
  return ts > now - window && ts < now + 24 * 60 * 60 * 1000;
}

function throttle(key: string, store: Map<string, number>, cooldown: number): boolean {
  const last = store.get(key) || 0;
  if (Date.now() - last < cooldown) return false;
  store.set(key, Date.now());
  return true;
}

async function loadGeofences(): Promise<GeofenceRow[]> {
  if (Date.now() - geofenceCache.at < GEOFENCE_TTL_MS) return geofenceCache.rows;
  const rows = await prisma.geofence.findMany({
    where: { isActive: true },
    select: { id: true, name: true, radius: true, centerLat: true, centerLng: true },
  });
  geofenceCache = { at: Date.now(), rows };
  return rows;
}

function distanceMeters(lat: number, lng: number, centerLat: number, centerLng: number): number {
  return haversine({ lat, lon: lng }, { lat: centerLat, lon: centerLng });
}

export async function findDevice(imei: string) {
  const trimmed = imei.trim();
  const candidates = [trimmed];
  if (trimmed.length === 15) candidates.push(`0${trimmed}`);
  if (trimmed.length === 16) candidates.push(trimmed.slice(1));

  return prisma.gpsDevice.findFirst({
    where: { imei: { in: candidates } },
    include: { vehicle: true, machine: true },
  });
}

async function evaluateGeofences(
  deviceId: string,
  fix: Gt06Fix,
  unitName: string,
  unitType: string,
  geofences: GeofenceRow[],
): Promise<string[]> {
  if (geofences.length === 0) return [];

  const byId = new Map(geofences.map((gf) => [gf.id, gf]));
  const previous = insideState.get(deviceId) || new Set<string>();
  const current = new Set<string>();
  const changes: string[] = [];

  for (const gf of geofences) {
    if (gf.centerLat === null || gf.centerLng === null || !gf.radius) continue;
    if (distanceMeters(fix.latitude, fix.longitude, gf.centerLat, gf.centerLng) > gf.radius) continue;
    current.add(gf.id);
  }

  const transitions: Array<{ type: 'GEOFENCE_ENTER' | 'GEOFENCE_EXIT'; id: string }> = [];

  for (const id of current) {
    if (!previous.has(id)) transitions.push({ type: 'GEOFENCE_ENTER', id });
  }
  for (const id of previous) {
    if (!current.has(id)) transitions.push({ type: 'GEOFENCE_EXIT', id });
  }

  for (const { type, id } of transitions) {
    const gf = byId.get(id);
    if (!gf) continue;

    await prisma.trackingEvent.create({
      data: {
        type,
        severity: 'INFO',
        message: `${type === 'GEOFENCE_ENTER' ? 'Entró a' : 'Salió de'} ${gf.name}`,
        latitude: fix.latitude,
        longitude: fix.longitude,
        speed: fix.speed,
        timestamp: fix.timestamp,
        gpsDeviceId: deviceId,
      },
    });

    await prisma.geofenceEvent.create({
      data: {
        type,
        timestamp: fix.timestamp,
        latitude: fix.latitude,
        longitude: fix.longitude,
        unitName,
        unitType,
        geofenceId: gf.id,
      },
    });

    changes.push(type);
  }

  insideState.set(deviceId, current);
  return changes;
}

async function evaluateOverspeed(deviceId: string, fix: Gt06Fix): Promise<string | null> {
  if (fix.speed < thresholds.overspeedKmh) return null;
  if (!throttle(deviceId, lastOverspeedAt, OVERSPEED_COOLDOWN_MS)) return null;

  await prisma.trackingEvent.create({
    data: {
      type: 'OVERSPEED',
      severity: 'WARNING',
      message: `Exceso de velocidad: ${Math.round(fix.speed)} km/h (límite ${thresholds.overspeedKmh} km/h)`,
      latitude: fix.latitude,
      longitude: fix.longitude,
      speed: fix.speed,
      timestamp: fix.timestamp,
      gpsDeviceId: deviceId,
    },
  });

  return 'OVERSPEED';
}

async function evaluateLowBattery(deviceId: string, fix: Gt06Fix, voltage?: number): Promise<string | null> {
  if (voltage === undefined || voltage >= thresholds.lowBatteryVolts) return null;
  if (!throttle(deviceId, lastLowBatteryAt, LOW_BATTERY_COOLDOWN_MS)) return null;

  await prisma.trackingEvent.create({
    data: {
      type: 'LOW_BATTERY',
      severity: 'WARNING',
      message: `Batería baja: ${voltage.toFixed(1)} V`,
      latitude: fix.latitude,
      longitude: fix.longitude,
      speed: fix.speed,
      timestamp: fix.timestamp,
      gpsDeviceId: deviceId,
    },
  });

  return 'LOW_BATTERY';
}

export async function ingestMessage(message: Gt06Message): Promise<IngestSummary> {
  const summary: IngestSummary = {
    deviceFound: false,
    imei: message.imei,
    inserted: 0,
    duplicates: 0,
    discarded: 0,
    events: [],
  };

  const device = await findDevice(message.imei);
  if (!device) return summary;
  summary.deviceFound = true;
  summary.deviceId = device.id;

  const unitName = device.vehicle?.name || device.machine?.name || message.imei;
  const unitType = device.vehicle ? 'VEHICLE' : 'MACHINE';

  if (message.fixes.length > 0) {
    const positionSummary = await ingestFixes(message.fixes, device, unitName, unitType);
    summary.inserted = positionSummary.inserted;
    summary.duplicates = positionSummary.duplicates;
    summary.discarded = positionSummary.discarded;
    summary.events = positionSummary.events;
    summary.unitStatus = positionSummary.unitStatus;
  }

  const alarm = message.alarm;
  if (alarm) {
    const type = mapAlarmType(message, alarm.reason);
    await prisma.trackingEvent.create({
      data: {
        type,
        severity: type === 'SOS' ? 'CRITICAL' : 'WARNING',
        message: buildAlarmMessage(type, message, alarm),
        latitude: alarm.latitude ?? null,
        longitude: alarm.longitude ?? null,
        speed: alarm.speed ?? null,
        timestamp: alarm.timestamp,
        gpsDeviceId: device.id,
      },
    });
    summary.events.push(`alarma:${type}`);
  }

  await prisma.gpsDevice.update({
    where: { id: device.id },
    data: { lastReportAt: new Date(), isActive: true },
  });

  return summary;
}

function mapAlarmType(message: Gt06Message, reason: string): string {
  if (message.command === 'SOS' || /SOS|EA/i.test(reason)) return 'SOS';
  if (message.command === 'OVERSPEED') return 'OVERSPEED';
  if (message.command === 'LOWBAT' || /BAT|LOW/i.test(reason)) return 'LOW_BATTERY';
  if (message.command === 'VIBRATION' || /VIB|MOVE/i.test(reason)) return 'VIBRATION';
  if (message.command === 'EV') return 'ALARM';
  return 'ALARM';
}

function buildAlarmMessage(type: string, message: Gt06Message, alarm: { reason: string; speed?: number; limit?: number }): string {
  switch (type) {
    case 'SOS':
      return 'Alarma SOS activada desde el vehículo';
    case 'OVERSPEED':
      return `Exceso de velocidad: ${Math.round(alarm.speed || 0)} km/h (límite ${alarm.limit || thresholds.overspeedKmh} km/h)`;
    case 'LOW_BATTERY':
      return 'Alerta de batería baja';
    case 'VIBRATION':
      return 'Detección de vibración o movimiento';
    default:
      return `Alarma del dispositivo (${alarm.reason}) [${message.command}]`;
  }
}

interface FixIngest {
  inserted: number;
  duplicates: number;
  discarded: number;
  events: string[];
  unitStatus?: string;
  latestFix?: Gt06Fix;
}

export async function ingestFixes(
  fixes: Gt06Fix[],
  preloadedDevice?: any,
  unitName?: string,
  unitType?: string,
): Promise<FixIngest> {
  const result: FixIngest = { inserted: 0, duplicates: 0, discarded: 0, events: [] };
  if (fixes.length === 0) return result;

  const imei = normalizeImei(fixes[0].imei);
  const device = preloadedDevice || (await findDevice(imei));
  if (!device) return result;

  const name = unitName || device.vehicle?.name || device.machine?.name || imei;
  const type = unitType || (device.vehicle ? 'VEHICLE' : 'MACHINE');

  const last = await prisma.gpsPosition.findFirst({
    where: { gpsDeviceId: device.id },
    orderBy: { timestamp: 'desc' },
  });
  let lastTs = last ? last.timestamp.getTime() : 0;
  let lastIgnition: boolean | null = last ? last.ignition : null;

  const geofences = await loadGeofences();

  for (const fix of fixes) {
    const ts = fix.timestamp.getTime();
    if (ts <= lastTs) {
      result.duplicates += 1;
      continue;
    }
    if (!isReasonableTimestamp(ts)) {
      result.discarded += 1;
      continue;
    }
    lastTs = ts;

    await prisma.gpsPosition.create({
      data: {
        latitude: fix.latitude,
        longitude: fix.longitude,
        speed: fix.speed,
        altitude: fix.altitude ?? null,
        heading: fix.heading ?? null,
        satellites: fix.satellites ?? null,
        ignition: fix.ignition ?? false,
        voltage: fix.voltage ?? null,
        timestamp: fix.timestamp,
        gpsDeviceId: device.id,
      },
    });
    result.inserted += 1;
    result.latestFix = fix;

    if (fix.ignition !== undefined && lastIgnition !== null && fix.ignition !== lastIgnition) {
      const eventType = fix.ignition ? 'IGNITION_ON' : 'IGNITION_OFF';
      await prisma.trackingEvent.create({
        data: {
          type: eventType,
          severity: 'INFO',
          message: eventType === 'IGNITION_ON' ? 'Encendido activado' : 'Encendido desactivado',
          latitude: fix.latitude,
          longitude: fix.longitude,
          speed: fix.speed,
          timestamp: fix.timestamp,
          gpsDeviceId: device.id,
        },
      });
      result.events.push(`evento:${eventType}`);
    }
    if (fix.ignition !== undefined) lastIgnition = fix.ignition;

    if (geofences.length > 0) {
      const changes = await evaluateGeofences(device.id, fix, name, type, geofences);
      result.events.push(...changes.map((c) => `geocerca:${c}`));
    }

    const overspeed = await evaluateOverspeed(device.id, fix);
    if (overspeed) result.events.push(`evento:${overspeed}`);

    const lowBattery = await evaluateLowBattery(device.id, fix, fix.voltage);
    if (lowBattery) result.events.push(`evento:${lowBattery}`);
  }

  if ((device.vehicleId || device.machineId) && result.latestFix) {
    const overspeedActive = Date.now() - (lastOverspeedAt.get(device.id) || 0) < OVERSPEED_COOLDOWN_MS;
    const status = overspeedActive
      ? 'ALERT'
      : result.latestFix.speed > 5
        ? 'MOVING'
        : 'STOPPED';

    if (device.vehicleId) {
      await prisma.vehicle.update({ where: { id: device.vehicleId }, data: { status } });
    } else if (device.machineId) {
      await prisma.machine.update({ where: { id: device.machineId }, data: { status } });
    }
    result.unitStatus = status;
  }

  if (result.inserted > 0) {
    await prisma.gpsDevice.update({
      where: { id: device.id },
      data: { lastReportAt: new Date(), isActive: true },
    }).catch(() => {});
  }

  return result;
}

export async function markOfflineDevices(imeis: string[], timeoutMs: number): Promise<number> {
  if (imeis.length === 0) return 0;

  const cutoff = new Date(Date.now() - timeoutMs);
  const candidates: string[] = [];
  for (const imei of new Set(imeis)) {
    candidates.push(imei);
    if (imei.length === 15) candidates.push(`0${imei}`);
    if (imei.length === 16) candidates.push(imei.slice(1));
  }

  const devices = await prisma.gpsDevice.findMany({
    where: { imei: { in: candidates }, isActive: true },
    include: { vehicle: true, machine: true },
  });

  let count = 0;
  for (const device of devices) {
    if (device.lastReportAt && device.lastReportAt >= cutoff) continue;

    if (device.vehicleId) {
      await prisma.vehicle.update({ where: { id: device.vehicleId }, data: { status: 'OFFLINE' } });
    } else if (device.machineId) {
      await prisma.machine.update({ where: { id: device.machineId }, data: { status: 'OFFLINE' } });
    }
    await prisma.gpsDevice.update({ where: { id: device.id }, data: { isActive: false } });
    count += 1;
  }
  return count;
}
