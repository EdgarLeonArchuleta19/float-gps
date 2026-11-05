import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { api } from './api';

let registered: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

Notifications.addNotificationResponseReceivedListener((response) => {
  const url = response.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
});

export function pushSupported() {
  return Device.isDevice;
}

async function deviceToken(ask: boolean) {
  if (!Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Alertas de unidades',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#f87203',
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted' && ask) status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data;
}

export async function enablePush(): Promise<boolean> {
  const token = await deviceToken(true);
  if (!token) return false;
  await api.notifications.registerDevice('expo', token, `${Device.manufacturer || ''} ${Device.modelName || 'Celular'}`.trim());
  registered = token;
  return true;
}

export async function refreshPush() {
  try {
    const token = await deviceToken(false);
    if (!token) return;
    await api.notifications.registerDevice('expo', token, `${Device.manufacturer || ''} ${Device.modelName || 'Celular'}`.trim());
    registered = token;
  } catch {
    registered = null;
  }
}

export function forgetPush() {
  if (!registered) return;
  api.notifications.removeDevice(registered).catch(() => {});
  registered = null;
}
