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

/** MapLibre no tiene circulos, solo polilineas, asi que se aproxima con un poligono. */
export function circlePolygon(
  center: [number, number],
  radiusMeters: number,
  steps = 64
): GeoJSON.Feature {
  const earthRadius = 6378137;
  const latRad = (center[1] * Math.PI) / 180;
  const ring: [number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const dLat = ((radiusMeters * Math.cos(angle)) / earthRadius) * (180 / Math.PI);
    const dLng = ((radiusMeters * Math.sin(angle)) / (earthRadius * Math.cos(latRad))) * (180 / Math.PI);
    ring.push([center[0] + dLng, center[1] + dLat]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

export function circlesGeoJson(circles: CircleSpec[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: circles
      .filter((c) => c.radius > 0)
      .map((c) => {
        const feature = circlePolygon(c.center, c.radius);
        feature.properties = { color: c.color };
        return feature;
      }),
  };
}

export function routesGeoJson(routes: RouteSpec[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: routes
      .filter((r) => r.path.length > 1)
      .map((route, i) => ({
        type: 'Feature',
        properties: { color: route.color, key: i },
        geometry: {
          type: 'LineString',
          coordinates: route.path.map((p) => [p[0], p[1]] as [number, number]),
        },
      })),
  };
}