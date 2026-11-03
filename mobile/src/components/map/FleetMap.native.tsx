import { useEffect, useMemo, useRef } from 'react';
import { Platform, View } from 'react-native';
import MapView, { Circle, Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useTheme } from '@/context/ThemeContext';
import { DARK_GOOGLE_STYLE } from './darkGoogleStyle';
import NativeUnitMarker from './NativeUnitMarker';
import type { FleetMapProps, MapCamera } from './types';

const DEFAULT_REGION: Region = { latitude: 24.7994, longitude: -107.394, latitudeDelta: 0.15, longitudeDelta: 0.15 };

function isValid(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

function zoomFromRegion(region: Region) {
  return Math.log2(360 / Math.max(region.longitudeDelta, 0.000001));
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
  const mapRef = useRef<MapView>(null);
  const lastCamera = useRef<string | null>(null);
  const ready = useRef(false);
  const pendingCamera = useRef<MapCamera | null>(null);

  const allCoords = useMemo(() => {
    const coords: { latitude: number; longitude: number }[] = [];
    markers.forEach((m) => isValid(m.lat, m.lng) && coords.push({ latitude: m.lat, longitude: m.lng }));
    routes.forEach((r) => r.path.forEach(([lat, lng]) => isValid(lat, lng) && coords.push({ latitude: lat, longitude: lng })));
    points.forEach((p) => isValid(p.lat, p.lng) && coords.push({ latitude: p.lat, longitude: p.lng }));
    circles.forEach((c) => {
      if (!isValid(c.lat, c.lng)) return;
      const dLat = c.radius / 111320;
      const dLng = c.radius / (111320 * Math.cos((c.lat * Math.PI) / 180));
      coords.push({ latitude: c.lat + dLat, longitude: c.lng + dLng }, { latitude: c.lat - dLat, longitude: c.lng - dLng });
    });
    return coords;
  }, [markers, routes, points, circles]);

  const applyCamera = (cam: MapCamera) => {
    const map = mapRef.current;
    if (!map) return;
    const pad = cam.padding || { top: 60, bottom: 60, left: 40, right: 40 };
    if (cam.type === 'center' && cam.lat !== undefined && cam.lng !== undefined) {
      map.animateCamera({ center: { latitude: cam.lat, longitude: cam.lng }, zoom: cam.zoom ?? 15 }, { duration: 600 });
      return;
    }
    if (allCoords.length === 1) {
      map.animateCamera({ center: allCoords[0], zoom: 15 }, { duration: 600 });
    } else if (allCoords.length > 1) {
      map.fitToCoordinates(allCoords, { edgePadding: pad, animated: true });
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
    const m = markers.find((x) => x.id === follow);
    if (m && isValid(m.lat, m.lng)) mapRef.current?.animateCamera({ center: { latitude: m.lat, longitude: m.lng } }, { duration: 800 });
  }, [follow, markers]);

  const onReady = () => {
    ready.current = true;
    if (pendingCamera.current) {
      applyCamera(pendingCamera.current);
      pendingCamera.current = null;
    }
  };

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={DEFAULT_REGION}
        mapType={layer === 'satellite' ? 'hybrid' : 'standard'}
        userInterfaceStyle={t.isDark ? 'dark' : 'light'}
        customMapStyle={Platform.OS === 'android' && t.isDark && layer !== 'satellite' ? DARK_GOOGLE_STYLE : []}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        onMapReady={onReady}
        onPanDrag={() => onUserPan?.()}
        onRegionChangeComplete={(region) => onMove?.({ lat: region.latitude, lng: region.longitude, zoom: zoomFromRegion(region) })}
      >
        {circles.filter((c) => isValid(c.lat, c.lng)).map((c, i) => (
          <Circle
            key={`c-${i}-${c.lat}-${c.lng}`}
            center={{ latitude: c.lat, longitude: c.lng }}
            radius={c.radius}
            strokeColor={c.color}
            strokeWidth={2}
            fillColor={`${c.color}24`}
          />
        ))}
        {routes.map((r, i) => (
          <Polyline
            key={`r-${i}-${r.path.length}`}
            coordinates={r.path.filter(([lat, lng]) => isValid(lat, lng)).map(([latitude, longitude]) => ({ latitude, longitude }))}
            strokeColor={r.color}
            strokeWidth={r.dashed ? 3 : 4}
            lineDashPattern={r.dashed ? [8, 8] : undefined}
            lineCap="round"
            lineJoin="round"
          />
        ))}
        {points.filter((p) => isValid(p.lat, p.lng)).map((p, i) => (
          <Marker key={`p-${i}-${p.lat}-${p.lng}`} coordinate={{ latitude: p.lat, longitude: p.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#ffffff', backgroundColor: p.color }} />
          </Marker>
        ))}
        {markers.filter((m) => isValid(m.lat, m.lng)).map((m) => (
          <NativeUnitMarker key={m.id} marker={m} onPress={onMarkerPress} />
        ))}
      </MapView>
    </View>
  );
}
