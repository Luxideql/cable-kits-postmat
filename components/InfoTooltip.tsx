'use client';
import { useState, useRef, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function InfoTooltip({ children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold
          border transition-colors duration-150 select-none
          text-c4 border-cbrd hover:text-indigo-500 hover:border-indigo-400"
        aria-label="Пояснення"
      >
        ?
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-50 w-80 rounded-xl shadow-xl p-4 text-[13px] leading-relaxed text-c3"
          style={{ backgroundColor: 'var(--cbg)', border: '1px solid var(--cbrd)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold uppercase tracking-wider text-c4">Пояснення</span>
            <button onClick={() => setOpen(false)} className="text-c4 hover:text-c1 text-lg leading-none">×</button>
          </div>
          <div className="space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}
