import { getKitStats, getShipments } from '@/lib/data';

export const dynamic = 'force-dynamic';

function KitStatus({ kits, planQty }: { kits: number; planQty: number }) {
  if (planQty <= 0) {
    if (kits >= 50) return <span className="badge-green">Добре</span>;
    if (kits >= 10) return <span className="badge-yellow">Мало</span>;
    return <span className="badge-red">Критично</span>;
  }
  const pct = kits / planQty;
  if (pct >= 1)   return <span className="badge-green">✓ Виконано</span>;
  if (pct >= 0.6) return <span className="badge-yellow">В процесі</span>;
  return <span className="badge-red">Відстає</span>;
}

function RadialProgress({ pct, size = 56 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.min(pct / 100, 1) * c;
  const color = pct >= 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#6366f1';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--cbrd)" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
              strokeDasharray={`${filled} ${c}`} strokeDashoffset={c*0.25}
              strokeLinecap="round" style={{ transition:'stroke-dasharray 0.7s ease' }}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize="11" fontWeight="600"
            fill={pct>=100 ? '#10b981' : 'var(--c1)'}>{Math.min(pct,999)}%</text>
    </svg>
  );
}

export default async function KitsPage() {
  let kitStats: Awaited<ReturnType<typeof getKitStats>> | null = null;
  let shipped = 0;
  let error = '';
  try {
    const [stats, shipments] = await Promise.all([getKitStats(), getShipments()]);
    kitStats = stats;
    shipped = shipments.reduce((s, r) => s + r.qty, 0);
  }
  catch(e:unknown) { error = e instanceof Error ? e.message : String(e); }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor:'rgba(239,68,68,0.2)', backgroundColor:'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">{error}</p>
    </div>
  );
  if (!kitStats) return null;

  const bn         = kitStats.bottleneck;
  const withPlan   = kitStats.positions.filter(p=>p.planQty>0);
  const planMin    = withPlan.length ? Math.min(...withPlan.map(p=>p.planQty)) : 0;
  const shortfall  = planMin > 0 ? Math.max(0, planMin - kitStats.totalKits) : 0;
  const overallPct = planMin > 0 ? Math.round((kitStats.totalKits / planMin) * 100) : 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Склад</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Комплекти</h1>
        </div>
        {bn && <span className="badge-red">Вузьке: {bn.lengthMm} мм</span>}
      </div>

      {/* Top KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card-hover p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Готових комплектів</p>
              <p className="text-[34px] font-semibold text-c1 leading-none">{kitStats.totalKits}</p>
              <p className="text-[12px] text-c4 mt-1.5">мінімум по всіх позиціях</p>
            </div>
            {planMin > 0 && <RadialProgress pct={overallPct}/>}
          </div>
        </div>

        {bn ? (
          <div className="card-hover p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Вузьке місце</p>
            <p className="text-[26px] font-semibold text-red-600 dark:text-red-400 leading-none">{bn.lengthMm} мм</p>
            <p className="text-[12px] text-c4 mt-1.5">{bn.kits} компл. · ще треба {bn.remaining} шт</p>
          </div>
        ) : (
          <div className="card-hover p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">Вузьке місце</p>
            <p className="text-[22px] font-semibold text-emerald-600 dark:text-emerald-400 leading-none">Відсутнє</p>
            <p className="text-[12px] text-c4 mt-1.5">Всі позиції збалансовані</p>
          </div>
        )}

        <div className="card-hover p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">
            {planMin > 0 ? 'Недостача до плану' : 'Мінімальний план'}
          </p>
          {planMin > 0
            ? <><p className={`text-[34px] font-semibold leading-none ${shortfall===0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{shortfall}</p><p className="text-[12px] text-c4 mt-1.5">план: {planMin} компл.</p></>
            : <><p className="text-[26px] font-semibold text-c4 leading-none">—</p><p className="text-[12px] text-c4 mt-1.5">план не задано</p></>
          }
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid var(--cbrd)' }}>
          <div>
            <h2 className="text-[15px] font-semibold text-c1">Деталі по позиціях</h2>
            <p className="text-[12px] text-c4 mt-0.5">{kitStats.positions.length} позицій</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom:'1px solid var(--cbrd)' }}>
                {['Позиція','Склад','Вироблено'].map(h => (
                  <th key={h} className={`th ${h === 'Позиція' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
                <th className="th text-right">
                  <span className="block leading-none">Разом</span>
                  <span className="block text-[10px] font-normal text-c4 mt-0.5 normal-case tracking-normal">склад + вироблено</span>
                </th>
                {['К-сть/компл.','Комплектів'].map(h => (
                  <th key={h} className="th text-right">{h}</th>
                ))}
                <th className="th text-right">
                  <span className="block leading-none">Вільних компл.</span>
                  <span className="block text-[10px] font-normal text-c4 mt-0.5 normal-case tracking-normal">компл. − відправлено</span>
                </th>
                <th className="th text-left">Статус</th>
              </tr>
            </thead>
            <tbody>
              {kitStats.positions.map((p, i) => {
                const isMin  = p.kits === kitStats!.totalKits;
                const isLast = i === kitStats!.positions.length - 1;
                return (
                  <tr key={p.id}
                      className={isMin ? 'row-hover-red' : 'row-hover'}
                      style={!isLast ? {borderBottom:'1px solid var(--cbrd)'} : {}}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMin ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-c4'}`}/>
                        <span className="text-[14px] font-semibold text-c1">{p.lengthMm} мм</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] text-c3 tabular-nums">{p.stock}</td>
                    <td className="px-5 py-3 text-right text-[14px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{p.produced}</td>
                    <td className="px-5 py-3 text-right text-[14px] font-semibold text-c1 tabular-nums">{p.available}</td>
                    <td className="px-5 py-3 text-right text-[13px] text-c3 tabular-nums">{p.qtyPerPostomat}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-[15px] font-bold tabular-nums ${isMin ? 'text-red-600 dark:text-red-400' : 'text-c1'}`}>{p.kits}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {(() => { const n = Math.max(0, p.kits - shipped); return (
                        <span className={`text-[15px] font-bold tabular-nums ${n === 0 ? 'text-c4' : 'text-emerald-600 dark:text-emerald-400'}`}>{n}</span>
                      ); })()}
                    </td>
                    <td className="px-5 py-3"><KitStatus kits={p.kits} planQty={p.planQty}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
