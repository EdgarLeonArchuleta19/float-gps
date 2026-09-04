import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Gauge, MapPin, Clock, Battery, Navigation, Power, PowerOff,
  Activity, History, AlertTriangle, Car, Wrench, Calendar, Shield, Route, Hash, Thermometer,
  Satellite, Unlink as UnlinkIcon, Search, X, Loader2, Check
} from 'lucide-react';
import LeafletMap, { MapMarker } from '../components/map/LeafletMap';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine, GpsPosition, TrackingEvent, GpsDevice } from '../types';
import {
  statusColor, statusLabel, formatDateTime, formatKm, formatHours, markerColor, timeAgo
} from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';
import Pagination from '../components/Pagination';
import DatePicker from '../components/DatePicker';

type Tab = 'resumen' | 'historial' | 'bitacora';

interface UnitDetailData {
  id: string;
  name: string;
  plate?: string;
  serialNumber?: string;
  type: string;
  brand?: string;
  model?: string;
  year?: number;
  status: string;
  unitType: 'vehicle' | 'machine';
  gpsDevice?: any;
  currentPosition?: any;
  todaySession?: any;
  kmToday?: number;
}

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

export default function UnitDetail() {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const { darkMode } = useLayout();
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [gpsSheetOpen, setGpsSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const { data: vehicle, loading: loadVehicle } = useApi<Vehicle>(
    async () => api.vehicles.get(id!),
    [id, refreshKey]
  );

  const { data: machine, loading: loadMachine } = useApi<Machine>(
    async () => api.machines.get(id!),
    [id, refreshKey]
  );

  const loading = loadVehicle || loadMachine;

  const unit: UnitDetailData | null = vehicle
    ? { ...vehicle, model: (vehicle as any).vehicleModel, unitType: 'vehicle', kmToday: (vehicle as any).kmToday }
    : machine
    ? { ...machine, model: (machine as any).machineModel, unitType: 'machine', kmToday: (machine as any).kmToday }
    : null;

  const unitType = unit?.unitType || 'vehicle';

  const { data: positions } = useApi<GpsPosition[]>(
    async () => {
      if (!unit?.gpsDevice?.id) return [];
      const r = await api.gps.getPositions(unit.gpsDevice.id, { startDate: dateFrom, endDate: dateTo + 'T23:59:59' });
      return r.data || r;
    },
    [unit?.gpsDevice?.id, dateFrom, dateTo]
  );

  const { data: allEvents } = useApi<any>(
    async () => {
      if (!unit?.gpsDevice?.id) return { data: [] };
      const params: Record<string, string> = {
        gpsDeviceId: unit.gpsDevice.id,
        startDate: dateFrom,
        endDate: dateTo + 'T23:59:59',
        limit: '200',
      };
      return api.events.list(params);
    },
    [unit?.gpsDevice?.id, dateFrom, dateTo]
  );

  const events = allEvents?.data || allEvents || [];

  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return events.slice(start, start + pageSize);
  }, [events, page, pageSize]);

  const routePath: [number, number][] = (positions || []).map((p) => [p.latitude, p.longitude]);
  const currentMarker: MapMarker[] = unit?.currentPosition
    ? [{ id: unit.id, position: [unit.currentPosition.latitude, unit.currentPosition.longitude], color: markerColor(unit.status), name: unit.name }]
    : [];

  // Historical stats
  const totalKm = useMemo(() => {
    if (!positions || positions.length < 2) return 0;
    let km = 0;
    for (let i = 1; i < positions.length; i++) {
      const R = 6371;
      const dLat = (positions[i].latitude - positions[i - 1].latitude) * Math.PI / 180;
      const dLng = (positions[i].longitude - positions[i - 1].longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(positions[i - 1].latitude * Math.PI / 180) * Math.cos(positions[i].latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      km += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return Math.round(km * 10) / 10;
  }, [positions]);

  const avgSpeed = useMemo(() => {
    if (!positions || positions.length === 0) return 0;
    const total = positions.reduce((sum, p) => sum + p.speed, 0);
    return Math.round(total / positions.length);
  }, [positions]);

  const maxSpeed = useMemo(() => {
    if (!positions || positions.length === 0) return 0;
    return Math.max(...positions.map((p) => p.speed));
  }, [positions]);

  const engineOnCount = events.filter((e: any) => e.type === 'ENGINE_ON').length;
  const engineOffCount = events.filter((e: any) => e.type === 'ENGINE_OFF').length;
  const alertCount = events.filter((e: any) => e.type === 'SPEED_ALERT').length;

  const handleUnlink = async () => {
    if (!unit?.gpsDevice?.id) return;
    try {
      await api.gps.unlinkDevice(unit.gpsDevice.id);
      addToast('success', 'GPS desvinculado');
      setConfirmUnlink(false);
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      addToast('error', e.message || 'Error al desvincular');
    }
  };

  if (loading || !unit) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032347]" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Activity }[] = [
    { key: 'resumen', label: 'Información', icon: Activity },
    { key: 'historial', label: 'Historial', icon: History },
    { key: 'bitacora', label: 'Bitácora', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <Link to="/fleet" className={`inline-flex items-center gap-1.5 text-[13px] ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>
          <ArrowLeft className="w-4 h-4" /> Flota
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {unit.unitType === 'vehicle' ? (
              <Car className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0`} />
            ) : (
              <Wrench className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0`} />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{unit.name}</h1>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-[#232329] text-gray-300' : statusColor(unit.status)}`}>
                  {statusLabel(unit.status)}
                </span>
              </div>
              <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {unit.plate || unit.serialNumber || '—'} · {unit.type} {unit.brand ? `· ${unit.brand}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-4`}>
          <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-1`}>Velocidad actual</p>
          <p className={`text-[15px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
            {unit.currentPosition?.speed ?? 0} km/h
          </p>
        </div>
        <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-4`}>
          <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-1`}>Voltaje</p>
          <p className={`text-[15px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
            {unit.currentPosition?.voltage ? `${unit.currentPosition.voltage}V` : '—'}
          </p>
        </div>
        <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-4`}>
          <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-1`}>Estado GPS</p>
          <p className={`text-[15px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
            {unit.gpsDevice ? (unit.currentPosition ? 'En línea' : 'Sin señal') : 'Sin GPS'}
          </p>
        </div>
        <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-4`}>
          <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-1`}>Encendido</p>
          <div className="flex items-center gap-1.5">
            {unit.currentPosition?.ignition ? (
              <><Power className="w-4 h-4 text-green-500" /><span className="text-[15px] font-bold text-green-500">ON</span></>
            ) : (
              <><PowerOff className={`w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} /><span className={`text-[15px] font-bold ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>OFF</span></>
            )}
          </div>
        </div>
      </div>

      <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl`}>
        <div className={`flex overflow-x-auto ${darkMode ? 'border-b border-[#33343c]' : 'border-b border-gray-100'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors
                ${activeTab === tab.key
                  ? `border-[#f87203] ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`
                  : `border-transparent ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'resumen' && (
            <div className="space-y-5">
              <div>
                <p className={`text-[12px] font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Datos del equipo</p>
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Nombre</p>
                    <p className={`font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{unit.name}</p>
                  </div>
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Tipo</p>
                    <p className={`font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'} capitalize`}>{unit.type}</p>
                  </div>
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>{unit.unitType === 'vehicle' ? 'Placa' : 'Serial'}</p>
                    <p className={`font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{unit.plate || unit.serialNumber || '—'}</p>
                  </div>
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Marca / Modelo</p>
                    <p className={`font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{unit.brand || '—'} {unit.model || ''}</p>
                  </div>
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Año</p>
                    <p className={`font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{unit.year || '—'}</p>
                  </div>
                  <div>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Estado</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-[#232329] text-gray-300' : statusColor(unit.status)}`}>
                      {statusLabel(unit.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className={`text-[12px] font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dispositivo GPS</p>
                {unit.gpsDevice ? (
                  <>
                    <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3.5`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <p className={`text-[12px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                          GPS vinculado · {unit.gpsDevice.model || 'Sin modelo'}
                        </p>
                        {unit.currentPosition && (
                          <span className={`ml-auto text-[11px] ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            En línea
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[13px]">
                        <div>
                          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>IMEI</p>
                          <p className={`font-medium font-mono text-xs ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{unit.gpsDevice.imei}</p>
                        </div>
                        <div>
                          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>SIM</p>
                          <p className={`font-medium font-mono text-xs ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{unit.gpsDevice.simNumber || '—'}</p>
                        </div>
                        <div>
                          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Última conexión</p>
                          <p className={`font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                            {unit.currentPosition ? timeAgo(unit.currentPosition.timestamp) : 'Sin conexión'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {confirmUnlink ? (
                        <>
                          <button onClick={handleUnlink}
                            className="flex-1 h-[38px] rounded-xl text-[12px] font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                            Sí, desvincular
                          </button>
                          <button onClick={() => setConfirmUnlink(false)}
                            className={`flex-1 h-[38px] rounded-xl text-[12px] font-medium transition-colors
                              ${darkMode ? 'bg-[#232329] text-gray-300 hover:bg-[#33343c]' : 'bg-[#f0f0f0] text-gray-600 hover:bg-gray-200'}`}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setGpsSheetOpen(true)}
                            className={`flex-1 h-[38px] rounded-xl text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5
                              ${darkMode ? 'bg-[#232329] text-gray-200 hover:bg-[#33343c]' : 'bg-[#032347]/10 text-[#032347] hover:bg-[#032347]/15'}`}>
                            <Satellite className="w-3.5 h-3.5" /> Cambiar GPS
                          </button>
                          <button onClick={() => setConfirmUnlink(true)}
                            className={`h-[38px] px-4 rounded-xl text-[12px] font-medium transition-colors flex items-center gap-1.5
                              ${darkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'}`}>
                            <UnlinkIcon className="w-3.5 h-3.5" /> Desvincular
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <button onClick={() => setGpsSheetOpen(true)}
                    className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-all active:scale-[0.99]
                      ${darkMode ? 'border-[#3c3d46] hover:border-[#f87203]/50' : 'border-gray-300 hover:border-[#032347]/50'}`}>
                    <Satellite className={`w-6 h-6 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={`text-[13px] font-medium ${darkMode ? 'text-gray-300' : 'text-[#1d1d1f]'}`}>
                      Esta unidad no tiene GPS vinculado
                    </p>
                    <span className="px-4 py-1.5 rounded-full text-[12px] font-semibold bg-[#032347] text-white">
                      + Vincular GPS
                    </span>
                  </button>
                )}
              </div>

              <div>
                <p className={`text-[12px] font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Resumen del día ({dateFrom})</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Km recorridos</p>
                    <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{formatKm(unit.todaySession?.kilometers ?? unit.kmToday ?? 0)}</p>
                  </div>
                  <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Tiempo encendido</p>
                    <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                      {unit.todaySession?.totalHours != null ? formatHours(unit.todaySession.totalHours) : '—'}
                    </p>
                  </div>
                  <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Vel. promedio</p>
                    <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{avgSpeed} km/h</p>
                  </div>
                  <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Vel. máxima</p>
                    <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{maxSpeed} km/h</p>
                  </div>
                </div>
              </div>

              <div>
                <p className={`text-[12px] font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Estadísticas del período</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Posiciones</p>
                    <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{positions?.length || 0}</p>
                  </div>
                  <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Km período</p>
                    <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{formatKm(totalKm)}</p>
                  </div>
                  <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Encendidos</p>
                    <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{engineOnCount}</p>
                  </div>
                  <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                    <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Alertas</p>
                    <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{alertCount}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className={`text-[12px] font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Última posición</p>
                <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3`}>
                  <p className={`text-[13px] font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                    {unit.currentPosition
                      ? `${unit.currentPosition.latitude.toFixed(5)}, ${unit.currentPosition.longitude.toFixed(5)}`
                      : 'Sin posición'}
                  </p>
                  <p className={`text-[11px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {unit.currentPosition ? timeAgo(unit.currentPosition.timestamp) : ''}
                  </p>
                </div>
                {currentMarker.length > 0 && (
                  <div className="rounded-2xl overflow-hidden mt-3" style={{ height: '200px' }}>
                    <LeafletMap dark={darkMode} markers={currentMarker} center={currentMarker[0].position} zoom={14} height="100%" />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'historial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
                <DatePicker value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
              </div>

              {routePath.length > 0 ? (
                <>
                  <div className="rounded-2xl overflow-hidden" style={{ height: '350px' }}>
                    <LeafletMap dark={darkMode} polyline={routePath} center={routePath[0]} zoom={13} height="100%" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3 text-center`}>
                      <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Km recorridos</p>
                      <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{formatKm(totalKm)}</p>
                    </div>
                    <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3 text-center`}>
                      <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Puntos</p>
                      <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{positions?.length || 0}</p>
                    </div>
                    <div className={`${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'} rounded-xl p-3 text-center`}>
                      <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Vel. máxima</p>
                      <p className={`text-[14px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{maxSpeed} km/h</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className={darkMode ? 'border-b border-[#33343c]' : 'border-b border-gray-100'}>
                          <th className={`text-left px-3 py-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hora</th>
                          <th className={`text-left px-3 py-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lat</th>
                          <th className={`text-left px-3 py-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lng</th>
                          <th className={`text-left px-3 py-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vel</th>
                          <th className={`text-left px-3 py-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} hidden sm:table-cell`}>Enc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(positions || []).slice().reverse().slice(0, 50).map((p) => (
                          <tr key={p.id} className={darkMode ? 'border-b border-[#33343c]/50' : 'border-b border-gray-50'}>
                            <td className={`px-3 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-xs`}>{formatDateTime(p.timestamp)}</td>
                            <td className={`px-3 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-mono text-xs`}>{p.latitude.toFixed(5)}</td>
                            <td className={`px-3 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-mono text-xs`}>{p.longitude.toFixed(5)}</td>
                            <td className={`px-3 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-xs`}>{p.speed} km/h</td>
                            <td className="px-3 py-2 hidden sm:table-cell">
                              {p.ignition ? <Power className="w-3 h-3 text-green-500" /> : <PowerOff className={`w-3 h-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className={`text-center py-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <MapPin className="w-10 h-10 mx-auto mb-2" />
                  <p>No hay posiciones en el rango seleccionado</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bitacora' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
                <DatePicker value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
              </div>

              {paginatedEvents.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
                  <p>No hay eventos en el rango seleccionado</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {paginatedEvents.map((ev: any) => (
                      <div key={ev.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${darkMode ? 'bg-[#232329]' : 'bg-[#f5f5f7]'}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${eventBg(ev.type)}`}>
                          {eventIcon(ev.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{eventLabel(ev.type)}</p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDateTime(ev.timestamp)}</p>
                          {ev.details && (
                            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>{ev.details}</p>
                          )}
                        </div>
                        {ev.speed != null && <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{Math.round(ev.speed)} km/h</span>}
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
          )}
        </div>
      </div>

      {gpsSheetOpen && unit && (
        <LinkGpsSheet
          unitId={unit.id}
          unitType={unit.unitType}
          unitName={unit.name}
          darkMode={darkMode}
          onClose={() => setGpsSheetOpen(false)}
          onLinked={() => {
            setGpsSheetOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function LinkGpsSheet({ unitId, unitType, unitName, darkMode, onClose, onLinked }: {
  unitId: string;
  unitType: 'vehicle' | 'machine';
  unitName: string;
  darkMode: boolean;
  onClose: () => void;
  onLinked: () => void;
}) {
  const { addToast } = useToast();
  const [devices, setDevices] = useState<GpsDevice[] | null>(null);
  const [selected, setSelected] = useState<GpsDevice | null>(null);
  const [search, setSearch] = useState('');
  const [imei, setImei] = useState('');
  const [imeiMsg, setImeiMsg] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    api.gps.listDevices({ available: 'true' })
      .then((r) => setDevices(r.data || r))
      .catch(() => setDevices([]));
  }, []);

  const filtered = useMemo(() => {
    if (!devices) return [];
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      d.imei.toLowerCase().includes(q) || d.model.toLowerCase().includes(q)
    );
  }, [devices, search]);

  const handleImeiLookup = async () => {
    const v = imei.trim();
    if (!v) return;
    setImeiMsg('');
    try {
      const r: any = await api.gps.listDevices({ imei: v });
      const list: GpsDevice[] = r.data || r;
      const found = list[0];
      if (!found) {
        setImeiMsg('No existe un dispositivo con ese IMEI');
      } else if (found.vehicleId || found.machineId) {
        setImeiMsg(`Ese GPS ya está en ${found.linkedUnit?.label || 'otra unidad'}`);
      } else {
        setSelected(found);
        setImeiMsg('');
      }
    } catch {
      setImeiMsg('Error al buscar el IMEI');
    }
  };

  const handleLink = async () => {
    if (!selected) return;
    setLinking(true);
    try {
      await api.gps.linkDevice(selected.id, unitType === 'vehicle' ? { vehicleId: unitId } : { machineId: unitId });
      onLinked();
    } catch (e: any) {
      addToast('error', e.message || 'Error al vincular');
    }
    setLinking(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`fixed z-[210] inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:w-[420px] sm:h-fit rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl max-h-[85dvh]
        ${darkMode ? 'bg-[#1b1b1f] border border-[#3c3d46]' : 'bg-white border border-gray-200'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3.5 border-b ${darkMode ? 'border-[#33343c]' : 'border-gray-100'}`}>
          <div>
            <h2 className={`text-[14px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Vincular GPS</h2>
            <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>a {unitName}</p>
          </div>
          <button onClick={onClose} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors
            ${darkMode ? 'hover:bg-[#33343c] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por IMEI o modelo..."
              className={`w-full pl-10 pr-9 h-[38px] rounded-xl text-[13px] outline-none
                ${darkMode ? 'bg-[#232329] text-white placeholder-gray-600' : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400'}`}
            />
            {search && (
              <button onClick={() => setSearch('')} className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Device list */}
          {devices === null ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={`w-6 h-6 animate-spin ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
          ) : filtered.length === 0 ? (
            <div className={`text-center py-8 text-[13px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Satellite className="w-8 h-8 mx-auto mb-2 opacity-30" />
              {search ? 'Sin resultados para tu búsqueda' : 'No hay dispositivos disponibles'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((d) => {
                const isSel = selected?.id === d.id;
                return (
                  <button key={d.id} onClick={() => setSelected(isSel ? null : d)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all
                      ${isSel
                        ? 'border-[#032347] bg-[#032347]/5'
                        : darkMode ? 'border-[#33343c] hover:border-[#3c3d46]' : 'border-gray-100 hover:border-gray-300'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      ${isSel ? 'bg-[#032347] text-white' : darkMode ? 'bg-[#232329] text-gray-400' : 'bg-[#f5f5f7] text-gray-500'}`}>
                      <Satellite className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium font-mono truncate ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>{d.imei}</p>
                      <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {d.model}{d.simNumber ? ` · SIM ···${d.simNumber.slice(-4)}` : ''}
                      </p>
                    </div>
                    {isSel && <Check className="w-4 h-4 text-[#032347] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Manual IMEI */}
          <div>
            <p className={`text-[11px] font-medium mb-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>¿Tienes el IMEI a la mano?</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={imei}
                onChange={(e) => { setImei(e.target.value); setImeiMsg(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleImeiLookup()}
                placeholder="Escribe el IMEI completo"
                inputMode="numeric"
                className={`flex-1 h-[38px] px-3.5 rounded-xl text-[12px] font-mono outline-none
                  ${darkMode ? 'bg-[#232329] text-white placeholder-gray-600' : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400'}`}
              />
              <button onClick={handleImeiLookup}
                className={`h-[38px] px-4 rounded-xl text-[12px] font-medium transition-colors
                  ${darkMode ? 'bg-[#232329] text-gray-200 hover:bg-[#33343c]' : 'bg-[#f0f0f0] text-gray-600 hover:bg-gray-200'}`}>
                Buscar
              </button>
            </div>
            {imeiMsg && <p className="mt-1.5 text-[11px] text-red-500">{imeiMsg}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t ${darkMode ? 'border-[#33343c]' : 'border-gray-100'}`}
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleLink}
            disabled={!selected || linking}
            className={`w-full h-[46px] flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98]
              ${darkMode ? 'bg-white text-[#032347] hover:bg-gray-100' : 'bg-[#032347] text-white hover:bg-[#02335a]'}
              disabled:opacity-40 disabled:active:scale-100`}
          >
            {linking ? <Loader2 className="w-4 h-4 animate-spin" />
              : selected ? <>Vincular con {unitName}</> : 'Selecciona un dispositivo'}
          </button>
        </div>
      </div>
    </>
  );
}

function KPISmall({ icon: Icon, label, value, color, darkMode }: { icon: any; label: string; value: string; color: string; darkMode: boolean }) {
  return (
    <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-4 transition-colors`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{value}</p>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
        </div>
      </div>
    </div>
  );
}
