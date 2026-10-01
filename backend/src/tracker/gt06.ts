export type Gt06Command =
  | 'GPSV1'
  | 'HEARTBEAT'
  | 'ALARM'
  | 'OVERSPEED'
  | 'SOS'
  | 'BUFFERRD'
  | 'UNBUFF'
  | 'LBS'
  | 'SOG'
  | 'EV'
  | 'VIBRATION'
  | 'LOWBAT'
  | 'LOGIN'
  | 'UNKNOWN';

export interface Gt06Fix {
  imei: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number;
  altitude?: number;
  heading?: number;
  satellites?: number;
  ignition?: boolean;
  voltage?: number;
  hdop?: number;
  pdop?: number;
  operator?: string;
}

export interface Gt06Alarm {
  imei: string;
  command: string;
  reason: string;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  speed?: number;
  limit?: number;
}

export interface Gt06Message {
  imei: string;
  command: Gt06Command;
  fixes: Gt06Fix[];
  alarm?: Gt06Alarm;
  raw: string;
}

export const GT06_FRAMER = '##';
export const GT06_KNOTS_TO_KMH = 1.852;

const IMEI_RE = /(\d{15,16})/;
const IMEI_RE_GLOBAL = /\b(\d{15,16})\b/g;
const DATE_RE = /^\d{12}(\.\d{2,3})?$/;
const CHECKSUM_RE = /^[0-9A-Fa-f]{4}$/;
const COUNT_PREFIX_RE = /^(\d+)(GPSV1)$/i;

const KNOWN_COMMANDS: Gt06Command[] = [
  'GPSV1',
  'HEARTBEAT',
  'ALARM',
  'OVERSPEED',
  'SOS',
  'BUFFERRD',
  'UNBUFF',
  'LBS',
  'SOG',
  'EV',
  'VIBRATION',
  'LOWBAT',
  'LOGIN',
];

export function normalizeImei(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 16 ? digits.slice(1) : digits;
}

export function buildResponse(imei: string, command: string, result = 'OK'): string {
  return `${GT06_FRAMER}+RESP,GT06,${imei},${command},${result}${GT06_FRAMER}`;
}

export function splitFrames(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = [];
  let rest = buffer;

  for (;;) {
    const start = rest.indexOf(GT06_FRAMER);
    if (start === -1) {
      rest = rest.length > 1 ? rest.slice(-1) : rest;
      break;
    }
    const end = rest.indexOf(GT06_FRAMER, start + GT06_FRAMER.length);
    if (end === -1) {
      rest = rest.slice(start);
      break;
    }
    const frame = rest.slice(start + GT06_FRAMER.length, end).trim();
    if (frame.length > 0) frames.push(frame);
    rest = rest.slice(end + GT06_FRAMER.length);
  }

  return { frames, rest };
}

function parseTimestamp(value: string): Date | null {
  const m = DATE_RE.exec(value);
  if (!m) return null;
  const digits = value.replace('.', '').padEnd(14, '0');
  const dd = parseInt(digits.slice(0, 2), 10);
  const mm = parseInt(digits.slice(2, 4), 10);
  const yyyy = parseInt(digits.slice(4, 8), 10);
  const HH = parseInt(digits.slice(8, 10), 10);
  const min = parseInt(digits.slice(10, 12), 10);
  const ss = parseInt(digits.slice(12, 14), 10);
  if (!yyyy || !mm || !dd) return null;
  const year = yyyy < 100 ? 2000 + yyyy : yyyy;
  const ts = Date.UTC(year, mm - 1, dd, HH, min, ss);
  return Number.isNaN(ts) ? null : new Date(ts);
}

