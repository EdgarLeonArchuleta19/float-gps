import net from 'net';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { Gt06Message, buildResponse, decodeGt06, splitFrames } from './gt06';
import { ingestMessage, markOfflineDevices, thresholds } from './ingest';

export interface TrackerState {
  started: boolean;
  port: number;
  protocol: string;
  connections: number;
  totalBytes: number;
  totalFrames: number;
  lastSeen: Date | null;
  lastImei: string | null;
  lastCommand: string | null;
  lastMessage: Gt06Message | null;
  inserted: number;
  lastInserted: number;
  lastError: string | null;
  onlineDevices: string[];
  thresholds: typeof thresholds;
}

const onlineDevices = new Map<string, Date>();
const sessionDevices = new Set<string>();

export const trackerState: TrackerState = {
  started: false,
  port: config.trackerPort,
  protocol: 'GT06 (TCP texto)',
  connections: 0,
  totalBytes: 0,
  totalFrames: 0,
  lastSeen: null,
  lastImei: null,
  lastCommand: null,
  lastMessage: null,
  inserted: 0,
  lastInserted: 0,
  lastError: null,
  onlineDevices: [],
  thresholds,
};

const captureDir = path.join(process.cwd(), 'tracker_captures');
const CAPTURE_ENABLED = process.env.TRACKER_CAPTURE ? process.env.TRACKER_CAPTURE === 'true' : !config.isProduction;
const MAX_CONNECTIONS = parseInt(process.env.TRACKER_MAX_CONNECTIONS || '500', 10);
const MAX_PENDING_TEXT = 8 * 1024;
const MAX_CAPTURE_BYTES = 5 * 1024 * 1024;
const OFFLINE_TIMEOUT_MS = parseInt(process.env.TRACKER_OFFLINE_MIN || '15', 10) * 60 * 1000;

function refreshOnlineDevices(): void {
  const cutoff = Date.now() - OFFLINE_TIMEOUT_MS;
  for (const [imei, seenAt] of onlineDevices) {
    if (seenAt.getTime() < cutoff) onlineDevices.delete(imei);
  }
  trackerState.onlineDevices = Array.from(onlineDevices.keys());
}

function writeCapture(sessionFile: string | null, line: string): void {
  if (!CAPTURE_ENABLED || !sessionFile) return;
  try {
    if (fs.existsSync(sessionFile) && fs.statSync(sessionFile).size > MAX_CAPTURE_BYTES) return;
    fs.appendFileSync(sessionFile, line + '\n');
  } catch {
    /* captura es best-effort, nunca debe tumbar el tracker */
  }
}

async function handleGt06Frame(
  frame: string,
  sessionFile: string | null,
  respond: (payload: string) => void,
): Promise<void> {
  trackerState.totalFrames += 1;
  trackerState.lastSeen = new Date();

  writeCapture(sessionFile, `RX ${frame}`);

  if (!frame.startsWith('+GT06,')) {
    trackerState.lastError = `Frame no reconocido: ${frame.slice(0, 120)}`;
    console.warn(`[TRACKER] ${trackerState.lastError}`);
    return;
  }

  const message = decodeGt06(frame);
  if (!message) {
    trackerState.lastError = `No se pudo decodificar: ${frame.slice(0, 120)}`;
    console.warn(`[TRACKER] ${trackerState.lastError}`);
    return;
  }

  respond(buildResponse(message.imei, message.command));

  trackerState.lastImei = message.imei;
  trackerState.lastCommand = message.command;
  trackerState.lastMessage = message;
  onlineDevices.set(message.imei, new Date());
  sessionDevices.add(message.imei);
  refreshOnlineDevices();

  console.log(`[TRACKER] ${message.imei} ${message.command} <- ${frame.slice(0, 160)}`);

  if (message.fixes.length === 0 && !message.alarm) {
    console.log(`[TRACKER] ${message.imei} ${message.command} (sin payload)`);
    return;
  }

  const summary = await ingestMessage(message);

  if (!summary.deviceFound) {
    trackerState.lastError = `IMEI ${message.imei} no registrado en el sistema`;
    console.warn(`[TRACKER] ${trackerState.lastError}`);
    return;
  }

  trackerState.lastError = null;
  trackerState.lastInserted = summary.inserted;
  trackerState.inserted += summary.inserted;

  const last = message.fixes[message.fixes.length - 1];
  if (last) {
    console.log(
      `[TRACKER] ${message.imei} ${message.command} | ` +
        `${last.latitude.toFixed(5)}, ${last.longitude.toFixed(5)} | ` +
        `${last.speed} km/h | sats=${last.satellites ?? '-'} | ` +
        `fixes=${message.fixes.length} insertadas=${summary.inserted} dup=${summary.duplicates}`,
    );
  }

  const produced = summary.events;
  if (produced.length > 0) {
    console.log(`[TRACKER] ${message.imei} -> ${produced.join(', ')}`);
  }
  if (summary.unitStatus) {
    console.log(`[TRACKER] ${message.imei} estado unidad=${summary.unitStatus}`);
  }
}

