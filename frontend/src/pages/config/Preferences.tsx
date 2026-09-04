import React, { useState } from 'react';
import { SlidersHorizontal, Globe, List, Map as MapIcon } from 'lucide-react';
import SettingsPageHeader from '../../components/SettingsPageHeader';
import SettingToggle from '../../components/SettingToggle';
import { useLayout } from '../../context/LayoutContext';

export default function Preferences() {
  const { darkMode } = useLayout();

  const [compactCards, setCompactCards] = useState(() => {
    return localStorage.getItem('cfg_compact') === 'true';
  });
  const [defaultView, setDefaultView] = useState(() => {
    return localStorage.getItem('cfg_view') || 'map';
  });
  const [reminders, setReminders] = useState(() => {
    return localStorage.getItem('cfg_reminders') !== 'false';
  });

  const persistView = (v: string) => {
    setDefaultView(v);
    localStorage.setItem('cfg_view', v);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <SettingsPageHeader title="Preferencias" subtitle="Preferencias generales de la aplicación" />

      <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#8b5cf6]/15' : 'bg-[#8b5cf6]/10'}`}>
            <SlidersHorizontal className={`w-5 h-5 ${darkMode ? 'text-[#8b5cf6]' : 'text-[#8b5cf6]'}`} />
          </div>
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Generales</h2>
        </div>

        <div className="space-y-1">
          <SettingToggle
            icon={<List className="w-4 h-4" />}
            label="Tarjetas compactas"
            description="Mostrar listas más densas en la flota"
            checked={compactCards}
            onChange={() => {
              setCompactCards(!compactCards);
              localStorage.setItem('cfg_compact', String(!compactCards));
            }}
          />
          <SettingToggle
            icon={<Globe className="w-4 h-4" />}
            label="Recordatorios de mantenimiento"
            description="Avisar sobre mantenimientos programados"
            checked={reminders}
            onChange={() => {
              setReminders(!reminders);
              localStorage.setItem('cfg_reminders', String(!reminders));
            }}
            last
          />
        </div>
      </div>

      <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <MapIcon className={`w-4 h-4 ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`} />
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Vista por defecto del mapa</h2>
        </div>
        <p className={`text-xs mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Al abrir el mapa, ¿qué quieres ver primero?</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'map', label: 'Mapa en vivo', desc: 'Posiciones en tiempo real', icon: MapIcon },
            { key: 'list', label: 'Lista de unidades', desc: 'Vehículos y maquinaria', icon: List },
          ].map((opt) => {
            const active = defaultView === opt.key;
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => persistView(opt.key)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all active:scale-[0.98] text-left
                  ${active
                    ? darkMode ? 'border-[#f87203] ring-2 ring-[#f87203]/25' : 'border-[#032347] ring-2 ring-[#032347]/15'
                    : darkMode ? 'border-[#2a2a2d]' : 'border-gray-200'}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${active ? (darkMode ? 'text-[#f87203]' : 'text-[#032347]') : (darkMode ? 'text-gray-500' : 'text-gray-400')}`} />
                <div className="min-w-0">
                  <p className={`text-[12px] font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{opt.label}</p>
                  <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}