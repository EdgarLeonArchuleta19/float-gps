import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CULIACAN: L.LatLngTuple = [24.7994, -107.3940];

const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

const VEHICLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.2 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
const MACHINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8L8 13V8L2 13Z"/></svg>`;

function vehicleMarkerIcon(color: string, dark: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="background:${color};color:white;padding:4px 6px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">${VEHICLE_SVG}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};margin-top:-1px;"></div>
    </div>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    tooltipAnchor: [0, -28],
  });
}

function machineMarkerIcon(color: string, dark: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="background:${color};color:white;padding:4px 6px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">${MACHINE_SVG}</div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${color};margin-top:-1px;"></div>
    </div>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    tooltipAnchor: [0, -28],
  });
}

function startIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#22C55E;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><div style="width:5px;height:5px;border-radius:50%;background:white;"></div></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function endIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#EF4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><div style="width:5px;height:5px;border-radius:50%;background:white;"></div></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export interface MapMarker {
  id: string;
  position: L.LatLngTuple;
  color: string;
  name: string;
  vehicleType?: 'vehicle' | 'machine';
  onClick?: () => void;
}

export interface MapRoute {
  path: L.LatLngTuple[];
  color: string;
}

export type MapLayerType = 'street' | 'satellite';

interface LeafletMapProps {
  markers?: MapMarker[];
  center?: L.LatLngTuple;
  zoom?: number;
  height?: string;
  polyline?: L.LatLngTuple[];
  polylines?: MapRoute[];
  circles?: { center: L.LatLngTuple; radius: number; color: string }[];
  fitBounds?: boolean;
  dark?: boolean;
  className?: string;
  onMapReady?: (map: L.Map) => void;
}

export default function LeafletMap({
  markers = [],
  center = CULIACAN,
  zoom = 12,
  height = '100%',
  polyline = [],
  polylines = [],
  circles = [],
  fitBounds = false,
  dark = false,
  className = '',
  onMapReady,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const routesLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const circlesLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center, zoom, zoomControl: false, attributionControl: false });
    const tileUrl = dark ? TILES.dark : TILES.light;
    tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    markersLayerRef.current.addTo(map);
    routesLayerRef.current.addTo(map);
    circlesLayerRef.current.addTo(map);
    mapRef.current = map;
    if (onMapReady) onMapReady(map);
    setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileLayerRef.current) return;
    map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, { maxZoom: 19 }).addTo(map);
  }, [dark]);

  useEffect(() => {
    markersLayerRef.current.clearLayers();
    markers.forEach((m) => {
      const iconFn = m.vehicleType === 'machine' ? machineMarkerIcon : vehicleMarkerIcon;
      const marker = L.marker(m.position, { icon: iconFn(m.color, dark) });
      if (m.onClick) marker.on('click', m.onClick);
      marker.bindTooltip(`<div style="font-size:12px;font-weight:600;white-space:nowrap;">${m.name}</div>`, {
        permanent: true,
        direction: 'top',
        offset: [0, -22],
        className: 'leaflet-tooltip-custom',
      });
      markersLayerRef.current.addLayer(marker);
    });
  }, [markers, dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    routesLayerRef.current.clearLayers();
    const allRoutes: MapRoute[] = [];
    if (polyline.length > 0) allRoutes.push({ path: polyline, color: '#3B82F6' });
    polylines.forEach((r) => { if (r.path.length > 0) allRoutes.push(r); });
    const singleRoute = allRoutes.length === 1;
    allRoutes.forEach((route) => {
      L.polyline(route.path, { color: route.color, weight: 4, opacity: 0.85, smoothFactor: 1 }).addTo(routesLayerRef.current);
      routesLayerRef.current.addLayer(
        L.marker(route.path[0], { icon: startIcon() })
          .bindTooltip('Inicio', { permanent: singleRoute, direction: 'top', offset: [0, -14] })
      );
      routesLayerRef.current.addLayer(
        L.marker(route.path[route.path.length - 1], { icon: endIcon() })
          .bindTooltip('Fin', { permanent: singleRoute, direction: 'top', offset: [0, -14] })
      );
    });
  }, [polyline, polylines]);

  useEffect(() => {
    circlesLayerRef.current.clearLayers();
    circles.forEach((c) => {
      L.circle(c.center, { radius: c.radius, fillColor: c.color, fillOpacity: 0.12, color: c.color, weight: 2 }).addTo(circlesLayerRef.current);
    });
    const map = mapRef.current;
    if (map) circlesLayerRef.current.addTo(map);
  }, [circles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitBounds) return;
    const pts: L.LatLngTuple[] = [
      ...markers.map((m) => m.position),
      ...polyline,
      ...polylines.flatMap((r) => r.path),
      ...circles.map((c) => c.center),
    ];
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 15 });
  }, [fitBounds, markers, polyline, polylines, circles]);

  return <div ref={containerRef} style={{ height, width: '100%' }} className={className} />;
}
