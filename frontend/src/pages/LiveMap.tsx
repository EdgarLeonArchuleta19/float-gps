import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Filter, Route, Shield, Navigation, Crosshair, Map, Satellite, Share2, Bell, ShoppingCart, Power, PowerOff, Gauge, Info, Zap, Clock, ChevronDown, ChevronRight, ChevronLeft, Loader2, PowerOff as PowerOffIcon
} from 'lucide-react';
import LeafletMap, { MapMarker, MapLayerType } from '../components/map/LeafletMap';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine, Geofence } from '../types';
import { markerColor, statusLabel, timeAgo, formatDateTime } from '../utils/format';
import { useLayout } from '../context/LayoutContext';
import { useToast } from '../context/ToastContext';
import SpinnerSelect from '../components/SpinnerSelect';
import L from 'leaflet';

type UnitFilter = 'all' | 'vehicles' | 'machines' | 'moving' | 'stopped';
type DetailTab = 'info' | 'bitacora';

interface UnitWithPosition {
  id: string;
  name: string;
  type: string;
  status: string;
  unitType: 'vehicle' | 'machine';
  lat: number;
  lng: number;
  speed: number;
  ignition: boolean;
  timestamp: string;
  plate?: string;
  serialNumber?: string;
  gpsDevice?: { id: string; imei: string; model?: string } | null;
}

