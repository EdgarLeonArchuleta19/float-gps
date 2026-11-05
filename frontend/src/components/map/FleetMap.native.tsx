import { useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
  type LngLat,
  type LngLatBounds,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { useTheme } from '@/context/ThemeContext';
import VehicleIcon from '@/components/shared/VehicleIcon';
import type { FleetMapProps, MapCamera, MapCircle, MapMarker, MapRoute } from './types';
import { ORANGE } from '@/lib/brand';

const STREET_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
};
const DEFAULT_CENTER: LngLat = [-107.394, 24.7994];
const DEFAULT_PADDING = { top: 60, bottom: 60, left: 40, right: 40 };
const EARTH_RADIUS_M = 6378137;

function isValid(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

function circleRing(c: MapCircle): LngLat[] {
  const latRad = (c.lat * Math.PI) / 180;
  return Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    const dLat = ((c.radius * Math.cos(a)) / EARTH_RADIUS_M) * (180 / Math.PI);
    const dLng = ((c.radius * Math.sin(a)) / (EARTH_RADIUS_M * Math.cos(latRad))) * (180 / Math.PI);
    return [c.lng + dLng, c.lat + dLat];
  });
}

function routeCoords(r: MapRoute): LngLat[] {
  return r.path.filter(([lat, lng]) => isValid(lat, lng)).map(([lat, lng]) => [lng, lat]);
}

function boundsOf(coords: LngLat[]): LngLatBounds {
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

function UnitMarker({ marker, onPress }: { marker: MapMarker; onPress?: (id: string) => void }) {
  return (
    <Marker id={marker.id} lngLat={[marker.lng, marker.lat]} anchor="center" onPress={() => onPress?.(marker.id)}>
      <View style={{ alignItems: 'center' }}>
        {marker.selected ? (
          <View style={{ backgroundColor: '#1b1b1f', borderColor: '#33343c', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 2 }}>
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
              {marker.name}
            </Text>
          </View>
        ) : null}
        <View style={{ borderRadius: 999, borderWidth: marker.selected ? 2 : 0, borderColor: ORANGE, backgroundColor: marker.selected ? 'rgba(248,114,3,0.22)' : 'transparent' }}>
          <VehicleIcon kind={marker.kind} figure={marker.figure} color={marker.color} statusColor={marker.statusColor} size={marker.selected ? 40 : 34} heading={marker.heading ?? 0} />
        </View>
      </View>
    </Marker>
  );
}

export default function FleetMap({
  markers = [],
  routes = [],
  circles = [],
  points = [],
  camera,
  follow,
  layer = 'street',
  onMarkerPress,
  onMove,
  onUserPan,
  style,
}: FleetMapProps) {
  const { t } = useTheme();
  const cameraRef = useRef<CameraRef>(null);
  const ready = useRef(false);
  const lastCamera = useRef<string | null>(null);
  const pendingCamera = useRef<MapCamera | null>(null);

  const mapStyle = layer === 'satellite' ? SATELLITE_STYLE : t.isDark ? DARK_STYLE : STREET_STYLE;
  const visibleMarkers = markers.filter((m) => isValid(m.lat, m.lng));

  const shapes = useMemo(() => {
    const validCircles = circles.filter((c) => isValid(c.lat, c.lng) && c.radius > 0);
    const validRoutes = routes.map((r) => ({ ...r, coords: routeCoords(r) })).filter((r) => r.coords.length > 1);
    const validPoints = points.filter((p) => isValid(p.lat, p.lng));
    return {
      circles: {
        type: 'FeatureCollection' as const,
        features: validCircles.map((c) => ({
          type: 'Feature' as const,
          properties: { color: c.color },
          geometry: { type: 'Polygon' as const, coordinates: [circleRing(c)] },
        })),
      },
      routes: {
        type: 'FeatureCollection' as const,
        features: validRoutes.map((r) => ({
          type: 'Feature' as const,
          properties: { color: r.color, dashed: !!r.dashed },
          geometry: { type: 'LineString' as const, coordinates: r.coords },
        })),
      },
      points: {
        type: 'FeatureCollection' as const,
        features: validPoints.map((p) => ({
          type: 'Feature' as const,
          properties: { color: p.color },
          geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        })),
      },
      coords: [
        ...visibleMarkers.map((m): LngLat => [m.lng, m.lat]),
        ...validRoutes.flatMap((r) => r.coords),
        ...validPoints.map((p): LngLat => [p.lng, p.lat]),
        ...validCircles.flatMap((c) => circleRing(c).filter((_, i) => i % 16 === 0)),
      ],
    };
  }, [circles, routes, points, visibleMarkers]);

  const applyCamera = (cam: MapCamera) => {
    const ref = cameraRef.current;
    if (!ref) return;
    if (cam.type === 'center' && cam.lat !== undefined && cam.lng !== undefined) {
      ref.easeTo({ center: [cam.lng, cam.lat], zoom: cam.zoom ?? 15, padding: cam.padding, duration: 600 });
      return;
    }
    if (shapes.coords.length === 1) {
      ref.easeTo({ center: shapes.coords[0], zoom: 15, duration: 600 });
    } else if (shapes.coords.length > 1) {
      ref.fitBounds(boundsOf(shapes.coords), { padding: cam.padding || DEFAULT_PADDING, duration: 600 });
    }
  };

  useEffect(() => {
    if (!camera || camera.key === lastCamera.current) return;
    lastCamera.current = camera.key;
    if (ready.current) applyCamera(camera);
    else pendingCamera.current = camera;
  }, [camera]);

  useEffect(() => {
    if (!follow || !ready.current) return;
    const m = visibleMarkers.find((x) => x.id === follow);
    if (m) cameraRef.current?.easeTo({ center: [m.lng, m.lat], duration: 800 });
  }, [follow, markers]);

  const onLoaded = () => {
    ready.current = true;
    if (pendingCamera.current) {
      applyCamera(pendingCamera.current);
      pendingCamera.current = null;
    }
  };

  return (
    <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: t.hex.screen }, style]}>
      <Map
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        touchRotate={false}
        touchPitch={false}
        compass={false}
        logo={false}
        attribution={false}
        onDidFinishLoadingMap={onLoaded}
        onRegionWillChange={(e) => {
          if (e.nativeEvent.userInteraction) onUserPan?.();
        }}
        onRegionDidChange={(e) => {
          const [lng, lat] = e.nativeEvent.center;
          onMove?.({ lat, lng, zoom: e.nativeEvent.zoom });
        }}
      >
        <Camera ref={cameraRef} initialViewState={{ center: DEFAULT_CENTER, zoom: 11 }} />
        <GeoJSONSource id="floa-circles" data={shapes.circles}>
          <Layer id="floa-circles-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.14 }} />
          <Layer id="floa-circles-line" type="line" paint={{ 'line-color': ['get', 'color'], 'line-width': 2 }} />
        </GeoJSONSource>
        <GeoJSONSource id="floa-routes" data={shapes.routes}>
          <Layer
            id="floa-routes-solid"
            type="line"
            filter={['!=', ['get', 'dashed'], true]}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.9 }}
          />
          <Layer
            id="floa-routes-dashed"
            type="line"
            filter={['==', ['get', 'dashed'], true]}
            paint={{ 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 2] }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="floa-points" data={shapes.points}>
          <Layer
            id="floa-points-dot"
            type="circle"
            paint={{ 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 }}
          />
        </GeoJSONSource>
        {visibleMarkers.map((m) => (
          <UnitMarker key={m.id} marker={m} onPress={onMarkerPress} />
        ))}
      </Map>
    </View>
  );
}
