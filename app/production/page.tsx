import { getPositions, getEmployees } from '@/lib/data';
import ProductionBatchEntry from '@/components/ProductionBatchEntry';
import { getTodayDate } from '@/lib/calculations';
import InfoTooltip from '@/components/InfoTooltip';

export const dynamic = 'force-dynamic';

export default async function ProductionPage() {
  let error = '';
  let positions: { id: string; lengthMm: number; qtyPerPostomat: number }[] = [];
  let employees: { id: string; fullName: string }[] = [];
  let today = '';

  try {
    const [posData, empData] = await Promise.all([getPositions(), getEmployees()]);
    today = getTodayDate();
    positions = posData
      .filter(p => p.qtyPerPostomat > 0)
      .map(p => ({ id: p.id, lengthMm: p.lengthMm, qtyPerPostomat: p.qtyPerPostomat }));
    employees = empData
      .filter(e => e.active)
      .map(e => ({ id: e.id, fullName: e.fullName }));
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) return (
    <div className="card p-6 animate-fade-up" style={{ borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.04)' }}>
      <p className="text-[14px] font-semibold text-red-600 dark:text-red-400 mb-1">Помилка підключення</p>
      <p className="text-[12px] text-red-500/60 font-mono break-all">{error}</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Виробництво</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Виробіток</h1>
        </div>
        <InfoTooltip>
          <p><b>По компл.</b> — вводиться кількість готових комплектів; система автоматично розраховує одиниці кожної позиції та записує звіти.</p>
          <p><b>Поштучно</b> — вводиться кількість одиниць для кожної позиції окремо.</p>
          <p><b>Дата</b> — можна обрати будь-яку дату для backdating звіту.</p>
          <p><b>Працівник</b> — звіт прив'язується до конкретного працівника.</p>
        </InfoTooltip>
      </div>

      <ProductionBatchEntry
        positions={positions}
        employees={employees}
        today={today}
      />
    </div>
  );
}
