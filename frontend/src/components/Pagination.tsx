import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

interface PaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
}

const PAGE_SIZES = [10, 30, 50];

export default function Pagination({ page, totalItems, pageSize, onPageSizeChange, onPageChange }: PaginationProps) {
  const { darkMode } = useLayout();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`flex items-center gap-3 pt-3 flex-wrap`}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30
            ${darkMode ? 'hover:bg-[#232329] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className={`text-[12px] font-medium px-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {page}/{totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30
            ${darkMode ? 'hover:bg-[#232329] text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <span className={`text-[12px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {from}–{to} de {totalItems}
      </span>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors
            ${darkMode ? 'bg-[#232329] text-gray-300 hover:bg-[#33343c]' : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'}`}
        >
          {pageSize}
          <svg className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className={`absolute left-0 bottom-full mb-1 w-16 rounded-xl shadow-xl z-50 py-1 overflow-hidden
              ${darkMode ? 'bg-[#232329] border border-[#3c3d46]' : 'bg-white border border-gray-100'}`}>
              {PAGE_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => { onPageSizeChange(s); onPageChange(1); setDropdownOpen(false); }}
                  className={`w-full text-center px-3 py-2 text-[12px] transition-colors
                    ${pageSize === s
                      ? `${darkMode ? 'text-[#f87203] bg-[#f87203]/10' : 'text-[#032347] bg-[#032347]/5'}`
                      : `${darkMode ? 'text-gray-400 hover:bg-[#33343c]' : 'text-gray-600 hover:bg-gray-50'}`
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
