import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Gauge, Power, PowerOff, ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine } from '../types';
import { markerColor, statusLabel, timeAgo } from '../utils/format';
import { useLayout } from '../context/LayoutContext';

type Filter = 'all' | 'vehicles' | 'machines' | 'moving' | 'stopped';

export default function VehicleList() {
  const navigate = useNavigate();
  const { darkMode } = useLayout();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data: vehicles } = useApi<any>(async () => api.vehicles.list({ limit: '200' }), []);
  const { data: machines } = useApi<any>(async () => api.machines.list({ limit: '200' }), []);

  const allUnits = useMemo(() => {
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

  const filtered = useMemo(() => {
    let result = allUnits;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) => u.name.toLowerCase().includes(q) || ((u as any).plate && (u as any).plate.toLowerCase().includes(q)));
    }
    switch (filter) {
      case 'vehicles': result = result.filter((u) => u.unitType === 'vehicle'); break;
      case 'machines': result = result.filter((u) => u.unitType === 'machine'); break;
      case 'moving': result = result.filter((u) => u.status === 'MOVING'); break;
      case 'stopped': result = result.filter((u) => u.status === 'STOPPED' || u.status === 'OFFLINE'); break;
    }
    return result;
  }, [allUnits, search, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'vehicles', label: 'Vehículos' },
    { key: 'machines', label: 'Maquinaria' },
    { key: 'moving', label: 'Movimiento' },
    { key: 'stopped', label: 'Detenidos' },
  ];

  return (
    <div className={`min-h-full ${darkMode ? 'bg-[#131316]' : 'bg-[#f5f5f7]'}`}>
      <div className={`sticky top-0 z-10 px-4 py-3 flex items-center gap-3 backdrop-blur-xl border-b
        ${darkMode ? 'bg-[#131316]/80 border-[#33343c]' : 'bg-[#f5f5f7]/80 border-gray-200'}`}>
        <button onClick={() => navigate('/live-map')} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-[#33343c] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-[16px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Flota</h1>
          <p className={`text-[12px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{allUnits.length} unidades</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o placa..."
            className={`w-full pl-10 pr-10 h-[44px] rounded-xl text-[13px] outline-none
              ${darkMode ? 'bg-[#1b1b1f] text-white placeholder-gray-600' : 'bg-white text-[#1d1d1f] placeholder-gray-400'}`} />
          {search && (
            <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium transition-all
                ${filter === f.key
                  ? 'bg-[#032347] text-white'
                  : darkMode ? 'bg-[#1b1b1f] text-gray-400' : 'bg-white text-gray-500'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Vehicle list */}
        <div className="space-y-1">
          {filtered.map((u) => (
            <button key={u.id} onClick={() => navigate(`/units/${u.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors text-left
                ${darkMode ? 'bg-[#1b1b1f] hover:bg-[#232329]' : 'bg-white hover:bg-gray-50'}`}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: markerColor(u.status) }} />
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium ${darkMode ? 'text-white' : 'text-[#1d1d1f]'} truncate`}>{u.name}</p>
                <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {u.unitType === 'vehicle' ? 'Vehículo' : 'Maquinaria'} · {u.type}
                  {'plate' in u ? ` · ${u.plate}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <Gauge className={`w-3 h-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <span className={`text-[12px] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{u.speed}</span>
                </div>
                {u.ignition ? <Power className="w-3 h-3 text-green-500" /> : <PowerOff className={`w-3 h-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />}
                <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">No se encontraron unidades</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
