import { useEffect, useRef, useState } from 'react';
import {
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreInstance,
  Marker,
  StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CircleSpec, EMPTY_GEOJSON, RouteSpec, circlesGeoJson, routesGeoJson } from './geo';

export type { CircleSpec };
export type MapRoute = RouteSpec;

const CULIACAN: [number, number] = [24.7994, -107.3940];

/**
 * Estilos gratuit@s, sin API key ni tarjeta.
 * - OpenFreeMap (calle) no pide registro.
 * - CartoDB cubre el tema oscuro.
 * - CartoDB ya no publica un style vectorial de satelite (devuelve 404), asi que
 *   el satelite se arma en memoria con los tiles raster de Esri World Imagery.
 */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
};

const STYLES: Record<'street' | 'dark' | 'satellite', string | StyleSpecification> = {
  street: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  satellite: SATELLITE_STYLE,
};

const ROUTE_LAYER = 'floa-routes';
const DASHED_LAYER = 'floa-routes-dashed';
const CIRCLE_FILL_LAYER = 'floa-circles-fill';
const CIRCLE_LINE_LAYER = 'floa-circles-line';

const EMPTY = EMPTY_GEOJSON;

const VEHICLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.2 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
const MACHINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8L8 13V8L2 13Z"/></svg>`;

function pin(color: string, svg: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;will-change:transform';
  wrap.innerHTML = `
    <div style="background:${color};color:white;padding:4px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">${svg}</div>
    <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};margin-top:-1px;"></div>`;
  return wrap;
}

