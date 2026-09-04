import React, { useState, useMemo } from 'react';
import { Bell, Power, PowerOff, Shield, Gauge, AlertTriangle } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { formatDateTime, timeAgo } from '../utils/format';
import { useLayout } from '../context/LayoutContext';
import Pagination from '../components/Pagination';
import DatePicker from '../components/DatePicker';
import SpinnerSelect from '../components/SpinnerSelect';

type EventFilter = 'all' | 'ENGINE_ON' | 'ENGINE_OFF' | 'SPEED_ALERT' | 'GEOFENCE';

const eventIcon = (type: string) => {
  switch (type) {
    case 'ENGINE_ON': return <Power className="w-4 h-4 text-green-500" />;
    case 'ENGINE_OFF': return <PowerOff className="w-4 h-4 text-red-500" />;
    case 'SPEED_ALERT': return <Gauge className="w-4 h-4 text-[#f87203]" />;
    case 'GEOFENCE_ENTER': return <Shield className="w-4 h-4 text-[#032347]" />;
    case 'GEOFENCE_EXIT': return <Shield className="w-4 h-4 text-[#032347]" />;
    default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
  }
};

const eventLabel = (type: string) => {
  switch (type) {
    case 'ENGINE_ON': return 'Motor encendido';
    case 'ENGINE_OFF': return 'Motor apagado';
    case 'SPEED_ALERT': return 'Alerta de velocidad';
    case 'GEOFENCE_ENTER': return 'Entró a geocerca';
    case 'GEOFENCE_EXIT': return 'Salió de geocerca';
    case 'IGNITION_ON': return 'Encendido activado';
    case 'IGNITION_OFF': return 'Encendido desactivado';
    default: return type;
  }
};

const eventBg = (type: string) => {
  switch (type) {
    case 'ENGINE_ON': return 'bg-green-500/10 text-green-500';
    case 'ENGINE_OFF': return 'bg-red-500/10 text-red-500';
    case 'SPEED_ALERT': return 'bg-[#f87203]/10 text-[#f87203]';
    case 'GEOFENCE_ENTER': return 'bg-[#032347]/10 text-[#032347]';
    case 'GEOFENCE_EXIT': return 'bg-[#032347]/10 text-[#032347]';
    default: return 'bg-gray-500/10 text-gray-400';
  }
};

export default function Notifications() {
  const { darkMode } = useLayout();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const params: Record<string, string> = { limit: '200' };
  if (dateFrom) params.startDate = dateFrom;
  if (dateTo) params.endDate = dateTo + 'T23:59:59';
  if (filter === 'ENGINE_ON') params.type = 'ENGINE_ON';
  else if (filter === 'ENGINE_OFF') params.type = 'ENGINE_OFF';
  else if (filter === 'SPEED_ALERT') params.type = 'SPEED_ALERT';
  else if (filter === 'GEOFENCE') params.type = 'GEOFENCE_ENTER';

  const { data, loading } = useApi<any>(
    () => api.events.list(params),
    [filter, dateFrom, dateTo]
  );

  const events = data?.data || data || [];

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return events.slice(start, start + pageSize);
  }, [events, page, pageSize]);

  const filters: { key: EventFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'ENGINE_ON', label: 'Motor on' },
    { key: 'ENGINE_OFF', label: 'Motor off' },
    { key: 'SPEED_ALERT', label: 'Velocidad' },
    { key: 'GEOFENCE', label: 'Geocerca' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Notificaciones</h1>
        <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{events.length} eventos registrados</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SpinnerSelect
          prefix="Tipo:"
          options={filters}
          value={filter}
          onChange={(k) => { setFilter(k as EventFilter); setPage(1); }}
        />

        <div className="h-5 w-px bg-gray-200 dark:bg-[#33343c]" />

        <div className="flex items-center gap-3">
          <DatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
          <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>a</span>
          <DatePicker value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032347]" />
        </div>
      ) : events.length === 0 ? (
        <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl text-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No hay notificaciones</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((evt: any, i: number) => (
              <div key={evt.id || i}
                className={`${darkMode ? 'bg-[#1b1b1f] hover:bg-[#232329]' : 'bg-white hover:bg-[#f5f5f7]'} rounded-2xl px-4 py-3 flex items-start gap-3 transition-all cursor-default`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${eventBg(evt.type)}`}>
                  {eventIcon(evt.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-[13px] font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{eventLabel(evt.type)}</p>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{evt.unitName}</p>
                  {evt.message && evt.message !== `${evt.type} event` && (
                    <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>{evt.message}</p>
                  )}
                  <div className={`flex items-center gap-3 mt-1.5 text-[11px] ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    <span>{formatDateTime(evt.timestamp)}</span>
                    <span>{timeAgo(evt.timestamp)}</span>
                    {evt.speed != null && <span>{Math.round(evt.speed)} km/h</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            totalItems={events.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
