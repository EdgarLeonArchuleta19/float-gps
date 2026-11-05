import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';
import { ALERT_TYPES, DEFAULT_SETTING, sendTestAlert } from '../services/notify.service';
import { webPushPublicKey } from '../services/push.service';
import { emailAvailable } from '../services/email.service';

const prisma = new PrismaClient();
const router = Router();

const EXPO_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;
const MAX_DEVICES = 10;

// Notification settings belong to a real customer account; a floaGPS team
// member in Support Mode has nothing to configure here.
function ownAccount(req: Request, _res: Response, next: NextFunction) {
  if (getTenant(req).support) return next(new AppError('Las notificaciones se configuran desde la cuenta del cliente.', 403));
  next();
}

router.use(ownAccount);

async function currentSetting(userId: string) {
  const [setting, devices] = await Promise.all([
    prisma.notificationSetting.findUnique({ where: { userId } }),
    prisma.pushDevice.count({ where: { userId } }),
  ]);
  const base = setting || DEFAULT_SETTING;
  return {
    pushEnabled: base.pushEnabled,
    emailEnabled: base.emailEnabled,
    types: base.types,
    devices,
    channels: { webPush: !!webPushPublicKey(), email: emailAvailable() },
  };
}

router.get('/settings', asyncHandler(async (req, res) => {
  res.json(await currentSetting(getTenant(req).userId));
}));

router.put('/settings', asyncHandler(async (req, res) => {
  const { userId } = getTenant(req);
  const body = req.body || {};
  const types = Array.isArray(body.types) ? ALERT_TYPES.filter((t) => body.types.includes(t)) : DEFAULT_SETTING.types;
  const data = {
    pushEnabled: body.pushEnabled !== false,
    emailEnabled: body.emailEnabled === true,
    types: [...types],
  };
  await prisma.notificationSetting.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  res.json(await currentSetting(userId));
}));

router.get('/web-push-key', (_req, res) => {
  res.json({ publicKey: webPushPublicKey() });
});

// Registers this phone (Expo push token) or browser (Web Push subscription)
// for the signed-in user. A token moves to whoever signs in last on it.
router.post('/devices', asyncHandler(async (req, res) => {
  const { userId } = getTenant(req);
  const kind = req.body?.kind;
  const raw = req.body?.token;
  let token = '';
  if (kind === 'expo' && typeof raw === 'string' && EXPO_TOKEN.test(raw)) token = raw;
  if (kind === 'web' && raw && typeof raw === 'object' && typeof raw.endpoint === 'string' && /^https:\/\//.test(raw.endpoint) && raw.keys?.p256dh && raw.keys?.auth) {
    token = JSON.stringify({ endpoint: raw.endpoint, keys: { p256dh: String(raw.keys.p256dh), auth: String(raw.keys.auth) } });
  }
  if (!token) throw new AppError('Dispositivo no válido para notificaciones', 400);
  const label = typeof req.body?.label === 'string' ? req.body.label.slice(0, 80) : null;
  await prisma.pushDevice.upsert({ where: { token }, create: { userId, kind, token, label }, update: { userId, label, lastUsedAt: new Date() } });
  const extra = await prisma.pushDevice.findMany({ where: { userId }, orderBy: { lastUsedAt: 'desc' }, skip: MAX_DEVICES, select: { id: true } });
  if (extra.length) await prisma.pushDevice.deleteMany({ where: { id: { in: extra.map((d) => d.id) } } });
  res.status(201).json({ ok: true });
}));

router.post('/devices/remove', asyncHandler(async (req, res) => {
  const { userId } = getTenant(req);
  const raw = req.body?.token;
  const token = typeof raw === 'string' ? raw : raw && typeof raw === 'object' ? JSON.stringify({ endpoint: raw.endpoint, keys: { p256dh: String(raw.keys?.p256dh), auth: String(raw.keys?.auth) } }) : '';
  await prisma.pushDevice.deleteMany({ where: { userId, token } });
  res.json({ ok: true });
}));

router.post('/test', asyncHandler(async (req, res) => {
  await sendTestAlert(getTenant(req).userId);
  res.json({ message: 'Enviamos una notificación de prueba a tus canales activos.' });
}));

export default router;
