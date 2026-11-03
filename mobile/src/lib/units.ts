import { router } from 'expo-router';
import type { FleetUnit, Machine, Vehicle } from './types';

export function vehicleToUnit(v: Vehicle): FleetUnit {
  return {
    id: v.id,
    kind: 'vehicle',
    name: v.name,
    plate: v.plate,
    type: v.type,
    brand: v.brand,
    model: v.vehicleModel,
    year: v.year,
    color: v.color,
    status: v.status,
    gpsDevice: v.gpsDevice,
    position: v.currentPosition || null,
    todaySession: v.todaySession,
  };
}

export function machineToUnit(m: Machine): FleetUnit {
  return {
    id: m.id,
    kind: 'machine',
    name: m.name,
    plate: m.serialNumber || 'Maquinaria',
    type: m.type,
    brand: m.brand,
    model: m.machineModel,
    year: m.year,
    status: m.status,
    gpsDevice: m.gpsDevice,
    position: m.currentPosition || null,
    todaySession: m.todaySession,
  };
}

export function hasPosition(unit: FleetUnit): unit is FleetUnit & { position: NonNullable<FleetUnit['position']> } {
  return !!unit.position && Number.isFinite(unit.position.latitude) && Number.isFinite(unit.position.longitude);
}

export function openUnit(unit: Pick<FleetUnit, 'id' | 'kind'>) {
  router.push(`/units/${unit.id}?kind=${unit.kind}` as never);
}

export function kmToday(unit: Pick<FleetUnit, 'todaySession'>): number {
  return unit.todaySession?.kilometers ?? 0;
}
