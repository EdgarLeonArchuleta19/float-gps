import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';
import { useVerticalPlacement } from '../hooks/useVerticalPlacement';

interface TimePickerProps {
  value: string; // HH:mm (24h)
  onChange: (value: string) => void;
  label?: string;
}

const inputBg = (dark: boolean) =>
  dark ? 'bg-[#1a1a1a] text-[#f5f5f7]' : 'bg-white text-[#1d1d1f]';

const padCls = (dark: boolean) =>
  dark ? 'hover:bg-[#1f1f22]' : 'hover:bg-[#f2f2f3]';

const pad = (n: number) => String(n).padStart(2, '0');

// Convierte "HH:mm" (24h) a "h:mm AM/PM" (12h) para mostrar en el input
function format12(value: string): string {
  const p = (value || '').split(':');
  const h = parseInt(p[0], 10);
  const m = parseInt(p[1], 10);
  if (isNaN(h) || isNaN(m)) return value;
  const pm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${pm ? 'PM' : 'AM'}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,10,...55

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const { darkMode } = useLayout();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const place = useVerticalPlacement(open, triggerRef, 360);

  const [hour, setHour] = useState(() => {
    const h = parseInt((value || '12:00').split(':')[0], 10);
    return isNaN(h) ? 12 : h;
  });
  const [min, setMin] = useState(() => {
    const m = parseInt((value || '12:00').split(':')[1] || '0', 10);
    return isNaN(m) ? 0 : m;
  });

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const openPicker = () => {
    const p = (value || '').split(':');
    const h = parseInt(p[0], 10);
    const m = parseInt(p[1] || '0', 10);
    if (!isNaN(h)) setHour(h);
    if (!isNaN(m)) setMin(m);
    setOpen(true);
  };

  const apply = () => {
    onChange(`${pad(hour)}:${pad(min)}`);
    setOpen(false);
  };

  const panel = (
    <GridPanel
      darkMode={darkMode}
      hour={hour}
      min={min}
      setHour={setHour}
      setMin={setMin}
      apply={apply}
    />
  );

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
            ? 'border-[#333] hover:border-[#444] ' + inputBg(darkMode)
            : 'border-gray-200 hover:border-gray-300 ' + inputBg(darkMode)}`}
      >
        <Clock className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-[#f87203]' : 'text-[#032347]'}`} />
        <span className={`flex-1 tabular-nums ${value ? '' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {value ? format12(value) : 'Seleccionar hora'}
        </span>
      </button>

      {open && (
        <>
          {/* Overlay SOLO móvil */}
          <div className="fixed inset-0 z-[990] lg:hidden bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* MÓVIL: modal centrado */}
          <div
            role="dialog" aria-modal="true"
            className={`lg:hidden fixed z-[1000] inset-0 m-auto h-max max-h-[86vh] overflow-y-auto no-scrollbar
              w-[92vw] max-w-[320px] rounded-2xl shadow-2xl border animate-fade-in
              ${darkMode ? 'bg-[#151517] border-[#242428]' : 'bg-white border-gray-100'}`}
          >
            <div className="px-5 py-5">{panel}</div>
          </div>

          {/* PC: popover junto al campo */}
          <div
            className={`hidden lg:block absolute z-[999]
              left-0 w-[280px]
              ${place === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}
              rounded-2xl shadow-xl border
              ${darkMode ? 'bg-[#151517] border-[#242428]' : 'bg-white border-gray-100'}`}
          >
            <div className="px-5 py-4">{panel}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Panel con grillas de Hora y Minuto (estilo simple, similar al calendario)
// ---------------------------------------------------------------------------

function GridPanel({ darkMode, hour, min, setHour, setMin, apply }: {
  darkMode: boolean;
  hour: number;
  min: number;
  setHour: (h: number) => void;
  setMin: (m: number) => void;
  apply: () => void;
}) {
  const isPM = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const accent = darkMode ? '#f87203' : '#032347';
  const dim = darkMode ? '#6e6e72' : '#a8a8ac';

  const togglePM = (pm: boolean) => {
    const nh = (hour % 12) + (pm ? 12 : 0);
    setHour(nh % 24);
  };

  return (
    <div>
      {/* Header hora:minuto */}
      <div className="flex items-center justify-center gap-1 pb-4 text-[34px] font-light tabular-nums tracking-tight"
        style={{ color: darkMode ? '#f5f5f7' : '#1d1d1f' }}>
        <span style={{ color: accent, fontWeight: 600 }}>{pad(hour12)}</span>
        <span style={{ color: dim }}>:</span>
        <span style={{ color: darkMode ? '#c9c9cc' : '#4a4a4e' }}>{pad(min)}</span>
      </div>

      {/* AM / PM */}
      <div className="flex justify-center gap-2 mb-4">
        {(['AM', 'PM'] as const).map((p) => {
          const active = (p === 'PM') === isPM;
          return (
            <button
              key={p}
              type="button"
              onClick={() => togglePM(p === 'PM')}
              className={`px-4 py-1.5 text-[12px] font-medium rounded-lg transition-colors
                ${active ? '' : padCls(darkMode)}`}
              style={active ? { backgroundColor: accent, color: '#fff', fontWeight: 600 } : { color: dim }}
            >
              {p}
            </button>
          );
        })}
      </div>

      {/* Grilla de horas */}
      <div className="mb-4">
        <p className="text-[10px] font-medium tracking-wide uppercase mb-2" style={{ color: dim }}>Hora</p>
        <div className="grid grid-cols-4 gap-1.5">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHour(h % 12 === 0 ? 12 : (h % 12) + (isPM ? 12 : 0))}
              className={`py-2 rounded-[10px] text-[13px] tabular-nums transition-colors
                ${hour12 === h ? '' : padCls(darkMode)}`}
              style={hour12 === h
                ? { backgroundColor: accent, color: '#fff', fontWeight: 600 }
                : { color: darkMode ? '#e6e6e8' : '#3a3a3e' }}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Grilla de minutos */}
      <div>
        <p className="text-[10px] font-medium tracking-wide uppercase mb-2" style={{ color: dim }}>Minuto</p>
        <div className="grid grid-cols-4 gap-1.5">
          {MINS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMin(m)}
              className={`py-2 rounded-[10px] text-[13px] tabular-nums transition-colors
                ${min === m ? '' : padCls(darkMode)}`}
              style={min === m
                ? { backgroundColor: accent, color: '#fff', fontWeight: 600 }
                : { color: darkMode ? '#e6e6e8' : '#3a3a3e' }}
            >
              {pad(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 mt-4 border-t"
        style={{ borderColor: darkMode ? '#242428' : '#f0f0f0' }}>
        <button
          onClick={apply}
          className="px-4 py-1.5 text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-80"
          style={{ color: accent }}
        >
          OK
        </button>
      </div>
    </div>
  );
}