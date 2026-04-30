import { getKitStats, getEmployees, getDailyPlanQty } from '@/lib/data';
import { getTodayDate } from '@/lib/calculations';
import DailyPlanInput from '@/components/DailyPlanInput';
import KitOverallInput from '@/components/KitOverallInput';

export const dynamic = 'force-dynamic';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const weekdays = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const wd = weekdays[new Date(iso).getDay()];
  return `${d}.${m}.${y} (${wd})`;
}

function DaysChip({ days }: { days: number }) {
  if (days <= 0) return <span className="badge-green">Виконано</span>;
  if (days <= 7) return <span className="badge-yellow">{days} дн.</span>;
  return <span className="badge-red">{days} дн.</span>;
}

export default async function PlanningPage() {
  let error = '';
  let kitStats: Awaited<ReturnType<typeof getKitStats>> | null = null;
  let activeWorkers = 0;
  let dailyPlan = 0;

  try {
    const [stats, employees, planQty] = await Promise.all([
      getKitStats(),
      getEmployees(),
      getDailyPlanQty(),
    ]);
    kitStats = stats;
    activeWorkers = employees.filter(e => e.active && e.notify).length;
    dailyPlan = planQty;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">{error}</p>
    </div>
  );
  if (!kitStats) return null;

  const today = getTodayDate();

  // Per-position remaining calculation
  const posRows = kitStats.positions
    .filter(p => p.planQty > 0)
    .map(p => {
      const totalPlanUnits = p.planQty * p.qtyPerPostomat;
      const remaining = Math.max(0, totalPlanUnits - p.available);
      const done = Math.min(p.available, totalPlanUnits);
      const pct = totalPlanUnits > 0 ? Math.round((done / totalPlanUnits) * 100) : 0;
      const daysNeeded = dailyPlan > 0 ? Math.ceil(remaining / dailyPlan) : null;
      const estDate = daysNeeded !== null ? addDays(today, daysNeeded) : null;
      return { p, totalPlanUnits, done, remaining, pct, daysNeeded, estDate };
    });

  const totalRemaining = posRows.reduce((s, r) => s + r.remaining, 0);
  const totalPlanUnits = posRows.reduce((s, r) => s + r.totalPlanUnits, 0);
  const totalDone      = posRows.reduce((s, r) => s + r.done, 0);
  const overallPct     = totalPlanUnits > 0 ? Math.round((totalDone / totalPlanUnits) * 100) : 0;
  const overallDays    = dailyPlan > 0 ? Math.ceil(totalRemaining / dailyPlan) : null;
  const overallDate    = overallDays !== null ? addDays(today, overallDays) : null;
  const perWorker      = activeWorkers > 0 && dailyPlan > 0 ? Math.round(dailyPlan / activeWorkers) : 0;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Виробництво</p>
        <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Планування</h1>
      </div>

      {/* Daily plan input */}
      <DailyPlanInput initial={dailyPlan} activeWorkers={activeWorkers} />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-hover p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Активних прац.</p>
          <p className="text-[30px] font-semibold text-c1 leading-none">{activeWorkers}</p>
          <p className="text-[11px] text-c4 mt-1.5">зі сповіщеннями</p>
        </div>

        <div className="card-hover p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">На прац. / день</p>
          {perWorker > 0
            ? <><p className="text-[30px] font-semibold text-indigo-600 dark:text-indigo-400 leading-none">{perWorker}</p><p className="text-[11px] text-c4 mt-1.5">шт / людину</p></>
            : <><p className="text-[24px] font-semibold text-c4 leading-none">—</p><p className="text-[11px] text-c4 mt-1.5">задайте план</p></>
          }
        </div>

        <div className="card-hover p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Залишилось</p>
          <p className="text-[30px] font-semibold text-amber-600 dark:text-amber-400 leading-none tabular-nums">
            {totalRemaining.toLocaleString()}
          </p>
          <p className="text-[11px] text-c4 mt-1.5">шт до кінця плану</p>
        </div>

        <div className="card-hover p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Планове завершення</p>
          {overallDate
            ? <>
                <p className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
                  {fmtDate(overallDate)}
                </p>
                <p className="text-[11px] text-c4 mt-1.5">
                  {overallDays === 0 ? 'сьогодні' : `через ${overallDays} дн.`}
                </p>
              </>
            : <><p className="text-[22px] font-semibold text-c4 leading-none">—</p><p className="text-[11px] text-c4 mt-1.5">задайте план</p></>
          }
        </div>
      </div>

      {/* Overall progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[14px] font-semibold text-c1">Загальний прогрес</p>
            <p className="text-[12px] text-c4 mt-0.5">
              {totalDone.toLocaleString()} з {totalPlanUnits.toLocaleString()} шт
            </p>
          </div>
          <span className={`text-[22px] font-bold tabular-nums ${overallPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : overallPct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
            {overallPct}%
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cbrd)' }}>
          <div
            className={`h-full rounded-full transition-all duration-700
              ${overallPct >= 100 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                : overallPct >= 60 ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
            style={{ width: `${Math.max(overallPct, overallPct > 0 ? 1 : 0)}%` }}
          />
        </div>
      </div>

      {/* Kit plan editor */}
      <KitOverallInput
        initial={kitStats.positions.find(p => p.planQty > 0)?.planQty ?? 0}
      />

      {/* Per-position progress table */}
      {posRows.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cbrd)' }}>
            <h2 className="text-[15px] font-semibold text-c1">По позиціях</h2>
            <p className="text-[12px] text-c4 mt-0.5">Розбивка по кожній позиції плану</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                  {['Позиція','План (шт)','Зроблено','Залишок','Прогрес','Днів','Дата завершення'].map(h => (
                    <th key={h} className={`th ${h === 'Позиція' || h === 'Прогрес' || h === 'Дата завершення' ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posRows.map(({ p, totalPlanUnits, done, remaining, pct, daysNeeded, estDate }, i) => (
                  <tr key={p.id}
                      className="row-hover"
                      style={i < posRows.length - 1 ? { borderBottom: '1px solid var(--cbrd)' } : {}}>
                    <td className="px-5 py-3">
                      <span className="text-[14px] font-semibold text-c1">{p.lengthMm} мм</span>
                      <span className="text-[11px] text-c4 ml-1.5">{p.planQty} компл.</span>
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] text-c3 tabular-nums">
                      {totalPlanUnits.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {done.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-[14px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                      {remaining > 0 ? remaining.toLocaleString() : <span className="text-emerald-600 dark:text-emerald-400">0</span>}
                    </td>
                    <td className="px-5 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cbrd)' }}>
                          <div
                            className={`h-full rounded-full transition-all duration-700
                              ${pct >= 100 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                            style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                        <span className="text-[12px] font-medium text-c4 w-8 text-right tabular-nums shrink-0">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {daysNeeded !== null
                        ? <DaysChip days={daysNeeded} />
                        : <span className="text-[12px] text-c4">—</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-[13px] text-c3">
                      {estDate
                        ? <span className={daysNeeded === 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                            {fmtDate(estDate)}
                          </span>
                        : <span className="text-c4">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-[14px] font-semibold text-c2 mb-1">Немає активних планів</p>
          <p className="text-[12px] text-c4">Задайте план виробництва у вкладці позицій або через бот (🎯 План)</p>
        </div>
      )}
    </div>
  );
}
