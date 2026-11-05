import { api } from './api';

let registered: PushSubscriptionJSON | null = null;

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function browserLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  return `${browser} · ${/Mobile|Android|iPhone/.test(ua) ? 'celular' : 'computadora'}`;
}

async function subscription(ask: boolean) {
  if (!pushSupported()) return null;
  let permission = Notification.permission;
  if (permission !== 'granted' && ask) permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const { publicKey } = await api.notifications.webPushKey();
  if (!publicKey) return null;
  const registration = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const current = existing || (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  return current.toJSON();
}

export async function enablePush(): Promise<boolean> {
  const sub = await subscription(true);
  if (!sub) return false;
  await api.notifications.registerDevice('web', sub, browserLabel());
  registered = sub;
  return true;
}

export async function refreshPush() {
  try {
    const sub = await subscription(false);
    if (!sub) return;
    await api.notifications.registerDevice('web', sub, browserLabel());
    registered = sub;
  } catch {
    registered = null;
  }
}

export function forgetPush() {
  if (!registered) return;
  api.notifications.removeDevice(registered).catch(() => {});
  registered = null;
}
