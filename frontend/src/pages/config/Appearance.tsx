import React from 'react';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import SettingsPageHeader from '../../components/SettingsPageHeader';

export default function Appearance() {
  const { darkMode, setDarkMode } = useLayout();

  const themes = [
    { key: 'light' as const, label: 'Claro', icon: Sun, bg: 'bg-[#f5f5f7]', card: 'bg-white', desc: 'Interfaz luminosa' },
    { key: 'dark' as const, label: 'Oscuro', icon: Moon, bg: 'bg-[#131316]', card: 'bg-[#202024]', desc: 'Interfaz oscura' },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      <SettingsPageHeader title="Apariencia" subtitle="Personaliza el aspecto visual" />

      <div className={`${darkMode ? 'bg-[#1b1b1f]' : 'bg-white'} rounded-2xl p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <MonitorSmartphone className={`w-4 h-4 ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`} />
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Tema</h2>
        </div>
        <p className={`text-xs mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Elige cómo se ve la aplicación.</p>

        <div className="grid grid-cols-2 gap-3">
          {themes.map((t) => {
            const active = (t.key === 'dark') === darkMode;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setDarkMode(t.key === 'dark')}
                className={`rounded-2xl overflow-hidden border transition-all active:scale-[0.98]
                  ${active
                    ? darkMode ? 'border-[#f87203] ring-2 ring-[#f87203]/30' : 'border-[#032347] ring-2 ring-[#032347]/20'
                    : darkMode ? 'border-[#2a2a2d]' : 'border-gray-200'}`}
              >
                {/* Mini vista previa */}
                <div className={`${t.bg} px-3 pt-3 pb-2`}>
                  <div className={`${t.card} h-16 rounded-lg border ${darkMode ? 'border-[#34363f]' : 'border-gray-100'} p-2 space-y-1`}>
                    <div className={`h-1.5 w-1/2 rounded-full ${t.key === 'dark' ? 'bg-[#f87203]/70' : 'bg-[#032347]/70'}`} />
                    <div className={`h-1 w-3/4 rounded-full ${t.key === 'dark' ? 'bg-white/20' : 'bg-gray-200'}`} />
                    <div className={`h-1 w-2/3 rounded-full ${t.key === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`} />
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-2.5 ${t.key === 'dark' ? 'bg-[#202024]' : 'bg-white'}`}>
                  <Icon className={`w-4 h-4 ${t.key === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-[13px] font-medium flex-1 text-left ${t.key === 'dark' ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
                    {t.label}
                  </span>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center ${active ? 'bg-[#032347]' : darkMode ? 'bg-[#2a2a2d]' : 'bg-gray-100'}`}>
                    {active && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6.5L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-[#34363f]' : 'border-gray-100'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {darkMode
              ? 'Modo oscuro activado. Ideal para uso nocturno y menor fatiga visual.'
              : 'Modo claro activado. Interfaz luminosa para uso diurno.'}
          </p>
        </div>
      </div>
    </div>
  );
}