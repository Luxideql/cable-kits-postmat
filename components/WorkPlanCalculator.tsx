'use client';
import { useState, useMemo, useEffect } from 'react';
import StatsCard from '@/components/StatsCard';

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

function distribute(positions: PositionRow[], workers: number, planPerWorker: number, targetKits: number): Task[][] {
  // Deficit per position: how many units are still missing to reach targetKits
  const needed = positions
    .map(p => ({
      id: p.id,
      lengthMm: p.lengthMm,
      needed: Math.max(0, Math.ceil(targetKits * p.qtyPerPostomat) - p.available),
    }))
    .filter(p => p.needed > 0)
    .sort((a, b) => b.needed - a.needed);

  const workerTasks: Task[][] = Array.from({ length: workers }, () => []);
  const workerLoad = Array(workers).fill(0);
  const queue = needed.map(p => ({ ...p, remaining: p.needed }));

  let wIdx = 0;
  let qi   = 0;

  while (wIdx < workers && qi < queue.length) {
    const capacity = planPerWorker - workerLoad[wIdx];
    if (capacity <= 0) { wIdx++; continue; }

    const pos    = queue[qi];
    const assign = Math.min(pos.remaining, capacity);

    if (assign > 0) {
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

const PrintIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

function PrintModal({
  workerTasks, workerNames, today, onClose,
}: {
  workerTasks: Task[][];
  workerNames: string[];
  today: string;
  onClose: () => void;
}) {
  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #wplan-print, #wplan-print * { visibility: visible !important; }
          #wplan-print {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 shrink-0"
             style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
            Попередній перегляд · {today}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer', background: 'none', border: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Закрити
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5"
              style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: '#4f46e5', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#4338ca')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4f46e5')}
            >
              <PrintIcon />
              Друкувати
            </button>
          </div>
        </div>

        {/* Scrollable A4 preview */}
        <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#e5e7eb' }}>
          <div
            id="wplan-print"
            style={{ maxWidth: '794px', margin: '0 auto', backgroundColor: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
          >
            {workerTasks.map((tasks, i) => {
              const workerTotal = tasks.reduce((s, t) => s + t.qty, 0);
              const name = workerNames[i]?.trim() || `Працівник ${i + 1}`;
              const isLast = i === workerTasks.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    padding: '28px 36px',
                    pageBreakAfter: isLast ? 'auto' : 'always',
                    breakAfter: isLast ? 'auto' : 'page',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <p style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.1 }}>{name}</p>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{today}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Загальний план</p>
                      <p style={{ fontSize: '38px', fontWeight: 800, color: '#4f46e5', margin: 0, lineHeight: 1 }}>{workerTotal}</p>
                      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>одиниць</p>
                    </div>
                  </div>

                  {/* Tasks table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                          Позиція
                        </th>
                        <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                          Кількість
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ padding: '14px 0', fontSize: '13px', color: '#9ca3af' }}>Завдань немає</td>
                        </tr>
                      ) : tasks.map(t => (
                        <tr key={t.posId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '11px 0', fontSize: '17px', color: '#374151', fontWeight: 500 }}>{t.lengthMm} мм</td>
                          <td style={{ padding: '11px 0', textAlign: 'right', fontSize: '22px', fontWeight: 800, color: '#111827' }}>{t.qty} шт</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                        <td style={{ padding: '10px 0', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Разом
                        </td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontSize: '22px', fontWeight: 800, color: '#4f46e5' }}>
                          {workerTotal} шт
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Signature line */}
                  <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed #d1d5db', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
                    <span>Підпис: _________________________</span>
                    <span>Виконано: _______ шт &nbsp;·&nbsp; ___.___.______</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default function WorkPlanCalculator({ positions }: Props) {
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
  }, []);

  const [workers, setWorkers]             = useState<number>(saved?.workers ?? 3);
  const [planPerWorker, setPlanPerWorker] = useState<number>(saved?.planPerWorker ?? 40);
  const [workerNames, setWorkerNames]     = useState<string[]>(
    Array.from({ length: saved?.workers ?? 3 }, (_, i) => saved?.workerNames?.[i] ?? '')
  );
  const [showPrint, setShowPrint]         = useState(false);

  // Keep names array in sync with workers count
  useEffect(() => {
    setWorkerNames(prev => {
      if (prev.length === workers) return prev;
      if (prev.length < workers) return [...prev, ...Array(workers - prev.length).fill('')];
      return prev.slice(0, workers);
    });
  }, [workers]);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ workers, planPerWorker, workerNames }));
  }, [workers, planPerWorker, workerNames]);

  const today = new Date().toLocaleDateString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const unitsPerKit    = positions.reduce((s, p) => s + p.qtyPerPostomat, 0);
  const totalUnits     = workers * planPerWorker;
  const additionalKits = unitsPerKit > 0 ? Math.floor(totalUnits / unitsPerKit) : 0;

  // Complete kits already in stock (bottleneck = minimum across positions)
  const stockKits = useMemo(() => {
    const active = positions.filter(p => p.qtyPerPostomat > 0);
    if (active.length === 0) return 0;
    return Math.min(...active.map(p => Math.floor(p.available / p.qtyPerPostomat)));
  }, [positions]);

  // Target = stock kits + what workers will add
  const targetKits = stockKits + additionalKits;

  const workerTasks = useMemo(
    () => distribute(positions, workers, planPerWorker, targetKits),
    [positions, workers, planPerWorker, targetKits]
  );

  // Complete kits after workers finish (stock + production per position)
  const actualKits = useMemo(() => {
    const active = positions.filter(p => p.qtyPerPostomat > 0);
    if (active.length === 0) return 0;
    const allTasks = workerTasks.flat();
    return Math.min(...active.map(p => {
      const produced = allTasks
        .filter(t => t.posId === p.id)
        .reduce((s, t) => s + t.qty, 0);
      return Math.floor((p.available + produced) / p.qtyPerPostomat);
    }));
  }, [workerTasks, positions]);

  // Total units workers actually need to produce (sum of deficits)
  const totalToMake = positions
    .filter(p => p.qtyPerPostomat > 0)
    .reduce((s, p) => s + Math.max(0, Math.ceil(targetKits * p.qtyPerPostomat) - p.available), 0);

  function updateName(i: number, name: string) {
    setWorkerNames(prev => {
      const next = [...prev];
      next[i] = name;
      return next;
    });
  }

  return (
    <div className="space-y-4">

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Після виробітку"
          value={unitsPerKit > 0 ? actualKits : '—'}
          sub={unitsPerKit > 0 ? `склад ${stockKits} + додають ${additionalKits}` : 'немає позицій'}
          color="indigo"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
        />
        <StatsCard
          title="Вже на складі"
          value={unitsPerKit > 0 ? stockKits : '—'}
          sub="готових комплектів зараз"
          color="emerald"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>}
        />
        <StatsCard
          title="Треба доробити"
          value={`${totalToMake} шт`}
          sub={`дефіцит — до ${targetKits} компл.`}
          color="amber"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
        <StatsCard
          title="Одиниць / компл."
          value={`${unitsPerKit} шт`}
          sub={`у ${positions.filter(p => p.qtyPerPostomat > 0).length} позиціях`}
          color="slate"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>}
        />
        <StatsCard
          title="Працівників"
          value={workers}
          sub={`по ${planPerWorker} шт кожен`}
          color="violet"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
      </div>

      {/* Inputs */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4">Параметри</p>
          <button
            type="button"
            onClick={() => setShowPrint(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium
                       text-indigo-600 dark:text-indigo-400 transition-colors"
            style={{ border: '1px solid var(--cbrd)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--chov)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            <PrintIcon />
            Друкувати
          </button>
        </div>
        <div className="flex flex-wrap gap-6 items-end">
          <Stepper label="Кількість працівників" value={workers} onChange={setWorkers} />
          <Stepper label="План на 1 прац. (шт)" value={planPerWorker} onChange={setPlanPerWorker} />
        </div>
      </div>

      {/* Worker cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {workerTasks.map((tasks, i) => {
          const workerTotal = tasks.reduce((s, t) => s + t.qty, 0);
          return (
            <div key={i} className="card overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3"
                   style={{ borderBottom: '1px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold text-white
                                    bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
                      {i + 1}
                    </div>
                    <input
                      type="text"
                      value={workerNames[i] ?? ''}
                      onChange={e => updateName(i, e.target.value)}
                      placeholder={`Працівник ${i + 1}`}
                      className="flex-1 min-w-0 bg-transparent text-[14px] font-semibold text-c1
                                 outline-none placeholder:text-c4 placeholder:font-normal"
                    />
                  </div>
                  <span className="text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0 ml-2">
                    {workerTotal} шт
                  </span>
                </div>
                <p className="text-[11px] text-c4 mt-1 ml-9">{today}</p>
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

      {/* Print modal */}
      {showPrint && (
        <PrintModal
          workerTasks={workerTasks}
          workerNames={workerNames}
          today={today}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
