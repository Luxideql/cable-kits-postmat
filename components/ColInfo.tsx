'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function ColInfo({ text }: { text: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  function show(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.bottom + 6 });
  }

  const tooltip = pos ? createPortal(
    <div
      className="fixed z-[9999] w-64 rounded-xl shadow-xl p-3 text-[12px] leading-relaxed text-c3 pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--cbg)',
        border: '1px solid var(--cbrd)',
      }}
    >
      {text}
    </div>,
    document.body
  ) : null;

  return (
    <span className="relative inline-flex items-center ml-1 align-middle">
      <button
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onClick={e => { e.stopPropagation(); pos ? setPos(null) : show(e); }}
        className="w-4 h-4 rounded-full text-[10px] font-bold leading-none flex items-center justify-center
          border transition-colors duration-150 select-none shrink-0
          text-c4 border-cbrd hover:text-indigo-500 hover:border-indigo-400"
        aria-label="Пояснення колонки"
      >
        ?
      </button>
      {tooltip}
    </span>
  );
}
