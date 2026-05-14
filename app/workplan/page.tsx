import { getKitStats } from '@/lib/data';
import WorkPlanCalculator from '@/components/WorkPlanCalculator';
import StatsCard from '@/components/StatsCard';
import InfoTooltip from '@/components/InfoTooltip';

export const dynamic = 'force-dynamic';

export default async function WorkPlanPage() {
  let error = '';
  let positions: { id: string; lengthMm: number; qtyPerPostomat: number; available: number }[] = [];
  let totalKits = 0;
  let shipped = 0;
  let bottleneck: { lengthMm: number; kits: number; remaining: number } | null = null;

  try {
    const stats = await getKitStats();
    totalKits   = stats.totalKits;
    shipped     = stats.shipped;
    bottleneck  = stats.bottleneck ?? null;
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
          <p><b>Після виробітку</b> — комплектів буде після виробітку: склад + те що виготовлять працівники (мінімум по всіх позиціях).</p>
          <p><b>Вже на складі</b> — скільки повних комплектів можна зібрати прямо зараз з наявних залишків.</p>
          <p><b>Треба доробити</b> — сума дефіциту по всіх позиціях до цільової кількості комплектів.</p>
          <p><b>Одиниць / компл.</b> — сума qtyPerPostomat по всіх активних позиціях.</p>
          <p><b>Ціль</b> = Склад + (Працівники × План ÷ Одиниць у компл.).</p>
          <p><b>Розподіл</b> — кожен працівник отримує лише дефіцитні позиції (залишок на складі − ціль). Позиції де складу вже достатньо — не потрапляють у завдання.</p>
          <p><b>Друкувати</b> — відкриває попередній перегляд A4, кожен працівник на окремому аркуші.</p>
        </InfoTooltip>
      </div>
      {/* Kit status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatsCard
          title="Готових комплектів"
          value={totalKits}
          sub="зараз на складі"
          color="emerald"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
        />
        <StatsCard
          title="Відправлено"
          value={`${shipped} компл.`}
          sub={`залишок: ${Math.max(0, totalKits - shipped)} компл.`}
          color="violet"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
        />
        {bottleneck
          ? <StatsCard
              title="Вузьке місце"
              value={`${bottleneck.lengthMm} мм`}
              sub={`${bottleneck.kits} компл. · треба ще ${bottleneck.remaining}`}
              color="red"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
            />
          : <StatsCard
              title="Статус"
              value="Норма"
              sub="Всі позиції в порядку"
              color="slate"
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
            />
        }
      </div>

      <WorkPlanCalculator positions={positions} />
    </div>
  );
}
