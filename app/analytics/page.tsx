import { getPositions, getDailyReports, getEmployees } from '@/lib/data';
import { getTodayDate } from '@/lib/calculations';
import InfoTooltip from '@/components/InfoTooltip';

export const dynamic = 'force-dynamic';

function HBar({ label, value, max, sub, color = 'indigo' }: {
  label: string; value: number; max: number; sub?: string; color?: 'indigo'|'emerald'|'purple';
}) {
  const pct   = max > 0 ? Math.round((value / max) * 100) : 0;
  const track = { indigo:'from-indigo-600 to-indigo-400', emerald:'from-emerald-600 to-emerald-400', purple:'from-purple-600 to-purple-400' }[color];
  return (
    <div className="group">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[14px] font-medium text-c2 group-hover:text-c1 transition-colors truncate max-w-[160px]">{label}</span>
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-[14px] font-semibold text-c1 tabular-nums">{value}</span>
          {sub && <span className="text-[11px] text-c4">{sub}</span>}
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cbrd)' }}>
        <div className={`h-full rounded-full bg-gradient-to-r ${track} transition-all duration-700`}
             style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }} />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  type D = {
    byEmployee: { name: string; today: number; week: number; total: number }[];
    byPosition: { label: string; today: number; week: number; total: number }[];
    last7: { date: string; total: number }[];
    totals: { today: number; week: number; total: number };
  };
  let data: D | null = null;
  let error = '';

  try {
    const [employees, positions, reports] = await Promise.all([getEmployees(), getPositions(), getDailyReports()]);
    const today   = getTodayDate();
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const byEmployee = employees.map(emp => {
      const mine = reports.filter(r => r.employeeId === emp.id);
      return { name: emp.fullName,
        today: mine.filter(r=>r.date===today).reduce((s,r)=>s+r.qty,0),
        week:  mine.filter(r=>r.date>=weekAgo).reduce((s,r)=>s+r.qty,0),
        total: mine.reduce((s,r)=>s+r.qty,0) };
    }).filter(e=>e.total>0).sort((a,b)=>b.week-a.week);

    const byPosition = positions.map(pos => {
      const mine = reports.filter(r => r.positionId === pos.id);
      return { label:`${pos.lengthMm} мм`,
        today: mine.filter(r=>r.date===today).reduce((s,r)=>s+r.qty,0),
        week:  mine.filter(r=>r.date>=weekAgo).reduce((s,r)=>s+r.qty,0),
        total: mine.reduce((s,r)=>s+r.qty,0) };
    }).filter(p=>p.total>0).sort((a,b)=>b.total-a.total);

    const last7: {date:string;total:number}[] = [];
    for (let i=6;i>=0;i--) {
      const d = new Date(Date.now()-i*86400000);
      const s = d.toISOString().split('T')[0];
      const [,m,day] = s.split('-');
      last7.push({ date:`${day}.${m}`, total:reports.filter(r=>r.date===s).reduce((a,r)=>a+r.qty,0) });
    }
    data = { byEmployee, byPosition, last7, totals: {
      today: reports.filter(r=>r.date===today).reduce((s,r)=>s+r.qty,0),
      week:  reports.filter(r=>r.date>=weekAgo).reduce((s,r)=>s+r.qty,0),
      total: reports.reduce((s,r)=>s+r.qty,0),
    }};
  } catch(e:unknown) { error = e instanceof Error ? e.message : String(e); }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor:'rgba(239,68,68,0.2)', backgroundColor:'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">{error}</p>
    </div>
  );
  if (!data) return null;

  const maxEmpWeek  = Math.max(...data.byEmployee.map(e=>e.week),1);
  const maxPosTotal = Math.max(...data.byPosition.map(p=>p.total),1);
  const maxDay      = Math.max(...data.last7.map(d=>d.total),1);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Звіти</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Аналітика</h1>
        </div>
        <InfoTooltip>
          <p><b>Сьогодні / Тиждень / Всього</b> — кількість одиниць продукції по всіх звітах за відповідний період.</p>
          <p><b>Виробіток за 7 днів</b> — стовпчиковий графік одиниць по датах.</p>
          <p><b>По працівниках</b> — рейтинг виробітку за поточний тиждень.</p>
          <p><b>По позиціях</b> — загальний виробіток по кожній позиції за весь час.</p>
        </InfoTooltip>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[{label:'Сьогодні',value:data.totals.today},{label:'Тиждень',value:data.totals.week},{label:'Всього',value:data.totals.total}].map(({label,value}) => (
          <div key={label} className="card-hover p-3 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">{label}</p>
            <p className="text-[22px] sm:text-[26px] font-semibold text-c1 leading-none tabular-nums">{value}</p>
            <p className="text-[11px] text-c4 mt-1">одиниць</p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-semibold text-c1">Виробіток за 7 днів</h2>
            <p className="text-[12px] text-c4 mt-0.5">Одиниць продукції по датам</p>
          </div>
          <span className="badge-indigo">{data.last7.reduce((s,d)=>s+d.total,0)} шт</span>
        </div>
        <div className="flex items-end gap-1.5" style={{ height:'100px' }}>
          {data.last7.map((d, i) => {
            const pct    = (d.total / maxDay) * 100;
            const isLast = i === data!.last7.length - 1;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] text-c4 group-hover:text-c3 transition-colors">{d.total > 0 ? d.total : ''}</span>
                <div className="w-full flex flex-col justify-end" style={{ height:'68px' }}>
                  <div
                    className={`w-full rounded-md transition-all duration-300
                      ${isLast ? 'bg-gradient-to-t from-indigo-600 to-indigo-400' : 'bar-day'}`}
                    style={{ height: `${Math.max(pct, d.total>0?4:1)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-medium ${isLast ? 'text-indigo-500 dark:text-indigo-400' : 'text-c4'}`}>{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="flex items-start justify-between mb-5">
            <div><h2 className="text-[15px] font-semibold text-c1">По працівниках</h2><p className="text-[12px] text-c4 mt-0.5">Виробіток за тиждень</p></div>
            <span className="badge-emerald">{data.byEmployee.length} осіб</span>
          </div>
          {data.byEmployee.length === 0
            ? <p className="text-[13px] text-c4 py-4">Немає даних</p>
            : <div className="space-y-3.5">{data.byEmployee.map(e => <HBar key={e.name} label={e.name} value={e.week} max={maxEmpWeek} sub="шт/тиж" color="emerald"/>)}</div>
          }
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between mb-5">
            <div><h2 className="text-[15px] font-semibold text-c1">По позиціях</h2><p className="text-[12px] text-c4 mt-0.5">Загальний виробіток</p></div>
            <span className="badge-indigo">{data.byPosition.length} поз.</span>
          </div>
          {data.byPosition.length === 0
            ? <p className="text-[13px] text-c4 py-4">Немає даних</p>
            : <div className="space-y-3.5">{data.byPosition.map(p => <HBar key={p.label} label={p.label} value={p.total} max={maxPosTotal} sub="шт" color="indigo"/>)}</div>
          }
        </div>
      </div>

      {/* Detail table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid var(--cbrd)' }}>
          <div>
            <h2 className="text-[15px] font-semibold text-c1">Детальна таблиця</h2>
            <p className="text-[12px] text-c4 mt-0.5">Сьогодні / тиждень / всього</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom:'1px solid var(--cbrd)' }}>
                {['Працівник','Сьогодні','Тиждень','Всього'].map(h => (
                  <th key={h} className={`th ${h==='Працівник' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.byEmployee.length === 0
                ? <tr><td colSpan={4} className="px-5 py-10 text-center text-[13px] text-c4">Даних немає</td></tr>
                : data.byEmployee.map((e, i) => (
                  <tr key={e.name}
                      className="row-hover"
                      style={i < data!.byEmployee.length-1 ? {borderBottom:'1px solid var(--cbrd)'} : {}}>
                    <td className="px-5 py-3 text-[14px] font-medium text-c2">{e.name}</td>
                    <td className="px-5 py-3 text-right text-[14px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {e.today > 0 ? e.today : <span className="text-c4 font-normal">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-[14px] font-semibold text-c1 tabular-nums">{e.week}</td>
                    <td className="px-5 py-3 text-right text-[13px] text-c3 tabular-nums">{e.total}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
