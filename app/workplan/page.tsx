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
          <p><b>Після виробітку</b> — скільки повних комплектів буде після того як працівники виконають норму: мінімум по всіх позиціях (склад + виробіток ÷ qtyPerPostomat).</p>
          <p><b>Вже на складі</b> — скільки повних комплектів можна зібрати прямо зараз з наявних залишків.</p>
          <p><b>Треба доробити</b> — сума дефіциту по всіх позиціях: скільки одиниць ще не вистачає до цілі.</p>
          <p><b>Одиниць / компл.</b> — сума qtyPerPostomat по всіх активних позиціях.</p>
          <p><b>Розподіл</b> — кожен працівник отримує лише дефіцитні позиції (ті де складу не вистачає до плану). Якщо позиція закрита складом — вона не потрапляє у завдання.</p>
          <p><b>Ім'я</b> — введіть ім'я працівника на картці; зберігається автоматично.</p>
          <p><b>Друкувати</b> — відкриває попередній перегляд A4, кожен працівник на окремому аркуші.</p>
        </InfoTooltip>
      </div>
      <WorkPlanCalculator positions={positions} />
    </div>
  );
}
