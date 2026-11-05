import { router } from 'expo-router';
import type { Figure, FleetUnit, Machine, UnitKind, Vehicle } from './types';
import { markerColor } from './format';

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
    figure: v.figure,
    iconColor: v.iconColor,
    status: v.status,
    isActive: v.isActive !== false,
    gpsDevice: v.gpsDevice,
    position: v.currentPosition || null,
    todaySession: v.todaySession,
    group: v.group || null,
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
    isActive: m.isActive !== false,
    gpsDevice: m.gpsDevice,
    position: m.currentPosition || null,
    todaySession: m.todaySession,
    group: m.group || null,
  };
}

export function defaultFigure(kind: UnitKind): Figure {
  return kind === 'machine' ? 'tractor' : 'sedan';
}

export function unitLook(unit: Pick<FleetUnit, 'kind' | 'status' | 'figure' | 'iconColor'>) {
  const status = markerColor(unit.status);
  return {
    figure: unit.figure || defaultFigure(unit.kind),
    color: unit.iconColor || status,
    statusColor: unit.iconColor ? status : undefined,
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
