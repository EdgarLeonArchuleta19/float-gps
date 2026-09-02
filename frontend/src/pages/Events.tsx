import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { TrackingEvent, PaginatedResponse } from '../types';
import { formatDateTime, eventTypeIcon, severityColor, timeAgo } from '../utils/format';
import { useLayout } from '../context/LayoutContext';
import DatePicker from '../components/DatePicker';

export default function Events() {
  const { darkMode } = useLayout();
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const params: Record<string, string> = { page: String(page), limit: String(limit) };
  if (typeFilter) params.type = typeFilter;
  if (dateFrom) params.from = dateFrom;
  if (dateTo) params.to = dateTo;

  const { data, loading } = useApi<PaginatedResponse<TrackingEvent>>(
    async () => api.events.list(params),
    [typeFilter, dateFrom, dateTo, page]
  );

  const events = data?.data || [];
  const pagination = data?.pagination;

  const eventTypes = [
    'IGNITION_ON', 'IGNITION_OFF', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT',
    'OVERSPEED', 'LOW_BATTERY', 'ENGINE_STOP', 'GPS_DISCONNECTED', 'GPS_CONNECTED', 'SOS',
  ];

  const inputBg = darkMode
    ? 'bg-gray-800 border border-gray-700 text-gray-200'
    : 'bg-white border border-gray-200 text-gray-900';

  return (
    <div className="space-y-4">
      <div>
        <h1 className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Eventos</h1>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Registro de eventos del sistema</p>
      </div>

      <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-4 space-y-3`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none ${inputBg}`}
          >
            <option value="">Todos los tipos</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <DatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
          <DatePicker value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : events.length === 0 ? (
        <div className={`text-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
          <p>No se encontraron eventos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className={`${darkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-4 transition-colors`}>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{eventTypeIcon(ev.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{ev.unitName || '—'}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : severityColor(ev.severity)}`}>
                      {ev.severity}
                    </span>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{ev.type.replace(/_/g, ' ')}</p>
                  <div className={`flex items-center gap-3 mt-1.5 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span>{formatDateTime(ev.timestamp)}</span>
                    <span>{timeAgo(ev.timestamp)}</span>
                    {ev.speed != null && <span>{ev.speed} km/h</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {pagination.total} resultados · Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`p-2 rounded-lg ${darkMode ? 'border border-gray-700 hover:bg-gray-800 text-gray-300' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className={`p-2 rounded-lg ${darkMode ? 'border border-gray-700 hover:bg-gray-800 text-gray-300' : 'border border-gray-200 hover:bg-gray-50 text-gray-600'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
