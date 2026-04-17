'use client';
import { useState } from 'react';

export default function ColInfo({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1 align-middle">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        className="w-4 h-4 rounded-full text-[10px] font-bold leading-none flex items-center justify-center
          text-c4 border border-cbrd hover:text-indigo-500 hover:border-indigo-400 transition-colors"
        aria-label="Пояснення колонки"
      >
        ?
      </button>
      {show && (
        <div
          className="absolute top-5 left-1/2 -translate-x-1/2 z-50 w-56 rounded-lg shadow-xl p-3
            text-[12px] leading-relaxed text-c3 pointer-events-none"
          style={{ backgroundColor: 'var(--cbg)', border: '1px solid var(--cbrd)' }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
