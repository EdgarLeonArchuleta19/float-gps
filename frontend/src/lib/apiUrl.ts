import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from './storage';

const API_PORT = 3001;
const SERVER_KEY = 'floa_server_url';
const HEALTH_TIMEOUT_MS = 8000;

function hostFromExpo(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  return hostUri.split(':')[0] || null;
}

function defaultApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname, origin } = window.location;
    return __DEV__ ? `${protocol}//${hostname}:${API_PORT}/api` : `${origin}/api`;
  }

  const host = hostFromExpo() || 'localhost';
  return `http://${host}:${API_PORT}/api`;
}

let current = defaultApiUrl();

export const canChangeServer = Platform.OS !== 'web';

export function getApiUrl(): string {
  return current;
}

export function serverOrigin(): string {
  return current.replace(/\/api$/, '');
}

export function normalizeServer(input: string): string | null {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s/]+(\/[^\s]*)?$/i.test(trimmed)) return null;
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
}

export async function loadServerUrl(): Promise<void> {
  if (!canChangeServer) return;
  const saved = await storage.get(SERVER_KEY).catch(() => null);
  if (saved) current = saved;
}

export async function checkServer(apiUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
    const body = await res.json().catch(() => null);
    return res.ok && body?.status === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function setServerUrl(apiUrl: string | null): Promise<void> {
  current = apiUrl || defaultApiUrl();
  if (apiUrl) await storage.set(SERVER_KEY, apiUrl);
  else await storage.remove(SERVER_KEY);
}
