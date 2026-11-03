import { Linking, Platform } from 'react-native';

type NavigationApp = 'google' | 'apple' | 'waze';

function navigationUrl(app: NavigationApp, lat: number, lng: number): string {
  switch (app) {
    case 'waze':
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    case 'apple':
      return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  }
}

export function availableNavigationApps(): NavigationApp[] {
  return Platform.OS === 'ios' ? ['apple', 'google', 'waze'] : ['google', 'waze'];
}

export function navigationAppLabel(app: NavigationApp): string {
  switch (app) {
    case 'apple': return 'Apple Maps';
    case 'waze': return 'Waze';
    default: return 'Google Maps';
  }
}

export async function openNavigation(app: NavigationApp, lat: number, lng: number) {
  const url = navigationUrl(app, lat, lng);
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  await Linking.openURL(url);
}
