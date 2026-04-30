'use client';
import { useState } from 'react';

type PosRow = {
  id: string;
  lengthMm: number;
  number: string;
  qtyPerPostomat: number;
  planQty: number;
  kits: number;
};

type RowState = 'idle' | 'saving' | 'saved';

export default function KitPlanTable({ positions }: { positions: PosRow[] }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(positions.map(p => [p.id, p.planQty > 0 ? String(p.planQty) : '']))
  );
  const [states, setStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(positions.map(p => [p.id, 'idle']))
  );

  async function save(posId: string) {
    const qty = Number(values[posId]) || 0;
    setStates(s => ({ ...s, [posId]: 'saving' }));
    await fetch('/api/planning/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId: posId, qty }),
    });
    setStates(s => ({ ...s, [posId]: 'saved' }));
    setTimeout(() => setStates(s => ({ ...s, [posId]: 'idle' })), 2000);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cbrd)' }}>
        <h2 className="text-[15px] font-semibold text-c1">План комплектів по позиціях</h2>
        <p className="text-[12px] text-c4 mt-0.5">Скільки комплектів необхідно виготовити по кожній позиції</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
              {['Позиція', 'Шт / компл.', 'Зроблено компл.', 'План (компл.)', ''].map((h, i) => (
                <th key={i} className={`th ${i === 0 ? 'text-left' : i === 4 ? 'text-right' : 'text-right'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => {
              const st = states[p.id];
              const val = values[p.id];
              const planNum = Number(val) || 0;
              const dirty = planNum !== p.planQty || p.planQty === 0;

              return (
                <tr
                  key={p.id}
                  className="row-hover"
                  style={i < positions.length - 1 ? { borderBottom: '1px solid var(--cbrd)' } : {}}
                >
                  <td className="px-5 py-3">
                    <span className="text-[14px] font-semibold text-c1">{p.lengthMm} мм</span>
                    {p.number && (
                      <span className="text-[11px] text-c4 ml-1.5">#{p.number}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-[13px] text-c3 tabular-nums">
                    {p.qtyPerPostomat}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {p.kits}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-0 rounded-xl overflow-hidden ml-auto w-fit"
                         style={{ border: '1px solid var(--cbrd)' }}>
                      <button
                        onClick={() => setValues(v => ({ ...v, [p.id]: String(Math.max(0, (Number(v[p.id]) || 0) - 1)) }))}
                        className="w-7 h-8 flex items-center justify-center text-c3 hover:text-c1 transition-colors text-base font-light"
                        style={{ borderRight: '1px solid var(--cbrd)' }}
                      >−</button>
                      <input
                        type="number"
                        min={0}
                        value={val}
                        onChange={e => setValues(v => ({ ...v, [p.id]: e.target.value }))}
                        placeholder="0"
                        className="w-16 h-8 text-center text-[14px] font-semibold text-c1 bg-transparent outline-none tabular-nums"
                      />
                      <button
                        onClick={() => setValues(v => ({ ...v, [p.id]: String((Number(v[p.id]) || 0) + 1) }))}
                        className="w-7 h-8 flex items-center justify-center text-c3 hover:text-c1 transition-colors text-base font-light"
                        style={{ borderLeft: '1px solid var(--cbrd)' }}
                      >+</button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => save(p.id)}
                      disabled={st === 'saving' || planNum < 0}
                      className={`btn-primary text-[12px] px-3 py-1.5 ${st === 'saving' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {st === 'saved' ? '✓' : st === 'saving' ? '…' : 'Зберегти'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
