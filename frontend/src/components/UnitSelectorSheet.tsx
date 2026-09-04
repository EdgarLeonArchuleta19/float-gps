import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Check, Car, Wrench, ChevronDown } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

export interface UnitSelectOption {
  id: string;
  name: string;
  gpsDeviceId?: string;
  type: 'vehicle' | 'machine';
}

interface UnitSelectorSheetProps {
  open: boolean;
  units: UnitSelectOption[];
  selectedIds: string[];
  max: number;
  colors: string[];
  onToggle: (unit: UnitSelectOption) => void;
  onClose: () => void;
  onClear: () => void;
}

const inputBg = (dark: boolean) =>
  dark
    ? 'bg-[#232329] text-[#f5f5f7] placeholder-gray-500'
    : 'bg-[#f5f5f7] text-[#1d1d1f] placeholder-gray-400';

export default function UnitSelectorSheet({
  open,
  units,
  selectedIds,
  max,
  colors,
  onToggle,
  onClose,
  onClear,
}: UnitSelectorSheetProps) {
  const { darkMode } = useLayout();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<'all' | 'vehicle' | 'machine'>('all');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setGroup('all');
      setTimeout(() => listRef.current?.scrollTo({ top: 0 }), 50);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const vehicles = useMemo(
    () => units.filter((u) => u.type === 'vehicle'),
    [units]
  );
  const machines = useMemo(
    () => units.filter((u) => u.type === 'machine'),
    [units]
  );

  const filterFn = (u: UnitSelectOption) =>
    u.name.toLowerCase().includes(query.toLowerCase());

  const showVehicles = (group === 'all' || group === 'vehicle') && vehicles.some(filterFn);
  const showMachines = (group === 'all' || group === 'machine') && machines.some(filterFn);
  const anyResult = showVehicles || showMachines;

  const idxOf = (id: string) => selectedIds.indexOf(id);
  const selectedCount = selectedIds.length;
  const atLimit = selectedCount >= max;

  const renderRow = (u: UnitSelectOption) => {
    const idx = idxOf(u.id);
    const active = idx >= 0;
    const color = colors[idx % colors.length];
    return (
      <button
        key={u.id}
        onClick={() => onToggle(u)}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-[13px] transition-colors
          ${active
            ? darkMode ? 'bg-[#232329]' : 'bg-[#f0f0f0]'
            : darkMode ? 'hover:bg-[#232329]' : 'hover:bg-gray-50'}`}
      >
        <span
          className={`w-[18px] h-[18px] rounded-md border flex-shrink-0 flex items-center justify-center transition-all
            ${active ? 'border-transparent' : darkMode ? 'border-gray-600' : 'border-gray-300'}`}
          style={active ? { background: color } : undefined}
        >
          {active && <Check className="w-3 h-3 text-white" strokeWidth={3.5} />}
        </span>
        <span className={`flex-1 truncate ${active ? (darkMode ? 'text-white' : 'text-[#1d1d1f]') : (darkMode ? 'text-gray-300' : 'text-gray-700')}`}>
          {u.name}
        </span>
        {!u.gpsDeviceId && (
          <span className={`text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-[#33343c] text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
            sin GPS
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-[1100] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`absolute inset-x-0 bottom-0 sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-[420px] sm:max-w-[92vw]
          flex flex-col transition-transform duration-300 ease-out shadow-2xl
          ${darkMode ? 'bg-[#16161a] border-[#33343c]' : 'bg-white border-gray-100'}
          sm:border-l
          ${open ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full'}`}
      >
        {/* Handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <span className={`w-10 h-1 rounded-full ${darkMode ? 'bg-[#3c3d46]' : 'bg-gray-300'}`} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
          <div>
            <h2 className={`text-[15px] font-bold ${darkMode ? 'text-[#f5f5f7]' : 'text-[#1d1d1f]'}`}>
              Seleccionar unidades
            </h2>
            <p className={`text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {selectedCount}/{max} seleccionadas
            </p>
          </div>
          <div className="flex items-center gap-1">
            {selectedCount > 0 && (
              <button
                onClick={onClear}
                className={`text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${darkMode ? 'text-red-400 hover:bg-[#232329]' : 'text-red-500 hover:bg-red-50'}`}
              >
                Limpiar
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-[#232329] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <ChevronDown className="w-5 h-5 sm:hidden" />
              <span className="hidden sm:block text-[13px] font-medium">Cerrar</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-1 pb-2.5 flex-shrink-0">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar unidad..."
              className={`w-full pl-10 pr-3 py-2.5 text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#032347] ${inputBg(darkMode)}`}
            />
          </div>
        </div>

        {/* Group tabs */}
        <div className="px-4 pb-2 flex gap-1.5 flex-shrink-0">
          {([
            ['all', 'Todas'],
            ['vehicle', 'Vehículos'],
            ['machine', 'Máquinas'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGroup(key)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors
                ${group === key
                  ? darkMode ? 'bg-white text-[#032347]' : 'bg-[#032347] text-white'
                  : darkMode ? 'bg-[#232329] text-gray-400 hover:text-white' : 'bg-[#f0f0f0] text-gray-500 hover:text-[#1d1d1f]'}`}
            >
              {label}
            </button>
          ))}
          {atLimit && selectedCount > 0 && (
            <span className={`ml-auto self-center text-[10px] px-1.5 py-0.5 rounded-full font-medium ${darkMode ? 'bg-[#232329] text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
              máx {max}
            </span>
          )}
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3 min-h-0">
          {!anyResult && (
            <p className={`text-center text-[12px] py-8 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              Sin resultados
            </p>
          )}

          {showVehicles && (
            <SelectGroup
              title="Vehículos"
              icon={<Car className="w-3.5 h-3.5" />}
              count={vehicles.length}
              items={vehicles.filter(filterFn)}
              render={renderRow}
            />
          )}

          {showMachines && (
            <SelectGroup
              title="Máquinas"
              icon={<Wrench className="w-3.5 h-3.5" />}
              count={machines.length}
              items={machines.filter(filterFn)}
              render={renderRow}
            />
          )}
        </div>

        {/* Footer CTA */}
        <div className={`p-3 flex-shrink-0 border-t ${darkMode ? 'border-[#33343c]' : 'border-gray-100'}`}>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[14px] font-semibold rounded-xl bg-[#032347] text-white hover:bg-[#02335a] active:scale-[0.99] transition-all"
          >
            <Check className="w-4 h-4" />
            Listo{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectGroup({
  title,
  icon,
  count,
  items,
  render,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  items: UnitSelectOption[];
  render: (u: UnitSelectOption) => React.ReactNode;
}) {
  const { darkMode } = useLayout();
  return (
    <div className="mb-1">
      <div className={`flex items-center gap-1.5 px-3.5 pt-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {icon}
        <span>{title}</span>
        <span className="font-normal normal-case">{count}</span>
      </div>
      <div className="space-y-0.5">{items.map(render)}</div>
    </div>
  );
}
