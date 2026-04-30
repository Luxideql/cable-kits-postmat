'use client';
import { useState } from 'react';

function calcEstDate(daysNeeded: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysNeeded);
  const [y, m, day] = d.toISOString().split('T')[0].split('-');
  const weekdays = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  return `${day}.${m}.${y} (${weekdays[d.getDay()]})`;
}

function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-0 rounded-xl overflow-hidden w-fit"
         style={{ border: '1px solid var(--cbrd)' }}>
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-9 h-10 flex items-center justify-center text-c3 hover:text-c1 transition-colors text-lg font-light"
        style={{ borderRight: '1px solid var(--cbrd)' }}
      >−</button>
      <input
        type="number"
        min={min}
        value={value || ''}
        onChange={e => onChange(Math.max(min, Number(e.target.value) || 0))}
        placeholder="0"
        className="w-16 h-10 text-center text-[18px] font-semibold text-c1 bg-transparent outline-none tabular-nums"
      />
      <button
        onClick={() => onChange(value + step)}
        className="w-9 h-10 flex items-center justify-center text-c3 hover:text-c1 transition-colors text-lg font-light"
        style={{ borderLeft: '1px solid var(--cbrd)' }}
      >+</button>
    </div>
  );
}

export default function PlanningSimulator({
  totalRemaining,
  initialWorkers,
  initialDailyPlan,
}: {
  totalRemaining: number;
  initialWorkers: number;
  initialDailyPlan: number;
}) {
  const initPerWorker =
    initialWorkers > 0 && initialDailyPlan > 0
      ? Math.round(initialDailyPlan / initialWorkers)
      : 0;

  const [workers, setWorkers] = useState(Math.max(1, initialWorkers));
  const [perWorker, setPerWorker] = useState(initPerWorker);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const totalDaily = workers * perWorker;
  const daysNeeded = totalDaily > 0 ? Math.ceil(totalRemaining / totalDaily) : null;
  const estDate = daysNeeded !== null ? calcEstDate(daysNeeded) : null;

  async function save() {
    if (totalDaily <= 0) return;
    setSaving(true);
    await fetch('/api/planning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: totalDaily }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4 mb-4">
        Денний план виробітку
      </p>

      <div className="flex flex-wrap gap-6 items-end">
        <div>
          <p className="text-[11px] text-c4 mb-2">Кількість людей</p>
          <Stepper value={workers} onChange={setWorkers} step={1} min={1} />
        </div>

        <div>
          <p className="text-[11px] text-c4 mb-2">Шт / людину / день</p>
          <Stepper value={perWorker} onChange={setPerWorker} step={10} min={0} />
        </div>

        <div className="flex items-center gap-2 pb-1">
          <span className="text-[13px] text-c4">=</span>
          <span className="text-[22px] font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums leading-none">
            {totalDaily > 0 ? totalDaily.toLocaleString() : '—'}
          </span>
          <span className="text-[13px] text-c4">шт / день</span>
        </div>
      </div>

      {/* Result row */}
      <div className="flex items-center gap-6 flex-wrap mt-4 pt-4"
           style={{ borderTop: '1px solid var(--cbrd)' }}>
        {estDate ? (
          <>
            <div>
              <p className="text-[11px] text-c4 mb-0.5">Планове завершення</p>
              <p className="text-[16px] font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
                {estDate}
              </p>
              <p className="text-[11px] text-c4 mt-0.5">
                {daysNeeded === 0 ? 'сьогодні' : `через ${daysNeeded} дн.`}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-c4 mb-0.5">Залишилось</p>
              <p className="text-[16px] font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-snug">
                {totalRemaining.toLocaleString()} шт
              </p>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-c4">Введіть кількість людей і норму щоб побачити дату завершення</p>
        )}

        <button
          onClick={save}
          disabled={saving || totalDaily <= 0}
          className={`btn-primary ml-auto ${saving || totalDaily <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {saved ? '✓ Збережено' : saving ? 'Збереження…' : 'Зберегти план'}
        </button>
      </div>
    </div>
  );
}
