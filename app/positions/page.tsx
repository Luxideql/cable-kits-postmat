import PositionsTable from '@/components/PositionsTable';
import InfoTooltip from '@/components/InfoTooltip';
import { getKitStats, getShipments, syncActualStockColumn } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function PositionsPage() {
  let stats: Awaited<ReturnType<typeof getKitStats>> | null = null;
  let shipped = 0;
  let error = '';
  try {
    const [s, shipments] = await Promise.all([getKitStats(), getShipments()]);
    syncActualStockColumn(s.positions, shipments.reduce((a, r) => a + r.qty, 0)).catch(() => {});
    stats = s;
    shipped = shipments.reduce((acc, r) => acc + r.qty, 0);
  }
  catch(e:unknown) { error = e instanceof Error ? e.message : String(e); }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor:'rgba(239,68,68,0.2)', backgroundColor:'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">{error}</p>
    </div>
  );
  if (!stats) return null;

  const totalStock            = stats.positions.reduce((s,p) => s + p.stock, 0);
  const totalProduced         = stats.positions.reduce((s,p) => s + p.produced, 0);
  const totalAvailable        = stats.positions.reduce((s,p) => s + p.available, 0);
  const totalAvailNotShipped  = stats.positions.reduce((s, p) => {
    return s + Math.max(0, p.available - shipped * p.qtyPerPostomat);
  }, 0);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Каталог</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Позиції</h1>
        </div>
        <div className="flex items-center gap-2">
          {stats.bottleneck && <span className="badge-red">Вузьке: {stats.bottleneck.lengthMm} мм</span>}
          <span className="badge-slate">{stats.positions.length} позицій</span>
          <InfoTooltip>
            <p><b>Залишок на складі</b> — початкові шт введені вручну в таблицю.</p>
            <p><b>Вироблено</b> — сума всіх звітів робітників через бот.</p>
            <p><b>Разом в шт</b> = Залишок + Вироблено.</p>
            <p><b>Залишок в шт</b> = Разом − (відправлено × к-сть на компл.) — скільки шт ще не пішло у відправлені комплекти.</p>
            <p><b>Мін. комплектів</b> — мінімум по всіх позиціях (обмежено вузьким місцем).</p>
            <p className="pt-1" style={{borderTop:'1px solid var(--cbrd)'}}><b>Таблиця:</b> Залишок + Вироблено = Разом → ÷ к-сть/компл. = Комплектів → − відправлено = Вільних компл.</p>
          </InfoTooltip>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Залишок на складі', value: totalStock,            sub: 'шт · початковий склад' },
          { label: 'Вироблено',         value: totalProduced,         sub: 'шт · виробництво' },
          { label: 'Разом в шт',        value: totalAvailable,        sub: 'склад + вироблено' },
          { label: 'Залишок в шт',      value: totalAvailNotShipped,  sub: 'шт · не відвантажено' },
          { label: 'Мін. комплектів',   value: stats.totalKits,       sub: 'мінімум по позиціях' },
        ].map(({label,value,sub}) => (
          <div key={label} className="card-hover p-3 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">{label}</p>
            <p className="text-[22px] sm:text-[26px] font-semibold text-c1 leading-none tabular-nums">{value}</p>
            <p className="text-[11px] text-c4 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/10">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" className="shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[12px] text-indigo-600 dark:text-indigo-400/70">Клікайте на заголовки для сортування</p>
      </div>

      <PositionsTable positions={stats.positions} shipped={shipped} />
    </div>
  );
}
