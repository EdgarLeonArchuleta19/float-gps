export type Plan = 'PERSONAL' | 'EMPRESA';

export type Figure = 'sedan' | 'suv' | 'pickup' | 'truck' | 'moto' | 'tractor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  roleName?: string | null;
  permissions?: string[] | null;
  companyId?: string | null;
  companyName?: string | null;
  companySlug?: string | null;
  plan?: Plan | null;
  maxUnits?: number | null;
  mustChangePassword?: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: string;
  brand?: string;
  vehicleModel?: string;
  year?: number;
  color?: string;
  figure?: Figure | null;
  iconColor?: string | null;
  status: 'MOVING' | 'STOPPED' | 'OFFLINE' | 'ALERT';
  isActive: boolean;
  gpsDevice?: GpsDevice | null;
  currentPosition?: GpsPosition | null;
  todaySession?: WorkSession | null;
  group?: GroupRef | null;
}

export interface Machine {
  id: string;
  name: string;
  serialNumber?: string;
  type: string;
  brand?: string;
  machineModel?: string;
  year?: number;
  status: 'MOVING' | 'STOPPED' | 'OFFLINE' | 'ALERT';
  isActive: boolean;
  gpsDevice?: GpsDevice | null;
  currentPosition?: GpsPosition | null;
  todaySession?: WorkSession | null;
  group?: GroupRef | null;
}

interface GpsDevice {
  id: string;
  imei: string;
  model: string;
  simNumber?: string;
  isActive: boolean;
  lastReportAt?: string;
  vehicleId?: string;
  machineId?: string;
  linkedUnit?: { id: string; name: string; label: string } | null;
}

export interface GpsPosition {
  id: string;
  latitude: number;
  longitude: number;
  speed: number;
  altitude?: number;
  heading?: number;
  ignition: boolean;
  voltage?: number;
  timestamp: string;
}

export interface TrackingEvent {
  id: string;
  type: string;
  severity: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  timestamp: string;
  unitName?: string;
  unitType?: string;
  gpsDevice?: any;
}

export interface Geofence {
  id: string;
  name: string;
  type: string;
  color: string;
  isActive: boolean;
  radius?: number;
  centerLat?: number;
  centerLng?: number;
  points?: any;
  unitsInside?: number;
  alertOn: GeofenceAlertOn;
  allUnits: boolean;
  vehicleIds: string[];
  machineIds: string[];
  groupIds: string[];
}

export type GeofenceAlertOn = 'ENTER' | 'EXIT' | 'BOTH';

export interface GroupRef {
  id: string;
  name: string;
  color: string;
}

export interface UnitGroup extends GroupRef {
  isActive: boolean;
  vehicleIds: string[];
  machineIds: string[];
  unitCount: number;
}

export type MaintenanceKind = 'OIL' | 'TIRES' | 'BRAKES' | 'SERVICE' | 'INSURANCE' | 'TAX' | 'VERIFICATION' | 'OTHER';
export type MaintenanceStatus = 'OK' | 'SOON' | 'DUE';

export interface Maintenance {
  id: string;
  kind: MaintenanceKind;
  title: string;
  intervalKm: number | null;
  intervalDays: number | null;
  lastDoneAt: string;
  notes: string | null;
  isActive: boolean;
  vehicleId: string | null;
  machineId: string | null;
  vehicle?: { id: string; name: string; plate: string } | null;
  machine?: { id: string; name: string; serialNumber: string | null } | null;
  kmSince: number;
  kmLeft: number | null;
  dueAt: string | null;
  daysLeft: number | null;
  status: MaintenanceStatus;
}

export interface MaintenanceLog {
  id: string;
  doneAt: string;
  km: number | null;
  cost: number | null;
  notes: string | null;
  doneBy: string;
}

export type AlertType = 'GEOFENCE' | 'SOS' | 'OVERSPEED' | 'LOW_BATTERY' | 'IGNITION' | 'MAINTENANCE';

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  types: AlertType[];
  devices: number;
  channels: { webPush: boolean; email: boolean };
}

interface WorkSession {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  totalHours: number;
  kilometers: number;
  idleHours: number;
  movingHours: number;
  vehicleId?: string;
  machineId?: string;
}

export interface DashboardStats {
  totalUnits: number;
  totalVehicles: number;
  totalMachines: number;
  activeVehicles: number;
  activeMachines: number;
  vehiclesOn: number;
  vehiclesOff: number;
  machinesOn: number;
  machinesOff: number;
  alertsCount: number;
  alertUnits: any[];
  hoursWorkedToday: string;
  totalHoursToday: number;
  kilometersToday: number;
  recentEvents: TrackingEvent[];
  vehicleStatus: { moving: number; stopped: number; offline: number; alert: number };
  machineStatus: { moving: number; stopped: number; offline: number; alert: number };
}

export interface TrackingData {
  positions: GpsPosition[];
  summary: {
    totalKm: number;
    totalTime: number;
    movingTime: number;
    stoppedTime: number;
    engineOnTime: number;
    totalPoints: number;
  };
  events: TrackingEvent[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type UnitKind = 'vehicle' | 'machine';

export interface FleetUnit {
  id: string;
  kind: UnitKind;
  name: string;
  plate: string;
  type: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  status: Vehicle['status'];
  isActive: boolean;
  figure?: Figure | null;
  iconColor?: string | null;
  gpsDevice?: GpsDevice | null;
  position: GpsPosition | null;
  todaySession?: WorkSession | null;
  group?: GroupRef | null;
}

export interface ReportRow {
  unitName: string;
  unitType?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  totalHours: number;
  kilometers?: number;
  totalKm?: number;
  idleHours?: number;
  totalIdle?: number;
  movingHours?: number;
  totalMoving?: number;
  days?: number;
}
