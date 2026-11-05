import { PrismaClient } from '@prisma/client';
import haversine from 'haversine-distance';

const prisma = new PrismaClient();

export interface WatchedGeofence {
  id: string;
  name: string;
  radius: number;
  centerLat: number;
  centerLng: number;
  alertOn: string;
  allUnits: boolean;
  vehicleIds: Set<string>;
  machineIds: Set<string>;
  groupIds: Set<string>;
}

export interface WatchedUnit {
  vehicleId: string | null;
  machineId: string | null;
  groupId: string | null;
}

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { at: number; rows: WatchedGeofence[] }>();
const insideState = new Map<string, Set<string>>();

export function forgetCompanyGeofences(companyId: string | null | undefined) {
  if (companyId) cache.delete(companyId);
}

// Only the geofences of the unit's own company are checked, so a unit never
// produces events (or leaks names) from another company's geofences.
export async function geofencesFor(companyId: string): Promise<WatchedGeofence[]> {
  const hit = cache.get(companyId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rows;
  const found = await prisma.geofence.findMany({
    where: { companyId, isActive: true, deletedAt: null, radius: { not: null }, centerLat: { not: null }, centerLng: { not: null } },
    select: {
      id: true,
      name: true,
      radius: true,
      centerLat: true,
      centerLng: true,
      alertOn: true,
      allUnits: true,
      targets: { select: { vehicleId: true, machineId: true, groupId: true } },
    },
  });
  const rows = found.map((g) => ({
    id: g.id,
    name: g.name,
    radius: g.radius!,
    centerLat: g.centerLat!,
    centerLng: g.centerLng!,
    alertOn: g.alertOn,
    allUnits: g.allUnits,
    vehicleIds: new Set(g.targets.map((t) => t.vehicleId).filter(Boolean) as string[]),
    machineIds: new Set(g.targets.map((t) => t.machineId).filter(Boolean) as string[]),
    groupIds: new Set(g.targets.map((t) => t.groupId).filter(Boolean) as string[]),
  }));
  cache.set(companyId, { at: Date.now(), rows });
  return rows;
}

// A geofence watches every unit, or only the units and groups it was
// assigned to.
export function watches(geofence: WatchedGeofence, unit: WatchedUnit) {
  if (geofence.allUnits) return true;
  if (unit.vehicleId && geofence.vehicleIds.has(unit.vehicleId)) return true;
  if (unit.machineId && geofence.machineIds.has(unit.machineId)) return true;
  return !!unit.groupId && geofence.groupIds.has(unit.groupId);
}

export function alertsOn(geofence: WatchedGeofence, type: 'GEOFENCE_ENTER' | 'GEOFENCE_EXIT') {
  return geofence.alertOn === 'BOTH' || (geofence.alertOn === 'ENTER' ? type === 'GEOFENCE_ENTER' : type === 'GEOFENCE_EXIT');
}

export function crossings(deviceId: string, lat: number, lng: number, geofences: WatchedGeofence[]) {
  const previous = insideState.get(deviceId) || new Set<string>();
  const current = new Set<string>();
  for (const gf of geofences) {
    if (haversine({ lat, lon: lng }, { lat: gf.centerLat, lon: gf.centerLng }) <= gf.radius) current.add(gf.id);
  }
  const result: { type: 'GEOFENCE_ENTER' | 'GEOFENCE_EXIT'; geofence: WatchedGeofence }[] = [];
  for (const gf of geofences) {
    if (current.has(gf.id) && !previous.has(gf.id)) result.push({ type: 'GEOFENCE_ENTER', geofence: gf });
    if (!current.has(gf.id) && previous.has(gf.id)) result.push({ type: 'GEOFENCE_EXIT', geofence: gf });
  }
  insideState.set(deviceId, current);
  return result;
}

export function unitsInside(geofenceId: string) {
  let count = 0;
  for (const inside of insideState.values()) if (inside.has(geofenceId)) count += 1;
  return count;
}
