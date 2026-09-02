import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

export default function SettingsPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigate = useNavigate();
  const { darkMode } = useLayout();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate('/config')}
        className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-100'}`}
        aria-label="Volver a ajustes"
      >
        <ChevronLeft className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
      </button>
      <div>
        <h1 className={`text-base font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>{title}</h1>
        {subtitle && <p className={`text-[13px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
      </div>
    </div>
  );
}