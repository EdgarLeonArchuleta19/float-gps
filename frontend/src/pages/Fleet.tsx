import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Car, Wrench, MapPin, Gauge, Navigation, X, Pencil, Trash2, Satellite, Link2, Link2Off } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Vehicle, Machine } from '../types';
import { statusColor, statusLabel, formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';
import Pagination from '../components/Pagination';
import SpinnerSelect from '../components/SpinnerSelect';

type TypeFilter = 'all' | 'vehicles' | 'machines' | 'gps';
type StatusFilter = 'all' | 'MOVING' | 'STOPPED' | 'OFFLINE';

interface Unit {
  id: string;
  name: string;
  plate?: string;
  serialNumber?: string;
  type: string;
  status: string;
  unitType: 'vehicle' | 'machine';
  speed: number;
  ignition: boolean;
  gpsConnected: boolean;
  lastLocation: string | null;
}

export default function Fleet() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { darkMode } = useLayout();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Unit | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const { data: vehiclesData, loading: loadVehicles, refetch: refetchVehicles } = useApi<any>(
    async () => api.vehicles.list({ limit: '200' }),
    []
  );

  const { data: machinesData, loading: loadMachines, refetch: refetchMachines } = useApi<any>(
    async () => api.machines.list({ limit: '200' }),
    []
  );

  const { data: gpsDevices, loading: loadGps, refetch: refetchGps } = useApi<any[]>(
    async () => api.gps.listDevices({}),
    []
  );

  const loading = loadVehicles || loadMachines || loadGps;

  const allUnits: Unit[] = useMemo(() => {
    const vList = (vehiclesData?.data || vehiclesData || []) as Vehicle[];
    const mList = (machinesData?.data || machinesData || []) as Machine[];
    return [
      ...vList.map((v) => ({
        id: v.id, name: v.name, plate: v.plate, serialNumber: undefined, type: v.type,
        status: v.status, unitType: 'vehicle' as const, speed: v.currentPosition?.speed ?? 0,
        ignition: v.currentPosition?.ignition ?? false, gpsConnected: !!v.gpsDevice,
        lastLocation: v.currentPosition ? formatDateTime(v.currentPosition.timestamp) : null,
      })),
      ...mList.map((m) => ({
        id: m.id, name: m.name, plate: undefined, serialNumber: m.serialNumber, type: m.type,
        status: m.status, unitType: 'machine' as const, speed: m.currentPosition?.speed ?? 0,
        ignition: m.currentPosition?.ignition ?? false, gpsConnected: !!m.gpsDevice,
        lastLocation: m.currentPosition ? formatDateTime(m.currentPosition.timestamp) : null,
      })),
    ];
  }, [vehiclesData, machinesData]);

  const filtered = useMemo(() => {
    let result = allUnits;
    if (typeFilter === 'vehicles') result = result.filter((u) => u.unitType === 'vehicle');
    if (typeFilter === 'machines') result = result.filter((u) => u.unitType === 'machine');
    if (statusFilter !== 'all') result = result.filter((u) => u.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) =>
        u.name.toLowerCase().includes(q) ||
        (u.plate && u.plate.toLowerCase().includes(q)) ||
        (u.serialNumber && u.serialNumber.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allUnits, typeFilter, statusFilter, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleDelete = async (unit: Unit) => {
    try {
      if (unit.unitType === 'vehicle') {
        await api.vehicles.delete(unit.id);
        refetchVehicles();
      }
      addToast('success', `${unit.name} eliminado`);
      setConfirmDelete(null);
      setMenuOpen(null);
    } catch {
      addToast('error', 'Error al eliminar');
    }
  };

  const handleUnlinkGps = async (imei: string, linkedName: string) => {
    try {
      const device = gpsDevices?.find((d) => d.imei === imei);
      if (!device) return;
      await api.gps.unlinkDevice(device.id);
      await refetchGps();
      addToast('success', `GPS ${imei} desvinculado de ${linkedName}`);
    } catch {
      addToast('error', 'No se pudo desvincular el GPS');
    }
  };

  const filteredGps = useMemo(() => {
    if (!gpsDevices) return [];
    if (!search) return gpsDevices;
    const q = search.toLowerCase();
    return gpsDevices.filter((d) =>
      (d.imei && d.imei.toLowerCase().includes(q)) ||
      (d.model && d.model.toLowerCase().includes(q)) ||
      (d.linkedUnit && d.linkedUnit.name.toLowerCase().includes(q))
    );
  }, [gpsDevices, search]);

  const typeTabs: { key: TypeFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'vehicles', label: 'Vehículos' },
    { key: 'machines', label: 'Maquinaria' },
    { key: 'gps', label: 'GPS' },
  ];

  const statusPills: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'MOVING', label: 'En movimiento' },
    { key: 'STOPPED', label: 'Detenidos' },
    { key: 'OFFLINE', label: 'Apagados' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Flota</h1>
        <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {typeFilter === 'gps' ? `${filteredGps.length} dispositivos GPS` : `${filtered.length} unidades`}
        </p>
      </div>

      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        <input
          type="text"
          placeholder="Buscar por nombre, placa, serial..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className={`w-full pl-10 pr-10 py-2.5 text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#032347] focus:border-transparent ${darkMode ? 'bg-[#1b1b1f] text-[#f5f5f7] placeholder-gray-500' : 'bg-white text-[#1d1d1f] placeholder-gray-400'}`}
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(1); }} className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SpinnerSelect
          options={typeTabs}
          value={typeFilter}
          onChange={(k) => { setTypeFilter(k as TypeFilter); setPage(1); }}
        />

        <div className="h-5 w-px bg-gray-200 dark:bg-[#33343c]" />

        <SpinnerSelect
          prefix="Estado:"
          options={statusPills}
          value={statusFilter}
          onChange={(k) => { setStatusFilter(k as StatusFilter); setPage(1); }}
        />
      </div>

      {typeFilter === 'gps' ? (
        filteredGps.length === 0 ? (
          <div className={`text-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <Satellite className="w-10 h-10 mx-auto mb-2" />
            <p>{search ? 'No se encontraron dispositivos' : 'No hay dispositivos GPS registrados'}</p>
            <p className="text-xs mt-1">Los GPS se registran al dar de alta un vehículo o maquinaria</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGps.map((d) => (
              <div key={d.id} className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Satellite className={`w-4 h-4 ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'} flex-shrink-0`} />
                    <div className="min-w-0">
                      <p className={`text-[13px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'} truncate tabular-nums`}>{d.imei}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{d.model || 'Dispositivo GPS'}</p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    d.linkedUnit ? 'bg-[#f87203]/15 text-[#f87203]' : darkMode ? 'bg-[#232329] text-gray-300' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {d.isActive ? (d.linkedUnit ? 'Vinculado' : 'Disponible') : 'Inactivo'}
                  </span>
                </div>
                {d.linkedUnit ? (
                  <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Link2 className="w-3 h-3" />
                    <span className="flex-1">Vinculado a: {d.linkedUnit.name} ({d.linkedUnit.label})</span>
                    <button
                      onClick={() => handleUnlinkGps(d.imei, d.linkedUnit.name)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        darkMode ? 'text-gray-400 hover:bg-[#33343c]' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Link2Off className="w-3 h-3" /> Desvincular
                    </button>
                  </div>
                ) : (
                  <p className={`text-xs flex items-center gap-1.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Link2Off className="w-3 h-3" /> Sin unidad asignada
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032347]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <Car className="w-10 h-10 mx-auto mb-2" />
          <p>No se encontraron unidades</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((unit) => (
              <div
                key={`${unit.unitType}-${unit.id}`}
                className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-4 transition-all`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                    onClick={() => navigate(`/units/${unit.id}`)}
                  >
                    {unit.unitType === 'vehicle' ? (
                      <Car className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0`} />
                    ) : (
                      <Wrench className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0`} />
                    )}
                    <div className="min-w-0">
                      <p className={`text-[13px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'} truncate`}>{unit.name}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{unit.plate || unit.serialNumber || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-[#232329] text-gray-300' : statusColor(unit.status)}`}>
                      {statusLabel(unit.status)}
                    </span>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === unit.id ? null : unit.id); }}
                        className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#33343c] text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </button>
                      {menuOpen === unit.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                          <div className={`absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl z-50 py-1 overflow-hidden
                            ${darkMode ? 'bg-[#232329] border border-[#3c3d46]' : 'bg-white border border-gray-100'}`}>
                            {unit.unitType === 'vehicle' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(null); navigate(`/fleet/edit/${unit.id}`); }}
                                className={`w-full text-left px-3 py-2.5 text-[13px] flex items-center gap-2 transition-colors
                                  ${darkMode ? 'text-gray-400 hover:bg-[#33343c]' : 'text-gray-600 hover:bg-gray-50'}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Editar
                              </button>
                            )}
                            {unit.unitType === 'vehicle' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(null); setConfirmDelete(unit); }}
                                className="w-full text-left px-3 py-2.5 text-[13px] flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Eliminar
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-3 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} cursor-pointer`}
                  onClick={() => navigate(`/units/${unit.id}`)}
                >
                  <span className="inline-flex items-center gap-1 capitalize px-1.5 py-0.5 rounded-md">
                    {unit.unitType === 'vehicle' ? 'Vehículo' : 'Maquinaria'} · {unit.type}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {unit.speed} km/h
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {unit.gpsConnected ? (
                      <Navigation className="w-3 h-3 text-green-500" />
                    ) : (
                      <Navigation className={`w-3 h-3 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                    )}
                    GPS
                  </span>
                </div>

                {unit.lastLocation && (
                  <div
                    className={`mt-2 flex items-center gap-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} cursor-pointer`}
                    onClick={() => navigate(`/units/${unit.id}`)}
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{unit.lastLocation}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
            <Pagination
            page={page}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={setPage}
          />
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className={`relative w-full max-w-sm p-6 rounded-2xl z-10 ${darkMode ? 'bg-[#232329]' : 'bg-white'}`}>
            <h3 className={`text-[15px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Eliminar {confirmDelete.name}</h3>
            <p className={`text-[13px] mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Esta acción no se puede deshacer. Se eliminará permanentemente.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmDelete(null)}
                className={`flex-1 h-[42px] rounded-xl text-[13px] font-medium transition-colors
                  ${darkMode ? 'bg-[#33343c] text-gray-300 hover:bg-[#3c3d46]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 h-[42px] rounded-xl text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={() => navigate('/fleet/new')}
          className="w-14 h-14 rounded-full bg-[#032347] text-white shadow-sm hover:bg-[#02335a] transition-colors flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
