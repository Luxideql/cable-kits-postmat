import { getShiftCards } from '@/lib/data';
import { getTodayDate } from '@/lib/calculations';
import type { ShiftCard } from '@/lib/types';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CardStatsPage() {
  let cards: ShiftCard[] = [];
  let error = '';

  try {
    cards = (await getShiftCards()).filter(c => c.status === 'confirmed');
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
  const fmtDate = (iso: string) => iso.split('-').reverse().join('.');

  function cardTotal(c: ShiftCard) {
    const items = c.fact_items.length > 0 ? c.fact_items : c.plan_items;
    return items.reduce((s, i) => s + i.qty, 0);
  }

  const todayTotal = cards.filter(c => c.date === today).reduce((s, c) => s + cardTotal(c), 0);
  const weekTotal  = cards.filter(c => c.date >= weekAgo).reduce((s, c) => s + cardTotal(c), 0);
  const allTotal   = cards.reduce((s, c) => s + cardTotal(c), 0);

  // Per-position totals
  const posTotals: Record<number, { all: number; today: number; week: number }> = {};
  for (const c of cards) {
    const items = c.fact_items.length > 0 ? c.fact_items : c.plan_items;
    for (const it of items) {
      if (!posTotals[it.lengthMm]) posTotals[it.lengthMm] = { all: 0, today: 0, week: 0 };
      posTotals[it.lengthMm].all += it.qty;
      if (c.date === today)   posTotals[it.lengthMm].today += it.qty;
      if (c.date >= weekAgo)  posTotals[it.lengthMm].week  += it.qty;
    }
  }
  const posRows = Object.entries(posTotals)
    .map(([mm, v]) => ({ mm: Number(mm), ...v }))
    .sort((a, b) => a.mm - b.mm);

  // Per-date rows (newest first)
  const dateRows = cards
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Виробництво</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Статистика змін</h1>
        </div>
        <Link href="/workplan" className="text-[12px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
          ← Норма виробітку
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Сьогодні шт',   value: todayTotal, sub: 'зафіксовані зміни' },
          { label: 'За тиждень шт', value: weekTotal,  sub: 'останні 7 днів' },
          { label: 'Всього шт',     value: allTotal,   sub: `${cards.length} змін` },
          { label: 'Кількість змін',value: cards.length, sub: 'зафіксовано' },
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
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-c4">По позиціях</p>
            <p className="text-[11px] text-c4 mt-0.5">Скільки штук вироблено по кожному розміру · тільки зафіксовані зміни</p>
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
                          <span className="inline-flex items-center justify-center px-2.5 h-7 rounded-lg text-[13px] font-semibold tabular-nums text-indigo-700 dark:text-indigo-200 bg-indigo-500/10">
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
                    <span className="text-[13px] font-bold tabular-nums text-c2">{posRows.reduce((s, r) => s + r.today, 0)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[13px] font-bold tabular-nums text-c2">{posRows.reduce((s, r) => s + r.week, 0)}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-[15px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{allTotal}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-shift history table */}
      {dateRows.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[14px] text-c4">Зафіксованих змін ще немає</p>
          <p className="text-[12px] text-c4 mt-1">Дані з&apos;являться після першої фіксації на сторінці &quot;Норма виробітку&quot;</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--cbrd)' }}>
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-c4">Зміни по датах</p>
            <p className="text-[11px] text-c4 mt-0.5">Тільки зафіксовані зміни</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                  <th className="th text-left min-w-[100px]">Дата</th>
                  <th className="th text-center min-w-[80px]">Прац.</th>
                  <th className="th text-right min-w-[80px]">План шт</th>
                  <th className="th text-right min-w-[80px]">Факт шт</th>
                  <th className="th text-right min-w-[60px]">+/−</th>
                </tr>
              </thead>
              <tbody>
                {dateRows.map((card, i) => {
                  const fact  = card.fact_items.length > 0 ? card.fact_items.reduce((s, x) => s + x.qty, 0) : card.plan_items.reduce((s, x) => s + x.qty, 0);
                  const diff  = fact - card.total_plan;
                  const isLast = i === dateRows.length - 1;
                  const isToday = card.date === today;
                  return (
                    <tr key={card.id} style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}>
                      <td className="px-4 py-3">
                        <span className={`text-[14px] font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-c1'}`}>
                          {fmtDate(card.date)}
                        </span>
                        {isToday && <span className="ml-2 text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">сьогодні</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-[13px] text-c3 tabular-nums">{card.workers_count}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px] text-c3 tabular-nums">{card.total_plan}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fact}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[13px] font-semibold tabular-nums ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {diff >= 0 ? '+' : ''}{diff}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
                  <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-c4">Разом</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-[13px] font-bold tabular-nums text-c2">
                      {dateRows.reduce((s, c) => s + c.total_plan, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-[15px] font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{allTotal}</span>
                  </td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