export default function LiveMap() {
  const navigate = useNavigate();
  const { darkMode } = useLayout();
  const { addToast } = useToast();
  const [panelOpen, setPanelOpen] = useState(false);
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showGeofences, setShowGeofences] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitWithPosition | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('info');
  const [mapLayer, setMapLayer] = useState<MapLayerType>('street');
  const [panelHeight, setPanelHeight] = useState<number>(0);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  const { data: vehicles } = useApi<any>(async () => api.vehicles.list({ limit: '200' }), []);
  const { data: machines } = useApi<any>(async () => api.machines.list({ limit: '200' }), []);
  const { data: geofencesRaw } = useApi<Geofence[]>(
    async () => { const r = await api.geofences.list(); return Array.isArray(r) ? r : (r as any).data || []; },
    []
  );

  const geofences = useMemo(() => geofencesRaw || [], [geofencesRaw]);

  const allUnits: UnitWithPosition[] = useMemo(() => {
    const vList = (vehicles?.data || vehicles || []) as Vehicle[];
    const mList = (machines?.data || machines || []) as Machine[];
    return [
      ...vList.filter((v) => v.currentPosition).map((v) => ({
        id: v.id, name: v.name, type: v.type, status: v.status, unitType: 'vehicle' as const,
        lat: v.currentPosition!.latitude, lng: v.currentPosition!.longitude,
        speed: v.currentPosition!.speed, ignition: v.currentPosition!.ignition, timestamp: v.currentPosition!.timestamp,
        plate: v.plate,
      })),
      ...mList.filter((m) => m.currentPosition).map((m) => ({
        id: m.id, name: m.name, type: m.type, status: m.status, unitType: 'machine' as const,
        lat: m.currentPosition!.latitude, lng: m.currentPosition!.longitude,
        speed: m.currentPosition!.speed, ignition: m.currentPosition!.ignition, timestamp: m.currentPosition!.timestamp,
        serialNumber: m.serialNumber,
      })),
    ];
  }, [vehicles, machines]);

  const filteredUnits = useMemo(() => {
    let result = allUnits;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) => u.name.toLowerCase().includes(q) || (u.plate && u.plate.toLowerCase().includes(q)));
    }
    switch (unitFilter) {
      case 'vehicles': result = result.filter((u) => u.unitType === 'vehicle'); break;
      case 'machines': result = result.filter((u) => u.unitType === 'machine'); break;
      case 'moving': result = result.filter((u) => u.status === 'MOVING'); break;
      case 'stopped': result = result.filter((u) => u.status === 'STOPPED' || u.status === 'OFFLINE'); break;
    }
    return result;
  }, [allUnits, search, unitFilter]);

  const mapCircles = useMemo(() => {
    if (!showGeofences) return [];
    return geofences
      .filter((g) => g.centerLat && g.centerLng && g.radius)
      .map((g) => ({
        center: [g.centerLat!, g.centerLng!] as [number, number],
        radius: g.radius!,
        color: g.color || '#f87203',
      }));
  }, [geofences, showGeofences]);

  const markers: MapMarker[] = filteredUnits.map((u) => ({
    id: `${u.unitType}-${u.id}`,
    position: [u.lat, u.lng],
    color: markerColor(u.status),
    name: u.name,
    vehicleType: u.unitType,
    onClick: () => {
      setSelectedUnit(u);
      setDetailTab('info');
      setPanelOpen(true);
    },
  }));

  const filterOptions: { key: UnitFilter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'vehicles', label: 'Vehículos' },
    { key: 'machines', label: 'Maquinaria' },
    { key: 'moving', label: 'En movimiento' },
    { key: 'stopped', label: 'Detenidos' },
  ];

  const handleMapReady = useCallback((map: L.Map) => { mapInstanceRef.current = map; }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const latlng: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
        map.setView(latlng, 15, { animate: true });
        if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
        if (userCircleRef.current) map.removeLayer(userCircleRef.current);
        const userIcon = L.divIcon({
          className: '',
          html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="width:20px;height:20px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);z-index:2;"></div>
            <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:rgba(59,130,246,0.15);z-index:1;"></div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        userMarkerRef.current = L.marker(latlng, { icon: userIcon }).addTo(map).bindTooltip('Mi ubicación', {
          permanent: true, direction: 'top', offset: [0, -14], className: 'leaflet-tooltip-custom',
        });
        userCircleRef.current = L.circle(latlng, { radius: 50, fillColor: '#3B82F6', fillOpacity: 0.08, color: '#3B82F6', weight: 1, opacity: 0.3 }).addTo(map);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const handleRecenter = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([24.7994, -107.3940], 12, { animate: true });
  }, []);

  const handleToggleLayer = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const newLayer = mapLayer === 'street' ? 'satellite' : 'street';
    setMapLayer(newLayer);
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const url = newLayer === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : darkMode ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    tileLayerRef.current = L.tileLayer(url, { maxZoom: 19 }).addTo(map);
  }, [mapLayer, darkMode]);

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <div className="flex-1 relative">
        <LeafletMap
          dark={darkMode}
          markers={markers}
          circles={mapCircles}
          center={[24.7994, -107.3940]}
          zoom={12}
          height="100%"
          fitBounds={markers.length > 0}
          onMapReady={handleMapReady}
        />

        {/* Map control buttons - right side */}
        <div className="absolute right-3 top-[72px] z-[50] flex flex-col gap-2">
          <button onClick={handleLocate} title="Mi ubicación"
            className={`w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95
              ${darkMode ? 'bg-[#111]/90 backdrop-blur-xl text-gray-300 hover:bg-[#222]' : 'bg-white/90 backdrop-blur-xl text-gray-600 hover:bg-gray-50'}`}>
            <Navigation className="w-[18px] h-[18px]" />
          </button>
          <button onClick={handleRecenter} title="Centrar mapa"
            className={`w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95
              ${darkMode ? 'bg-[#111]/90 backdrop-blur-xl text-gray-300 hover:bg-[#222]' : 'bg-white/90 backdrop-blur-xl text-gray-600 hover:bg-gray-50'}`}>
            <Crosshair className="w-[18px] h-[18px]" />
          </button>
          <button onClick={handleToggleLayer} title={mapLayer === 'street' ? 'Modo satelital' : 'Modo calle'}
            className={`w-[40px] h-[40px] rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95
              ${mapLayer === 'satellite' ? 'bg-[#032347] text-white'
                : darkMode ? 'bg-[#111]/90 backdrop-blur-xl text-gray-300 hover:bg-[#222]' : 'bg-white/90 backdrop-blur-xl text-gray-600 hover:bg-gray-50'}`}>
            {mapLayer === 'satellite' ? <Map className="w-[18px] h-[18px]" /> : <Satellite className="w-[18px] h-[18px]" />}
          </button>
        </div>

        {/* Search bar on map */}
        <div className="absolute top-3 left-3 right-3 z-[50]">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none z-10 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o placa..."
                className={`w-full pl-11 pr-10 h-[42px] rounded-xl text-[13px] outline-none shadow-lg
                  ${darkMode ? 'bg-[#111]/90 backdrop-blur-xl text-white placeholder-gray-600' : 'bg-white/90 backdrop-blur-xl text-[#1d1d1f] placeholder-gray-400'}`} />
              {search && (
                <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button onClick={() => setShowGeofences(!showGeofences)}
              className={`h-[42px] w-[42px] flex items-center justify-center rounded-xl shadow-lg transition-all
                ${showGeofences ? 'bg-[#f87203] text-white' : darkMode ? 'bg-[#111]/90 backdrop-blur-xl text-gray-400' : 'bg-white/90 backdrop-blur-xl text-gray-500'}`}>
              <Shield className="w-4 h-4" />
            </button>
            <div className="relative">
              <button onClick={() => setFilterOpen(!filterOpen)}
                className={`h-[42px] w-[42px] flex items-center justify-center rounded-xl shadow-lg transition-colors
                  ${unitFilter !== 'all' ? 'bg-[#f87203] text-white' : darkMode ? 'bg-[#111]/90 backdrop-blur-xl text-gray-400' : 'bg-white/90 backdrop-blur-xl text-gray-500'}`}>
                <Filter className="w-4 h-4" />
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                  <div className={`absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-xl z-50 py-1 overflow-hidden
                    ${darkMode ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-100'}`}>
                    {filterOptions.map((f) => (
                      <button key={f.key} onClick={() => { setUnitFilter(f.key); setFilterOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors
                          ${unitFilter === f.key ? darkMode ? 'text-[#f87203] bg-[#f87203]/10' : 'text-[#032347] bg-[#032347]/5'
                            : darkMode ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex items-center px-1">
            <span className={`text-[11px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {filteredUnits.length} de {allUnits.length} unidades
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={`fixed lg:absolute left-0 right-0 z-[65]`} style={{ bottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <div className={`mx-auto flex items-center justify-between px-3 sm:px-5 w-[95%] sm:w-[60%] h-[72px] rounded-full shadow-2xl
          ${darkMode ? 'bg-[#111]/95 backdrop-blur-xl border border-[#333]' : 'bg-white/95 backdrop-blur-xl border border-gray-200 shadow-black/10'}`}>
          {/* Left: Share + Alarm */}
          <button onClick={() => navigate('/live-map/share')}
            className={`w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0
              ${darkMode ? 'bg-[#3b82f6]/20 text-[#60a5fa] hover:bg-[#3b82f6]/30' : 'bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/15'}`}>
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/live-map/alarm')}
            className={`w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0
              ${darkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-500/10 text-red-500 hover:bg-red-500/15'}`}>
            <Bell className="w-5 h-5" />
          </button>

          {/* Center: Car list */}
          <button onClick={() => setPanelOpen(true)}
            className="w-[60px] h-[60px] sm:w-[64px] sm:h-[64px] -mt-6 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 bg-[#032347] text-white hover:bg-[#02335a] shadow-[0_4px_20px_rgba(3,35,71,0.4)] flex-shrink-0">
            <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.2 1 13v3c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
            </svg>
          </button>

          {/* Right: Route + Engine Stop */}
          <button onClick={() => navigate('/live-map/route')}
            className={`w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0
              ${darkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15'}`}>
            <Route className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/live-map/engine-stop')}
            className={`w-[44px] h-[44px] sm:w-[48px] sm:h-[48px] rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0
              ${darkMode ? 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/15'}`}>
            <Zap className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Vehicle Popover */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => { setPanelOpen(false); setSelectedUnit(null); }} />
          <div className={`fixed lg:absolute bottom-[88px] left-1/2 -translate-x-1/2 z-[80] w-[92%] sm:w-[360px] max-h-[55vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl
            ${darkMode ? 'bg-[#111] border border-[#333]' : 'bg-white border border-gray-200'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-[#222]' : 'border-gray-100'}`}>
              <div>
                <h2 className={`text-[14px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {selectedUnit ? selectedUnit.name : 'Flota'}
                </h2>
                <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {selectedUnit
                    ? `${selectedUnit.unitType === 'vehicle' ? 'Vehículo' : 'Maquinaria'} · ${selectedUnit.type}`
                    : `${allUnits.length} unidades · ${allUnits.filter((u) => u.status === 'MOVING').length} en movimiento`}
                </p>
              </div>
              <button onClick={() => { setPanelOpen(false); setSelectedUnit(null); }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors
                  ${darkMode ? 'hover:bg-[#222] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search */}
            {!selectedUnit && (
              <div className={`px-3 py-2 border-b ${darkMode ? 'border-[#222]' : 'border-gray-100'}`}>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none z-10 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar vehículo..."
                    className={`w-full pl-11 pr-9 h-[38px] rounded-xl text-[13px] outline-none transition-all
                      ${darkMode ? 'bg-[#1a1a1a] text-white placeholder-gray-600 focus:ring-2 focus:ring-[#f87203]/30' : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400 focus:ring-2 focus:ring-[#032347]/15'}`} />
                  {search && (
                    <button onClick={() => setSearch('')} className={`absolute right-2.5 top-1/2 -translate-y-1/2 z-10 p-0.5 rounded-full transition-colors
                      ${darkMode ? 'text-gray-600 hover:text-gray-300 hover:bg-[#222]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Filter spinner (when showing list) */}
            {!selectedUnit && (
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${darkMode ? 'border-[#222]' : 'border-gray-100'}`}>
                <SpinnerSelect
                  prefix="Filtrar:"
                  options={filterOptions}
                  value={unitFilter}
                  onChange={(k) => setUnitFilter(k as UnitFilter)}
                />
                <span className={`text-[11px] ml-auto flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {filteredUnits.length} de {allUnits.length}
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Vehicle list */}
              {!selectedUnit ? (
                filteredUnits.slice(0, 10).map((u) => (
                  <button key={u.id} onClick={() => { setSelectedUnit(u); setDetailTab('info'); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition-colors text-left border-b
                      ${darkMode ? 'border-[#222] hover:bg-[#1a1a1a]' : 'border-gray-50 hover:bg-gray-50'}`}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: markerColor(u.status) }} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] font-medium ${darkMode ? 'text-white' : 'text-[#1d1d1f]'} truncate`}>{u.name}</p>
                      <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {u.unitType === 'vehicle' ? 'Vehículo' : 'Maquinaria'} · {u.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-0.5">
                        <Gauge className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-[11px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{u.speed}</span>
                      </div>
                      {u.ignition ? <Power className="w-3 h-3 text-green-500" /> : <PowerOff className={`w-3 h-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />}
                      <ChevronRight className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    </div>
                  </button>
                ))
              ) : (
                /* Selected unit detail */
                <SelectedUnitDetail
                  unit={selectedUnit}
                  detailTab={detailTab}
                  setDetailTab={setDetailTab}
                  darkMode={darkMode}
                  onBack={() => setSelectedUnit(null)}
                  onNavigate={(path) => { setPanelOpen(false); setSelectedUnit(null); navigate(path); }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function downsampleRoute(positions: any[], max = 250): [number, number][] {
  const pts = positions.map((p) => [p.latitude, p.longitude] as [number, number]);
  if (pts.length <= max) return pts;
  const step = Math.ceil(pts.length / max);
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
  const last = pts[pts.length - 1];
  const lastOut = out[out.length - 1];
  if (lastOut[0] !== last[0] || lastOut[1] !== last[1]) out.push(last);
  return out;
}

function SelectedUnitDetail({ unit, detailTab, setDetailTab, darkMode, onBack, onNavigate }: {
  unit: UnitWithPosition;
  detailTab: DetailTab;
  setDetailTab: (t: DetailTab) => void;
  darkMode: boolean;
  onBack: () => void;
  onNavigate: (path: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const { data: eventsData } = useApi<any>(
    async () => {
      const r = await api.events.list({ unitId: unit.id, startDate: today, endDate: today + 'T23:59:59', limit: '50' });
      return r;
    },
    [unit.id]
  );

  const { data: tracking, loading: loadingRoute } = useApi<{ positions: any[]; summary: { totalKm: number; totalPoints: number } }>(
    async () => {
      if (!unit.gpsDevice?.id) return { positions: [], summary: { totalKm: 0, totalPoints: 0 } };
      return api.gps.getTracking(unit.gpsDevice.id, { date: today });
    },
    [unit.gpsDevice?.id]
  );

  const events = (eventsData?.data || eventsData || []) as any[];

  const routePositions = tracking?.positions ?? [];
  const routeKm = tracking?.summary?.totalKm ?? 0;
  const routePointsCount = tracking?.summary?.totalPoints ?? 0;
  const lastRoutePos = routePositions.length > 0 ? routePositions[routePositions.length - 1] : null;
  const engineOnEvents = events.filter((e: any) => e.type === 'ENGINE_ON');
  const engineOffEvents = events.filter((e: any) => e.type === 'ENGINE_OFF');
  const lastEngineOn = engineOnEvents.length > 0 ? engineOnEvents[engineOnEvents.length - 1] : null;
  const lastEngineOff = engineOffEvents.length > 0 ? engineOffEvents[engineOffEvents.length - 1] : null;
  const todayAlerts = events.filter((e: any) => e.type === 'SPEED_ALERT').length;

  const eventIconMap: Record<string, string> = {
    ENGINE_ON: '🟢', ENGINE_OFF: '🔴', SPEED_ALERT: '🟡', GEOFENCE_ENTER: '🔵', GEOFENCE_EXIT: '🔵', IGNITION_ON: '🟢', IGNITION_OFF: '🔴',
  };
  const eventLabelMap: Record<string, string> = {
    ENGINE_ON: 'Motor encendido', ENGINE_OFF: 'Motor apagado', SPEED_ALERT: 'Alerta de velocidad', GEOFENCE_ENTER: 'Entró a geocerca', GEOFENCE_EXIT: 'Salió de geocerca', IGNITION_ON: 'Encendido ON', IGNITION_OFF: 'Encendido OFF',
  };

  return (
    <div className="px-4 py-3">
      <button onClick={onBack}
        className={`flex items-center gap-1 text-[11px] mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <ChevronLeft className="w-3 h-3" /> Volver a la lista
      </button>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-3">
        {(['info', 'bitacora'] as DetailTab[]).map((tab) => (
          <button key={tab} onClick={() => setDetailTab(tab)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all
              ${detailTab === tab ? 'bg-[#032347] text-white' : darkMode ? 'bg-[#1a1a1a] text-gray-400' : 'bg-[#f0f0f0] text-gray-500'}`}>
            {tab === 'info' ? 'Hoy' : 'Bitácora'}
          </button>
        ))}
      </div>

      {detailTab === 'info' ? (
        <div className="space-y-3">
          {/* Route preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className={`text-[10px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Trayecto de hoy</p>
              {routeKm > 0 && (
                <span className={`text-[10px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {routeKm.toFixed(1)} km · {routePointsCount} puntos
                </span>
              )}
            </div>
            {loadingRoute ? (
              <div className={`h-[170px] rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f7]'}`}>
                <Loader2 className={`w-5 h-5 animate-spin ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            ) : routePositions.length > 1 && lastRoutePos ? (
              <>
                <div className="rounded-xl overflow-hidden h-[170px]" style={{ zIndex: 0 }}>
                  <LeafletMap
                    dark={darkMode}
                    polyline={downsampleRoute(routePositions)}
                    markers={[{
                      id: unit.id,
                      position: [lastRoutePos.latitude, lastRoutePos.longitude],
                      color: markerColor(unit.status),
                      name: unit.name,
                      vehicleType: unit.unitType,
                    }]}
                    center={[lastRoutePos.latitude, lastRoutePos.longitude]}
                    zoom={13}
                    fitBounds
                    height="100%"
                  />
                </div>
              </>
            ) : (
              <div className={`h-[80px] rounded-xl flex items-center justify-center text-[12px]
                ${darkMode ? 'bg-[#1a1a1a] text-gray-500' : 'bg-[#f5f5f7] text-gray-400'}`}>
                {unit.gpsDevice ? 'Sin trayecto registrado hoy' : 'Sin GPS vinculado'}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: markerColor(unit.status) }} />
            <span className={`text-[12px] font-medium ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>
              {statusLabel(unit.status)}
            </span>
            {unit.ignition && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">ON</span>
            )}
          </div>

          {/* Today stats grid */}
          <div className={`rounded-xl p-3 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f7]'}`}>
            <p className={`text-[10px] font-medium mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Estadísticas de hoy</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Velocidad</p>
                <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{unit.speed} km/h</p>
              </div>
              <div>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Tipo</p>
                <p className={`text-[13px] font-bold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{unit.type}</p>
              </div>
              <div>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Último encendido</p>
                <p className={`text-[12px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {lastEngineOn ? new Date(lastEngineOn.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
              <div>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Último apagado</p>
                <p className={`text-[12px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {lastEngineOff ? new Date(lastEngineOff.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
              <div>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Encendidos hoy</p>
                <p className={`text-[12px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{engineOnEvents.length}</p>
              </div>
              <div>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Alertas hoy</p>
                <p className={`text-[12px] font-semibold ${todayAlerts > 0 ? 'text-[#f87203]' : darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{todayAlerts}</p>
              </div>
              <div>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Eventos hoy</p>
                <p className={`text-[12px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{events.length}</p>
              </div>
              <div>
                <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Última actualización</p>
                <p className={`text-[12px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {unit.timestamp ? timeAgo(unit.timestamp) : '—'}
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => onNavigate(`/units/${unit.id}`)}
            className="w-full py-2.5 bg-[#032347] text-white rounded-xl text-[12px] font-medium transition-all active:scale-[0.98]">
            Ver info completa
          </button>
        </div>
      ) : (
        /* Bitácora de hoy */
        <div className="space-y-2">
          <p className={`text-[10px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Bitácora del {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
          </p>
          {events.length === 0 ? (
            <div className={`text-center py-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Clock className="w-8 h-8 mx-auto mb-1 opacity-30" />
              <p className="text-[11px]">Sin eventos hoy</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[30vh] overflow-y-auto">
              {events.slice(0, 20).map((ev: any) => (
                <div key={ev.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f7]'}`}>
                  <span className="text-[12px]">{eventIconMap[ev.type] || '⚪'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      {eventLabelMap[ev.type] || ev.type}
                    </p>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(ev.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                  {ev.speed != null && (
                    <span className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{Math.round(ev.speed)} km/h</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {events.length > 20 && (
            <button onClick={() => onNavigate(`/units/${unit.id}`)}
              className={`w-full py-2 text-[11px] font-medium rounded-xl ${darkMode ? 'bg-[#1a1a1a] text-gray-400' : 'bg-[#f0f0f0] text-gray-500'}`}>
              Ver todos ({events.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
