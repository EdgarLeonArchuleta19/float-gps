import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Navigation, Search, X, Gauge, Power, PowerOff, Route as RouteIcon } from 'lucide-react';
import LeafletMap, { MapMarker } from '../components/map/LeafletMap';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine } from '../types';
import { markerColor, statusLabel } from '../utils/format';
import { useLayout } from '../context/LayoutContext';
import { useToast } from '../context/ToastContext';
import L from 'leaflet';

export default function RouteToVehicle() {
  const navigate = useNavigate();
  const { darkMode } = useLayout();
  const { addToast } = useToast();
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [search, setSearch] = useState('');
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  const { data: vehicles } = useApi<any>(async () => api.vehicles.list({ limit: '200' }), []);
  const { data: machines } = useApi<any>(async () => api.machines.list({ limit: '200' }), []);

  const allUnits = useMemo(() => {
    const vList = (vehicles?.data || vehicles || []) as Vehicle[];
    const mList = (machines?.data || machines || []) as Machine[];
    return [
      ...vList.filter((v) => v.currentPosition).map((v) => ({
        id: v.id, name: v.name, type: v.type, status: v.status, unitType: 'vehicle' as const,
        lat: v.currentPosition!.latitude, lng: v.currentPosition!.longitude,
        speed: v.currentPosition!.speed, ignition: v.currentPosition!.ignition,
        plate: v.plate,
      })),
      ...mList.filter((m) => m.currentPosition).map((m) => ({
        id: m.id, name: m.name, type: m.type, status: m.status, unitType: 'machine' as const,
        lat: m.currentPosition!.latitude, lng: m.currentPosition!.longitude,
        speed: m.currentPosition!.speed, ignition: m.currentPosition!.ignition,
        serialNumber: m.serialNumber,
      })),
    ];
  }, [vehicles, machines]);

  const filtered = useMemo(() => {
    if (!search) return allUnits;
    const q = search.toLowerCase();
    return allUnits.filter((u) => u.name.toLowerCase().includes(q) || ((u as any).plate && (u as any).plate.toLowerCase().includes(q)));
  }, [allUnits, search]);

  const markers: MapMarker[] = allUnits.map((u) => ({
    id: u.id, position: [u.lat, u.lng], color: markerColor(u.status), name: u.name, vehicleType: u.unitType,
  }));

  const handleMapReady = useCallback((map: L.Map) => { mapInstanceRef.current = map; }, []);

  const handleNavigate = (unit: any) => {
    setSelectedUnit(unit);
    const map = mapInstanceRef.current;
    if (!map) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
          const destLatLng = L.latLng(unit.lat, unit.lng);
          if (routeLineRef.current) map.removeLayer(routeLineRef.current);
          routeLineRef.current = L.polyline([userLatLng, destLatLng], {
            color: '#3B82F6', weight: 4, opacity: 0.85, dashArray: '8 8',
          }).addTo(map);
          map.fitBounds(L.latLngBounds([userLatLng, destLatLng]), { padding: [60, 60] });
        },
        () => { addToast('error', 'No se pudo obtener tu ubicación'); },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  useEffect(() => {
    return () => { if (routeLineRef.current && mapInstanceRef.current) mapInstanceRef.current.removeLayer(routeLineRef.current); };
  }, []);

  return (
    <div className={`min-h-full flex flex-col ${darkMode ? 'bg-[#131316]' : 'bg-[#f5f5f7]'}`}>
      <div className={`sticky top-0 z-10 px-4 py-3 flex items-center gap-3 backdrop-blur-xl border-b
        ${darkMode ? 'bg-[#131316]/80 border-[#33343c]' : 'bg-[#f5f5f7]/80 border-gray-200'}`}>
        <button onClick={() => navigate('/live-map')} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-[#33343c] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-[16px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Ruta al vehículo</h1>
          <p className={`text-[12px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Selecciona un vehículo para ver la ruta</p>
        </div>
      </div>

      <div className="flex-1 relative" style={{ minHeight: '300px' }}>
        <LeafletMap dark={darkMode} markers={markers} center={[24.7994, -107.3940]} zoom={12} height="300px" onMapReady={handleMapReady} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="relative mb-2">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar unidad..."
            className={`w-full pl-10 pr-10 h-[44px] rounded-xl text-[13px] outline-none
              ${darkMode ? 'bg-[#1b1b1f] text-white placeholder-gray-600' : 'bg-white text-[#1d1d1f] placeholder-gray-400'}`} />
          {search && (
            <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {filtered.map((u) => (
          <button key={u.id} onClick={() => handleNavigate(u)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left
              ${selectedUnit?.id === u.id ? darkMode ? 'bg-[#3b82f6]/15 border border-[#3b82f6]/30' : 'bg-[#3b82f6]/5 border border-[#3b82f6]/20'
                : darkMode ? 'bg-[#1b1b1f]' : 'bg-white'}`}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: markerColor(u.status) }} />
            <div className="min-w-0 flex-1">
              <p className={`text-[13px] font-medium ${darkMode ? 'text-white' : 'text-[#1d1d1f]'} truncate`}>{u.name}</p>
              <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{'plate' in u ? u.plate : u.serialNumber} · {u.type}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Gauge className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <span className={`text-[12px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{u.speed}</span>
              </div>
              <RouteIcon className="w-4 h-4 text-[#3b82f6]" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
