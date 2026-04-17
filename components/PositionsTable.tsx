'use client';
import { useState } from 'react';
import type { PositionStats } from '@/lib/types';

interface Props { positions: PositionStats[]; shipped?: number }
type SortKey = 'lengthMm' | 'stock' | 'produced' | 'available' | 'kits' | 'progress';

const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
       className={`ml-1 inline transition-all duration-200 ${active ? 'opacity-100' : 'opacity-20'}`}>
    {asc ? <path d="M5 2L9 8H1L5 2Z"/> : <path d="M5 8L1 2H9L5 8Z"/>}
  </svg>
);

export default function PositionsTable({ positions, shipped = 0 }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('kits');
  const [sortAsc, setSortAsc]  = useState(false);

  const minKits = positions.length ? Math.min(...positions.map(p => p.kits)) : 0;
  const sorted  = [...positions].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortAsc ? diff : -diff;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  };

  const TH = ({ k, label, align = 'left' }: { k: SortKey; label: string; align?: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`th ${align === 'right' ? 'text-right' : 'text-left'}
        ${sortKey === k ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
    >
      {label}<SortIcon active={sortKey === k} asc={sortAsc} />
    </th>
  );

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
              <TH k="lengthMm"  label="Позиція" />
              <th className="th text-left">Комірки</th>
              <TH k="stock"     label="Залишок"    align="right" />
              <TH k="produced"  label="Вироблено"  align="right" />
              <th className="th text-right">
                <span className="block leading-none">Разом</span>
                <span className="block text-[10px] font-normal text-c4 mt-0.5 normal-case tracking-normal">склад + вироблено</span>
              </th>
              <TH k="kits"      label="Комплектів" align="right" />
              <th className="th text-right">
                <span className="block leading-none">Вільних компл.</span>
                <span className="block text-[10px] font-normal text-c4 mt-0.5 normal-case tracking-normal">компл. − відправлено</span>
              </th>
              <TH k="progress"  label="Прогрес" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => {
              const isBottleneck = p.kits === minKits && p.kits >= 0;
                  const readyNow = Math.max(0, p.kits - shipped);
              const isLast = idx === sorted.length - 1;
              return (
                <tr
                  key={p.id}
                  className={`group transition-colors duration-100 ${isBottleneck ? 'bg-red-500/[0.04]' : ''}`}
                  style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = isBottleneck ? 'rgba(239,68,68,0.06)' : 'var(--chov)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = isBottleneck ? 'rgba(239,68,68,0.04)' : '')}
                >
                  {/* Position */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0
                        ${isBottleneck ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]' : 'bg-indigo-500/50'}`} />
                      <span className="text-[14px] font-semibold text-c1">{p.lengthMm} мм</span>
                      {isBottleneck && <span className="badge-red ml-0.5">вузьке</span>}
                    </div>
                  </td>

                  {/* Cells */}
                  <td className="px-4 py-3 text-[13px] font-mono text-c4">{p.cellNumbers || '—'}</td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-right text-[14px] text-c3">{p.stock}</td>

                  {/* Produced */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-[14px] font-medium text-emerald-600 dark:text-emerald-400">{p.produced}</span>
                  </td>

                  {/* Total (stock + produced) */}
                  <td className="px-4 py-3 text-right text-[14px] font-semibold text-c2">{p.available}</td>

                  {/* Kits */}
                  <td className="px-4 py-3 text-right">
                    <span className={`text-[15px] font-bold tabular-nums
                      ${isBottleneck ? 'text-red-600 dark:text-red-400' : 'text-c1'}`}>
                      {p.kits}
                    </span>
                  </td>

                  {/* Ready now (kits − shipped) */}
                  <td className="px-4 py-3 text-right">
                    <span className={`text-[15px] font-bold tabular-nums
                      ${readyNow === 0 ? 'text-c4' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {readyNow}
                    </span>
                  </td>

                  {/* Progress */}
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
                      <span className={`text-[12px] tabular-nums w-8 text-right shrink-0 font-medium text-c4`}>
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
