import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { ingestFixes, findDevice, recordEvent } from '../tracker/ingest';
import {
  TraccarPosition,
  TraccarDevice,
  TraccarEvent,
  traccarPositionToFix,
} from '../tracker/traccarMapping';

const prisma = new PrismaClient();

// Fails closed: without a configured secret the webhook only works outside
// production (config refuses to boot in production without one).
function verifyWebhookSecret(req: Request): boolean {
  if (!config.traccarWebhookSecret) {
    return !config.isProduction;
  }
  const header = req.headers['x-floa-token'];
  const query = req.query.token;
  const token = typeof header === 'string' && header ? header : typeof query === 'string' ? query : '';
  if (!token) return false;

  const expected = crypto.createHash('sha256').update(config.traccarWebhookSecret).digest();
  const actual = crypto.createHash('sha256').update(token).digest();
  return crypto.timingSafeEqual(expected, actual);
}

export async function handleTraccarWebhook(req: Request, res: Response) {
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ error: 'Token de webhook no válido o no proporcionado' });
  }

  const payload = req.body || {};
  const position: TraccarPosition | undefined = payload.position;
  const device: TraccarDevice | undefined = payload.device;
  const event: TraccarEvent | undefined = payload.event;

  let insertedCount = 0;
  let deviceFound = false;

  const uniqueId = device?.uniqueId || (position?.attributes?.uniqueId as string);

  if (uniqueId && position && position.latitude !== undefined && position.longitude !== undefined) {
    const fix = traccarPositionToFix(uniqueId, position);
    const summary = await ingestFixes([fix]);
    insertedCount = summary.inserted;
    deviceFound = summary.inserted > 0 || !!(await findDevice(uniqueId));
  }

  if (uniqueId && event) {
    const matchedDevice = await findDevice(uniqueId);
    if (matchedDevice) {
      deviceFound = true;
      const eventType = event.type || 'ALARM';
      const eventTime = event.eventTime || event.serverTime ? new Date(event.eventTime || event.serverTime!) : new Date();

      if (eventType === 'deviceOffline') {
        if (matchedDevice.vehicleId) {
          await prisma.vehicle.update({ where: { id: matchedDevice.vehicleId }, data: { status: 'OFFLINE' } }).catch(() => {});
        } else if (matchedDevice.machineId) {
          await prisma.machine.update({ where: { id: matchedDevice.machineId }, data: { status: 'OFFLINE' } }).catch(() => {});
        }
      }

      if (eventType === 'alarm' || eventType === 'sos' || event.attributes?.alarm) {
        const alarmDesc = (event.attributes?.alarm as string) || 'Alarma recibida';
        await recordEvent(matchedDevice, {
          type: alarmDesc.toLowerCase().includes('sos') ? 'SOS' : 'ALARM',
          severity: 'CRITICAL',
          message: `Alarma Traccar: ${alarmDesc}`,
          latitude: position?.latitude ?? null,
          longitude: position?.longitude ?? null,
          speed: position?.speed ?? null,
          timestamp: eventTime,
        }).catch(() => {});
      }
    }
  }

  return res.status(200).json({
    received: true,
    deviceFound,
    uniqueId: uniqueId || null,
    inserted: insertedCount,
  });
}
