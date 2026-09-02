import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Check, Search, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine } from '../types';
import { markerColor, statusLabel } from '../utils/format';
import { useLayout } from '../context/LayoutContext';
import { useToast } from '../context/ToastContext';

export default function ShareLocation() {
  const navigate = useNavigate();
  const { darkMode } = useLayout();
  const { addToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const { data: vehicles } = useApi<any>(async () => api.vehicles.list({ limit: '200' }), []);
  const { data: machines } = useApi<any>(async () => api.machines.list({ limit: '200' }), []);

  const allUnits = useMemo(() => {
    const vList = (vehicles?.data || vehicles || []) as Vehicle[];
    const mList = (machines?.data || machines || []) as Machine[];
    return [
      ...vList.filter((v) => v.currentPosition).map((v) => ({
        id: v.id, name: v.name, type: v.type, status: v.status, unitType: 'vehicle' as const,
        lat: v.currentPosition!.latitude, lng: v.currentPosition!.longitude,
        plate: v.plate,
      })),
      ...mList.filter((m) => m.currentPosition).map((m) => ({
        id: m.id, name: m.name, type: m.type, status: m.status, unitType: 'machine' as const,
        lat: m.currentPosition!.latitude, lng: m.currentPosition!.longitude,
        serialNumber: m.serialNumber,
      })),
    ];
  }, [vehicles, machines]);

  const filtered = useMemo(() => {
    if (!search) return allUnits;
    const q = search.toLowerCase();
      return allUnits.filter((u) => u.name.toLowerCase().includes(q) || ((u as any).plate && (u as any).plate.toLowerCase().includes(q)));
  }, [allUnits, search]);

  const toggle = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((u) => u.id)));
  };

  return (
    <div className={`min-h-full ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f7]'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 px-4 py-3 flex items-center gap-3 backdrop-blur-xl border-b
        ${darkMode ? 'bg-[#0a0a0a]/80 border-[#222]' : 'bg-[#f5f5f7]/80 border-gray-200'}`}>
        <button onClick={() => navigate('/live-map')} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-[#222] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-[16px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Compartir ubicación</h1>
          <p className={`text-[12px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Selecciona unidades para compartir</p>
        </div>
        {selected.size > 0 && (
          <span className="text-[12px] font-medium text-[#f87203]">{selected.size} seleccionadas</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar unidad..."
            className={`w-full pl-10 pr-10 h-[44px] rounded-xl text-[13px] outline-none
              ${darkMode ? 'bg-[#111] text-white placeholder-gray-600' : 'bg-white text-[#1d1d1f] placeholder-gray-400'}`} />
          {search && (
            <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Select all */}
        <button onClick={toggleAll}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors
            ${darkMode ? 'bg-[#111] hover:bg-[#1a1a1a] text-gray-300' : 'bg-white hover:bg-gray-50 text-[#1d1d1f]'}`}>
          <div className={`w-5 h-5 rounded-md flex items-center justify-center border
            ${selected.size === filtered.length && filtered.length > 0 ? 'bg-[#032347] border-[#032347]' : darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            {selected.size === filtered.length && filtered.length > 0 && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
          Seleccionar todas ({filtered.length})
        </button>

        {/* List */}
        <div className="space-y-1">
          {filtered.map((u) => (
            <button key={u.id} onClick={() => toggle(u.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left
                ${selected.has(u.id)
                  ? darkMode ? 'bg-[#032347]/20 border border-[#032347]/30' : 'bg-[#032347]/5 border border-[#032347]/20'
                  : darkMode ? 'bg-[#111]' : 'bg-white'}`}>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors
                ${selected.has(u.id) ? 'bg-[#032347] border-[#032347]' : darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                {selected.has(u.id) && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: markerColor(u.status) }} />
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium ${darkMode ? 'text-white' : 'text-[#1d1d1f]'} truncate`}>{u.name}</p>
                <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {u.unitType === 'vehicle' ? 'Vehículo' : 'Maquinaria'} · {u.type} · {'plate' in u ? u.plate : u.serialNumber}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer button */}
      {selected.size > 0 && (
        <div className={`sticky bottom-0 p-4 border-t backdrop-blur-xl
          ${darkMode ? 'bg-[#0a0a0a]/80 border-[#222]' : 'bg-[#f5f5f7]/80 border-gray-200'}`}>
          <button onClick={() => { addToast('success', `Compartiendo ubicación de ${selected.size} unidades`); navigate('/live-map'); }}
            className="w-full h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-[#032347] text-white text-[14px] font-semibold transition-all active:scale-[0.98]">
            <Share2 className="w-4 h-4" />
            Compartir ubicación
          </button>
        </div>
      )}
    </div>
  );
}
