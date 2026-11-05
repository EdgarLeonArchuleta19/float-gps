import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import type { TenantContext } from '../middleware/auth';
import { permissionsFor } from '../utils/permissions';
import { normalizePlan } from '../utils/plans';
import { escapeHtml } from '../utils/html';
import { canAccessUnit, type UnitKind } from './unitAccess';
import { pushToUser } from './push.service';
import { sendEmail } from './email.service';

const prisma = new PrismaClient();

export const ALERT_TYPES = ['GEOFENCE', 'SOS', 'OVERSPEED', 'LOW_BATTERY', 'IGNITION', 'MAINTENANCE'] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const DEFAULT_SETTING = {
  pushEnabled: true,
  emailEnabled: false,
  types: ['GEOFENCE', 'SOS', 'OVERSPEED', 'MAINTENANCE'] as string[],
};

export interface Alert {
  companyId: string;
  type: AlertType;
  title: string;
  body: string;
  url?: string;
  unit?: { kind: UnitKind; id: string };
}

const REPEAT_WINDOW_MS = 60 * 1000;
const lastSent = new Map<string, number>();

export function alertTypeFor(eventType: string): AlertType | null {
  if (eventType.startsWith('GEOFENCE_')) return 'GEOFENCE';
  if (eventType === 'SOS' || eventType === 'ALARM' || eventType === 'VIBRATION') return 'SOS';
  if (eventType === 'OVERSPEED') return 'OVERSPEED';
  if (eventType === 'LOW_BATTERY') return 'LOW_BATTERY';
  if (eventType === 'IGNITION_ON' || eventType === 'IGNITION_OFF') return 'IGNITION';
  return null;
}


function alertEmail(alert: Alert, name: string) {
  return `
    <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f">
      <p style="color:#6b7280;margin:0 0 4px">Hola, ${escapeHtml(name)}</p>
      <h2 style="color:#032347;margin:0 0 8px">${escapeHtml(alert.title)}</h2>
      <p style="font-size:15px">${escapeHtml(alert.body)}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:24px">Puedes cambiar qué alertas recibes en floaGPS → Configuración → Notificaciones.</p>
    </div>`;
}

// Who gets an alert: active users of the company whose role lets them see
// alerts (or maintenance, for maintenance reminders) and who can see that
// unit, filtered by the alert types and channels each one chose.
async function recipients(alert: Alert) {
  const users = await prisma.user.findMany({
    where: { companyId: alert.companyId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      roleId: true,
      ownUnits: true,
      customRole: { select: { permissions: true, allUnits: true } },
      company: { select: { plan: true } },
      notificationSetting: true,
    },
  });
  const needed = alert.type === 'MAINTENANCE' ? 'maintenance' : 'alerts';
  const chosen = [];
  for (const user of users) {
    const permissions = permissionsFor(user.role, user.customRole);
    if (permissions !== null && !permissions.includes(needed)) continue;
    const setting = user.notificationSetting || DEFAULT_SETTING;
    if (!setting.types.includes(alert.type)) continue;
    if (alert.unit) {
      const isMember = user.role !== 'admin';
      const tenant: TenantContext = {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: alert.companyId,
        roleId: user.roleId,
        permissions,
        restrictToUserUnits: isMember && (user.ownUnits || !user.customRole?.allUnits),
        unitsByUser: isMember && user.ownUnits,
        plan: normalizePlan(user.company?.plan),
        support: null,
      };
      if (!(await canAccessUnit(alert.unit.kind, alert.unit.id, tenant))) continue;
    }
    chosen.push({ user, setting });
  }
  return chosen;
}

async function deliver(user: { id: string; name: string; email: string }, setting: typeof DEFAULT_SETTING, alert: Alert) {
  const jobs: Promise<unknown>[] = [];
  if (setting.pushEnabled) jobs.push(pushToUser(user.id, { title: alert.title, body: alert.body, url: alert.url }));
  if (setting.emailEnabled) {
    jobs.push(
      sendEmail({ to: user.email, subject: `${alert.title} · floaGPS`, html: alertEmail(alert, user.name) }).then((sent) => {
        if (!sent && !config.isProduction) console.log(`[EMAIL-DEV] ${user.email}: ${alert.title} — ${alert.body}`);
      }),
    );
  }
  await Promise.all(jobs);
}

// Sends an alert by push and email according to each recipient's
// settings. The same alert for the same unit and person is sent at most once
// a minute, so a unit bouncing on a geofence edge doesn't flood anyone.
export async function dispatchAlert(alert: Alert) {
  try {
    const list = await recipients(alert);
    const now = Date.now();
    await Promise.all(
      list.map(({ user, setting }) => {
        const key = `${user.id}:${alert.type}:${alert.unit?.id || ''}:${alert.title}`;
        if (now - (lastSent.get(key) || 0) < REPEAT_WINDOW_MS) return null;
        lastSent.set(key, now);
        return deliver(user, setting, alert);
      }),
    );
  } catch (err) {
    console.error('[ALERTAS]', err);
  }
}

export async function sendTestAlert(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, notificationSetting: true } });
  if (!user) return;
  await deliver(user, user.notificationSetting || DEFAULT_SETTING, {
    companyId: '',
    type: 'SOS',
    title: 'Notificación de prueba',
    body: 'Así te llegarán las alertas de tus unidades.',
    url: '/notifications',
  });
}
