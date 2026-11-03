import { Platform } from 'react-native';
import * as Location from 'expo-location';

export async function getMyLocation(): Promise<{ lat: number; lng: number }> {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Tu navegador no permite obtener la ubicación'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('No se pudo obtener tu ubicación')),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Permiso de ubicación denegado');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
