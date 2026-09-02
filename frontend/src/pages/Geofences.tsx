import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import LeafletMap from '../components/map/LeafletMap';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { Geofence } from '../types';
import { useToast } from '../context/ToastContext';
import { useLayout } from '../context/LayoutContext';
import Pagination from '../components/Pagination';

export default function Geofences() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { darkMode } = useLayout();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Geofence | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const { data: geofences, loading, refetch } = useApi<Geofence[]>(
    async () => { const r = await api.geofences.list(); return Array.isArray(r) ? r : (r as any).data || []; },
    []
  );

  const list = geofences || [];

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page, pageSize]);

  const handleDelete = async (g: Geofence) => {
    try {
      await api.geofences.delete(g.id);
      addToast('success', `"${g.name}" eliminada`);
      refetch();
      setConfirmDelete(null);
      setMenuOpen(null);
    } catch {
      addToast('error', 'Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#032347]" />
      </div>
    );
  }

  const circles = list
    .filter((g) => g.centerLat && g.centerLng && g.radius)
    .map((g) => ({
      center: [g.centerLat!, g.centerLng!] as [number, number],
      radius: g.radius!,
      color: g.color || '#f87203',
    }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Geocercas</h1>
        <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{list.length} geocercas configuradas</p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ height: '350px' }}>
        {circles.length > 0 ? (
          <LeafletMap dark={darkMode} circles={circles} center={[24.7994, -107.3940]} zoom={12} height="100%" fitBounds />
        ) : (
          <LeafletMap dark={darkMode} center={[24.7994, -107.3940]} zoom={12} height="100%" />
        )}
      </div>

      <div className={`${darkMode ? 'bg-[#111]' : 'bg-white'} rounded-2xl`}>
        {list.length === 0 ? (
          <div className={`text-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <Shield className="w-10 h-10 mx-auto mb-2" />
            <p>No hay geocercas configuradas</p>
          </div>
        ) : (
          <>
            <div className={`${darkMode ? 'divide-y divide-[#222]' : 'divide-y divide-gray-100'}`}>
              {paginated.map((g) => (
                <div key={g.id} className={`flex items-center gap-3 px-4 py-4 transition-colors ${darkMode ? 'hover:bg-[#1a1a1a]' : 'hover:bg-[#f5f5f7]'}`}>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: g.color || '#f87203' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{g.name}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} capitalize`}>{g.type}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[13px] flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-green-500" />
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{g.unitsInside ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{g.unitsOutside ?? 0}</span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === g.id ? null : g.id); }}
                        className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-[#222] text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </button>
                      {menuOpen === g.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                          <div className={`absolute right-0 top-full mt-1 w-36 rounded-xl shadow-xl z-50 py-1 overflow-hidden
                            ${darkMode ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-100'}`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpen(null); navigate(`/geofences/edit/${g.id}`); }}
                              className={`w-full text-left px-3 py-2.5 text-[13px] flex items-center gap-2 transition-colors
                                ${darkMode ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpen(null); setConfirmDelete(g); }}
                              className="w-full text-left px-3 py-2.5 text-[13px] flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4">
              <Pagination
                page={page}
                totalItems={list.length}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className={`relative w-full max-w-sm p-6 rounded-2xl z-10 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            <h3 className={`text-[15px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Eliminar "{confirmDelete.name}"</h3>
            <p className={`text-[13px] mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Esta acción no se puede deshacer. Se eliminará permanentemente.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmDelete(null)}
                className={`flex-1 h-[42px] rounded-xl text-[13px] font-medium transition-colors
                  ${darkMode ? 'bg-[#222] text-gray-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
          onClick={() => navigate('/geofences/new')}
          className="w-14 h-14 rounded-full bg-[#032347] text-white shadow-sm hover:bg-[#02335a] transition-colors flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
