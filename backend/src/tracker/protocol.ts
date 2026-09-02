export interface TrackerFix {
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
  raw: string;
}

const IMEI_RE = /\b(\d{15})\b/;

export function extractImei(buf: Buffer): string | null {
  const ascii = buf.toString('ascii');
  const m = ascii.match(IMEI_RE);
  if (m) return m[1];
  return null;
}

export function makeHex(buf: Buffer): string {
  return buf.toString('hex').replace(/(..)/g, '$1 ');
}

export function toHex(buf: Buffer): string {
  return buf.toString('hex');
}

export interface DecodeResult {
  imei?: string;
  signature?: string;
  recordCount?: number;
  records: TrackerFix[];
  unknown: boolean;
}

function sanity(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function readIntBE(buf: Buffer, off: number, len: number): number {
  return buf.readIntBE(off, len);
}

function readUIntBE(buf: Buffer, off: number, len: number): number {
  return buf.readUIntBE(off, len);
}

export function decodeMessage(imei: string, buf: Buffer): DecodeResult {
  const out: DecodeResult = { records: [], unknown: true };

  if (buf.length >= 2) {
    out.signature = buf.subarray(0, 2).toString('hex');
  }

  const ascii = buf.toString('ascii');
  if (ascii.includes(imei)) {
    out.imei = imei;
  }

  if (buf.length < 10) return out;

  const sig0 = buf[0];
  const sig1 = buf[1];

  if (sig0 === 0x06 && sig1 === 0x01) {
    out.unknown = false;
    return out;
  }

  if (sig0 === 0x00 && (sig1 === 0x02 || sig1 === 0x01)) {
    const viz = readUIntBE(buf, 2, 1);
    if (viz === 0) return out;
    out.recordCount = viz;
    out.unknown = false;
    let off = 3;
    for (let i = 0; i < viz && off + 8 <= buf.length; i++) {
      const timestamp = readUIntBE(buf, off, 4);
      off += 4;
      const priority = buf[off];
      if (off + 1 > buf.length) break;
      off += 1;
      const longitude = readIntBE(buf, off, 4);
      off += 4;
      const latitude = readIntBE(buf, off, 4);
      off += 4;
      const fix: TrackerFix = {
        imei,
        timestamp: new Date(timestamp * 1000),
        latitude: latitude * 0.0000001,
        longitude: longitude * 0.0000001,
        speed: 0,
        raw: toHex(buf.subarray(0, Math.min(off + 16, buf.length))),
      };
      if (sanity(fix.latitude, fix.longitude)) {
        if (off + 2 <= buf.length) {
          fix.altitude = readUIntBE(buf, off, 2);
          off += 2;
        }
        if (off + 1 <= buf.length) {
          fix.heading = buf[off];
          off += 1;
        }
        if (off + 1 <= buf.length) {
          fix.satellites = buf[off];
          off += 1;
        }
        if (off + 2 <= buf.length) {
          fix.speed = readUIntBE(buf, off, 2);
          off += 2;
        }
        fix.speed = Math.round(fix.speed / 10);
      } else {
        out.records = [];
        out.unknown = true;
        return out;
      }
      out.records.push(fix);
    }
    return out;
  }

  return out;
}

export function ipFromPort(n: number): string {
  return `${(n >> 24) & 0xff}.${(n >> 16) & 0xff}.${(n >> 8) & 0xff}.${n & 0xff}`;
}