function dot(color: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);`;
  return el;
}

export interface MapMarker {
  id: string;
  position: [number, number];
  color: string;
  name: string;
  vehicleType?: 'vehicle' | 'machine';
  onClick?: () => void;
}

export type MapLayerType = 'street' | 'satellite';

interface MapLibreMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  polyline?: [number, number][];
  polylines?: MapRoute[];
  circles?: CircleSpec[];
  fitBounds?: boolean;
  dark?: boolean;
  layer?: MapLayerType;
  className?: string;
  onMapReady?: (map: MapLibreInstance) => void;
}

interface OverlayData {
  markers: MapMarker[];
  polyline: [number, number][];
  polylines: MapRoute[];
  circles: CircleSpec[];
  fitBounds: boolean;
}

export default function MapLibreMap({
  markers = [],
  center = CULIACAN,
  zoom = 12,
  height = '100%',
  polyline = [],
  polylines = [],
  circles = [],
  fitBounds = false,
  dark = false,
  layer = 'street',
  className = '',
  onMapReady,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreInstance | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const routeMarkersRef = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);

  const styleUrl =
    layer === 'satellite' ? STYLES.satellite : dark ? STYLES.dark : STYLES.street;

  // Ultimos props, para poder repintar sin depender de un rerender.
  const dataRef = useRef<OverlayData>({ markers, polyline, polylines, circles, fitBounds });
  dataRef.current = { markers, polyline, polylines, circles, fitBounds };

  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  // Fuentes y capas propias. Hay que (re)crearlas tras cada setStyle porque
  // MapLibre las descarta cuando cambia el estilo.
  const addOverlays = (map: MapLibreInstance) => {
    if (map.getSource(ROUTE_LAYER)) return;

    map.addSource(ROUTE_LAYER, { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: ROUTE_LAYER,
      type: 'line',
      source: ROUTE_LAYER,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#3B82F6'],
        'line-width': 4,
        'line-opacity': 0.85,
      },
    });

    map.addSource(DASHED_LAYER, { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: DASHED_LAYER,
      type: 'line',
      source: DASHED_LAYER,
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#3B82F6'],
        'line-width': 4,
        'line-opacity': 0.85,
        'line-dasharray': [2, 2],
      },
    });

    map.addSource(CIRCLE_FILL_LAYER, { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: CIRCLE_FILL_LAYER,
      type: 'fill',
      source: CIRCLE_FILL_LAYER,
      paint: {
        'fill-color': ['coalesce', ['get', 'color'], '#3B82F6'],
        'fill-opacity': 0.12,
      },
    });

    map.addLayer({
      id: CIRCLE_LINE_LAYER,
      type: 'line',
      source: CIRCLE_FILL_LAYER,
      paint: {
        'line-color': ['coalesce', ['get', 'color'], '#3B82F6'],
        'line-width': 2,
      },
    });
  };

  // Pinta datos sobre el mapa. Se invoca desde los efectos y tambien desde
  // load/styledata, porque al cambiar de estilo las fuentes nacen vacias.
  const applyData = (map: MapLibreInstance, data: OverlayData) => {
    if (!map.getSource(ROUTE_LAYER)) return;

    const all: MapRoute[] = [];
    if (data.polyline.length > 1) all.push({ path: data.polyline, color: '#3B82F6' });
    data.polylines.forEach((r) => {
      if (r.path.length > 1) all.push(r);
    });

    (map.getSource(ROUTE_LAYER) as GeoJSONSource | undefined)?.setData(
      routesGeoJson(all.filter((r) => !r.dashed)),
    );
    (map.getSource(DASHED_LAYER) as GeoJSONSource | undefined)?.setData(
      routesGeoJson(all.filter((r) => r.dashed)),
    );
    (map.getSource(CIRCLE_FILL_LAYER) as GeoJSONSource | undefined)?.setData(
      circlesGeoJson(data.circles),
    );

    routeMarkersRef.current.forEach((m) => m.remove());
    routeMarkersRef.current = [];

    all.filter((r) => !r.dashed).forEach((route) => {
      routeMarkersRef.current.push(
        new Marker({ element: dot('#22C55E') }).setLngLat(route.path[0]).addTo(map),
        new Marker({ element: dot('#EF4444') })
          .setLngLat(route.path[route.path.length - 1])
          .addTo(map),
      );
    });

    if (data.fitBounds) {
      const points: [number, number][] = [
        ...data.markers.map((m) => m.position),
        ...data.polyline,
        ...data.polylines.flatMap((r) => r.path),
        ...data.circles.map((c) => c.center),
      ];
      if (points.length > 0) {
        const bounds = new LngLatBounds();
        points.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 0 });
      }
    }
  };

  // Marcadores de unidad: son elementos DOM, sobreviven al cambio de estilo.
  const paintMarkers = (map: MapLibreInstance, list: MapMarker[]) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = list.map((m) => {
      const el = m.vehicleType === 'machine' ? pin(m.color, MACHINE_SVG) : pin(m.color, VEHICLE_SVG);

      if (m.onClick) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', m.onClick);
      }

      const label = document.createElement('div');
      label.textContent = m.name;
      label.style.cssText =
        'position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;' +
        'background:#fff;color:#111;font-size:11px;font-weight:600;padding:2px 6px;border-radius:6px;' +
        'white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);pointer-events:none;';
      el.appendChild(label);

      return new Marker({ element: el, anchor: 'bottom' }).setLngLat(m.position).addTo(map);
    });
  };

  // Creacion del mapa (una sola vez)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreInstance({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
    });

    map.on('load', () => {
      addOverlays(map);
      applyData(map, dataRef.current);
      paintMarkers(map, dataRef.current.markers);
      onMapReadyRef.current?.(map);
      setReady(true);
    });

    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      routeMarkersRef.current.forEach((m) => m.remove());
      routeMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambio de estilo (tema oscuro / satelite)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setReady(false);

    const onStyleReady = () => {
      if (!map.getSource(ROUTE_LAYER)) return;
      applyData(map, dataRef.current);
      setReady(true);
    };

    map.once('styledata', onStyleReady);
    map.setStyle(styleUrl);
  }, [styleUrl, ready]);

  // Repintar overlays cuando cambian los datos o el mapa queda listo.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    applyData(map, { markers, polyline, polylines, circles, fitBounds });
  }, [ready, polyline, polylines, circles, fitBounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    paintMarkers(map, markers);
  }, [ready, markers]);

  return <div ref={containerRef} style={{ height, width: '100%' }} className={className} />;
}