export interface CircleSpec {
  center: [number, number];
  radius: number;
  color: string;
}

export interface RouteSpec {
  path: [number, number][];
  color: string;
  dashed?: boolean;
}

export const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

/**
 * La app usa [lat, lng] en todas sus props, pero MapLibre y GeoJSON esperan
 * [lng, lat]. Estas dos funciones son el unico lugar donde se invierte el orden,
 * para no tener que acordarse en cada llamada.
 */
export function toLngLat([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

/** GeoJSON exige [lng, lat]. */
function toGeoJSONPoint([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

export function isValidPoint(p: [number, number] | undefined | null): boolean {
  if (!p || p.length < 2) return false;
  const [lat, lng] = p;
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

export function validPoints(path: [number, number][]): [number, number][] {
  return path.filter(isValidPoint);
}

/** MapLibre no tiene circulos, solo polilineas, asi que se aproxima con un poligono. */
export function circlePolygon(
  center: [number, number],
  radiusMeters: number,
  steps = 64
): GeoJSON.Feature | null {
  if (!isValidPoint(center) || !(radiusMeters > 0)) return null;

  const earthRadius = 6378137;
  const latRad = (center[0] * Math.PI) / 180;
  const ring: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const dLat = ((radiusMeters * Math.cos(angle)) / earthRadius) * (180 / Math.PI);
    const dLng =
      ((radiusMeters * Math.sin(angle)) / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
    ring.push(toGeoJSONPoint([center[0] + dLat, center[1] + dLng]));
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

export function circlesGeoJson(circles: CircleSpec[]): GeoJSON.FeatureCollection {
  const features = circles
    .map((c) => {
      const feature = circlePolygon(c.center, c.radius);
      if (!feature) return null;
      feature.properties = { color: c.color };
      return feature;
    })
    .filter((f): f is GeoJSON.Feature => f !== null);

  return { type: 'FeatureCollection', features };
}

export function routesGeoJson(routes: RouteSpec[]): GeoJSON.FeatureCollection {
  const features = routes
    .map((route) => {
      const path = validPoints(route.path);
      if (path.length < 2) return null;
      return {
        type: 'Feature' as const,
        properties: { color: route.color },
        geometry: {
          type: 'LineString' as const,
          coordinates: path.map(toGeoJSONPoint),
        },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return { type: 'FeatureCollection', features };
}