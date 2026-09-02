import React, { useState } from 'react';
import { BookOpen, Clock, MapPin, Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine } from '../types';
import { formatHours, formatKm, formatDate } from '../utils/format';
import { useLayout } from '../context/LayoutContext';
import DatePicker from '../components/DatePicker';

interface WorkSessionRow {
  id: string;
  date: string;
  unitName: string;
  unitType: string;
  startTime: string;
  endTime?: string;
  totalHours: number;
  kilometers: number;
  idleHours: number;
  movingHours: number;
}

export default function WorkLog() {
  const { darkMode } = useLayout();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [unitFilter, setUnitFilter] = useState('');

  const { data: vehicles } = useApi<any[]>(
    async () => { const r = await api.vehicles.list(); return Array.isArray(r) ? r : r.data || []; },
    []
  );

  const { data: machines } = useApi<any[]>(
    async () => { const r = await api.machines.list(); return Array.isArray(r) ? r : r.data || []; },
    []
  );

  const allUnits = [
    ...(vehicles || []).map((v) => ({ id: v.id, name: v.name })),
    ...(machines || []).map((m) => ({ id: m.id, name: m.name })),
  ];

  const params: Record<string, string> = {};
  if (dateFrom) params.from = dateFrom;
  if (dateTo) params.to = dateTo;
  if (unitFilter) params.unitId = unitFilter;

  const { data: sessions, loading } = useApi<WorkSessionRow[]>(
    async () => {
      const r = await api.reports.getDaily(params);
      return Array.isArray(r) ? r : (r as any).data || [];
    },
    [dateFrom, dateTo, unitFilter]
  );

  const rows = sessions || [];

  const inputBg = darkMode
    ? 'bg-gray-800 border border-gray-700 text-gray-200'
    : 'bg-white border border-gray-200 text-gray-900';

  return (
    <div className="space-y-4">
      <div>
        <h1 className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Bitácora</h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Registro diario de sesiones de trabajo</p>
      </div>

      <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-4 space-y-3`}>
        <div className="grid grid-cols-2 gap-3">
          <DatePicker label="Desde" value={dateFrom} onChange={setDateFrom} />
          <DatePicker label="Hasta" value={dateTo} onChange={setDateTo} />
        </div>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none ${inputBg}`}
          >
            <option value="">Todas las unidades</option>
            {allUnits.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : rows.length === 0 ? (
        <div className={`text-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <BookOpen className="w-10 h-10 mx-auto mb-2" />
          <p>No hay sesiones de trabajo en el rango seleccionado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className={`${darkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-4 transition-colors`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{row.unitName}</span>
                </div>
                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{formatDate(row.date)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Inicio</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{row.startTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fin</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{row.endTime || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Horas</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{formatHours(row.totalHours)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Km</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{formatKm(row.kilometers)}</p>
                  </div>
                </div>
              </div>
              <div className={`flex gap-4 mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                <span>Idle: {formatHours(row.idleHours)}</span>
                <span>Movimiento: {formatHours(row.movingHours)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
