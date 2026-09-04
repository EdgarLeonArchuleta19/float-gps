import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut, KeyRound, User as UserIcon, Mail, Shield, Check, Eye, EyeOff, ChevronRight, X, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateName, changePassword } = useAuth();
  const { darkMode } = useLayout();
  const { addToast } = useToast();

  const [nameModal, setNameModal] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [passModal, setPassModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const [logoutModal, setLogoutModal] = useState(false);

  const card = `${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl overflow-hidden`;
  const rowBorder = darkMode ? 'border-[#1e1e20]' : 'border-gray-100';
  const text = darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]';
  const sub = darkMode ? 'text-gray-500' : 'text-gray-500';
  const inputClass = `w-full px-4 py-2.5 text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400
    ${darkMode ? 'bg-[#232329] text-[#f5f5f7] placeholder-gray-600' : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400'}`;
  const labelClass = `block text-xs font-medium ${sub} mb-1.5`;

  const handleSaveName = async () => {
    if (!name.trim()) {
      addToast('error', 'El nombre no puede estar vacío');
      return;
    }
    setSavingName(true);
    await new Promise((r) => setTimeout(r, 300));
    updateName(name.trim());
    setSavingName(false);
    setNameModal(false);
    addToast('success', 'Nombre actualizado');
  };

  const handleSavePassword = async () => {
    if (!currentPass || !newPass || !confirmPass) {
      addToast('error', 'Completa todos los campos');
      return;
    }
    if (newPass.length < 6) {
      addToast('error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPass !== confirmPass) {
      addToast('error', 'Las contraseñas nuevas no coinciden');
      return;
    }
    setSavingPass(true);
    await new Promise((r) => setTimeout(r, 400));
    const ok = await changePassword(currentPass, newPass);
    setSavingPass(false);
    if (!ok) {
      addToast('error', 'La contraseña actual es incorrecta');
      return;
    }
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setPassModal(false);
    addToast('success', 'Contraseña actualizada');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = user?.role === 'admin' ? 'Administrador' : user?.role === 'operator' ? 'Operador' : 'Usuario';

  const actionBtn = `inline-flex items-center justify-center gap-2 px-5 h-[42px] rounded-xl text-[13px] font-medium transition-colors active:scale-[0.99] ${
    darkMode ? 'bg-[#33343c] text-gray-200 hover:bg-[#2a2a2a]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className={`p-2 -ml-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#232329]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-base font-bold ${text}`}>Mi cuenta</h1>
          <p className={`text-[13px] ${sub}`}>Tu perfil y seguridad</p>
        </div>
      </div>

      {/* Identidad */}
      <div className={`${card} p-6`}>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-[#232329]' : 'bg-gray-100'}`}>
            <span className={`text-2xl font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="min-w-0">
            <p className={`text-base font-semibold truncate ${text}`}>{user?.name}</p>
            <p className={`text-[13px] truncate ${sub}`}>{user?.email}</p>
            <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${darkMode ? 'bg-[#232329] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Cuenta */}
      <div className={card}>
        <div className={`px-4 py-3 border-b ${rowBorder}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${sub}`}>Cuenta</p>
        </div>
        <div>
          <button onClick={() => { setName(user?.name || ''); setNameModal(true); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${darkMode ? 'hover:bg-[#161616]' : 'hover:bg-[#f8f8f9]'} border-b ${rowBorder}`}>
            <UserIcon className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${sub}`}>Nombre</p>
              <p className={`text-[13px] font-medium truncate ${text}`}>{user?.name}</p>
            </div>
            <Pencil className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          </button>
          <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${rowBorder}`}>
            <Mail className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${sub}`}>Correo electrónico</p>
              <p className={`text-[13px] truncate ${text}`}>{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Shield className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${sub}`}>Rol</p>
              <p className={`text-[13px] capitalize ${text}`}>{roleLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seguridad */}
      <div className={card}>
        <div className={`px-4 py-3 border-b ${rowBorder}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${sub}`}>Seguridad</p>
        </div>
        <button onClick={() => { setPassModal(true); setCurrentPass(''); setNewPass(''); setConfirmPass(''); }}
          className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${darkMode ? 'hover:bg-[#161616]' : 'hover:bg-[#f8f8f9]'}`}>
          <KeyRound className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[13px] font-medium ${text}`}>Cambiar contraseña</p>
            <p className={`text-xs ${sub}`}>Actualiza tu contraseña de acceso</p>
          </div>
          <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
      </div>

      {/* Sesión */}
      <div className={card}>
        <button onClick={() => setLogoutModal(true)}
          className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-red-500/5">
          <span className={`flex items-center gap-3 text-[13px] font-medium ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </span>
          <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-red-400/60' : 'text-red-300'}`} />
        </button>
      </div>

      {/* Modal: nombre */}
      {nameModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-black/40" onClick={() => setNameModal(false)} />
          <div className={`relative w-full max-w-sm rounded-2xl z-10 p-6 ${darkMode ? 'bg-[#202024]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-[15px] font-semibold ${text}`}>Editar nombre</h3>
              <button onClick={() => setNameModal(false)} className={`p-1.5 rounded-lg ${darkMode ? 'text-gray-400 hover:bg-[#33343c]' : 'text-gray-500 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Nombre completo</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={inputClass} />
              </div>
              <button onClick={handleSaveName} disabled={savingName}
                className={`w-full h-[42px] inline-flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-60 ${actionBtn}`}>
                {savingName ? <span className={`w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin ${darkMode ? 'border-t-gray-200' : 'border-t-gray-600'}`} />
                  : <Check className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: contraseña */}
      {passModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-black/40" onClick={() => setPassModal(false)} />
          <div className={`relative w-full max-w-sm rounded-2xl z-10 p-6 ${darkMode ? 'bg-[#202024]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-[15px] font-semibold ${text}`}>Cambiar contraseña</h3>
              <button onClick={() => setPassModal(false)} className={`p-1.5 rounded-lg ${darkMode ? 'text-gray-400 hover:bg-[#33343c]' : 'text-gray-500 hover:bg-gray-100'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Contraseña actual</label>
                <div className="relative">
                  <input type={showCurrent ? 'text' : 'password'} value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)} placeholder="••••••••"
                    autoComplete="current-password" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Nueva contraseña</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} value={newPass}
                    onChange={(e) => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirmar nueva contraseña</label>
                <input type={showNew ? 'text' : 'password'} value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)} placeholder="Repite la nueva"
                  autoComplete="new-password" className={inputClass} />
              </div>
              <button onClick={handleSavePassword} disabled={savingPass}
                className={`w-full h-[42px] inline-flex items-center justify-center gap-2 rounded-xl text-[13px] font-medium transition-colors disabled:opacity-60 ${actionBtn}`}>
                {savingPass ? <span className={`w-4 h-4 border-2 border-gray-400 rounded-full animate-spin ${darkMode ? 'border-t-gray-200' : 'border-t-gray-600'}`} />
                  : <KeyRound className="w-4 h-4" />}
                Actualizar contraseña
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: cerrar sesión */}
      {logoutModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-black/40" onClick={() => setLogoutModal(false)} />
          <div className={`relative w-full max-w-sm rounded-2xl z-10 p-6 ${darkMode ? 'bg-[#202024]' : 'bg-white'}`}>
            <h3 className={`text-[15px] font-semibold ${text}`}>Cerrar sesión</h3>
            <p className={`text-[13px] mt-2 ${sub}`}>¿Seguro que quieres salir de tu cuenta en este dispositivo?</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setLogoutModal(false)}
                className={`flex-1 h-[42px] rounded-xl text-[13px] font-medium transition-colors ${darkMode ? 'bg-[#33343c] text-gray-300 hover:bg-[#3c3d46]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Cancelar
              </button>
              <button onClick={handleLogout}
                className="flex-1 h-[42px] rounded-xl text-[13px] font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}