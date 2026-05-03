'use client';
import { useState, useRef } from 'react';
import type { PositionStats } from '@/lib/types';
import ColInfo from '@/components/ColInfo';

interface Props { positions: PositionStats[]; shipped?: number }
type SortKey = 'lengthMm' | 'stock' | 'produced' | 'available' | 'kits' | 'progress';

const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
       className={`ml-1 inline transition-all duration-200 ${active ? 'opacity-100' : 'opacity-20'}`}>
    {asc ? <path d="M5 2L9 8H1L5 2Z"/> : <path d="M5 8L1 2H9L5 8Z"/>}
  </svg>
);

const EditIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-40 ml-1 transition-opacity">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export default function PositionsTable({ positions, shipped = 0 }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('kits');
  const [sortAsc, setSortAsc]  = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [availMap, setAvailMap]   = useState<Record<string, number>>({});
  const [saving, setSaving]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const minKits = positions.length ? Math.min(...positions.map(p => p.kits)) : 0;
  const sorted  = [...positions].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  function getActual(p: PositionStats) {
    return availMap[p.id] ?? p.available;
  }

  function startEdit(p: PositionStats) {
    setEditingId(p.id);
    setEditValue(String(getActual(p)));
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitEdit(p: PositionStats) {
    const entered = parseInt(editValue);
    if (isNaN(entered) || entered < 0) { setEditingId(null); return; }
    if (entered === getActual(p)) { setEditingId(null); return; }
    setEditingId(null);
    setSaving(p.id);
    setAvailMap(m => ({ ...m, [p.id]: entered }));
    // Back-calculate: available = stock + produced - shipped*qty → stock = entered - produced + shipped*qty
    const stockToSave = entered - p.produced + shipped * p.qtyPerPostomat;
    try {
      await fetch('/api/positions/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, stock: stockToSave }),
      });
    } finally {
      setSaving(null);
    }
  }

  const TH = ({ k, label, align = 'left', info }: { k: SortKey; label: string; align?: string; info?: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`th ${align === 'right' ? 'text-right' : 'text-left'}
        ${sortKey === k ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        <SortIcon active={sortKey === k} asc={sortAsc} />
        {info && <span onClick={e => e.stopPropagation()}><ColInfo text={info} /></span>}
      </span>
    </th>
  );

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
              <th className="th text-left">
                <span className="inline-flex items-center gap-0.5">
                  Позиція
                  <ColInfo text="Довжина кабелю в мм. Кожна позиція — окремий тип кабелю для поштомату." />
                </span>
              </th>
              <th className="th text-left">
                <span className="inline-flex items-center gap-0.5">
                  Комірки
                  <ColInfo text="Номери комірок поштомату, куди вкладається цей кабель." />
                </span>
              </th>
              <TH k="stock"    label="Залишок"   align="right" info="Початковий залишок зі складу — введено вручну в Google Sheets." />
              <TH k="produced" label="Вироблено" align="right" info="Сума всіх звітів робітників через бот за весь час." />
              <TH k="available" label="Фактичний залишок" align="right"
                info="Залишок + Вироблено − (відправлено × к-сть/компл.) = скільки штук реально є зараз. Натисніть щоб скоригувати після переобліку." />
              <TH k="kits" label="Комплектів" align="right" info="floor(Фактичний залишок ÷ К-сть/компл.) — скільки повних комплектів можна зібрати." />
              <th className="th text-right">
                <span className="inline-flex items-center gap-0.5">
                  Вільних компл.
                  <ColInfo text="Комплектів − відправлено всього. Скільки комплектів ще не відвантажено." />
                </span>
              </th>
              <TH k="progress" label="Прогрес" info="Виконання плану в %: Фактичний залишок ÷ (план × к-сть/компл.) × 100." />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => {
              const isBottleneck = p.kits === minKits && p.kits >= 0;
              const readyNow = p.kits;
              const isLast = idx === sorted.length - 1;
              const actual = getActual(p);
              return (
                <tr
                  key={p.id}
                  className={`group transition-colors duration-100 ${isBottleneck ? 'bg-red-500/[0.04]' : ''}`}
                  style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = isBottleneck ? 'rgba(239,68,68,0.06)' : 'var(--chov)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = isBottleneck ? 'rgba(239,68,68,0.04)' : '')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0
                        ${isBottleneck ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-indigo-500/50'}`} />
                      <span className="text-[14px] font-semibold text-c1">{p.lengthMm} мм</span>
                      {isBottleneck && <span className="badge-red ml-0.5">вузьке</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-mono text-c4">{p.cellNumbers || '—'}</td>
                  <td className="px-4 py-3 text-right text-[14px] text-c3">{p.stock}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[14px] font-medium text-emerald-600 dark:text-emerald-400">{p.produced}</span>
                  </td>

                  {/* Фактичний залишок — editable */}
                  <td className="px-4 py-3 text-right cursor-pointer" onClick={() => startEdit(p)}>
                    {editingId === p.id ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <input
                          ref={inputRef}
                          type="number"
                          min={0}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(p)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(p);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-20 text-right text-[14px] font-semibold text-c1 bg-transparent outline-none
                                     tabular-nums border-b-2 border-indigo-500"
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="text-[10px] text-indigo-400">переоблік</span>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center justify-end text-[14px] font-semibold tabular-nums
                        ${saving === p.id ? 'text-indigo-400 animate-pulse' : 'text-c2'}`}>
                        {actual}
                        <EditIcon />
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className={`text-[15px] font-bold tabular-nums
                      ${isBottleneck ? 'text-red-600 dark:text-red-400' : 'text-c1'}`}>
                      {p.kits}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-[15px] font-bold tabular-nums
                      ${readyNow === 0 ? 'text-c4' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {readyNow}
                    </span>
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cbrd)' }}>
                        <div
                          className={`h-full rounded-full transition-all duration-700
                            ${isBottleneck
                              ? 'bg-gradient-to-r from-red-600 to-red-400'
                              : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                          style={{ width: `${Math.max(p.progress, 2)}%` }}
                        />
                      </div>
                      <span className="text-[12px] tabular-nums w-8 text-right shrink-0 font-medium text-c4">
                        {p.progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-[12px] text-c4">Позицій не знайдено</p>
          </div>
        )}
      </div>
    </div>
  );
}
