import { Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { hasPosition } from './units';
import type { FleetUnit } from './types';

function locationMessage(units: FleetUnit[]): string {
  const lines = units.filter(hasPosition).map((u) => {
    const { latitude, longitude, speed } = u.position;
    return `• ${u.name} (${u.plate}) · ${Math.round(speed)} km/h\n  https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  });
  return `Ubicación actual · floaGPS\n${lines.join('\n')}`;
}

export async function copyLocations(units: FleetUnit[]) {
  await Clipboard.setStringAsync(locationMessage(units));
}

export async function shareLocations(units: FleetUnit[]): Promise<'shared' | 'copied'> {
  const located = units.filter(hasPosition);
  if (!located.length) throw new Error('Las unidades seleccionadas no tienen posición reciente');
  const message = locationMessage(located);
  if (Platform.OS === 'web') {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      await nav.share({ title: 'Ubicación floaGPS', text: message });
      return 'shared';
    }
    await Clipboard.setStringAsync(message);
    return 'copied';
  }
  await Share.share({ message });
  return 'shared';
}

export function whatsappLocations(units: FleetUnit[]) {
  const url = `https://wa.me/?text=${encodeURIComponent(locationMessage(units))}`;
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url);
}
