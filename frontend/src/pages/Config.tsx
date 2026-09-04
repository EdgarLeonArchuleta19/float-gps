import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palette, Bell, SlidersHorizontal, Users, Info, Shield, ChevronRight,
} from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

interface SettingsCategory {
  path: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export default function Config() {
  const navigate = useNavigate();
  const { darkMode } = useLayout();

  const categories: SettingsCategory[] = [
    {
      path: '/config/appearance',
      label: 'Apariencia',
      description: 'Modo oscuro y personalización visual',
      icon: <Palette className="w-5 h-5" />,
    },
    {
      path: '/config/notifications',
      label: 'Notificaciones',
      description: 'Alertas, avisos y actualizaciones del mapa',
      icon: <Bell className="w-5 h-5" />,
    },
    {
      path: '/config/preferences',
      label: 'Preferencias',
      description: 'Preferencias generales de la aplicación',
      icon: <SlidersHorizontal className="w-5 h-5" />,
    },
    {
      path: '/config/users',
      label: 'Usuarios',
      description: 'Gestiona el acceso al sistema',
      icon: <Users className="w-5 h-5" />,
    },
    {
      path: '/config/zone',
      label: 'Seguridad y zona',
      description: 'Zona horaria y unidades de medida',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      path: '/config/about',
      label: 'Acerca de',
      description: 'Información del sistema y versión',
      icon: <Info className="w-5 h-5" />,
    },
  ];

  const iconColors: Record<string, string> = {
    'Apariencia': darkMode ? 'bg-[#f87203]/15 text-[#f87203]' : 'bg-[#f87203]/10 text-[#f87203]',
    'Notificaciones': darkMode ? 'bg-[#3b82f6]/15 text-[#3b82f6]' : 'bg-[#3b82f6]/10 text-[#3b82f6]',
    'Preferencias': darkMode ? 'bg-[#8b5cf6]/15 text-[#8b5cf6]' : 'bg-[#8b5cf6]/10 text-[#8b5cf6]',
    'Usuarios': darkMode ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#10b981]/10 text-[#10b981]',
    'Seguridad y zona': darkMode ? 'bg-[#032347]/40 text-[#032347]' : 'bg-[#032347]/10 text-[#032347]',
    'Acerca de': darkMode ? 'bg-[#f59e0b]/15 text-[#f59e0b]' : 'bg-[#f59e0b]/10 text-[#f59e0b]',
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Ajustes</h1>
        <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
          Personaliza tu experiencia en Floa GPS
        </p>
      </div>

      <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl overflow-hidden`}>
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.path}
              onClick={() => navigate(cat.path)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors
                ${darkMode ? (i !== categories.length - 1 ? 'border-b border-[#33343c]/50' : '') : (i !== categories.length - 1 ? 'border-b border-gray-100' : '')}
                ${darkMode ? 'hover:bg-[#232329]' : 'hover:bg-[#f8f8f9]'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColors[cat.label]}`}>
                {Icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{cat.label}</p>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} truncate`}>{cat.description}</p>
              </div>
              <ChevronRight className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}