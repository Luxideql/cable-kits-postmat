import { getKitStats, getDailyPlanQty, getEmployees } from '@/lib/data';
import ForecastCalculator from '@/components/ForecastCalculator';

export const dynamic = 'force-dynamic';

export default async function ForecastPage() {
  let error = '';
  let totalRemaining = 0;
  let kitsRemaining = 0;
  let initialWorkers = 0;
  let initialDailyPlan = 0;

  try {
    const [kitStats, employees, dailyPlan] = await Promise.all([
      getKitStats(),
      getEmployees(),
      getDailyPlanQty(),
    ]);

    const posRows = kitStats.positions.filter(p => p.planQty > 0);
    totalRemaining = posRows.reduce((s, p) => {
      const totalPlanUnits = p.planQty * p.qtyPerPostomat;
      return s + Math.max(0, totalPlanUnits - p.available);
    }, 0);

    const kitPlan = posRows[0]?.planQty ?? 0;
    kitsRemaining = Math.max(0, kitPlan - kitStats.totalKits);
    initialWorkers = employees.filter(e => e.active && e.notify).length;
    initialDailyPlan = dailyPlan;
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
        totalRemaining={totalRemaining}
        kitsRemaining={kitsRemaining}
        defaultWorkers={initialWorkers || 1}
        defaultPerWorker={initPerWorker}
      />
    </div>
  );
}
