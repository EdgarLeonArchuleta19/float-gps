export interface DrivingRoute {
  path: [number, number][];
  distanceKm: number;
  durationMin: number;
  byRoad: boolean;
}

const OSRM_URL = process.env.EXPO_PUBLIC_OSRM_URL || 'https://router.project-osrm.org';

function straightKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function drivingRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<DrivingRoute> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(
      `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    );
    const body = await res.json();
    const route = body?.routes?.[0];
    if (!res.ok || body.code !== 'Ok' || !route) throw new Error('Sin ruta');
    return {
      path: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
      distanceKm: route.distance / 1000,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      byRoad: true,
    };
  } catch {
    const km = straightKm(from, to);
    return { path: [[from.lat, from.lng], [to.lat, to.lng]], distanceKm: km, durationMin: Math.max(1, Math.round((km / 40) * 60)), byRoad: false };
  } finally {
    clearTimeout(timeout);
  }
}
