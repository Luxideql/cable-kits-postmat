'use client';
import { useState, useMemo, useEffect } from 'react';
import StatsCard from './StatsCard';

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

function distribute(positions: PositionRow[], workers: number, planPerWorker: number): Task[][] {
  const active = positions.filter(p => p.qtyPerPostomat > 0);
  const totalCapacity = workers * planPerWorker;
  const unitsPerKit   = active.reduce((s, p) => s + p.qtyPerPostomat, 0);

  if (!active.length || !unitsPerKit || !totalCapacity)
    return Array.from({ length: workers }, () => []);

  // Hamilton's largest-remainder method: guarantees sum == totalCapacity exactly
  const exact  = active.map(p => totalCapacity * p.qtyPerPostomat / unitsPerKit);
  const floors = exact.map(Math.floor);
  const remain = totalCapacity - floors.reduce((s, f) => s + f, 0);

  const allocs = [...floors];
  exact
    .map((e, i) => ({ i, frac: e - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, remain)
    .forEach(({ i }) => allocs[i]++);

  // Sort DESC so the largest positions fill first
  const queue = active
    .map((p, i) => ({ id: p.id, lengthMm: p.lengthMm, remaining: allocs[i] }))
    .filter(a => a.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  const workerTasks: Task[][] = Array.from({ length: workers }, () => []);
  const workerLoad = Array(workers).fill(0);
  let wIdx = 0, qi = 0;

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
  workerTasks, workerNames, today, onClose, workerIndex,
}: {
  workerTasks: Task[][];
  workerNames: string[];
  today: string;
  onClose: () => void;
  workerIndex?: number;
}) {
  function handlePrint() {
    const list = workerIndex !== undefined
      ? [{ tasks: workerTasks[workerIndex], i: workerIndex }]
      : workerTasks.map((tasks, i) => ({ tasks, i }));

    const pagesHtml = list.map(({ tasks, i }, arrIdx) => {
      const name = workerNames[i]?.trim() || `Працівник ${i + 1}`;
      const total = tasks.reduce((s, t) => s + t.qty, 0);
      const isLast = arrIdx === list.length - 1;
      const rows = tasks.length === 0
        ? `<tr><td colspan="2" style="padding:14px 0;font-size:13px;color:#9ca3af">Завдань немає</td></tr>`
        : tasks.map(t => `
            <tr style="border-bottom:1px solid #f3f4f6">
              <td style="padding:11px 0;font-size:17px;color:#374151;font-weight:500">${t.lengthMm} мм</td>
              <td style="padding:11px 0;text-align:right;font-size:22px;font-weight:800;color:#111827">${t.qty} шт</td>
            </tr>`).join('');

      return `
        <div style="padding:36px 48px;${!isLast ? 'page-break-after:always;break-after:page;' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
            <div>
              <div style="font-size:28px;font-weight:800;color:#111827;line-height:1.1">${name}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:4px">${today}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">Загальний план</div>
              <div style="font-size:44px;font-weight:800;color:#4f46e5;line-height:1">${total}</div>
              <div style="font-size:13px;color:#6b7280">одиниць</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:2px solid #e5e7eb">
                <th style="text-align:left;padding:8px 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Позиція</th>
                <th style="text-align:right;padding:8px 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Кількість</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid #e5e7eb">
                <td style="padding:10px 0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Разом</td>
                <td style="padding:10px 0;text-align:right;font-size:22px;font-weight:800;color:#4f46e5">${total} шт</td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding-top:14px;border-top:1px dashed #d1d5db;display:flex;justify-content:space-between;font-size:12px;color:#9ca3af">
            <span>Підпис: _________________________</span>
            <span>Виконано: _______ шт &nbsp;·&nbsp; ___.___.______</span>
          </div>
        </div>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: white; }
        @media print { @page { size: A4; margin: 0; } }
      </style>
    </head><body>${pagesHtml}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #wplan-print, #wplan-print * { visibility: visible !important; }
          #wplan-print {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .wplan-page { page-break-after: always !important; break-after: page !important; }
          .wplan-page-last { page-break-after: avoid !important; break-after: avoid !important; }
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
            {workerTasks
              .map((tasks, i) => ({ tasks, i }))
              .filter(({ i }) => workerIndex === undefined || i === workerIndex)
              .map(({ tasks, i }, arrIdx, arr) => {
              const workerTotal = tasks.reduce((s, t) => s + t.qty, 0);
              const name = workerNames[i]?.trim() || `Працівник ${i + 1}`;
              const isLast = arrIdx === arr.length - 1;
              return (
                <div
                  key={i}
                  className={isLast ? 'wplan-page-last' : 'wplan-page'}
                  style={{ padding: '28px 36px', pageBreakInside: 'avoid', breakInside: 'avoid' }}
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
  const [printIndex, setPrintIndex] = useState<number | 'all' | null>(null);

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

  const totalUnits = workers * planPerWorker;
  const unitsPerKit = positions.filter(p => p.qtyPerPostomat > 0).reduce((s, p) => s + p.qtyPerPostomat, 0);
  const kitsFromProduction = unitsPerKit > 0 ? Math.floor(totalUnits / unitsPerKit) : 0;

  const stockKits = useMemo(() => {
    const active = positions.filter(p => p.qtyPerPostomat > 0);
    if (active.length === 0) return 0;
    return Math.min(...active.map(p => Math.floor(p.available / p.qtyPerPostomat)));
  }, [positions]);

  const totalKits = stockKits + kitsFromProduction;

  const workerTasks = useMemo(
    () => distribute(positions, workers, planPerWorker),
    [positions, workers, planPerWorker]
  );

  function updateName(i: number, name: string) {
    setWorkerNames(prev => {
      const next = [...prev];
      next[i] = name;
      return next;
    });
  }

  return (
    <div className="space-y-4">

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatsCard
          title="Загальний виробіток"
          value={`${totalUnits} шт`}
          sub={`${workers} прац. × ${planPerWorker} шт`}
          color="emerald"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <StatsCard
          title="Готових комплектів"
          value={kitsFromProduction}
          sub={`з ${totalUnits} шт виробітку`}
          color="indigo"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          }
        />
        <StatsCard
          title="Разом зі складом"
          value={totalKits}
          sub={`склад ${stockKits} + виробіток ${kitsFromProduction}`}
          color="violet"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          }
        />
      </div>

      {/* Inputs */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4">Параметри</p>
          <button
            type="button"
            onClick={() => setPrintIndex('all')}
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
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {workerTotal} шт
                  </span>
                  <button
                    type="button"
                    onClick={() => setPrintIndex(i)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium
                               text-indigo-600 dark:text-indigo-400 transition-colors"
                    style={{ border: '1px solid var(--cbrd)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--chov)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <PrintIcon />
                    Друк
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Print modal */}
      {printIndex !== null && (
        <PrintModal
          workerTasks={workerTasks}
          workerNames={workerNames}
          today={today}
          workerIndex={printIndex === 'all' ? undefined : printIndex}
          onClose={() => setPrintIndex(null)}
        />
      )}
    </div>
  );
}
