import React, { useState } from 'react';
import { Users as UsersIcon, Plus, X, Loader2, Trash2, Shield, Eye, EyeOff, KeyRound, Car, Wrench, Check } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { useLayout } from '../../context/LayoutContext';
import { useToast } from '../../context/ToastContext';
import SettingsPageHeader from '../../components/SettingsPageHeader';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  viewer: 'Solo lectura',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-[#032347]/10 text-[#032347]',
  operator: 'bg-[#f87203]/10 text-[#f87203]',
  viewer: 'bg-gray-100 text-gray-500',
};

function CheckRow({ label, sub, checked, onToggle }: {
  label: string;
  sub?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const { darkMode } = useLayout();
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-colors
        ${darkMode ? 'hover:bg-[#1a1a1a]' : 'hover:bg-[#f5f5f7]'}`}
    >
      <span className="min-w-0">
        <span className={`block text-[13px] font-medium truncate ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{label}</span>
        {sub && <span className={`block text-[11px] truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</span>}
      </span>
      <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors
        ${checked ? 'bg-[#032347]' : darkMode ? 'bg-[#222] border border-[#333]' : 'bg-white border border-gray-200'}`}>
        {checked && <Check className="w-3.5 h-3.5 text-white" />}
      </span>
    </button>
  );
}

export default function Users() {
  const { darkMode } = useLayout();
  const { addToast } = useToast();
  const { data: users, loading, refetch } = useApi<any[]>(() => api.users.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [showPwd, setShowPwd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const [accessUser, setAccessUser] = useState<any>(null);
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [machineIds, setMachineIds] = useState<string[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);

  const { data: vehiclesRes, loading: loadingVehicles } = useApi<any>(
    () => (accessUser ? api.vehicles.list({ limit: '500' }) : Promise.resolve(null)),
    [accessUser]
  );
  const { data: machinesRes, loading: loadingMachines } = useApi<any>(
    () => (accessUser ? api.machines.list({ limit: '500' }) : Promise.resolve(null)),
    [accessUser]
  );

  const allVehicles = (vehiclesRes?.data || vehiclesRes || []) as any[];
  const allMachines = (machinesRes?.data || machinesRes || []) as any[];

  const inputClass = `w-full px-4 py-2.5 text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#032347]
    ${darkMode ? 'bg-[#1a1a1a] text-[#f5f5f7] placeholder-gray-600' : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400'}`;
  const labelClass = `block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;

  const openModal = () => {
    setForm({ name: '', email: '', password: '', role: 'viewer' });
    setShowPwd(false);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) return;
    setSaving(true);
    try {
      await api.users.create({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      addToast('success', 'Usuario creado');
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      addToast('error', err?.message || 'No se pudo crear el usuario');
    }
    setSaving(false);
  };

  const handleDelete = async (u: any) => {
    try {
      await api.users.delete(u.id);
      addToast('success', `Usuario ${u.name} eliminado`);
      setConfirmDelete(null);
      refetch();
    } catch {
      addToast('error', 'No se pudo eliminar el usuario');
      setConfirmDelete(null);
    }
  };

  const openAccess = (u: any) => {
    const assigned = (u.units || []) as { vehicleId: string | null; machineId: string | null }[];
    setVehicleIds(assigned.map((x) => x.vehicleId).filter(Boolean) as string[]);
    setMachineIds(assigned.map((x) => x.machineId).filter(Boolean) as string[]);
    setAccessUser(u);
  };

  const toggleVehicle = (id: string) =>
    setVehicleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleMachine = (id: string) =>
    setMachineIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const saveAccess = async () => {
    if (!accessUser) return;
    setSavingAccess(true);
    try {
      await api.users.updateUnits(accessUser.id, { vehicleIds, machineIds });
      addToast('success', 'Unidades actualizadas');
      setAccessUser(null);
      refetch();
    } catch (err: any) {
      addToast('error', err?.message || 'No se pudo guardar');
    }
    setSavingAccess(false);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <SettingsPageHeader title="Usuarios" subtitle="Gestiona el acceso al sistema" />

      <div className={`${darkMode ? 'bg-[#111]' : 'bg-white'} rounded-2xl p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#10b981]/15' : 'bg-[#10b981]/10'}`}>
              <UsersIcon className={`w-5 h-5 ${darkMode ? 'text-[#10b981]' : 'text-[#10b981]'}`} />
            </div>
            <div>
              <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Cuentas de usuario</h2>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{(users || []).length} usuarios registrados</p>
            </div>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-white bg-[#032347] hover:bg-[#02335a] transition-colors active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-[#032347]" />
          </div>
        ) : (users || []).length === 0 ? (
          <div className={`text-center py-10 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <UsersIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-[13px]">No hay usuarios aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users!.map((u) => (
              <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f8f8f9]'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#242428]' : 'bg-white'}`}>
                  <span className={`text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-[#032347]'}`}>
                    {(u.name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold truncate ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{u.name}</p>
                  <p className={`text-xs truncate ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{u.email}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${ROLE_COLORS[u.role]} ${darkMode && u.role === 'viewer' ? 'bg-[#1f1f22] text-gray-400' : ''}`}>
                  {ROLE_LABELS[u.role] || u.role}
                </span>
                <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${darkMode ? 'bg-[#222] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  {(u.units || []).length} unidades
                </span>
                <button
                  onClick={() => openAccess(u)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex-shrink-0 ${
                    darkMode ? 'text-gray-300 hover:bg-[#222]' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Asignar unidades visibles"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Acceso
                </button>
                <button
                  onClick={() => setConfirmDelete(u)}
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${darkMode ? 'text-gray-600 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-500/10'}`}
                  title="Eliminar usuario"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {accessUser && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center px-6 py-8">
          <div className="fixed inset-0 bg-black/50" onClick={() => setAccessUser(null)} />
          <div className={`relative w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl z-10 overflow-hidden ${darkMode ? 'bg-[#151517]' : 'bg-white'}`}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div>
                <h3 className={`text-[15px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Unidades de {accessUser.name}</h3>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Selecciona qué vehículos y maquinaria puede ver</p>
              </div>
              <button onClick={() => setAccessUser(null)} className={`p-1.5 rounded-lg ${darkMode ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-500 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vehículos</h4>
                  <button
                    type="button"
                    onClick={() => setVehicleIds(allVehicles.map((v) => v.id))}
                    className={`text-[11px] font-medium ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`}
                  >
                    Seleccionar todos
                  </button>
                </div>
                {loadingVehicles ? (
                  <div className="flex items-center justify-center h-16"><Loader2 className="w-5 h-5 animate-spin text-[#032347]" /></div>
                ) : allVehicles.length === 0 ? (
                  <p className={`text-xs py-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No hay vehículos registrados</p>
                ) : (
                  <div className={`max-h-52 overflow-y-auto rounded-xl p-1 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f8f8f9]'}`}>
                    {allVehicles.map((v) => (
                      <CheckRow
                        key={v.id}
                        label={v.name}
                        sub={`${v.plate || 'Sin placa'} · ${v.type}`}
                        checked={vehicleIds.includes(v.id)}
                        onToggle={() => toggleVehicle(v.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Maquinaria</h4>
                  <button
                    type="button"
                    onClick={() => setMachineIds(allMachines.map((m) => m.id))}
                    className={`text-[11px] font-medium ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`}
                  >
                    Seleccionar todos
                  </button>
                </div>
                {loadingMachines ? (
                  <div className="flex items-center justify-center h-16"><Loader2 className="w-5 h-5 animate-spin text-[#032347]" /></div>
                ) : allMachines.length === 0 ? (
                  <p className={`text-xs py-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No hay maquinaria registrada</p>
                ) : (
                  <div className={`max-h-52 overflow-y-auto rounded-xl p-1 ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f8f8f9]'}`}>
                    {allMachines.map((m) => (
                      <CheckRow
                        key={m.id}
                        label={m.name}
                        sub={m.serialNumber ? `${m.serialNumber} · ${m.type}` : m.type}
                        checked={machineIds.includes(m.id)}
                        onToggle={() => toggleMachine(m.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t ${darkMode ? 'border-[#242428]' : 'border-gray-100'}">
              <button
                onClick={() => setAccessUser(null)}
                className={`flex-1 h-[42px] rounded-xl text-[13px] font-medium transition-colors ${darkMode ? 'bg-[#222] text-gray-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Cancelar
              </button>
              <button
                onClick={saveAccess}
                disabled={savingAccess}
                className="flex-1 h-[42px] rounded-xl text-[13px] font-semibold text-white bg-[#032347] hover:bg-[#02335a] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {savingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4" /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className={`relative w-full max-w-md rounded-2xl z-10 p-6 ${darkMode ? 'bg-[#151517]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-[15px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Nuevo usuario</h3>
              <button onClick={() => setModalOpen(false)} className={`p-1.5 rounded-lg ${darkMode ? 'text-gray-400 hover:bg-[#222]' : 'text-gray-500 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={labelClass}>Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Juan Pérez" className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ejemplo@correo.com" className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Contraseña *</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className={`${inputClass} pr-10`} required />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Rol</label>
                <div className="flex gap-2">
                  {[
                    { key: 'admin', label: 'Admin' },
                    { key: 'operator', label: 'Operador' },
                    { key: 'viewer', label: 'Lectura' },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.key })}
                      className={`flex-1 py-2 rounded-xl text-[12px] font-medium transition-colors
                        ${form.role === r.key
                          ? 'bg-[#032347] text-white'
                          : darkMode ? 'bg-[#1f1f22] text-gray-400' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`flex items-center gap-2 text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <Shield className="w-3.5 h-3.5" />
                El rol define los permisos de acceso a la plataforma.
              </div>
              <button
                type="submit"
                disabled={saving || !form.name.trim() || !form.email.trim() || !form.password}
                className={`w-full h-[44px] flex items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98]
                  ${darkMode ? 'bg-white text-[#032347] hover:bg-gray-100' : 'bg-[#032347] text-white hover:bg-[#02335a]'}
                  disabled:opacity-40`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Crear usuario</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className={`relative w-full max-w-sm p-6 rounded-2xl z-10 ${darkMode ? 'bg-[#151517]' : 'bg-white'}`}>
            <h3 className={`text-[15px] font-semibold ${darkMode ? 'text-white' : 'text-[#1d1d1f]'}`}>Eliminar usuario</h3>
            <p className={`text-[13px] mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ¿Seguro que quieres eliminar a <span className="font-semibold">{confirmDelete.name}</span>? No se podrá acceder con esta cuenta.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)}
                className={`flex-1 h-[42px] rounded-xl text-[13px] font-medium transition-colors ${darkMode ? 'bg-[#222] text-gray-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 h-[42px] rounded-xl text-[13px] font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}