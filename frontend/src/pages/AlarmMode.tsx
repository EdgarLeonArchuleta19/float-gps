import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, Shield, MapPin, Clock, Check, Search, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine } from '../types';
import { markerColor } from '../utils/format';
import { useLayout } from '../context/LayoutContext';
import { useToast } from '../context/ToastContext';

export default function AlarmMode() {
  const navigate = useNavigate();
  const { darkMode } = useLayout();
  const { addToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [alarmActive, setAlarmActive] = useState(false);

  const { data: vehicles } = useApi<any>(async () => api.vehicles.list({ limit: '200' }), []);
  const { data: machines } = useApi<any>(async () => api.machines.list({ limit: '200' }), []);

  const allUnits = useMemo(() => {
    const vList = (vehicles?.data || vehicles || []) as Vehicle[];
    const mList = (machines?.data || machines || []) as Machine[];
    return [
      ...vList.filter((v) => v.currentPosition).map((v) => ({
        id: v.id, name: v.name, type: v.type, status: v.status, unitType: 'vehicle' as const,
        plate: v.plate,
      })),
      ...mList.filter((m) => m.currentPosition).map((m) => ({
        id: m.id, name: m.name, type: m.type, status: m.status, unitType: 'machine' as const,
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

  const features = [
    { icon: MapPin, title: 'Alertas de geocerca', desc: 'Notificación cuando entren o salgan de zonas' },
    { icon: Clock, title: 'Exceso de velocidad', desc: 'Alerta cuando superen el límite configurado' },
    { icon: Shield, title: 'Batería baja', desc: 'Aviso cuando el dispositivo tenga poca carga' },
  ];

  return (
    <div className={`min-h-full ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f7]'}`}>
      <div className={`sticky top-0 z-10 px-4 py-3 flex items-center gap-3 backdrop-blur-xl border-b
        ${darkMode ? 'bg-[#0a0a0a]/80 border-[#222]' : 'bg-[#f5f5f7]/80 border-gray-200'}`}>
        <button onClick={() => navigate('/live-map')} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-[#222] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-[16px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Modo alarma</h1>
          <p className={`text-[12px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{selected.size} unidades seleccionadas</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Global toggle */}
        <div className={`rounded-2xl p-5 ${darkMode ? 'bg-[#111]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${alarmActive ? 'bg-red-500/15' : darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
                {alarmActive ? <Bell className="w-6 h-6 text-red-500" /> : <BellOff className={`w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />}
              </div>
              <div>
                <p className={`text-[15px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Alarma global</p>
                <p className={`text-[12px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {alarmActive ? 'Activa — recibiendo alertas' : 'Desactivada'}
                </p>
              </div>
            </div>
            <button onClick={() => { setAlarmActive(!alarmActive); addToast(alarmActive ? 'info' : 'success', alarmActive ? 'Alarma desactivada' : 'Alarma activada'); }}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${alarmActive ? 'bg-red-500' : darkMode ? 'bg-[#333]' : 'bg-gray-200'}`}>
              <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${alarmActive ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Feature types */}
        <div className="space-y-2">
          <p className={`text-[12px] font-medium px-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Tipos de alerta</p>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className={`flex items-center gap-4 px-4 py-4 rounded-2xl ${darkMode ? 'bg-[#111]' : 'bg-white'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f5f7]'}`}>
                  <Icon className="w-5 h-5 text-[#f87203]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{f.title}</p>
                  <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{f.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border
                  ${alarmActive ? 'bg-[#032347] border-[#032347]' : darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  {alarmActive && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vehicle checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className={`text-[12px] font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Seleccionar unidades</p>
            <button onClick={toggleAll} className={`text-[12px] font-medium ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`}>
              {selected.size === filtered.length && filtered.length > 0 ? 'Deseleccionar' : 'Todas'}
            </button>
          </div>

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

          {/* List */}
          <div className="space-y-1">
            {filtered.map((u) => (
              <button key={u.id} onClick={() => toggle(u.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left
                  ${selected.has(u.id) ? darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'
                    : darkMode ? 'bg-[#111]' : 'bg-white'}`}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors
                  ${selected.has(u.id) ? 'bg-red-500 border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  {selected.has(u.id) && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: markerColor(u.status) }} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-medium ${darkMode ? 'text-white' : 'text-[#1d1d1f]'} truncate`}>{u.name}</p>
                  <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {u.unitType === 'vehicle' ? 'Vehículo' : 'Maquinaria'} · {(u as any).plate || (u as any).serialNumber}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-[#111]' : 'bg-white'}`}>
          <p className={`text-[12px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} leading-relaxed`}>
            Las alertas se enviarán como notificaciones push a tu dispositivo para las unidades seleccionadas.
          </p>
        </div>
      </div>

      {/* Footer */}
      {selected.size > 0 && (
        <div className={`sticky bottom-0 p-4 border-t backdrop-blur-xl
          ${darkMode ? 'bg-[#0a0a0a]/80 border-[#222]' : 'bg-[#f5f5f7]/80 border-gray-200'}`}>
          <button onClick={() => { addToast('success', `Alarma configurada para ${selected.size} unidades`); navigate('/live-map'); }}
            className={`w-full h-[48px] flex items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98]
              ${alarmActive ? 'bg-red-500 text-white' : 'bg-[#032347] text-white'}`}>
            <Bell className="w-4 h-4" />
            {alarmActive ? 'Actualizar alarma' : 'Activar alarma'} ({selected.size})
          </button>
        </div>
      )}
    </div>
  );
}
