import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PowerOff, Check, Search, X, AlertTriangle } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine } from '../types';
import { markerColor, statusLabel } from '../utils/format';
import { useLayout } from '../context/LayoutContext';
import { useToast } from '../context/ToastContext';

export default function EngineStop() {
  const navigate = useNavigate();
  const { darkMode } = useLayout();
  const { addToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: vehicles } = useApi<any>(async () => api.vehicles.list({ limit: '200' }), []);
  const { data: machines } = useApi<any>(async () => api.machines.list({ limit: '200' }), []);

  const allUnits = useMemo(() => {
    const vList = (vehicles?.data || vehicles || []) as Vehicle[];
    const mList = (machines?.data || machines || []) as Machine[];
    return [
      ...vList.filter((v) => v.currentPosition).map((v) => ({
        id: v.id, name: v.name, type: v.type, status: v.status, unitType: 'vehicle' as const,
        plate: v.plate, ignition: v.currentPosition!.ignition,
      })),
      ...mList.filter((m) => m.currentPosition).map((m) => ({
        id: m.id, name: m.name, type: m.type, status: m.status, unitType: 'machine' as const,
        serialNumber: m.serialNumber, ignition: m.currentPosition!.ignition,
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

  const handleStop = async () => {
    setSending(true);
    try {
      for (const id of selected) {
        const unit = allUnits.find((u) => u.id === id);
        if (unit) await api.commands.engineStop(id, unit.unitType);
      }
      addToast('success', `Comando enviado a ${selected.size} unidades`);
      setSelected(new Set());
      setShowConfirm(false);
      navigate('/live-map');
    } catch (e: any) {
      addToast('error', e.message || 'Error al enviar comando');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`min-h-full ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f7]'}`}>
      <div className={`sticky top-0 z-10 px-4 py-3 flex items-center gap-3 backdrop-blur-xl border-b
        ${darkMode ? 'bg-[#0a0a0a]/80 border-[#222]' : 'bg-[#f5f5f7]/80 border-gray-200'}`}>
        <button onClick={() => navigate('/live-map')} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-[#222] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className={`text-[16px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Paro de motor</h1>
          <p className={`text-[12px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Selecciona unidades para apagar motor</p>
        </div>
        {selected.size > 0 && (
          <span className="text-[12px] font-medium text-red-500">{selected.size} seleccionadas</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Warning */}
        <div className={`rounded-2xl p-4 flex items-start gap-3 ${darkMode ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`text-[13px] font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Acción de emergencia</p>
            <p className={`text-[12px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              El motor de las unidades seleccionadas se apagará remotamente. Esta acción es irreversible hasta que se reinicie manualmente.
            </p>
          </div>
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
                ${selected.has(u.id) ? 'bg-red-500/10 border border-red-500/20'
                  : darkMode ? 'bg-[#111]' : 'bg-white'}`}>
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors
                ${selected.has(u.id) ? 'bg-red-500 border-red-500' : darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                {selected.has(u.id) && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: markerColor(u.status) }} />
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium ${darkMode ? 'text-white' : 'text-[#1d1d1f]'} truncate`}>{u.name}</p>
                <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {'plate' in u ? u.plate : u.serialNumber} · {u.ignition ? <span className="text-green-500">Encendido</span> : <span>Apagado</span>}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      {selected.size > 0 && (
        <div className={`sticky bottom-0 p-4 border-t backdrop-blur-xl
          ${darkMode ? 'bg-[#0a0a0a]/80 border-[#222]' : 'bg-[#f5f5f7]/80 border-gray-200'}`}>
          <button onClick={() => setShowConfirm(true)}
            className="w-full h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-red-500 text-white text-[14px] font-semibold transition-all active:scale-[0.98]">
            <PowerOff className="w-4 h-4" />
            Apagar motor ({selected.size})
          </button>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={`${darkMode ? 'bg-[#111]' : 'bg-white'} rounded-2xl shadow-xl max-w-md w-full p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <PowerOff className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className={`text-base font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Confirmar paro</h3>
                <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Se apagará el motor de {selected.size} unidades</p>
              </div>
            </div>
            <p className={`text-[13px] ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
              ¿Estás seguro? El motor de las unidades seleccionadas se apagará remotamente.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)}
                className={`px-4 py-2 text-[13px] font-medium rounded-xl ${darkMode ? 'text-gray-300 bg-[#1a1a1a] hover:bg-[#222]' : 'text-gray-700 bg-[#f5f5f7] hover:bg-gray-200'}`}>
                Cancelar
              </button>
              <button onClick={handleStop} disabled={sending}
                className="px-4 py-2 text-[13px] font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50">
                {sending ? 'Enviando...' : 'Confirmar paro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