function parseCoord(value: string, hemisphere: string, max: number): number | null {
  const cleaned = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(cleaned);
  if (!match) return null;

  const negative = /^[SW]/i.test(hemisphere);
  const integerDigits = match[1];
  const fraction = match[2] ? parseFloat(`0.${match[2]}`) : 0;

  const decimalIntDigits = max >= 180 ? 3 : 2;

  const asDecimal = parseFloat(cleaned);
  const asNmea =
    integerDigits.length > decimalIntDigits
      ? parseInt(integerDigits.slice(0, -2), 10) +
        (parseInt(integerDigits.slice(-2), 10) + fraction) / 60
      : NaN;

  let magnitude: number;
  if (Number.isFinite(asDecimal) && integerDigits.length <= decimalIntDigits && asDecimal <= max) {
    magnitude = asDecimal;
  } else if (Number.isFinite(asNmea) && asNmea <= max) {
    magnitude = asNmea;
  } else if (Number.isFinite(asDecimal) && asDecimal <= max) {
    magnitude = asDecimal;
  } else {
    return null;
  }

  return negative ? -magnitude : magnitude;
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function findAcc(fields: string[], from: number): boolean | undefined {
  for (let i = from; i < fields.length; i++) {
    const f = fields[i].trim();
    const inline = /^ACC[=:]([01])$/i.exec(f);
    if (inline) return inline[1] === '1';
    if (/^ACC$/i.test(f)) {
      const next = parseInt(fields[i + 1], 10);
      if (next === 0 || next === 1) return next === 1;
    }
  }
  return undefined;
}

function findVoltage(fields: string[], from: number): number | undefined {
  for (let i = from; i < fields.length; i++) {
    const f = fields[i].trim();
    const inline = /^(?:DC|VOLTAGE?|BATT|BATTERY)[=:]([\d.]+)$/i.exec(f);
    if (inline) {
      const v = parseFloat(inline[1]);
      if (Number.isFinite(v)) return v;
    }
    if (/^(?:DC|VOLTAGE?|BATT|BATTERY)$/i.test(f)) {
      const next = parseFloat(fields[i + 1]);
      if (Number.isFinite(next)) return next;
    }
  }
  return undefined;
}

function parseFixFromAnchor(imei: string, fields: string[], anchor: number): Gt06Fix | null {
  const timestamp = parseTimestamp(fields[anchor]);
  if (!timestamp) return null;

  const latRaw = fields[anchor + 1];
  const latHemi = fields[anchor + 2];
  const lonRaw = fields[anchor + 3];
  const lonHemi = fields[anchor + 4];

  const latitude = parseCoord(latRaw || '', latHemi || '', 90);
  const longitude = parseCoord(lonRaw || '', lonHemi || '', 180);
  if (latitude === null || longitude === null) return null;

  const fix: Gt06Fix = {
    imei,
    timestamp,
    latitude,
    longitude,
    speed: Math.round((parseNumber(fields[anchor + 5]) || 0) * GT06_KNOTS_TO_KMH),
  };

  const heading = parseNumber(fields[anchor + 6]);
  if (heading !== undefined && heading >= 0 && heading <= 360) fix.heading = heading;

  const altitude = parseNumber(fields[anchor + 7]);
  if (altitude !== undefined) fix.altitude = altitude;

  const satellites = parseNumber(fields[anchor - 2]);
  if (satellites !== undefined) fix.satellites = Math.round(satellites);

  const pdop = parseNumber(fields[anchor + 8]);
  if (pdop !== undefined) fix.pdop = pdop;

  const hdop = parseNumber(fields[anchor + 9]);
  if (hdop !== undefined) fix.hdop = hdop;

  const operator = fields[anchor + 10];
  if (operator && !CHECKSUM_RE.test(operator)) fix.operator = operator;

  const ignition = findAcc(fields, anchor + 11);
  if (ignition !== undefined) fix.ignition = ignition;

  const voltage = findVoltage(fields, anchor + 11);
  if (voltage !== undefined) fix.voltage = voltage;

  return fix;
}

function resolveCommand(token: string): { command: Gt06Command; count?: number } {
  const upper = token.toUpperCase();
  const match = COUNT_PREFIX_RE.exec(upper);
  if (match) return { command: 'GPSV1', count: parseInt(match[1], 10) };
  const known = KNOWN_COMMANDS.find((c) => c === upper);
  return { command: known || 'UNKNOWN' };
}

function firstPlainNumber(fields: string[]): number | undefined {
  for (const field of fields) {
    const value = field.trim();
    if (DATE_RE.test(value)) continue;
    if (!/^\d+(\.\d+)?$/.test(value)) continue;
    const n = parseFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickReason(fields: string[]): string | undefined {
  const first = (fields[0] || '').trim();
  return /^[A-Z]{1,3}$/i.test(first) ? first.toUpperCase() : undefined;
}

function buildAlarm(imei: string, command: string, fields: string[], fixes: Gt06Fix[]): Gt06Alarm {
  const last = fixes[fixes.length - 1];

  let limit: number | undefined;
  if (command === 'OVERSPEED') {
    const candidate = firstPlainNumber(fields);
    if (candidate !== undefined && candidate > 0 && candidate <= 300) limit = candidate;
  }

  return {
    imei,
    command,
    reason: pickReason(fields) || command,
    timestamp: last ? last.timestamp : new Date(),
    latitude: last ? last.latitude : undefined,
    longitude: last ? last.longitude : undefined,
    speed: last ? last.speed : undefined,
    limit,
  };
}

export function decodeGt06(frame: string): Gt06Message | null {
  const body = frame.startsWith(GT06_FRAMER) ? frame.replace(/^##|##$/g, '') : frame;
  if (!body.startsWith('+GT06,')) return null;

  const parts = body.split(',');
  const imeiField = parts[1] || '';
  const imeiMatch = IMEI_RE.exec(imeiField);
  if (!imeiMatch) return null;
  const imei = normalizeImei(imeiMatch[1]);

  const token = (parts[2] || '').trim();
  const { command, count } = resolveCommand(token);

  const payload = parts.slice(3).map((p) => p.trim());
  if (count !== undefined) payload.unshift(token);

  const anchors: number[] = [];
  for (let i = 0; i < payload.length; i++) {
    if (DATE_RE.test(payload[i])) anchors.push(i);
  }

  const fixes: Gt06Fix[] = [];
  for (const anchor of anchors) {
    const fix = parseFixFromAnchor(imei, payload, anchor);
    if (fix) fixes.push(fix);
  }

  const message: Gt06Message = { imei, command, fixes, raw: body };

  const isAlarm =
    command === 'ALARM' || command === 'SOS' || command === 'OVERSPEED' ||
    command === 'VIBRATION' || command === 'LOWBAT' || command === 'EV';

  if (isAlarm) {
    message.alarm = buildAlarm(imei, command, payload, fixes);
  }

  return message;
}

