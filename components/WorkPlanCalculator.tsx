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

const LS_KEY = 'workplan_v1';

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

export default function WorkPlanCalculator({ positions }: Props) {
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
  }, []);

  const [workers, setWorkers]           = useState<number>(saved?.workers ?? 3);
  const [planPerWorker, setPlanPerWorker] = useState<number>(saved?.planPerWorker ?? 40);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ workers, planPerWorker }));
  }, [workers, planPerWorker]);

  const totalUnits  = workers * planPerWorker;
  const unitsPerKit = positions.reduce((s, p) => s + p.qtyPerPostomat, 0);
  const totalKits   = unitsPerKit > 0 ? totalUnits / unitsPerKit : 0;

  // Per-position: how many units to produce (plan only, stock not deducted)
  const posRemaining = positions.map(p => ({
    ...p,
    needed:    Math.round(totalKits * p.qtyPerPostomat),
    remaining: Math.round(totalKits * p.qtyPerPostomat),
  }));

  const totalRemaining = posRemaining.reduce((s, p) => s + p.remaining, 0);
  const totalNeeded    = posRemaining.reduce((s, p) => s + p.needed, 0);
  const totalAvailable = posRemaining.reduce((s, p) => s + p.available, 0);

  // Distribute remaining fairly: worker i gets floor(rem/n) + (i < rem%n ? 1 : 0)
  type WorkerTask = { lengthMm: number; qty: number }[];
  const workerTasks: WorkerTask[] = Array.from({ length: workers }, () => []);

  for (const p of posRemaining) {
    if (p.remaining === 0) continue;
    const base  = Math.floor(p.remaining / workers);
    const extra = p.remaining % workers;
    for (let i = 0; i < workers; i++) {
      const qty = base + (i < extra ? 1 : 0);
      if (qty > 0) workerTasks[i].push({ lengthMm: p.lengthMm, qty });
    }
  }

  const allDone = false;

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
            <p className="text-[26px] font-semibold text-c1 leading-none tabular-nums">{totalUnits} <span className="text-[14px] font-normal text-c4">шт</span></p>
            <p className="text-[11px] text-c4 mt-0.5">≈ {Math.floor(totalKits)} компл. · {workers} × {planPerWorker}</p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-c4 mb-1">Залишилось виготовити</p>
            {allDone ? (
              <p className="text-[18px] font-semibold text-emerald-500 leading-none">✓ Залишків достатньо</p>
            ) : (
              <>
                <p className="text-[26px] font-semibold text-amber-500 leading-none tabular-nums">{totalRemaining} <span className="text-[14px] font-normal text-c4">шт</span></p>
                <p className="text-[11px] text-c4 mt-0.5">є {totalAvailable} з {totalNeeded} потрібних</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Worker cards */}
      {allDone ? (
        <div className="card p-6 text-center">
          <p className="text-[15px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Всі залишки в наявності — завдань немає</p>
          <p className="text-[12px] text-c4 mt-1">На складі достатньо для {totalKits} комплектів</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {workerTasks.map((tasks, i) => {
            const workerTotal = tasks.reduce((s, t) => s + t.qty, 0);
            return (
              <div key={i} className="card overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-3 flex items-center justify-between"
                     style={{ borderBottom: '1px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white
                                    bg-gradient-to-br from-indigo-500 to-purple-600">
                      {i + 1}
                    </div>
                    <span className="text-[14px] font-semibold text-c1">Працівник {i + 1}</span>
                  </div>
                  <span className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {workerTotal} шт
                  </span>
                </div>

                {/* Task rows */}
                <div className="divide-y" style={{ borderColor: 'var(--cbrd)' }}>
                  {tasks.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-c4">Завдань немає</p>
                  ) : (
                    tasks.map(t => (
                      <div key={t.lengthMm} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-[13px] text-c3">{t.lengthMm} мм</span>
                        <span className="text-[15px] font-bold text-c1 tabular-nums">{t.qty} шт</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Card footer */}
                <div className="px-4 py-2.5 flex items-center justify-between"
                     style={{ borderTop: '2px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-c4">Разом</span>
                  <span className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{workerTotal} шт</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Overview table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cbrd)' }}>
          <h2 className="text-[13px] font-semibold text-c3">Зведення по позиціях</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                <th className="th text-left">Позиція</th>
                <th className="th text-right">Потрібно</th>
                <th className="th text-right">Є на складі</th>
                <th className="th text-right">Залишилось</th>
              </tr>
            </thead>
            <tbody>
              {posRemaining.map((p, i) => {
                const isLast = i === posRemaining.length - 1;
                const done = p.remaining === 0;
                return (
                  <tr key={p.id} className="row-hover"
                      style={{ ...(!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}), ...(done ? { opacity: 0.5 } : {}) }}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className="text-[13px] font-semibold text-c1">{p.lengthMm} мм</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right text-[13px] text-c3 tabular-nums">{p.needed}</td>
                    <td className="px-5 py-2.5 text-right text-[13px] text-c3 tabular-nums">{p.available}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {done
                        ? <span className="text-[12px] text-emerald-600 dark:text-emerald-400">✓ є</span>
                        : <span className="text-[14px] font-bold text-amber-500">{p.remaining}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--cbrd)' }}>
                <td className="px-5 py-2.5 text-[12px] font-semibold text-c3" colSpan={2}>Всього</td>
                <td className="px-5 py-2.5 text-right text-[13px] font-semibold text-c2 tabular-nums">{totalAvailable}</td>
                <td className="px-5 py-2.5 text-right tabular-nums">
                  {allDone
                    ? <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ 0</span>
                    : <span className="text-[14px] font-bold text-amber-500">{totalRemaining}</span>}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
