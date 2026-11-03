import { config } from '../config';
import { Gt06Fix } from './gt06';
import { ingestFixes } from './ingest';
import {
  TraccarDevice,
  TraccarPosition,
  traccarPositionToFix,
} from './traccarMapping';

let timer: NodeJS.Timeout | null = null;
let running = false;
const lastFixTime = new Map<number, number>();

function baseUrl(): string {
  return config.traccarUrl.replace(/\/+$/, '');
}

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (!config.traccarToken && config.traccarUser) {
    const raw = `${config.traccarUser}:${config.traccarPassword}`;
    headers.Authorization = `Basic ${Buffer.from(raw).toString('base64')}`;
  }
  return headers;
}

async function apiGet<T>(path: string): Promise<T> {
  const separator = path.includes('?') ? '&' : '?';
  const token = config.traccarToken ? `${separator}token=${encodeURIComponent(config.traccarToken)}` : '';
  const response = await fetch(`${baseUrl()}${path}${token}`, { headers: requestHeaders() });
  if (!response.ok) {
    throw new Error(`Traccar ${response.status} ${response.statusText} en ${path}`);
  }
  return (await response.json()) as T;
}

async function pollDevice(device: TraccarDevice, now: Date): Promise<number> {
  const from = lastFixTime.get(device.id) ?? now.getTime() - config.traccarLookbackMs;
  const fromIso = new Date(from + 1).toISOString();
  const toIso = now.toISOString();

  const positions = await apiGet<TraccarPosition[]>(
    `/api/positions?deviceId=${device.id}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
  );
  if (positions.length === 0) return 0;

  const fixes = positions
    .map((position) => traccarPositionToFix(device.uniqueId, position))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const summary = await ingestFixes(fixes);

  const latest = positions.reduce(
    (max, position) => Math.max(max, new Date(position.fixTime || position.deviceTime || 0).getTime()),
    from
  );
  lastFixTime.set(device.id, latest);

  if (summary.inserted > 0) {
    console.log(`[TRACCAR] ${device.uniqueId} ${summary.inserted} posiciones nuevas (device=${device.id})`);
  }
  return summary.inserted;
}

async function pollOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const devices = await apiGet<TraccarDevice[]>('/api/devices');
    const now = new Date();
    for (const device of devices) {
      try {
        await pollDevice(device, now);
      } catch (error) {
        console.error(`[TRACCAR] Error device ${device.id}: ${(error as Error).message}`);
      }
    }
  } catch (error) {
    console.error(`[TRACCAR] ${(error as Error).message}`);
  } finally {
    running = false;
  }
}

export function startTraccarBridge(): void {
  if (timer) return;

  console.log('');
  console.log('=============================================');
  console.log(`  TRACCAR polling bridge -> ${baseUrl()}`);
  console.log(`  Poll cada ${Math.round(config.traccarPollMs / 1000)}s`);
  console.log('=============================================');
  console.log('');

  pollOnce();
  timer = setInterval(pollOnce, config.traccarPollMs);
  timer.unref();
}
