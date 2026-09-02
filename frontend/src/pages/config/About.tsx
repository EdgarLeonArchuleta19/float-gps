import React from 'react';
import { Info, MapPin, Cpu, Database, ShieldCheck } from 'lucide-react';
import SettingsPageHeader from '../../components/SettingsPageHeader';
import { useLayout } from '../../context/LayoutContext';

const APP_VERSION = '1.4.0';

export default function About() {
  const { darkMode } = useLayout();

  const card = `${darkMode ? 'bg-[#111]' : 'bg-white'} rounded-2xl p-5`;

  const Row = ({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) => (
    <div className={`flex items-center gap-3 py-2.5 ${!last ? (darkMode ? 'border-b border-[#222]/50' : 'border-b border-gray-100') : ''}`}>
      <div className={darkMode ? 'text-gray-500' : 'text-gray-400'}>{icon}</div>
      <div className="flex-1">
        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
      </div>
      <p className={`text-[13px] font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <SettingsPageHeader title="Acerca de" subtitle="Información del sistema" />

      <div className={card}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#f87203]/15' : 'bg-[#f87203]/10'}`}>
            <Info className={`w-6 h-6 ${darkMode ? 'text-[#f87203]' : 'text-[#f87203]'}`} />
          </div>
          <div>
            <h2 className={`text-[15px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Float GPS</h2>
            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Sistema de rastreo de flotillas</p>
          </div>
        </div>
        <div className="mt-2">
          <Row label="Versión" value={APP_VERSION} icon={<Info className="w-4 h-4" />} />
          <Row label="Mapas" value="Leaflet + CartoDB" icon={<MapPin className="w-4 h-4" />} />
          <Row label="Base de datos" value="SQLite" icon={<Database className="w-4 h-4" />} />
          <Row
            label="Backend"
            value="Express API"
            icon={<Cpu className="w-4 h-4" />}
            last
          />
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className={`w-5 h-5 ${darkMode ? 'text-[#032347]' : 'text-[#032347]'}`} />
          <h2 className={`text-[15px] font-semibold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>Licencia</h2>
        </div>
        <p className={`text-[13px] leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Float GPS es un software de demostración. Los datos de posición mostrados son simulados para
          fines de evaluación. Uso libre para pruebas internas.
        </p>
      </div>
    </div>
  );
}