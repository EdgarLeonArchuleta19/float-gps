import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';
import { useVerticalPlacement } from '../hooks/useVerticalPlacement';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const inputBg = (dark: boolean) =>
  dark ? 'bg-[#232329] text-[#f5f5f7]' : 'bg-white text-[#1d1d1f]';

function toDate(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

type View = 'days' | 'months' | 'years';

export default function DatePicker({ value, onChange, label, min, max }: DatePickerProps) {
  const { darkMode } = useLayout();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('days');
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [viewDate, setViewDate] = useState<Date>(() => toDate(value) || new Date());

  const place = useVerticalPlacement(open, triggerRef, 340);

  const minDate = min ? toDate(min) : null;
  const maxDate = max ? toDate(max) : null;
  const maxYear = maxDate ? maxDate.getFullYear() : null;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setView('days');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const openPicker = () => {
    setViewDate(toDate(value) || new Date());
    setView('days');
    setOpen(true);
  };

  const grid = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // lunes como inicio
    const cells: (Date | null)[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d.getMonth() === m ? d : null);
    }
    return cells;
  }, [viewDate]);

  const yearGrid: number[] = useMemo(() => {
    const cur = viewDate.getFullYear();
    const start = cur - 6;
    return Array.from({ length: 12 }, (_, i) => start + i);
  }, [viewDate]);

  const isSelected = (d: Date) => toDate(value)?.getTime() === d.getTime();
  const isToday = (d: Date) => {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };
  const isDisabled = (d: Date) =>
    !!(minDate && d < minDate) || !!(maxDate && d > maxDate);

  const shiftMonth = (dir: number) =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + dir, 1));
  const shiftYears = (dir: number) =>
    setViewDate(new Date(viewDate.getFullYear() + dir, viewDate.getMonth(), 1));

  const setYear = (y: number) => {
    setViewDate(new Date(y, viewDate.getMonth(), 1));
    setView('months'); // año → meses → luego a días
  };

  const setMonth = (mIdx: number) => {
    setViewDate(new Date(viewDate.getFullYear(), mIdx, 1));
    setView('days');
  };

  const display = value
    ? (() => {
        const d = toDate(value)!;
        return `${d.getDate().toString().padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : '';

  const accent = darkMode ? '#f87203' : '#032347';

  const headerTitle = {
    days: (
      <button type="button" onClick={() => setView('months')}
        className="text-[14px] font-medium tracking-tight" style={{ color: darkMode ? '#f5f5f7' : '#1d1d1f' }}>
        {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
      </button>
    ),
    months: (
      <button type="button" onClick={() => setView('years')}
        className="text-[14px] font-medium tracking-tight" style={{ color: darkMode ? '#f5f5f7' : '#1d1d1f' }}>
        {viewDate.getFullYear()}
      </button>
    ),
    years: <span className="text-[14px] font-medium tracking-tight" style={{ color: darkMode ? '#f5f5f7' : '#1d1d1f' }}>
      {yearGrid[0]} – {yearGrid[yearGrid.length - 1]}
    </span>,
  }[view];

  return (
    <div ref={wrapRef} className="relative">
      {label && (
        <label className={`block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>{label}</label>
      )}
      <button
        type="button"
        ref={triggerRef}
        onClick={openPicker}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-[13px] rounded-xl border text-left transition-colors active:scale-[0.99]
          ${darkMode
            ? 'border-[#3c3d46] hover:border-[#444] ' + inputBg(darkMode)
            : 'border-gray-200 hover:border-gray-300 ' + inputBg(darkMode)}`}
      >
        <Calendar className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`} />
        <span className={`flex-1 ${value ? '' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {display || 'Seleccionar fecha'}
        </span>
      </button>

      {open && (
        <>
          {/* Overlay SOLO móvil */}
          <div className="fixed inset-0 z-[990] lg:hidden bg-black/50 backdrop-blur-sm"
            onClick={() => { setOpen(false); setView('days'); }} />

          {/* MÓVIL: modal centrado */}
          <div
            role="dialog" aria-modal="true"
            className={`lg:hidden fixed z-[1000] inset-0 m-auto h-max max-h-[86vh] overflow-y-auto no-scrollbar
              w-[92vw] max-w-[320px] rounded-2xl shadow-2xl border animate-fade-in
              ${darkMode ? 'bg-[#202024] border-[#34363f]' : 'bg-white border-gray-100'}`}
          >
            <div className="px-5 py-5">
              <CalendarGrid
                view={view}
                viewDate={viewDate}
                headerTitle={headerTitle}
                shiftMonth={shiftMonth}
                shiftYears={shiftYears}
                WEEKDAYS={WEEKDAYS}
                grid={grid}
                isSelected={isSelected}
                isToday={isToday}
                isDisabled={isDisabled}
                MONTHS_SHORT={MONTHS_SHORT}
                yearGrid={yearGrid}
                setYear={setYear}
                setMonth={setMonth}
                toIso={toIso}
                onPick={(iso) => { onChange(iso); setOpen(false); setView('days'); }}
                onToday={() => onChange(toIso(new Date()))}
                maxYear={maxYear}
                darkMode={darkMode}
                accent={accent}
                padCls={`${darkMode ? 'hover:bg-[#2a2b31]' : 'hover:bg-[#f2f2f3]'} text-[#8a8a8e]`}
              />
            </div>
          </div>

          {/* PC: popover junto al campo */}
          <div
            className={`hidden lg:block absolute z-[999]
              left-0 w-[280px]
              ${place === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}
              rounded-2xl shadow-xl border
              ${darkMode ? 'bg-[#202024] border-[#34363f]' : 'bg-white border-gray-100'}`}
          >
            <div className="px-5 py-4">
              <CalendarGrid
                view={view}
                viewDate={viewDate}
                headerTitle={headerTitle}
                shiftMonth={shiftMonth}
                shiftYears={shiftYears}
                WEEKDAYS={WEEKDAYS}
                grid={grid}
                isSelected={isSelected}
                isToday={isToday}
                isDisabled={isDisabled}
                MONTHS_SHORT={MONTHS_SHORT}
                yearGrid={yearGrid}
                setYear={setYear}
                setMonth={setMonth}
                toIso={toIso}
                onPick={(iso) => { onChange(iso); setOpen(false); setView('days'); }}
                onToday={() => onChange(toIso(new Date()))}
                maxYear={maxYear}
                darkMode={darkMode}
                accent={accent}
                padCls={`${darkMode ? 'hover:bg-[#2a2b31]' : 'hover:bg-[#f2f2f3]'} text-[#8a8a8e]`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CalendarGrid(props: {
  view: View;
  viewDate: Date;
  headerTitle: React.ReactNode;
  shiftMonth: (dir: number) => void;
  shiftYears: (dir: number) => void;
  WEEKDAYS: string[];
  grid: (Date | null)[];
  isSelected: (d: Date) => boolean;
  isToday: (d: Date) => boolean;
  isDisabled: (d: Date) => boolean;
  MONTHS_SHORT: string[];
  yearGrid: number[];
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  toIso: (d: Date) => string;
  onPick: (iso: string) => void;
  onToday: () => void;
  maxYear: number | null;
  darkMode: boolean;
  accent: string;
  padCls: string;
}) {
  const {
    view, viewDate, headerTitle, shiftMonth, shiftYears, WEEKDAYS, grid,
    isSelected, isToday, isDisabled, MONTHS_SHORT, yearGrid, setYear, setMonth,
    toIso, onPick, onToday, maxYear, darkMode, accent, padCls,
  } = props;

  const navBtn = `w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'text-gray-400 hover:bg-[#2a2b31]' : 'text-gray-500 hover:bg-[#f2f2f3]'}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => (view === 'days' ? shiftMonth(-1) : shiftYears(view === 'months' ? -1 : -12))}
          className={navBtn} aria-label="Anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">{headerTitle}</div>
        <button type="button" onClick={() => (view === 'days' ? shiftMonth(1) : shiftYears(view === 'months' ? 1 : 12))}
          className={navBtn} aria-label="Siguiente">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {view === 'days' ? (
        <>
          <div className="grid grid-cols-7 text-center mb-1">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="text-[10px] font-medium tracking-wide"
                style={{ color: darkMode ? '#6e6e72' : '#a8a8ac' }}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {grid.map((d, i) => {
              if (!d) return <span key={i} className="h-9" />;
              const sel = isSelected(d);
              const today = isToday(d);
              const dis = isDisabled(d);
              return (
                <button key={i} disabled={dis} onClick={() => onPick(toIso(d))}
                  className={`h-9 text-[12px] rounded-[10px] transition-colors ${padCls}
                    ${sel ? 'text-white font-semibold' : dis ? 'opacity-30' : ''}`}
                  style={{ backgroundColor: sel ? accent : undefined, fontWeight: today && !sel ? 600 : 400,
                    color: sel ? undefined : today ? accent : undefined }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-[#34363f]' : 'border-gray-100'}`}>
            <button onClick={onToday}
              className="w-full py-1.5 text-[12px] rounded-lg transition-colors hover:opacity-70"
              style={{ color: accent, fontWeight: 500 }}>
              Hoy
            </button>
          </div>
        </>
      ) : view === 'months' ? (
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS_SHORT.map((m, i) => (
            <button key={m} onClick={() => setMonth(i)}
              className={`py-2.5 rounded-[10px] text-[12px] transition-colors
                ${viewDate.getMonth() === i ? '' : padCls}`}
              style={viewDate.getMonth() === i ? { backgroundColor: accent, color: '#fff', fontWeight: 500 } : undefined}>
              {m}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {yearGrid.map((y) => {
            const sel = viewDate.getFullYear() === y;
            const isMax = maxYear != null && y > maxYear;
            return (
              <button key={y} disabled={isMax} onClick={() => setYear(y)}
                className={`py-2.5 rounded-[10px] text-[12px] tabular-nums transition-colors
                  ${sel ? '' : isMax ? 'opacity-30' : padCls}`}
                style={sel ? { backgroundColor: accent, color: '#fff', fontWeight: 500 } : undefined}>
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}
