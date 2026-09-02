export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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
  status: 'MOVING' | 'STOPPED' | 'OFFLINE' | 'ALERT';
  isActive: boolean;
  gpsDevice?: GpsDevice | null;
  currentPosition?: GpsPosition | null;
  todaySession?: WorkSession | null;
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
}

export interface GpsDevice {
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
  unitsOutside?: number;
  totalUnits?: number;
}

export interface WorkSession {
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
