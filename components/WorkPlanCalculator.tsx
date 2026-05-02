'use client';
import { useState, useMemo, useEffect } from 'react';

type PositionRow = {
  id: string;
  lengthMm: number;
  qtyPerPostomat: number;
  available: number;
};

type Props = {
  positions: PositionRow[];
};

const LS_KEY = 'workplan_v2';

function Stepper({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-c4 mb-2">{label}</p>
      <div className="flex items-center gap-0">
        <button type="button" onClick={() => onChange(Math.max(1, value - 1))}
          className="w-8 h-8 rounded-l-lg flex items-center justify-center text-c3 hover:text-c1 transition-colors text-[16px]"
          style={{ backgroundColor: 'var(--chov)', border: '1px solid var(--cbrd)', borderRight: 'none' }}>−</button>
        <input type="number" value={value} min={1}
          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) onChange(v); }}
          className="w-14 h-8 text-center text-[15px] font-semibold text-c1 bg-transparent outline-none tabular-nums"
          style={{ border: '1px solid var(--cbrd)' }} />
        <button type="button" onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-r-lg flex items-center justify-center text-c3 hover:text-c1 transition-colors text-[16px]"
          style={{ backgroundColor: 'var(--chov)', border: '1px solid var(--cbrd)', borderLeft: 'none' }}>+</button>
      </div>
    </div>
  );
}

// Build default assignments: all workers assigned to all positions
function defaultAssignments(posIds: string[], n: number): Record<string, number[]> {
  return Object.fromEntries(posIds.map(id => [id, Array.from({ length: n }, (_, i) => i)]));
}

export default function WorkPlanCalculator({ positions }: Props) {
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
  }, []);

  const [workers, setWorkers]             = useState<number>(saved?.workers ?? 3);
  const [planPerWorker, setPlanPerWorker] = useState<number>(saved?.planPerWorker ?? 40);
  const [assignments, setAssignments]     = useState<Record<string, number[]>>(
    () => saved?.assignments ?? defaultAssignments(positions.map(p => p.id), saved?.workers ?? 3)
  );

  // When workers count changes, reset assignments to include all workers
  useEffect(() => {
    setAssignments(defaultAssignments(positions.map(p => p.id), workers));
  }, [workers, positions.length]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ workers, planPerWorker, assignments }));
  }, [workers, planPerWorker, assignments]);

  const totalUnits  = workers * planPerWorker;
  const unitsPerKit = positions.reduce((s, p) => s + p.qtyPerPostomat, 0);
  const totalKits   = unitsPerKit > 0 ? totalUnits / unitsPerKit : 0;

  // Per-position needed units
  const posNeeded = positions.map(p => ({
    ...p,
    needed: Math.round(totalKits * p.qtyPerPostomat),
  }));

  function toggleAssignment(posId: string, workerIdx: number) {
    setAssignments(prev => {
      const current = prev[posId] ?? [];
      const hasIt = current.includes(workerIdx);
      // Don't allow removing the last assigned worker
      if (hasIt && current.length === 1) return prev;
      const next = hasIt ? current.filter(i => i !== workerIdx) : [...current, workerIdx].sort((a, b) => a - b);
      return { ...prev, [posId]: next };
    });
  }

  // Build per-worker tasks based on assignments
  type Task = { lengthMm: number; posId: string; qty: number };
  const workerTasks: Task[][] = Array.from({ length: workers }, () => []);

  for (const p of posNeeded) {
    if (p.needed === 0) continue;
    const assigned = (assignments[p.id] ?? Array.from({ length: workers }, (_, i) => i));
    const n = assigned.length;
    const base  = Math.floor(p.needed / n);
    const extra = p.needed % n;
    assigned.forEach((wIdx, i) => {
      const qty = base + (i < extra ? 1 : 0);
      if (qty > 0) workerTasks[wIdx].push({ lengthMm: p.lengthMm, posId: p.id, qty });
    });
  }

  return (
    <div className="space-y-4">

      {/* Inputs */}
      <div className="card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4 mb-4">Параметри</p>
        <div className="flex flex-wrap gap-6 items-end">
          <Stepper label="Кількість працівників" value={workers} onChange={setWorkers} />
          <Stepper label="План на 1 прац. (шт)" value={planPerWorker} onChange={setPlanPerWorker} />
          <div>
            <p className="text-[12px] font-medium text-c4 mb-1">Ціль</p>
            <p className="text-[26px] font-semibold text-c1 leading-none tabular-nums">
              {totalUnits} <span className="text-[14px] font-normal text-c4">шт</span>
            </p>
            <p className="text-[11px] text-c4 mt-0.5">≈ {Math.floor(totalKits)} компл. · {workers} × {planPerWorker}</p>
          </div>
        </div>
      </div>

      {/* Assignment matrix */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cbrd)' }}>
          <div>
            <h2 className="text-[15px] font-semibold text-c1">Розподіл позицій</h2>
            <p className="text-[12px] text-c4 mt-0.5">Галочка — працівник виконує цю позицію</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                <th className="th text-left">Позиція</th>
                <th className="th text-right">Потрібно</th>
                {Array.from({ length: workers }, (_, i) => (
                  <th key={i} className="th text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                      {i + 1}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posNeeded.map((p, i) => {
                const assigned = assignments[p.id] ?? Array.from({ length: workers }, (_, i) => i);
                const isLast = i === posNeeded.length - 1;
                return (
                  <tr key={p.id} className="row-hover"
                      style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}>
                    <td className="px-5 py-3">
                      <span className="text-[14px] font-semibold text-c1">{p.lengthMm} мм</span>
                      <span className="text-[11px] text-c4 ml-2">{p.qtyPerPostomat} шт/компл.</span>
                    </td>
                    <td className="px-5 py-3 text-right text-[14px] font-semibold text-c1 tabular-nums">
                      {p.needed} шт
                    </td>
                    {Array.from({ length: workers }, (_, wIdx) => {
                      const checked = assigned.includes(wIdx);
                      const isOnly  = assigned.length === 1 && checked;
                      return (
                        <td key={wIdx} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleAssignment(p.id, wIdx)}
                            title={isOnly ? 'Мінімум 1 працівник' : ''}
                            className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all duration-150"
                            style={{
                              backgroundColor: checked ? 'rgba(99,102,241,0.15)' : 'var(--chov)',
                              border: `1.5px solid ${checked ? 'rgba(99,102,241,0.5)' : 'var(--cbrd)'}`,
                              opacity: isOnly ? 0.5 : 1,
                              cursor: isOnly ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {checked && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                   stroke="rgb(99,102,241)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {workerTasks.map((tasks, i) => {
          const workerTotal = tasks.reduce((s, t) => s + t.qty, 0);
          return (
            <div key={i} className="card overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between"
                   style={{ borderBottom: '1px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white
                                  bg-gradient-to-br from-indigo-500 to-purple-600">
                    {i + 1}
                  </div>
                  <span className="text-[14px] font-semibold text-c1">Працівник {i + 1}</span>
                </div>
                <span className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {workerTotal} шт
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--cbrd)' }}>
                {tasks.length === 0 ? (
                  <p className="px-4 py-3 text-[13px] text-c4">Завдань немає</p>
                ) : tasks.map(t => (
                  <div key={t.posId} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[13px] text-c3">{t.lengthMm} мм</span>
                    <span className="text-[15px] font-bold text-c1 tabular-nums">{t.qty} шт</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between"
                   style={{ borderTop: '2px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-c4">Разом</span>
                <span className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {workerTotal} шт
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
