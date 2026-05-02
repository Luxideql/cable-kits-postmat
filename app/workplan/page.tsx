import { getKitStats } from '@/lib/data';
import WorkPlanCalculator from '@/components/WorkPlanCalculator';
import InfoTooltip from '@/components/InfoTooltip';

export const dynamic = 'force-dynamic';

export default async function WorkPlanPage() {
  let error = '';
  let positions: { id: string; lengthMm: number; qtyPerPostomat: number; available: number }[] = [];

  try {
    const stats = await getKitStats();
    positions = stats.positions
      .filter(p => p.qtyPerPostomat > 0)
      .map(p => ({
        id: p.id,
        lengthMm: p.lengthMm,
        qtyPerPostomat: p.qtyPerPostomat,
        available: p.available,
      }));
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
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Норма виробітку</h1>
        </div>
        <InfoTooltip>
          <p><b>Готових комплектів</b> — реальна кількість повних комплектів з фактичного розподілу: мінімум по всіх позиціях (floor(вироблено ÷ qtyPerPostomat)).</p>
          <p><b>Загальний план</b> = Кількість працівників × План на 1 прац. (шт).</p>
          <p><b>Одиниць / компл.</b> — сума qtyPerPostomat по всіх активних позиціях.</p>
          <p><b>Розподіл</b> — позиції сортуються від більшої потреби до меншої і послідовно заповнюють кожного працівника до його плану.</p>
          <p><b>Округлення</b> — якщо кількість не ділиться рівно, завжди округляється вгору (Math.ceil).</p>
          <p><b>Ім'я</b> — введіть ім'я працівника на картці; зберігається автоматично.</p>
          <p><b>Друкувати</b> — відкриває попередній перегляд A4, кожен працівник на окремому аркуші.</p>
        </InfoTooltip>
      </div>
      <WorkPlanCalculator positions={positions} />
    </div>
  );
}
