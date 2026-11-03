import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 3001;

function hostFromExpo(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  return hostUri.split(':')[0] || null;
}

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${API_PORT}/api`;
  }

  const host = hostFromExpo() || 'localhost';
  return `http://${host}:${API_PORT}/api`;
}

export const API_URL = resolveApiUrl();
