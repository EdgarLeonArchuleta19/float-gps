import { GT06_KNOTS_TO_KMH, Gt06Fix } from './gt06';

export interface TraccarDevice {
  id: number;
  uniqueId: string;
  name?: string;
  status?: string;
  lastUpdate?: string;
}

export interface TraccarPosition {
  id?: number;
  deviceId?: number;
  fixTime?: string;
  deviceTime?: string;
  serverTime?: string;
  valid?: boolean;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  course?: number;
  accuracy?: number;
  attributes?: Record<string, unknown>;
}

export interface TraccarEvent {
  id?: number;
  deviceId?: number;
  type?: string;
  serverTime?: string;
  eventTime?: string;
  positionId?: number;
  attributes?: Record<string, unknown>;
}

export function attributeBoolean(attributes: Record<string, unknown> | undefined, key: string): boolean | undefined {
  if (!attributes) return undefined;
  const value = attributes[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return undefined;
}

export function attributeNumber(attributes: Record<string, unknown> | undefined, key: string): number | undefined {
  if (!attributes) return undefined;
  const value = attributes[key];
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function traccarPositionToFix(uniqueId: string, position: TraccarPosition): Gt06Fix {
  const attributes = position.attributes || {};

  const timeStr = position.fixTime || position.deviceTime || position.serverTime || new Date().toISOString();

  const fix: Gt06Fix = {
    imei: uniqueId,
    timestamp: new Date(timeStr),
    latitude: position.latitude,
    longitude: position.longitude,
    speed: Math.round((position.speed || 0) * GT06_KNOTS_TO_KMH),
  };

  if (position.altitude !== undefined) fix.altitude = position.altitude;
  if (position.course !== undefined && position.course >= 0 && position.course <= 360) {
    fix.heading = position.course;
  }

  const satellites = attributeNumber(attributes, 'sat');
  if (satellites !== undefined) fix.satellites = Math.round(satellites);

  const ignition = attributeBoolean(attributes, 'ignition');
  if (ignition !== undefined) fix.ignition = ignition;

  const voltage = attributeNumber(attributes, 'power') ?? attributeNumber(attributes, 'battery');
  if (voltage !== undefined) fix.voltage = voltage;

  return fix;
}
