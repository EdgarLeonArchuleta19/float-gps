import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';
import { useVerticalPlacement } from '../hooks/useVerticalPlacement';

interface TimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  label?: string;
}

const inputBg = (dark: boolean) =>
  dark ? 'bg-[#1a1a1a] text-[#f5f5f7]' : 'bg-white text-[#1d1d1f]';

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

export default function TimePicker({ value, onChange, label }: TimePickerProps) {
  const { darkMode } = useLayout();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const place = useVerticalPlacement(open, triggerRef, 460);

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
    <DialPanel
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
          <div className="fixed inset-0 z-[990] lg:hidden bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* MÓVIL: modal */}
          <div
            role="dialog" aria-modal="true"
            className={`lg:hidden fixed z-[1000] inset-0 m-auto h-max max-h-[90vh] overflow-y-auto no-scrollbar
              w-[92vw] max-w-[360px] rounded-2xl shadow-2xl border animate-fade-in
              ${darkMode ? 'bg-[#151517] border-[#242428]' : 'bg-white border-gray-100'}`}
          >
            <div className="px-5 py-4">{panel}</div>
          </div>

          {/* PC: popover junto al campo */}
          <div
            className={`hidden lg:block absolute z-[999] left-0 w-[320px]
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
//  Reloj analógico en escala de grises (solo blanco, negro y grises)
// ---------------------------------------------------------------------------

const HOURS12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MIN_TICKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function DialPanel({ darkMode, hour, min, setHour, setMin, apply }: {
  darkMode: boolean;
  hour: number;
  min: number;
  setHour: (h: number) => void;
  setMin: (m: number) => void;
  apply: () => void;
}) {
  const [mode, setMode] = useState<'hour' | 'min'>('hour');
  const isPM = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  const accent = darkMode ? '#f87203' : '#032347';
  const faceBg = darkMode ? '#1a1a1c' : '#ffffff';
  const textColor = darkMode ? '#f5f5f7' : '#1d1d1f';
  const dim = darkMode ? '#7a7a7e' : '#9a9aa0';
  const activeChipBg = darkMode ? '#2a2a2c' : '#e2e2e4';

  const selectHour = (h12: number) => {
    const nh = ((h12 % 12) + (isPM ? 12 : 0)) % 24;
    setHour(nh);
  };

  const togglePM = (pm: boolean) => {
    const nh = (hour % 12) + (pm ? 12 : 0);
    setHour(nh % 24);
  };

  return (
    <div>
      {/* Título contextual */}
      <div className="text-center mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: dim }}>
          {mode === 'hour' ? 'Hora' : 'Minutos'}
        </span>
      </div>

      {/* Header: hora:minuto + AM/PM toggle */}
      <div className="flex items-center justify-center gap-3 pb-3">
        <div className="flex items-center gap-1 text-[30px] font-light tabular-nums tracking-tight" style={{ color: textColor }}>
          <button
            type="button"
            onClick={() => setMode('hour')}
            className="px-1.5 rounded-lg transition-colors"
            style={mode === 'hour'
              ? { color: accent, fontWeight: 600, background: activeChipBg }
              : {}}
          >
            {pad(hour12)}
          </button>
          <span style={{ color: dim }}>:</span>
          <button
            type="button"
            onClick={() => setMode('min')}
            className="px-1.5 rounded-lg transition-colors"
            style={mode === 'min'
              ? { color: accent, fontWeight: 600, background: activeChipBg }
              : {}}
          >
            {pad(min)}
          </button>
        </div>

        {/* AM/PM */}
        <div className="flex flex-col text-[12px] font-medium leading-tight" style={{ marginLeft: -8 }}>
          {(['AM', 'PM'] as const).map((p) => {
            const active = (p === 'PM') === isPM;
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePM(p === 'PM')}
                className="px-2 py-0.5 rounded-md transition-colors"
                style={{
                  color: active ? accent : dim,
                  fontWeight: active ? 700 : 400,
                  background: active ? activeChipBg : 'transparent',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dial con arrastre de mouse y flechas */}
      <ClockDial
        mode={mode}
        hour12={hour12}
        min={min}
        onSelectHour={selectHour}
        onSelectMin={(m) => setMin(Math.round(m / 5) * 5)}
        onSelectHourClick={(h12) => {
          selectHour(h12);
          setMode('min');
        }}
        onArrow={(dir) => {
          if (mode === 'hour') {
            const nh = (hour12 - 1 + dir + 12) % 12 + 1;
            selectHour(nh);
          } else {
            const nm = min + dir * 5;
            setMin(((nm % 60) + 60) % 60);
          }
        }}
        accent={accent}
        faceBg={faceBg}
        textColor={textColor}
        dim={dim}
        activeChipBg={activeChipBg}
        isPM={isPM}
        darkMode={darkMode}
      />

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t" style={{ borderColor: darkMode ? '#242428' : '#f0f0f0' }}>
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

function ClockDial({ mode, hour12, min, onSelectHour, onSelectMin, onSelectHourClick, onArrow, accent, faceBg, textColor, dim, activeChipBg, isPM, darkMode }: {
  mode: 'hour' | 'min';
  hour12: number;
  min: number;
  onSelectHour: (h: number) => void;
  onSelectMin: (m: number) => void;
  onSelectHourClick: (h: number) => void;
  onArrow: (dir: number) => void;
  accent: string;
  faceBg: string;
  textColor: string;
  dim: string;
  activeChipBg: string;
  isPM: boolean;
  darkMode: boolean;
}) {
  const SIZE = 230;
  const CENTER = SIZE / 2;
  const numR = SIZE / 2 - 26;
  const dragRef = useRef<{ active: boolean; pid: number | null; startX: number; startY: number; moved: boolean }>({ active: false, pid: null, startX: 0, startY: 0, moved: false });
  const svgRef = useRef<SVGSVGElement | null>(null);

  const angleFor = (i: number) => ((i % 12) / 12) * 2 * Math.PI - Math.PI / 2;

  const pos = (index: number, r: number): [number, number] => {
    const a = angleFor(index);
    return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
  };

  // Convierte coordenadas de cliente a coordenadas internas del SVG
  const toLocal = (clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const rect = svg.getBoundingClientRect();
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  };

  // Determina qué tick está más cerca del ángulo de un punto (para arrastre)
  const selectFromPoint = (clientX: number, clientY: number) => {
    const [px, py] = toLocal(clientX, clientY);
    const angle = Math.atan2(py - CENTER, px - CENTER) + Math.PI / 2;
    const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const idx = Math.round(norm / ((Math.PI * 2) / 12)) % 12;
    if (mode === 'hour') {
      onSelectHour(idx === 0 ? 12 : idx);
    } else {
      onSelectMin(idx * 5);
    }
  };

  const handleDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { active: true, pid: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    selectFromPoint(e.clientX, e.clientY);
  };

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.active) return;
    if (dragRef.current.pid !== null && e.pointerId !== dragRef.current.pid) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    if (dx > 4 || dy > 4) dragRef.current.moved = true;
    selectFromPoint(e.clientX, e.clientY);
  };

  const handleUp = () => {
    dragRef.current = { active: false, pid: null, startX: 0, startY: 0, moved: false };
  };

  const selectedTick = mode === 'hour' ? hour12 : Math.round(min / 5) % 12;
  const handAngle = angleFor(selectedTick === 0 ? 12 : selectedTick);
  const handR = numR;

  const onKey = (e: React.KeyboardEvent) => {
    e.preventDefault();
    if (e.key === 'ArrowUp') onArrow(1);
    else if (e.key === 'ArrowDown') onArrow(-1);
    else if (e.key === 'ArrowRight') onArrow(1);
    else if (e.key === 'ArrowLeft') onArrow(-1);
  };

  const selCircleFill = accent;
  const selTextFill = '#ffffff';

  return (
    <div className="flex justify-center">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="select-none"
        tabIndex={0}
        role="dialog"
        aria-label={mode === 'hour' ? 'Seleccionar hora' : 'Seleccionar minutos'}
        onKeyDown={onKey}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onPointerLeave={handleUp}
        style={{ cursor: 'pointer', touchAction: 'none', outline: 'none' }}
      >
        {/* Cara del reloj */}
        <circle cx={CENTER} cy={CENTER} r={CENTER - 4} fill={faceBg} />
        <circle
          cx={CENTER} cy={CENTER}
          r={CENTER - 4}
          fill="none"
          stroke={darkMode ? '#2c2c2e' : '#d4d4d6'}
          strokeWidth={1}
        />

        {/* Guías radiales sutiles (doce divisiones) */}
        {Array.from({ length: 12 }, (_, i) => {
          const [x1, y1] = pos(i, numR + 8);
          const [x2, y2] = pos(i, numR + 16);
          const isTick = i === (selectedTick === 0 ? 12 : selectedTick) % 12;
          return (
            <line
              key={i}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke={isTick ? accent : (darkMode ? '#2c2c2e' : '#d4d4d6')}
              strokeWidth={isTick ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Manecilla */}
        <line
          x1={CENTER} y1={CENTER}
          x2={CENTER + handR * Math.cos(handAngle)}
          y2={CENTER + handR * Math.sin(handAngle)}
          stroke={accent}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CENTER} cy={CENTER} r={4} fill={accent} />
        <circle
          cx={CENTER + handR * Math.cos(handAngle)}
          cy={CENTER + handR * Math.sin(handAngle)}
          r={16}
          fill={accent}
        />

        {/* Números */}
        {(mode === 'hour' ? HOURS12 : MIN_TICKS).map((v, i) => {
          const r = numR;
          const [x, y] = pos(mode === 'hour' ? (v === 12 ? 0 : v) : i, r);
          const sel = mode === 'hour' ? v === hour12 : (min === v);
          const label = mode === 'hour'
            ? String(v)
            : (v === 0 ? '00' : String(v));
          return (
            <g
              key={v}
              className="cursor-pointer"
              onPointerDown={(e) => {
                // Tocar un número = selección directa
                e.stopPropagation();
                const movedBefore = dragRef.current.moved;
                dragRef.current = { active: true, pid: e.pointerId, startX: e.clientX, startY: e.clientY, moved: movedBefore };
                e.currentTarget.setPointerCapture?.(e.pointerId);
                if (mode === 'hour') onSelectHour(v);
                else onSelectMin(v);
              }}
              onPointerMove={handleMove}
              onPointerUp={() => {
                // Click reconocido: no hubo arrastre → en modo hora se avanza a minutos
                const wasClick = !dragRef.current.moved;
                handleUp();
                if (mode === 'hour' && wasClick) {
                  onSelectHourClick(v);
                }
              }}
              onPointerCancel={handleUp}
              onPointerLeave={handleUp}
            >
              <circle
                cx={x} cy={y} r={16}
                fill={sel ? selCircleFill : 'transparent'}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={x} y={y}
                textAnchor="middle" dominantBaseline="central"
                fontSize="12"
                fontWeight={sel ? 700 : 400}
                fill={sel ? selTextFill : mode === 'hour' ? textColor : dim}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}