import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';
import { useVerticalPlacement } from '../hooks/useVerticalPlacement';

interface SpinnerOption {
  key: string;
  label: string;
}

export default function SpinnerSelect({ options, value, onChange, prefix }: {
  options: SpinnerOption[];
  value: string;
  onChange: (key: string) => void;
  prefix?: string;
}) {
  const { darkMode } = useLayout();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const place = useVerticalPlacement(open, triggerRef, 220);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = options.find((o) => o.key === value)?.label ?? '';

  return (
    <div ref={wrapRef} className="relative w-fit">
      <button
        ref={triggerRef}
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 pl-3 pr-2 py-2 text-[13px] rounded-xl transition-all active:scale-[0.99]
          ${darkMode ? 'bg-[#1a1a1a] text-[#f5f5f7]' : 'bg-white text-[#1d1d1f]'}`}
      >
        {prefix && <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{prefix}</span>}
        <span className="font-medium">{selected}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''} ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[990] lg:hidden bg-black/40" onClick={() => setOpen(false)} />

          <div role="dialog" aria-modal="true"
            className={`lg:hidden fixed z-[1000] inset-0 m-auto h-max w-[240px] rounded-2xl p-1.5 shadow-2xl border animate-fade-in
              ${darkMode ? 'bg-[#151517] border-[#242428]' : 'bg-white border-gray-100'}`}>
            {options.map((o) => (
              <button key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-colors
                  ${value === o.key
                    ? darkMode ? 'bg-[#1f1f22] text-[#f5f5f7]' : 'bg-[#f5f5f7] text-[#1d1d1f]'
                    : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {o.label}
                {value === o.key && (
                  <span className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-[#f87203]' : 'bg-[#032347]'}`} />
                )}
              </button>
            ))}
          </div>

          <div className={`hidden lg:block absolute z-[999] min-w-[190px]
            ${place === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}
            rounded-2xl p-1.5 shadow-xl border
            ${darkMode ? 'bg-[#151517] border-[#242428]' : 'bg-white border-gray-100'}`}>
            {options.map((o) => (
              <button key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] transition-colors
                  ${value === o.key
                    ? darkMode ? 'bg-[#1f1f22] text-[#f5f5f7]' : 'bg-[#f5f5f7] text-[#1d1d1f]'
                    : darkMode ? 'text-gray-400 hover:bg-[#1a1a1a]' : 'text-gray-500 hover:bg-[#f5f5f7]'}`}>
                {o.label}
                {value === o.key && (
                  <span className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-[#f87203]' : 'bg-[#032347]'}`} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}