import StatsCard from '@/components/StatsCard';
import PositionsTable from '@/components/PositionsTable';
import InfoTooltip from '@/components/InfoTooltip';
import { getKitStats, getDailyReports, getShipments } from '@/lib/data';
import { getTodayDate, formatDate } from '@/lib/calculations';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

// ── Icons ──────────────────────────────────────────────────────────────────────
const Ic = {
  Box:   () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>),
  Clock: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Grid:  () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>),
  Alert: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  Check: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>),
  Truck: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  Pack:  () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>),
};

// ── SVG bar chart (server-renderable) ─────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; isToday?: boolean }[] }) {
  const max   = Math.max(...data.map(d => d.value), 1);
  const W     = 560;
  const H     = 160;
  const PX    = 8;
  const n     = data.length;
  const SLOT  = (W - PX * 2) / n;
  const BAR_W = Math.floor(SLOT * 0.62);

  return (
    <svg viewBox={`0 0 ${W} ${H + 34}`} className="w-full" style={{ height: '200px' }}>
      <defs>
        <linearGradient id="bG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.35"/>
        </linearGradient>
        <linearGradient id="bGT" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity="1"/>
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.65"/>
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f}
          x1={PX} y1={Math.round(H * (1 - f))}
          x2={W - PX} y2={Math.round(H * (1 - f))}
          stroke="rgba(100,116,139,0.1)" strokeWidth="1" strokeDasharray="3 3"
        />
      ))}

      {data.map((d, i) => {
        const slotX = PX + i * SLOT;
        const x     = slotX + (SLOT - BAR_W) / 2;
        const barH  = Math.max((d.value / max) * H, d.value > 0 ? 6 : 0);
        const y     = H - barH;
        const fill  = d.isToday ? 'url(#bGT)' : 'url(#bG)';

        return (
          <g key={i}>
            {/* Background track */}
            <rect x={x} y={0} width={BAR_W} height={H}
                  fill={d.isToday ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.03)'}
                  rx="8"/>
            {/* Bar */}
            {barH > 0 && (
              <rect x={x} y={y} width={BAR_W} height={barH}
                    fill={fill} rx="8" opacity={d.value === 0 ? 0.2 : 1}/>
            )}
            {/* Value */}
            {d.value > 0 && (
              <text x={x + BAR_W / 2} y={y - 7} textAnchor="middle"
                    fontSize="11" fontWeight="600"
                    fill={d.isToday ? '#818cf8' : 'rgba(99,102,241,0.75)'}>
                {d.value}
              </text>
            )}
            {/* Date */}
            <text x={x + BAR_W / 2} y={H + 22} textAnchor="middle"
                  fontSize="11" fontWeight={d.isToday ? '700' : '400'}
                  fill={d.isToday ? '#818cf8' : 'rgba(100,116,139,0.65)'}>
              {d.label}
            </text>
            {/* Today dot */}
            {d.isToday && (
              <circle cx={x + BAR_W / 2} cy={H + 32} r="2.5" fill="#818cf8"/>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SectionHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-[15px] font-semibold text-c1 leading-none">{title}</h2>
        {sub && <p className="text-[12px] text-c4 mt-1 leading-none">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  let kitStats: Awaited<ReturnType<typeof getKitStats>> | null = null;
  let todayTotal = 0, activeWorkers = 0;
  let last7: { label: string; value: number; isToday: boolean }[] = [];
  let recentShipments: Awaited<ReturnType<typeof getShipments>> = [];
  let error = '';

  try {
    const [stats, allReports, shipments] = await Promise.all([
      getKitStats(),
      getDailyReports(),
      getShipments(),
    ]);
    kitStats = stats;
    recentShipments = shipments.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

    const today = getTodayDate();
    const todayR = allReports.filter(r => r.date === today);
    todayTotal    = todayR.reduce((s, r) => s + r.qty, 0);
    activeWorkers = new Set(todayR.map(r => r.employeeId)).size;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const ds = d.toISOString().split('T')[0];
      const [,m,day] = ds.split('-');
      last7.push({ label:`${day}.${m}`, value: allReports.filter(r=>r.date===ds).reduce((s,r)=>s+r.qty,0), isToday:i===0 });
    }
  } catch (e: unknown) { error = e instanceof Error ? e.message : String(e); }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400 mb-1">Помилка підключення</p>
      <p className="text-[12px] text-red-500/60 font-mono break-all">{error}</p>
    </div>
  );
  if (!kitStats) return null;

  const bn            = kitStats.bottleneck;
  const totalProduced = kitStats.positions.reduce((s, p) => s + p.produced, 0);
  const avgProgress   = Math.round(kitStats.positions.reduce((s,p)=>s+p.progress,0) / (kitStats.positions.length||1));
  const weekTotal     = last7.reduce((s,d)=>s+d.value,0);
  const readyToShip   = Math.max(0, kitStats.totalKits - kitStats.shipped);

  return (
    <div className="space-y-5 animate-fade-up">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Огляд</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Дашборд</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[12px] text-c4 font-medium">Live дані</span>
          <InfoTooltip>
            <p><b>Готових комплектів</b> — мінімум по всіх позиціях прямо зараз.</p>
            <p><b>Вироблено сьогодні</b> — сума звітів за поточний день.</p>
            <p><b>Вузьке місце</b> — позиція що обмежує кількість комплектів.</p>
            <p><b>Відправлено</b> — загальна кількість відвантажених комплектів за весь час.</p>
            <p><b>Готово до відправки</b> = Готових комплектів − Відправлено.</p>
            <p><b>Графік</b> — кількість вироблених одиниць по днях за останній тиждень.</p>
          </InfoTooltip>
        </div>
      </div>

      {/* KPI Cards — row 1: виробництво */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Готових комплектів" value={kitStats.totalKits} sub="мінімум по позиціях" color="indigo" icon={<Ic.Box />}/>
        <StatsCard title="Вироблено сьогодні" value={`${todayTotal} шт`} sub={`${activeWorkers} прац. активних`} color="emerald" icon={<Ic.Clock />}/>
        <StatsCard title="Позицій" value={kitStats.positions.length} sub={`Всього: ${totalProduced} шт`} color="slate" icon={<Ic.Grid />}/>
        {bn
          ? <StatsCard title="Вузьке місце" value={`${bn.lengthMm} мм`} sub={`${bn.kits} компл. · треба ${bn.remaining}`} color="red" icon={<Ic.Alert />}/>
          : <StatsCard title="Статус" value="Норма" sub="Всі позиції в порядку" color="emerald" icon={<Ic.Check />}/>
        }
      </div>

      {/* KPI Cards — row 2: відвантаження */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Відправлено" value={`${kitStats.shipped} компл.`} sub="загалом за весь час" color="violet" icon={<Ic.Truck />}/>
        <StatsCard title="Готово до відправки" value={`${readyToShip} компл.`} sub={kitStats.shipped > 0 ? `відправлено: ${kitStats.shipped}` : 'відправлень ще немає'} color={readyToShip > 0 ? 'emerald' : 'slate'} icon={<Ic.Pack />}/>
        <div className="col-span-2 card p-4 flex flex-col justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4 mb-3">Останні відвантаження</p>
          {recentShipments.length === 0 ? (
            <p className="text-[13px] text-c4">Відвантажень ще немає</p>
          ) : (
            <div className="space-y-2">
              {recentShipments.map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-[13px] text-c3">{formatDate(s.date)}</span>
                  <span className="text-[13px] font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                    {s.qty} компл.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Bar chart */}
        <div className="lg:col-span-2 card p-5">
          <SectionHeader title="Виробіток за 7 днів" sub="Кількість одиниць по датам">
            <span className="badge-indigo">{weekTotal} шт / тиждень</span>
          </SectionHeader>
          <BarChart data={last7} />
        </div>

        {/* Position breakdown */}
        <div className="card p-5 flex flex-col">
          <SectionHeader title="Позиції" sub="Прогрес по кожній" />
          <div className="flex-1 space-y-3">
            {kitStats.positions.map(p => {
              const isBottleneck = kitStats!.bottleneck?.id === p.id;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] text-c3 font-medium">{p.lengthMm} мм</span>
                    <span className={`text-[12px] font-semibold tabular-nums ${isBottleneck ? 'text-red-600 dark:text-red-400' : 'text-c4'}`}>
                      {p.kits} к.
                    </span>
                  </div>
                  <div className="h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cbrd)' }}>
                    <div
                      className={`h-full rounded-full transition-all duration-700
                        ${isBottleneck ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}
                      style={{ width: `${Math.max(p.progress, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--cbrd)' }}>
            <p className="text-[11px] text-c4 uppercase tracking-wider font-semibold mb-1">Серед. прогрес</p>
            <p className="text-[24px] font-semibold text-c1 leading-none">{avgProgress}%</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div>
        <SectionHeader title="Деталізація позицій" sub="Сортування по будь-якому стовпцю">
          <span className="text-[12px] text-c4">{kitStats.positions.length} позицій</span>
        </SectionHeader>
        <PositionsTable positions={kitStats.positions} shipped={kitStats.shipped} />
      </div>
    </div>
  );
}
