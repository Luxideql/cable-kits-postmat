import { getEmployees, getDailyReports } from '@/lib/data';
import { getTodayDate } from '@/lib/calculations';
import type { EmployeeStats, DailyReport } from '@/lib/types';
import NotifyToggle from '@/components/NotifyToggle';

export const dynamic = 'force-dynamic';

const COLORS = ['from-indigo-500 to-purple-500','from-emerald-500 to-teal-500','from-amber-500 to-orange-500','from-pink-500 to-rose-500','from-sky-500 to-blue-500'];

function Avatar({ name }: { name: string }) {
  const safe     = name || '?';
  const initials = safe.split(' ').map(n=>n[0]||'').filter(Boolean).slice(0,2).join('').toUpperCase() || '?';
  const color    = COLORS[safe.charCodeAt(0) % COLORS.length];
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-[12px] font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

function AvatarSm({ name }: { name: string }) {
  const safe     = name || '?';
  const initials = safe.split(' ').map(n=>n[0]||'').filter(Boolean).slice(0,2).join('').toUpperCase() || '?';
  const color    = COLORS[safe.charCodeAt(0) % COLORS.length];
  return (
    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

function ActivityBadge({ today, week }: { today: number; week: number }) {
  if (today > 0) return <span className="badge-green">Активний</span>;
  if (week  > 0) return <span className="badge-yellow">Цього тижня</span>;
  return <span className="badge-slate">Не активний</span>;
}

function fmtDate(iso: string) {
  const [,m,d] = iso.split('-');
  return `${d}.${m}`;
}

function fmtWeekday(iso: string) {
  const days = ['нд','пн','вт','ср','чт','пт','сб'];
  return days[new Date(iso).getDay()];
}

export default async function EmployeesPage() {
  let stats: EmployeeStats[] = [];
  let reports: DailyReport[] = [];
  let error = '';

  try {
    const [employees, allReports] = await Promise.all([getEmployees(), getDailyReports()]);
    reports = allReports;
    const today   = getTodayDate();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    stats = employees.map(emp => {
      const mine = reports.filter(r=>r.employeeId===emp.id);
      return { ...emp,
        todayQty: mine.filter(r=>r.date===today).reduce((s,r)=>s+r.qty,0),
        weekQty:  mine.filter(r=>r.date>=weekAgo).reduce((s,r)=>s+r.qty,0),
        totalQty: mine.reduce((s,r)=>s+r.qty,0) };
    }).sort((a,b)=>b.weekQty-a.weekQty);
  } catch(e:unknown) { error = e instanceof Error ? e.message : String(e); }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor:'rgba(239,68,68,0.2)', backgroundColor:'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">{error}</p>
    </div>
  );

  const activeToday = stats.filter(e=>e.todayQty>0).length;
  const topWorker   = stats.length > 0 ? stats[0] : null;

  // ── Per-day matrix (last 14 days) ─────────────────────────────────────────────
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().split('T')[0]);
  }
  const today = getTodayDate();

  // matrix[employeeId][date] = qty
  const matrix: Record<string, Record<string, number>> = {};
  for (const emp of stats) {
    matrix[emp.id] = {};
    for (const day of days) matrix[emp.id][day] = 0;
  }
  for (const rep of reports) {
    if (matrix[rep.employeeId] && rep.date in matrix[rep.employeeId]) {
      matrix[rep.employeeId][rep.date] += rep.qty;
    }
  }

  // max per day for intensity scaling
  const dayMax: Record<string, number> = {};
  for (const day of days) {
    dayMax[day] = Math.max(1, ...stats.map(e => matrix[e.id]?.[day] ?? 0));
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Команда</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Працівники</h1>
        </div>
        <span className="badge-slate">{stats.length} зареєстровано</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-hover p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Активних сьогодні</p>
          <p className="text-[26px] font-semibold text-c1 leading-none">{activeToday}</p>
          <p className="text-[11px] text-c4 mt-1">з {stats.length} всього</p>
        </div>
        <div className="card-hover p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Кращий за тиждень</p>
          {topWorker
            ? <><p className="text-[15px] font-semibold text-c1 leading-snug truncate">{topWorker.fullName.split(' ')[0]}</p><p className="text-[11px] text-c4 mt-1">{topWorker.weekQty} шт / тиж</p></>
            : <p className="text-[15px] text-c4">—</p>
          }
        </div>
        <div className="card-hover p-3 sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Всього вироблено</p>
          <p className="text-[26px] font-semibold text-c1 leading-none tabular-nums">{stats.reduce((s,e)=>s+e.totalQty,0)}</p>
          <p className="text-[11px] text-c4 mt-1">одиниць</p>
        </div>
      </div>

      {/* Summary table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid var(--cbrd)' }}>
          <h2 className="text-[15px] font-semibold text-c1">Список працівників</h2>
          <span className="text-[12px] text-c4">{stats.length} осіб</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom:'1px solid var(--cbrd)' }}>
                {['Працівник','Посада','Сьогодні','Тиждень','Всього','Статус','Сповіщення'].map(h => (
                  <th key={h} className={`th ${['Сьогодні','Тиждень','Всього'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.length === 0
                ? <tr><td colSpan={7} className="px-5 py-12 text-center"><p className="text-[13px] text-c4">Немає працівників</p></td></tr>
                : stats.map((e, i) => (
                  <tr key={e.id}
                      className="row-hover"
                      style={i < stats.length-1 ? {borderBottom:'1px solid var(--cbrd)'} : {}}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.fullName} />
                        <div>
                          <p className="text-[14px] font-medium text-c2">{e.fullName}</p>
                          {e.telegramId && <p className="text-[11px] text-c4 font-mono">tg:{e.telegramId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-c3">{e.position||'—'}</td>
                    <td className="px-5 py-3 text-right">
                      {e.todayQty > 0
                        ? <span className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{e.todayQty}</span>
                        : <span className="text-[13px] text-c4">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-[14px] font-semibold text-c1 tabular-nums">
                      {e.weekQty > 0 ? e.weekQty : <span className="text-c4 font-normal">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] text-c3 tabular-nums">{e.totalQty}</td>
                    <td className="px-5 py-3"><ActivityBadge today={e.todayQty} week={e.weekQty}/></td>
                    <td className="px-5 py-3">
                      <NotifyToggle empId={e.id} initial={e.notify} />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-day matrix */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid var(--cbrd)' }}>
          <div>
            <h2 className="text-[15px] font-semibold text-c1">Виробіток по днях</h2>
            <p className="text-[12px] text-c4 mt-0.5">Останні 14 днів · одиниць на день</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr style={{ borderBottom:'1px solid var(--cbrd)' }}>
                {/* Sticky worker column */}
                <th className="th text-left sticky left-0 z-10 min-w-[140px] pr-4"
                    style={{ backgroundColor:'var(--csr)' }}>
                  Працівник
                </th>
                {days.map(day => (
                  <th key={day}
                      className={`th text-center px-2 min-w-[52px] ${day === today ? 'text-indigo-500 dark:text-indigo-400' : ''}`}>
                    <span className="block">{fmtDate(day)}</span>
                    <span className={`block text-[9px] font-normal mt-0.5 normal-case tracking-normal
                      ${day === today ? 'text-indigo-400' : 'text-c4'}`}>
                      {fmtWeekday(day)}
                    </span>
                  </th>
                ))}
                <th className="th text-right px-4 min-w-[64px]">Всього</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0
                ? <tr><td colSpan={days.length + 2} className="px-5 py-12 text-center"><p className="text-[13px] text-c4">Немає даних</p></td></tr>
                : stats.map((emp, i) => {
                  const isLast = i === stats.length - 1;
                  const rowTotal = days.reduce((s, d) => s + (matrix[emp.id]?.[d] ?? 0), 0);
                  return (
                    <tr key={emp.id}
                        className="row-hover"
                        style={!isLast ? { borderBottom:'1px solid var(--cbrd)' } : {}}>
                      {/* Sticky worker name */}
                      <td className="px-4 py-2.5 sticky left-0 z-10"
                          style={{ backgroundColor:'var(--csr)' }}>
                        <div className="flex items-center gap-2">
                          <AvatarSm name={emp.fullName} />
                          <span className="text-[13px] font-medium text-c2 truncate max-w-[90px]">
                            {emp.fullName.split(' ')[0]}
                          </span>
                        </div>
                      </td>
                      {days.map(day => {
                        const qty = matrix[emp.id]?.[day] ?? 0;
                        const intensity = qty > 0 ? Math.max(0.15, qty / dayMax[day]) : 0;
                        const isToday = day === today;
                        return (
                          <td key={day} className="px-1 py-2.5 text-center">
                            {qty > 0 ? (
                              <span
                                className={`inline-flex items-center justify-center w-9 h-7 rounded-lg text-[12px] font-semibold tabular-nums
                                  ${isToday ? 'text-indigo-700 dark:text-indigo-200' : 'text-emerald-700 dark:text-emerald-200'}`}
                                style={{
                                  backgroundColor: isToday
                                    ? `rgba(99,102,241,${intensity * 0.25})`
                                    : `rgba(16,185,129,${intensity * 0.25})`,
                                }}
                              >
                                {qty}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-9 h-7 text-[11px] text-c4">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-[14px] font-semibold tabular-nums text-c1">
                          {rowTotal > 0 ? rowTotal : <span className="text-c4 font-normal">—</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })
              }
              {/* Day totals row */}
              {stats.length > 0 && (
                <tr style={{ borderTop:'1px solid var(--cbrd)' }}>
                  <td className="px-4 py-2.5 sticky left-0 z-10 text-[11px] font-bold uppercase tracking-wide text-c4"
                      style={{ backgroundColor:'var(--csr2)' }}>
                    Разом
                  </td>
                  {days.map(day => {
                    const dayTotal = stats.reduce((s, e) => s + (matrix[e.id]?.[day] ?? 0), 0);
                    return (
                      <td key={day} className="px-1 py-2.5 text-center"
                          style={{ backgroundColor:'var(--csr2)' }}>
                        {dayTotal > 0
                          ? <span className="text-[12px] font-bold tabular-nums text-c2">{dayTotal}</span>
                          : <span className="text-[11px] text-c4">—</span>
                        }
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right"
                      style={{ backgroundColor:'var(--csr2)' }}>
                    <span className="text-[14px] font-bold tabular-nums text-c1">
                      {stats.reduce((s,e) => s + days.reduce((ds,d) => ds + (matrix[e.id]?.[d] ?? 0), 0), 0)}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
