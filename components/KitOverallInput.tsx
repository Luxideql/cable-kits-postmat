'use client';
import { useState } from 'react';

export default function KitOverallInput({ initial }: { initial: number }) {
  const [value, setValue] = useState(initial > 0 ? String(initial) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const num = Number(value) || 0;

  async function save() {
    if (num <= 0) return;
    setSaving(true);
    await fetch('/api/planning/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: num }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4 mb-1">
        Загальний план комплектів
      </p>
      <p className="text-[12px] text-c4 mb-4">Скільки поштоматів необхідно укомплектувати</p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-0 rounded-xl overflow-hidden"
             style={{ border: '1px solid var(--cbrd)' }}>
          <button
            onClick={() => setValue(v => String(Math.max(0, (Number(v) || 0) - 1)))}
            className="w-9 h-10 flex items-center justify-center text-c3 hover:text-c1 transition-colors text-lg font-light"
            style={{ borderRight: '1px solid var(--cbrd)' }}
          >−</button>
          <input
            type="number"
            min={0}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0"
            className="w-24 h-10 text-center text-[18px] font-semibold text-c1 bg-transparent outline-none tabular-nums"
          />
          <button
            onClick={() => setValue(v => String((Number(v) || 0) + 1))}
            className="w-9 h-10 flex items-center justify-center text-c3 hover:text-c1 transition-colors text-lg font-light"
            style={{ borderLeft: '1px solid var(--cbrd)' }}
          >+</button>
        </div>

        <span className="text-[13px] text-c4">поштоматів</span>

        <button
          onClick={save}
          disabled={saving || num <= 0}
          className={`btn-primary ml-auto ${saving || num <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {saved ? '✓ Збережено' : saving ? 'Збереження…' : 'Зберегти'}
        </button>
      </div>
    </div>
  );
}
