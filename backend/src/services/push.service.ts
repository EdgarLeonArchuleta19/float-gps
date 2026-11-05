import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
}

const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const DEV_KEYS_FILE = path.resolve(__dirname, '../../.vapid-dev.json');

// Browser push needs a VAPID key pair. Production reads it from
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; in development a pair is generated
// once and kept in backend/.vapid-dev.json so subscriptions survive restarts.
function loadVapidKeys(): { publicKey: string; privateKey: string } | null {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  if (config.isProduction) {
    console.warn('[PUSH] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas: las notificaciones del navegador están apagadas.');
    return null;
  }
  try {
    if (fs.existsSync(DEV_KEYS_FILE)) return JSON.parse(fs.readFileSync(DEV_KEYS_FILE, 'utf8'));
    const keys = webpush.generateVAPIDKeys();
    fs.writeFileSync(DEV_KEYS_FILE, JSON.stringify(keys));
    return keys;
  } catch {
    return null;
  }
}

const vapid = loadVapidKeys();
if (vapid) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:soporte@floagps.com', vapid.publicKey, vapid.privateKey);

export function webPushPublicKey() {
  return vapid?.publicKey || null;
}

async function forget(token: string) {
  await prisma.pushDevice.deleteMany({ where: { token } }).catch(() => {});
}

async function sendExpo(tokens: string[], message: PushMessage) {
  if (!tokens.length) return;
  try {
    const res = await fetch(EXPO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        tokens.map((to) => ({ to, title: message.title, body: message.body, sound: 'default', priority: 'high', channelId: 'alerts', data: { url: message.url || '/notifications' } })),
      ),
    });
    const json: any = await res.json().catch(() => null);
    const results: any[] = json?.data || [];
    await Promise.all(results.map((r, i) => (r?.details?.error === 'DeviceNotRegistered' ? forget(tokens[i]) : null)));
  } catch (err) {
    console.error('[PUSH] Expo:', err);
  }
}

async function sendWeb(subscriptions: string[], message: PushMessage) {
  if (!vapid) return;
  const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url || '/notifications' });
  await Promise.all(
    subscriptions.map(async (raw) => {
      try {
        await webpush.sendNotification(JSON.parse(raw), payload, { TTL: 3600 });
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) await forget(raw);
      }
    }),
  );
}

export async function pushToUser(userId: string, message: PushMessage) {
  const devices = await prisma.pushDevice.findMany({ where: { userId }, select: { kind: true, token: true } });
  await Promise.all([
    sendExpo(devices.filter((d) => d.kind === 'expo').map((d) => d.token), message),
    sendWeb(devices.filter((d) => d.kind === 'web').map((d) => d.token), message),
  ]);
  if (devices.length) await prisma.pushDevice.updateMany({ where: { userId }, data: { lastUsedAt: new Date() } }).catch(() => {});
}
