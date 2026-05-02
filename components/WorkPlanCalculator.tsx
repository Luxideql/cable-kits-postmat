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

const LS_KEY = 'workplan_v3';

function Stepper({ label, sub, value, onChange }: {
  label: string; sub?: string; value: number; onChange: (v: number) => void;
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
      {sub && <p className="text-[11px] text-c4 mt-1">{sub}</p>}
    </div>
  );
}

type Task = { lengthMm: number; posId: string; qty: number };

function distribute(positions: PositionRow[], workers: number, planPerWorker: number, totalKits: number): Task[][] {
  // Calculate needed per position
  const needed = positions
    .map(p => ({ id: p.id, lengthMm: p.lengthMm, needed: Math.ceil(totalKits * p.qtyPerPostomat) }))
    .filter(p => p.needed > 0)
    .sort((a, b) => b.needed - a.needed); // largest first

  const workerTasks: Task[][] = Array.from({ length: workers }, () => []);
  const workerLoad = Array(workers).fill(0);

  // Queue of positions with remaining units
  const queue = needed.map(p => ({ ...p, remaining: p.needed }));

  let wIdx = 0;
  let qi   = 0;

  while (wIdx < workers && qi < queue.length) {
    const capacity = planPerWorker - workerLoad[wIdx];
    if (capacity <= 0) { wIdx++; continue; }

    const pos    = queue[qi];
    const assign = Math.min(pos.remaining, capacity);

    if (assign > 0) {
      // Merge with existing task for same position if already in this worker's list
      const existing = workerTasks[wIdx].find(t => t.posId === pos.id);
      if (existing) existing.qty += assign;
      else workerTasks[wIdx].push({ lengthMm: pos.lengthMm, posId: pos.id, qty: assign });

      workerLoad[wIdx] += assign;
      pos.remaining    -= assign;
    }

    if (pos.remaining === 0) qi++;
    if (workerLoad[wIdx] >= planPerWorker) wIdx++;
  }

  return workerTasks;
}

export default function WorkPlanCalculator({ positions }: Props) {
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
  }, []);

  const [workers, setWorkers]             = useState<number>(saved?.workers ?? 3);
  const [planPerWorker, setPlanPerWorker] = useState<number>(saved?.planPerWorker ?? 40);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ workers, planPerWorker }));
  }, [workers, planPerWorker]);

  const unitsPerKit = positions.reduce((s, p) => s + p.qtyPerPostomat, 0);
  const totalUnits  = workers * planPerWorker;
  const totalKits   = unitsPerKit > 0 ? totalUnits / unitsPerKit : 0;

  const workerTasks = useMemo(
    () => distribute(positions, workers, planPerWorker, totalKits),
    [positions, workers, planPerWorker, totalKits]
  );

  return (
    <div className="space-y-4">

      {/* Inputs */}
      <div className="card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4 mb-4">Параметри</p>
        <div className="flex flex-wrap gap-6 items-end">
          <Stepper label="Кількість працівників" value={workers} onChange={setWorkers} />
          <Stepper label="План на 1 прац. (шт)" value={planPerWorker} onChange={setPlanPerWorker} />
          <div>
            <p className="text-[12px] font-medium text-c4 mb-1">Загальна ціль</p>
            <p className="text-[26px] font-semibold text-c1 leading-none tabular-nums">
              {totalUnits} <span className="text-[14px] font-normal text-c4">шт</span>
            </p>
            <p className="text-[11px] text-c4 mt-0.5">
              ≈ {Math.floor(totalKits)} компл. · {workers} × {planPerWorker}
            </p>
          </div>
        </div>
      </div>

      {/* Worker cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {workerTasks.map((tasks, i) => {
          const workerTotal = tasks.reduce((s, t) => s + t.qty, 0);
          return (
            <div key={i} className="card overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between"
                   style={{ borderBottom: '1px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white
                                  bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-[14px] font-semibold text-c1">Працівник {i + 1}</span>
                </div>
                <span className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {workerTotal} шт
                </span>
              </div>

              {/* Tasks */}
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

              {/* Footer */}
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
