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

function Stepper({ label, value, onChange, step = 1 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-c4 mb-2">{label}</p>
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - step))}
          className="w-8 h-8 rounded-l-lg flex items-center justify-center text-c3 hover:text-c1 transition-colors text-[16px] font-medium"
          style={{ backgroundColor: 'var(--chov)', border: '1px solid var(--cbrd)', borderRight: 'none' }}
        >−</button>
        <input
          type="number"
          value={value}
          min={1}
          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) onChange(v); }}
          className="w-16 h-8 text-center text-[15px] font-semibold text-c1 bg-transparent outline-none tabular-nums"
          style={{ border: '1px solid var(--cbrd)' }}
        />
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="w-8 h-8 rounded-r-lg flex items-center justify-center text-c3 hover:text-c1 transition-colors text-[16px] font-medium"
          style={{ backgroundColor: 'var(--chov)', border: '1px solid var(--cbrd)', borderLeft: 'none' }}
        >+</button>
      </div>
    </div>
  );
}

export default function WorkPlanCalculator({ positions }: Props) {
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
  }, []);

  const [workers, setWorkers] = useState<number>(saved?.workers ?? 1);
  const [planPerWorker, setPlanPerWorker] = useState<number>(saved?.planPerWorker ?? 1);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ workers, planPerWorker }));
  }, [workers, planPerWorker]);

  const totalKits = workers * planPerWorker;

  const rows = positions.map(p => {
    const needed    = totalKits * p.qtyPerPostomat;
    const remaining = Math.max(0, needed - p.available);
    const perWorker = workers > 0 ? Math.ceil(remaining / workers) : 0;
    const done      = remaining === 0;
    return { ...p, needed, remaining, perWorker, done };
  });

  const totNeeded    = rows.reduce((s, r) => s + r.needed, 0);
  const totAvailable = rows.reduce((s, r) => s + r.available, 0);
  const totRemaining = rows.reduce((s, r) => s + r.remaining, 0);
  const totPerWorker = rows.reduce((s, r) => s + r.perWorker, 0);
  const allDone      = totRemaining === 0;

  return (
    <div className="space-y-4">

      {/* Inputs */}
      <div className="card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4 mb-4">Параметри</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <Stepper label="Працівників" value={workers} onChange={setWorkers} />
          <Stepper label="План на 1 прац. (компл.)" value={planPerWorker} onChange={setPlanPerWorker} />
          <div>
            <p className="text-[12px] font-medium text-c4 mb-2">Ціль</p>
            <p className="text-[28px] font-semibold text-c1 leading-none tabular-nums">{totalKits}</p>
            <p className="text-[12px] text-c4 mt-1">компл. = {workers} × {planPerWorker}</p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-c4 mb-2">Статус</p>
            {allDone ? (
              <span className="badge-green text-[13px] px-3 py-1">✓ Залишків достатньо</span>
            ) : (
              <div>
                <p className="text-[22px] font-semibold text-amber-500 leading-none tabular-nums">{totRemaining}</p>
                <p className="text-[12px] text-c4 mt-1">шт залишилось</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cbrd)' }}>
          <div>
            <h2 className="text-[15px] font-semibold text-c1">Розподіл по позиціях</h2>
            <p className="text-[12px] text-c4 mt-0.5">Скільки кожному працівнику треба виготов��ти</p>
          </div>
          <span className="badge-indigo">{positions.length} позицій</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                <th className="th text-left">Позиція</th>
                <th className="th text-right">К-сть/компл.</th>
                <th className="th text-right">Потрібно всього</th>
                <th className="th text-right">Вже є</th>
                <th className="th text-right">Залишилось</th>
                <th className="th text-right">На 1 прац.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isLast = i === rows.length - 1;
                return (
                  <tr
                    key={r.id}
                    className={r.done ? 'row-hover' : 'row-hover'}
                    style={{
                      ...((!isLast) ? { borderBottom: '1px solid var(--cbrd)' } : {}),
                      ...(r.done ? { opacity: 0.6 } : {}),
                    }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.done ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className="text-[14px] font-semibold text-c1">{r.lengthMm} мм</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] text-c4 tabular-nums">{r.qtyPerPostomat}</td>
                    <td className="px-5 py-3 text-right text-[13px] text-c3 tabular-nums">{r.needed}</td>
                    <td className="px-5 py-3 text-right text-[13px] tabular-nums"
                        style={{ color: r.available >= r.needed ? 'var(--c3)' : 'var(--c3)' }}>
                      {r.available}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {r.done ? (
                        <span className="text-[13px] text-emerald-600 dark:text-emerald-400 font-medium">✓ є</span>
                      ) : (
                        <span className="text-[14px] font-semibold text-amber-500">{r.remaining}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {r.done ? (
                        <span className="text-[13px] text-c4">—</span>
                      ) : (
                        <span className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400">{r.perWorker}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--cbrd)' }}>
                <td className="px-5 py-3 text-[13px] font-semibold text-c3" colSpan={2}>Всього</td>
                <td className="px-5 py-3 text-right text-[13px] font-semibold text-c2 tabular-nums">{totNeeded}</td>
                <td className="px-5 py-3 text-right text-[13px] font-semibold text-c2 tabular-nums">{totAvailable}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {allDone ? (
                    <span className="text-[13px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ 0</span>
                  ) : (
                    <span className="text-[15px] font-bold text-amber-500">{totRemaining}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {allDone ? (
                    <span className="text-[13px] text-c4">—</span>
                  ) : (
                    <span className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400">{totPerWorker}</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Per-worker summary */}
      {!allDone && (
        <div className="card p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4 mb-3">Завдання на 1 працівника</p>
          <div className="space-y-2">
            {rows.filter(r => !r.done).map(r => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="text-[13px] text-c3">{r.lengthMm} мм</span>
                <span className="text-[14px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {r.perWorker} шт
                </span>
              </div>
            ))}
            <div className="pt-2 mt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--cbrd)' }}>
              <span className="text-[13px] font-semibold text-c2">Разом</span>
              <span className="text-[15px] font-bold text-c1 tabular-nums">{totPerWorker} шт</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