export function startTrackerServer(): net.Server {
  if (CAPTURE_ENABLED && !fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true });
  }

  const server = net.createServer((socket) => {
    trackerState.connections += 1;
    const remote = `${socket.remoteAddress || '?'}:${socket.remotePort}`;
    const sessionFile = CAPTURE_ENABLED
      ? path.join(captureDir, `gt06-${Date.now()}-${remote.replace(/[^a-zA-Z0-9]/g, '_')}.log`)
      : null;

    console.log(`[TRACKER] Conexión entrante desde ${remote}`);

    let textRest = '';
    let pending: Promise<void> = Promise.resolve();

    const respond = (payload: string): void => {
      writeCapture(sessionFile, `TX ${payload}`);
      if (!socket.destroyed) socket.write(payload);
    };

    socket.setTimeout(OFFLINE_TIMEOUT_MS, () => {
      console.log(`[TRACKER] Timeout sin datos ${remote}, cerrando`);
      socket.destroy();
    });

    socket.on('data', (chunk: Buffer) => {
      trackerState.totalBytes += chunk.length;
      trackerState.lastSeen = new Date();

      const incoming = textRest + chunk.toString('latin1');
      const { frames, rest } = splitFrames(incoming);
      if (rest.length > MAX_PENDING_TEXT) {
        console.warn(`[TRACKER] ${remote} envió datos sin delimitar, cerrando`);
        socket.destroy();
        return;
      }
      textRest = rest;

      for (const frame of frames) {
        pending = pending.then(() => handleGt06Frame(frame, sessionFile, respond)).catch((err: Error) => {
          trackerState.lastError = err.message;
          console.error(`[TRACKER] Error procesando frame: ${err.message}`);
        });
      }
    });

    socket.on('error', (err) => {
      console.error(`[TRACKER] Error ${remote}: ${err.message}`);
    });

    socket.on('close', () => {
      trackerState.connections -= 1;
      console.log(`[TRACKER] Conexión cerrada ${remote}`);
    });
  });

  server.maxConnections = MAX_CONNECTIONS;

  server.listen(config.trackerPort, config.trackerHost, () => {
    trackerState.started = true;
    trackerState.port = config.trackerPort;
    console.log('');
    console.log('=============================================');
    console.log(`  TRACKER TCP en ${config.trackerHost}:${config.trackerPort}`);
    console.log('  Protocolo: GT06 (##+GT06,...,##)');
    console.log(`  Exceso de velocidad: ${thresholds.overspeedKmh} km/h`);
    console.log(`  Batería baja: ${thresholds.lowBatteryVolts} V`);
    console.log(`  Capturas raw: ${CAPTURE_ENABLED ? captureDir : 'desactivadas'}`);
    console.log('=============================================');
    console.log('');
  });

  server.on('error', (err) => {
    trackerState.started = false;
    console.error(`[TRACKER] ${err.message}`);
  });

  const watchdog = setInterval(() => {
    refreshOnlineDevices();
    markOfflineDevices(Array.from(sessionDevices), OFFLINE_TIMEOUT_MS)
      .then((n) => {
        if (n > 0) console.log(`[TRACKER] ${n} unidad(es) marcadas como OFFLINE por falta de reportes`);
      })
      .catch((err: Error) => console.error(`[TRACKER] Watchdog: ${err.message}`));
  }, 60 * 1000);
  watchdog.unref();

  return server;
}
