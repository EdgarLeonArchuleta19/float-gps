import net from 'net';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { extractImei, decodeMessage, DecodeResult } from './protocol';
import { ingestFixes } from './ingest';

export interface TrackerState {
  started: boolean;
  port: number;
  connections: number;
  totalBytes: number;
  lastSeen: Date | null;
  lastImei: string | null;
  lastDecode: DecodeResult | null;
  inserted: number;
  lastInserted: number;
  lastError: string | null;
}

export const trackerState: TrackerState = {
  started: false,
  port: config.trackerPort,
  connections: 0,
  totalBytes: 0,
  lastSeen: null,
  lastImei: null,
  lastDecode: null,
  inserted: 0,
  lastInserted: 0,
  lastError: null,
};

const captureDir = path.join(process.cwd(), 'tracker_captures');

export function startTrackerServer(): net.Server {
  if (!fs.existsSync(captureDir)) {
    fs.mkdirSync(captureDir, { recursive: true });
  }

  const server = net.createServer((socket) => {
    trackerState.connections += 1;
    const remote = `${socket.remoteAddress || '?'}:${socket.remotePort}`;
    const sessionFile = path.join(captureDir, `capture-${Date.now()}-${remote.replace(/[^a-zA-Z0-9]/g, '_')}.hex`);
    console.log(`[TRACKER] Conexión entrante desde ${remote}`);

    let socketImei: string | null = null;
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer) => {
      trackerState.totalBytes += chunk.length;
      trackerState.lastSeen = new Date();

      const chunkHex = chunk.toString('hex').replace(/(..(?=..))/g, '$1 ').toUpperCase();
      fs.appendFileSync(sessionFile, chunkHex + '\n');
      console.log(`[TRACKER][${remote}] +${chunk.length} bytes | ${chunkHex}`);

      buffer = Buffer.concat([buffer, chunk]);

      if (!socketImei) {
        const imei = extractImei(buffer);
        if (imei) {
          socketImei = imei;
          trackerState.lastImei = imei;
          console.log(`[TRACKER] IMEI detectado: ${imei}`);
          const at = buffer.toString('ascii').indexOf(imei);
          buffer = buffer.subarray(at + imei.length);
        }
      }

      if (socketImei) {
        const decoded = decodeMessage(socketImei, buffer);
        if (decoded.recordCount && decoded.records.length > 0) {
          trackerState.lastDecode = decoded;
          const r = decoded.records[decoded.records.length - 1];
          console.log(`[TRACKER] Fix: ${r.latitude.toFixed(6)}, ${r.longitude.toFixed(6)} @ ${r.speed} km/h ${r.timestamp.toISOString()}`);
          ingestFixes(decoded.records)
            .then((sum) => {
              trackerState.inserted += sum.inserted;
              trackerState.lastInserted = sum.inserted;
              if (!sum.deviceFound) {
                trackerState.lastError = `IMEI ${socketImei} no registrado en el sistema`;
                console.warn(`[TRACKER] ${trackerState.lastError}`);
              } else {
                trackerState.lastError = null;
                console.log(`[TRACKER] BD: +${sum.inserted} posiciones, +${sum.events.length} eventos, estado unidad=${sum.unitStatus || '-'}`);
              }
            })
            .catch((err) => {
              trackerState.lastError = err.message;
              console.error(`[TRACKER] Error escribiendo en BD: ${err.message}`);
            });
          buffer = Buffer.alloc(0);
        }
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

  server.listen(config.trackerPort, config.trackerHost, () => {
    trackerState.started = true;
    trackerState.port = config.trackerPort;
    console.log(`[TRACKER] Escuchando TCP en ${config.trackerHost}:${config.trackerPort} (Ruptela/Argus ZK LITE+)`);
    console.log(`[TRACKER] Capturas raw guardadas en ${captureDir}`);
  });

  server.on('error', (err) => {
    console.error(`[TRACKER] ${err.message}`);
    trackerState.started = false;
  });

  return server;
}