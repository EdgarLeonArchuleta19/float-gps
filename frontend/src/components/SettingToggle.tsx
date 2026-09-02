import React from 'react';
import { useLayout } from '../context/LayoutContext';

export default function SettingToggle({ icon, label, description, checked, onChange, last }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  const { darkMode } = useLayout();

  return (
    <div className={`flex items-center justify-between py-3 ${!last ? (darkMode ? 'border-b border-[#222]/50' : 'border-b border-gray-100') : ''}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{icon}</div>
        <div className="min-w-0">
          <p className={`text-[13px] font-medium ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{label}</p>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all transition-colors ${checked ? 'bg-[#032347]' : darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
      </label>
    </div>
  );
}