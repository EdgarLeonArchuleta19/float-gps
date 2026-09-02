import React, { useState } from 'react';
import { Shield, Globe, Gauge, Car } from 'lucide-react';
import SettingsPageHeader from '../../components/SettingsPageHeader';
import { useLayout } from '../../context/LayoutContext';

const TIMEZONES = [
  'America/Mexico_City',
  'America/New_York',
  'America/Los_Angeles',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Buenos_Aires',
];

export default function Zone() {
  const { darkMode } = useLayout();

  const [timezone, setTimezone] = useState(() => {
    return localStorage.getItem('cfg_tz') || 'America/Mexico_City';
  });
  const [units, setUnits] = useState<'km' | 'mi'>('km');
  const [speedUnit, setSpeedUnit] = useState<'kmh' | 'mph'>('kmh');

  const card = `${darkMode ? 'bg-[#111]' : 'bg-white'} rounded-2xl p-5`;
  const labelClass = `block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`;

  const persist = (v: string) => {
    setTimezone(v);
    localStorage.setItem('cfg_tz', v);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <SettingsPageHeader title="Seguridad y zona" subtitle="Preferencias regionales y de seguridad" />

      <div className={card}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#032347]/40' : 'bg-[#032347]/10'}`}>
            <Globe className={`w-5 h-5 ${darkMode ? 'text-[#032347]' : 'text-[#032347]'}`} />
          </div>
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Zona horaria</h2>
        </div>
        <div>
          <label className={labelClass}>Huso horario del sistema</label>
          <select
            value={timezone}
            onChange={(e) => persist(e.target.value)}
            className={`w-full px-4 py-2.5 text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#032347] appearance-none
              ${darkMode ? 'bg-[#1a1a1a] text-[#f5f5f7]' : 'bg-[#f5f5f7] text-[#1d1d1f]'}`}
          >
            {TIMEZONES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#f87203]/15' : 'bg-[#f87203]/10'}`}>
            <Car className={`w-5 h-5 ${darkMode ? 'text-[#f87203]' : 'text-[#f87203]'}`} />
          </div>
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Unidades</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Distancia</label>
            <div className="flex gap-1 p-1 rounded-xl bg-[#f5f5f7] dark:bg-[#1f1f22]">
              {[
                { key: 'km', label: 'Km' },
                { key: 'mi', label: 'Mi' },
              ].map((o) => (
                <button
                  key={o.key}
                  onClick={() => setUnits(o.key as 'km' | 'mi')}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all
                    ${units === o.key ? 'bg-white text-[#032347] shadow-sm dark:text-[#f87203]' : 'text-gray-500'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Velocidad</label>
            <div className="flex gap-1 p-1 rounded-xl bg-[#f5f5f7] dark:bg-[#1f1f22]">
              {[
                { key: 'kmh', label: 'km/h' },
                { key: 'mph', label: 'mph' },
              ].map((o) => (
                <button
                  key={o.key}
                  onClick={() => setSpeedUnit(o.key as 'kmh' | 'mph')}
                  className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all
                    ${speedUnit === o.key ? 'bg-white text-[#032347] shadow-sm dark:text-[#f87203]' : 'text-gray-500'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#10b981]/15' : 'bg-[#10b981]/10'}`}>
            <Gauge className={`w-5 h-5 ${darkMode ? 'text-[#10b981]' : 'text-[#10b981]'}`} />
          </div>
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Seguridad</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'low', label: 'Baja', desc: 'Solo contraseña' },
            { key: 'high', label: 'Alta', desc: 'Expiración de sesión' },
          ].map((o) => (
            <button
              key={o.key}
              onClick={() => localStorage.setItem('cfg_security', o.key)}
              className={`p-3 rounded-xl border text-left transition-all active:scale-[0.98]
                ${localStorage.getItem('cfg_security') === o.key
                  ? darkMode ? 'border-[#f87203] ring-2 ring-[#f87203]/25' : 'border-[#032347] ring-2 ring-[#032347]/15'
                  : darkMode ? 'border-[#2a2a2d]' : 'border-gray-200'}`}
            >
              <p className={`text-[12px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{o.label}</p>
              <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{o.desc}</p>
            </button>
          ))}
        </div>
        <div className={`mt-4 pt-4 border-t flex items-center gap-2 ${darkMode ? 'border-[#242428]' : 'border-gray-100'}`}>
          <Shield className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Ajuste de seguridad básica por ahora; próximamente autenticación real por sesión.
          </p>
        </div>
      </div>
    </div>
  );
}