import { getKitStats, getDailyPlanQty, getEmployees } from '@/lib/data';
import ForecastCalculator from '@/components/ForecastCalculator';

export const dynamic = 'force-dynamic';

export default async function ForecastPage() {
  let error = '';
  let kitsRemaining = 0;
  let kitPlan = 0;
  let initialWorkers = 0;
  let initialDailyPlan = 0;
  let positions: { qtyPerPostomat: number; available: number }[] = [];

  try {
    const [kitStats, employees, dailyPlan] = await Promise.all([
      getKitStats(),
      getEmployees(),
      getDailyPlanQty(),
    ]);

    const posRows = kitStats.positions.filter(p => p.planQty > 0);
    kitPlan = posRows[0]?.planQty ?? 0;
    kitsRemaining = Math.max(0, kitPlan - kitStats.totalKits);
    initialWorkers = employees.filter(e => e.active && e.notify).length;
    initialDailyPlan = dailyPlan;
    positions = kitStats.positions
      .filter(p => p.qtyPerPostomat > 0)
      .map(p => ({ qtyPerPostomat: p.qtyPerPostomat, available: p.available }));
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">{error}</p>
    </div>
  );

  const initPerWorker = initialWorkers > 0 && initialDailyPlan > 0
    ? Math.round(initialDailyPlan / initialWorkers)
    : 0;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Виробництво</p>
        <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Калькулятор прогнозування</h1>
      </div>

      <ForecastCalculator
        positions={positions}
        kitsRemaining={kitsRemaining}
        kitPlan={kitPlan}
        defaultWorkers={initialWorkers || 1}
        defaultPerWorker={initPerWorker}
      />
    </div>
  );
}
