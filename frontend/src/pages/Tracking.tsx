import React, { useState, useRef } from 'react';
import { ChevronDown, Play, Gauge, Navigation, Power, Timer, AlertTriangle, X, Route as RouteIcon, MousePointerClick } from 'lucide-react';
import LeafletMap, { MapMarker, MapRoute } from '../components/map/LeafletMap';
import DatePicker from '../components/DatePicker';
import TimePicker from '../components/TimePicker';
import UnitSelectorSheet, { UnitSelectOption } from '../components/UnitSelectorSheet';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine, TrackingData } from '../types';
import { formatHours, formatKm } from '../utils/format';
import { useLayout } from '../context/LayoutContext';

interface UnitOption extends UnitSelectOption {}

interface UnitResult {
  unit: UnitOption;
  color: string;
  data?: TrackingData | null;
  error?: string;
}

const ROUTE_COLORS = ['#2563EB', '#f87203', '#16A34A', '#9333EA', '#DB2777'];
const MAX_UNITS = ROUTE_COLORS.length;

function downsampleRoute(positions: TrackingData['positions'], max = 300): [number, number][] {
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

export default function Tracking() {
  const { darkMode } = useLayout();
  const [selectedUnits, setSelectedUnits] = useState<UnitOption[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [results, setResults] = useState<UnitResult[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: vehicles } = useApi<Vehicle[]>(
    async () => { const r = await api.vehicles.list(); return r.data || r; },
    []
  );

  const { data: machines } = useApi<Machine[]>(
    async () => { const r = await api.machines.list(); return r.data || r; },
    []
  );

  const units: UnitOption[] = [
    ...(vehicles || []).map((v) => ({ id: v.id, name: v.name, gpsDeviceId: v.gpsDevice?.id, type: 'vehicle' as const })),
    ...(machines || []).map((m) => ({ id: m.id, name: m.name, gpsDeviceId: m.gpsDevice?.id, type: 'machine' as const })),
  ];

  const toggleUnit = (unit: UnitOption) => {
    setFetchError(null);
    setSelectedUnits((prev) => {
      if (prev.some((u) => u.id === unit.id)) {
        return prev.filter((u) => u.id !== unit.id);
      }
      if (prev.length >= MAX_UNITS) {
        setFetchError(`Máximo ${MAX_UNITS} unidades a la vez`);
        return prev;
      }
      return [...prev, unit];
    });
  };

  const clearAll = () => {
    setSelectedUnits([]);
    setResults([]);
    setSelectedUnitId(null);
    setFetchError(null);
  };

  const scrollToResults = () => {
    setTimeout(() => {
      if (window.innerWidth < 1024) {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const handleSearch = async () => {
    if (selectedUnits.length === 0) {
      setFetchError('Selecciona al menos una unidad');
      return;
    }
    const withGps = selectedUnits.filter((u) => u.gpsDeviceId);
    if (withGps.length === 0) {
      setFetchError('Ninguna de las unidades seleccionadas tiene dispositivo GPS asignado');
      return;
    }
    setFetching(true);
    setFetchError(null);
    setResults([]);
    setSelectedUnitId(null);
    const from = `${date}T${startTime}:00`;
    const to = `${date}T${endTime}:00`;
    try {
      const settled = await Promise.allSettled(
        selectedUnits.map(async (unit) => {
          if (!unit.gpsDeviceId) {
            return { unit, color: '', error: 'Sin GPS asignado' } as UnitResult;
          }
          const data = await api.gps.getTracking(unit.gpsDeviceId, { from, to });
          return { unit, color: '', data } as UnitResult;
        })
      );
      const mapped: UnitResult[] = settled.map((r, i) => {
        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        if (r.status === 'fulfilled') {
          return { ...r.value, color };
        }
        return { unit: selectedUnits[i], color, error: r.reason?.message || 'Error al consultar' };
      });
      mapped.sort((a, b) =>
        selectedUnits.findIndex((u) => u.id === a.unit.id) - selectedUnits.findIndex((u) => u.id === b.unit.id)
      );
      setResults(mapped);
      scrollToResults();
    } finally {
      setFetching(false);
    }
  };

  const okResults = results.filter((r) => r.data && r.data.positions.length > 0);
  const routes: MapRoute[] = okResults.map((r) => ({
    path: downsampleRoute(r.data!.positions),
    color: r.color,
  }));
  const endMarkers: MapMarker[] = okResults.map((r) => {
    const pos = r.data!.positions[r.data!.positions.length - 1];
    return {
      id: `end-${r.unit.id}`,
      position: [pos.latitude, pos.longitude],
      color: r.color,
      name: r.unit.name,
      onClick: () => setSelectedUnitId(r.unit.id),
    };
  });

  const activeResult = selectedUnitId
    ? okResults.find((r) => r.unit.id === selectedUnitId) ?? null
    : null;

  const cardClass = `${darkMode ? 'bg-[#111]' : 'bg-white'} rounded-2xl transition-colors`;
  const labelClass = `block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`;

  return (
    <div className="space-y-4 pb-28 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Rastreo histórico</h1>
        <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
          Compara las rutas de hasta {MAX_UNITS} unidades
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
        {/* Panel de filtros (una sola tarjeta compacta) */}
        <div className="w-full lg:w-[340px] flex-shrink-0 lg:sticky lg:top-4">
          <div className={`${cardClass} p-3.5 sm:p-4 divide-y ${darkMode ? 'divide-[#222]' : 'divide-gray-100'}`}>
            {/* Fecha y horario */}
            <div className="pb-3.5">
              <div className="grid grid-cols-1 gap-2.5">
                <DatePicker label="Fecha" value={date} onChange={setDate} />
                <div className="grid grid-cols-2 gap-2.5">
                  <TimePicker label="Inicio" value={startTime} onChange={setStartTime} />
                  <TimePicker label="Fin" value={endTime} onChange={setEndTime} />
                </div>
              </div>
            </div>

            {/* Unidades */}
            <div className="pt-3.5">
              <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                Unidades
              </label>

              {/* Trigger: abre el selector */}
              <button
                onClick={() => setSelectorOpen(true)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-[13px] border-2 transition-all active:scale-[0.99]
                  ${selectedUnits.length > 0
                    ? darkMode ? 'border-[#f87203]/60 bg-[#f87203]/5' : 'border-[#f87203]/50 bg-[#f87203]/5'
                    : darkMode ? 'border-[#333] bg-transparent hover:border-gray-500' : 'border-gray-200 bg-transparent hover:border-gray-300'}`}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold flex-shrink-0
                  ${selectedUnits.length > 0 ? 'bg-[#f87203] text-white' : darkMode ? 'bg-[#222] text-gray-400' : 'bg-[#f0f0f0] text-gray-500'}`}>
                  {selectedUnits.length}
                </span>
                <span className={`flex-1 truncate font-medium ${selectedUnits.length > 0 ? (darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]') : (darkMode ? 'text-gray-300' : 'text-gray-600')}`}>
                  {selectedUnits.length > 0
                    ? selectedUnits.map((u) => u.name).join(', ')
                    : 'Elegir unidades'}
                </span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </button>
              {selectedUnits.length === 0 && (
                <p className={`mt-1.5 text-[11px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  Hasta {MAX_UNITS} unidades para comparar rutas
                </p>
              )}

              {/* Chips seleccionados */}
              {selectedUnits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {selectedUnits.map((u, i) => (
                    <span key={u.id}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[11px] font-medium text-white"
                      style={{ background: ROUTE_COLORS[i % ROUTE_COLORS.length] }}>
                      {u.name}
                      <button onClick={() => toggleUnit(u)} className="p-0.5 rounded-full hover:bg-white/25 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Botón dentro del panel: solo escritorio */}
              <button onClick={handleSearch} disabled={fetching || selectedUnits.length === 0}
                className={`mt-3 hidden lg:flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${darkMode ? 'bg-white text-[#032347] hover:bg-gray-100' : 'bg-[#032347] text-white hover:bg-[#02335a]'} active:scale-[0.99]`}>
                {fetching ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
                {fetching ? 'Buscando...' : 'Buscar rutas'}
              </button>
            </div>
          </div>
        </div>

        {/* Área principal */}
        <div ref={resultsRef} className="flex-1 min-w-0 w-full space-y-4 scroll-mt-4">
          {fetchError && (
            <div className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className={`text-[13px] ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{fetchError}</p>
            </div>
          )}

          {/* Instrucción o detalle de la unidad seleccionada en el mapa */}
          {okResults.length > 0 && !fetching && !activeResult && (
            <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-dashed
              ${darkMode ? 'border-[#333] text-gray-500' : 'border-gray-300 text-gray-500'}`}>
              <MousePointerClick className="w-[18px] h-[18px] flex-shrink-0" />
              <p className="text-[12.5px]">
                Toca un punto del mapa — o su etiqueta de color — para ver el detalle de esa unidad
              </p>
            </div>
          )}

          {activeResult && !fetching && (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="h-1" style={{ background: activeResult.color }} />
              <div className="p-3.5 sm:p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: activeResult.color }} />
                  <p className={`flex-1 truncate text-[14px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                    {activeResult.unit.name}
                  </p>
                  <button onClick={() => setSelectedUnitId(null)} aria-label="Cerrar detalle"
                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#222] text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Distancia</p>
                    <p className={`mt-0.5 text-[15px] font-semibold tabular-nums flex items-center gap-1.5 ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                      <Navigation className="w-3.5 h-3.5" style={{ color: activeResult.color }} />
                      {formatKm(activeResult.data!.summary.totalKm)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Tiempo total</p>
                    <p className={`mt-0.5 text-[15px] font-semibold tabular-nums flex items-center gap-1.5 ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                      <Timer className="w-3.5 h-3.5" style={{ color: activeResult.color }} />
                      {formatHours(activeResult.data!.summary.totalTime / 3600)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>En movimiento</p>
                    <p className={`mt-0.5 text-[15px] font-semibold tabular-nums flex items-center gap-1.5 ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                      <Gauge className="w-3.5 h-3.5" style={{ color: activeResult.color }} />
                      {formatHours(activeResult.data!.summary.movingTime / 3600)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wider font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Motor encendido</p>
                    <p className={`mt-0.5 text-[15px] font-semibold tabular-nums flex items-center gap-1.5 ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                      <Power className="w-3.5 h-3.5" style={{ color: activeResult.color }} />
                      {formatHours(activeResult.data!.summary.engineOnTime / 3600)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mapa con leyenda flotante */}
          {routes.length > 0 && !fetching ? (
            <div className="rounded-2xl overflow-hidden relative h-[58vh] sm:h-[440px] lg:h-[520px]" style={{ zIndex: 0 }}>
              <LeafletMap dark={darkMode} polylines={routes} markers={endMarkers} height="100%" fitBounds />
              {/* Leyenda de colores sobre el mapa (tappable para ver detalle) */}
              {okResults.length > 1 && (
                <div className="absolute top-2.5 left-2.5 z-[900] flex flex-wrap gap-1.5 max-w-[75%]">
                  {okResults.map((r) => (
                    <button key={r.unit.id}
                      onClick={() => setSelectedUnitId((prev) => (prev === r.unit.id ? null : r.unit.id))}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shadow-md transition-all active:scale-95
                        ${selectedUnitId === r.unit.id ? 'ring-2 ring-white/90' : 'opacity-85 hover:opacity-100'}`}
                      style={{ background: r.color }}>
                      {r.unit.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : fetching ? (
            <div className={`${cardClass} flex flex-col items-center justify-center py-20 gap-3`}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032347]" />
              <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Consultando rutas...</p>
            </div>
          ) : (
            <div className={`${cardClass} text-center py-14 lg:py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <RouteIcon className="w-10 h-10 mx-auto mb-2" />
              <p className="text-[13px]">Selecciona una o más unidades y presiona Buscar rutas</p>
            </div>
          )}

          {/* Errores por unidad */}
          {results.filter((r) => r.error).length > 0 && !fetching && (
            <div className={`${cardClass} p-3.5 space-y-1.5`}>
              <p className={`text-[12px] font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avisos</p>
              {results.filter((r) => r.error).map((r) => (
                <p key={r.unit.id} className={`text-[12px] ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                  · {r.unit.name}: {r.error}
                </p>
              ))}
            </div>
          )}

          {/* Tabla detallada: sigue a la unidad seleccionada en el mapa */}
          {activeResult && !fetching && (
            <div className={`${cardClass} overflow-x-auto`}>
              <div className={`px-4 py-2.5 border-b ${darkMode ? 'border-[#222]' : 'border-gray-100'}`}>
                <p className={`text-[12px] font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Posiciones · {activeResult.unit.name}
                </p>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className={darkMode ? 'border-b border-[#222]' : 'border-b border-gray-100'}>
                    <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hora</th>
                    <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lat</th>
                    <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lng</th>
                    <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Velocidad</th>
                    <th className={`text-left px-4 py-3 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} hidden sm:table-cell`}>Encendido</th>
                  </tr>
                </thead>
                <tbody>
                  {activeResult.data!.positions.map((p) => (
                    <tr key={p.id} className={darkMode ? 'border-b border-[#222]/50' : 'border-b border-gray-50'}>
                      <td className={`px-4 py-2 ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'} text-xs`}>{new Date(p.timestamp).toLocaleTimeString('es-MX')}</td>
                      <td className={`px-4 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-mono text-xs`}>{p.latitude.toFixed(5)}</td>
                      <td className={`px-4 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-mono text-xs`}>{p.longitude.toFixed(5)}</td>
                      <td className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-xs`}>{p.speed} km/h</td>
                      <td className="px-4 py-2 hidden sm:table-cell">
                        {p.ignition ? (
                          <span className="text-green-500 text-xs font-medium">Sí</span>
                        ) : (
                          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Barra de acción fija (móvil) */}
      <div className={`lg:hidden fixed bottom-0 inset-x-0 z-[1050] px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] backdrop-blur-xl border-t
        ${darkMode ? 'bg-[#0a0a0a]/90 border-[#222]' : 'bg-white/90 border-gray-200'}`}>
        <button onClick={handleSearch} disabled={fetching || selectedUnits.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[14px] font-semibold rounded-xl bg-[#032347] text-white hover:bg-[#02335a] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {fetching ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
          {fetching ? 'Buscando...' : `Buscar rutas${selectedUnits.length > 0 ? ` (${selectedUnits.length})` : ''}`}
        </button>
      </div>

      {/* Selector de unidades (bottom sheet) */}
      <UnitSelectorSheet
        open={selectorOpen}
        units={units}
        selectedIds={selectedUnits.map((u) => u.id)}
        max={MAX_UNITS}
        colors={ROUTE_COLORS}
        onToggle={toggleUnit}
        onClose={() => setSelectorOpen(false)}
        onClear={clearAll}
      />
    </div>
  );
}
