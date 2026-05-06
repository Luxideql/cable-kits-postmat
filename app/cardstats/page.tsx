import { getWorkCards, getEmployees } from '@/lib/data';
import { getTodayDate } from '@/lib/calculations';
import type { WorkCard } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function cardQty(c: WorkCard) {
  return c.tasks.reduce((s, t) => s + t.actualQty, 0);
}

export default async function CardStatsPage() {
  let cards: WorkCard[] = [];
  let error = '';

  try {
    cards = (await getWorkCards()).filter(c => c.status === 'confirmed');
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">{error}</p>
    </div>
  );

  const today   = getTodayDate();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  // unique employees (preserve order by total desc)
  const empTotals: Record<string, number> = {};
  for (const c of cards) {
    empTotals[c.employeeName] = (empTotals[c.employeeName] ?? 0) + cardQty(c);
  }
  const emps = Object.keys(empTotals).sort((a, b) => empTotals[b] - empTotals[a]);

  // unique dates newest first
  const dates = Array.from(new Set(cards.map(c => c.date))).sort((a, b) => b.localeCompare(a));

  // matrix[emp][date] = qty
  const matrix: Record<string, Record<string, number>> = {};
  for (const c of cards) {
    if (!matrix[c.employeeName]) matrix[c.employeeName] = {};
    matrix[c.employeeName][c.date] = (matrix[c.employeeName][c.date] ?? 0) + cardQty(c);
  }

  const todayTotal  = cards.filter(c => c.date === today).reduce((s, c) => s + cardQty(c), 0);
  const weekTotal   = cards.filter(c => c.date >= weekAgo).reduce((s, c) => s + cardQty(c), 0);
  const allTotal    = cards.reduce((s, c) => s + cardQty(c), 0);
  const todayCards  = cards.filter(c => c.date === today).length;
  const topEmp      = emps[0];
  const topEmpQty   = topEmp ? empTotals[topEmp] : 0;

  // per-position totals
  const posTotals: Record<number, { all: number; today: number; week: number }> = {};
  for (const c of cards) {
    for (const t of c.tasks) {
      if (!posTotals[t.lengthMm]) posTotals[t.lengthMm] = { all: 0, today: 0, week: 0 };
      posTotals[t.lengthMm].all   += t.actualQty;
      if (c.date === today)   posTotals[t.lengthMm].today += t.actualQty;
      if (c.date >= weekAgo)  posTotals[t.lengthMm].week  += t.actualQty;
    }
  }
  const posRows = Object.entries(posTotals)
    .map(([mm, v]) => ({ mm: Number(mm), ...v }))
    .sort((a, b) => a.mm - b.mm);

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Виробництво</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Статистика карточок</h1>
        </div>
        <Link href="/workplan"
          className="text-[12px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
          ← Норма виробітку
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Сьогодні шт',    value: todayTotal,  sub: `${todayCards} карточок` },
          { label: 'За тиждень шт',  value: weekTotal,   sub: 'останні 7 днів' },
          { label: 'Всього шт',      value: allTotal,    sub: `${cards.length} карточок` },
          { label: 'Найкращий',      value: topEmp ?? '—', sub: topEmp ? `${topEmpQty} шт` : 'немає даних' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card-hover p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">{label}</p>
            <p className="text-[22px] font-semibold text-c1 leading-none tabular-nums truncate">{value}</p>
            <p className="text-[11px] text-c4 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Per-position breakdown */}
      {posRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--cbrd)' }}>
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-c4">По позиціях (комплекти)</p>
            <p className="text-[11px] text-c4 mt-0.5">Скільки штук вироблено по кожному розміру · тільки зафіксовані карточки</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                  <th className="th text-left min-w-[120px]">Позиція</th>
                  <th className="th text-center min-w-[90px]">Сьогодні</th>
                  <th className="th text-center min-w-[90px]">За тиждень</th>
                  <th className="th text-right min-w-[90px]">Всього</th>
                </tr>
              </thead>
              <tbody>
                {posRows.map((row, i) => {
                  const isLast = i === posRows.length - 1;
                  const pct = allTotal > 0 ? Math.round(row.all / allTotal * 100) : 0;
                  return (
                    <tr key={row.mm} style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}>
                      <td className="px-4 py-3">
                        <span className="text-[14px] font-semibold text-c1">{row.mm} мм</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {row.today > 0 ? (
                          <span className="inline-flex items-center justify-center px-2.5 h-7 rounded-lg
                            text-[13px] font-semibold tabular-nums
                            text-indigo-700 dark:text-indigo-200 bg-indigo-500/10">
                            {row.today}
                          </span>
                        ) : <span className="text-[12px] text-c4">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-[13px] font-semibold tabular-nums text-c2">{row.week}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden hidden sm:block"
                               style={{ backgroundColor: 'var(--cbrd)' }}>
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                 style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="text-[15px] font-bold tabular-nums text-c1">{row.all}</span>
                          <span className="text-[11px] text-c4 tabular-nums w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                  <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-c4">Разом</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[13px] font-bold tabular-nums text-c2">
                      {posRows.reduce((s, r) => s + r.today, 0)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[13px] font-bold tabular-nums text-c2">
                      {posRows.reduce((s, r) => s + r.week, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-[15px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {allTotal}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matrix table */}
      {emps.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[14px] text-c4">Зафіксованих карточок ще немає</p>
          <p className="text-[12px] text-c4 mt-1">Дані з'являться після першої фіксації на сторінці "Норма виробітку"</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--cbrd)' }}>
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-c4">По працівниках і датах</p>
            <p className="text-[11px] text-c4 mt-0.5">Тільки зафіксовані карточки · шт</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                  <th className="th text-left sticky left-0 z-10 min-w-[140px]"
                      style={{ backgroundColor: 'var(--csr)' }}>
                    Працівник
                  </th>
                  {dates.map(d => (
                    <th key={d} className={`th text-center px-3 min-w-[72px] tabular-nums ${d === today ? 'text-indigo-500 dark:text-indigo-400' : ''}`}>
                      <span className="block">{d.slice(5).replace('-', '.')}</span>
                    </th>
                  ))}
                  <th className="th text-right px-4 min-w-[72px]">Разом</th>
                </tr>
              </thead>
              <tbody>
                {emps.map((emp, i) => {
                  const total = empTotals[emp];
                  const isLast = i === emps.length - 1;
                  return (
                    <tr key={emp} style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}>
                      <td className="px-4 py-3 sticky left-0 z-10 text-[13px] font-medium text-c2"
                          style={{ backgroundColor: 'var(--csr)' }}>
                        {emp}
                      </td>
                      {dates.map(d => {
                        const qty = matrix[emp]?.[d] ?? 0;
                        const isToday = d === today;
                        return (
                          <td key={d} className="px-3 py-3 text-center">
                            {qty > 0 ? (
                              <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg
                                text-[13px] font-semibold tabular-nums
                                ${isToday
                                  ? 'text-indigo-700 dark:text-indigo-200 bg-indigo-500/10'
                                  : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'}`}>
                                {qty}
                              </span>
                            ) : (
                              <span className="text-[12px] text-c4">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-right">
                        <span className="text-[15px] font-bold tabular-nums text-c1">{total}</span>
                      </td>
                    </tr>
                  );
                })}
                {/* Day totals */}
                <tr style={{ borderTop: '2px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                  <td className="px-4 py-2.5 sticky left-0 z-10 text-[11px] font-bold uppercase tracking-wide text-c4"
                      style={{ backgroundColor: 'var(--csr2)' }}>
                    Разом
                  </td>
                  {dates.map(d => {
                    const dayTotal = emps.reduce((s, e) => s + (matrix[e]?.[d] ?? 0), 0);
                    return (
                      <td key={d} className="px-3 py-2.5 text-center">
                        <span className="text-[13px] font-bold tabular-nums text-c2">{dayTotal}</span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-[15px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                      {allTotal}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
