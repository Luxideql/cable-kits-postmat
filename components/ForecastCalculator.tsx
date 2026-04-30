'use client';
import { useState } from 'react';

function calcCalendarDate(daysNeeded: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysNeeded);
  const [y, m, day] = d.toISOString().split('T')[0].split('-');
  const weekdays = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  return `${day}.${m}.${y} (${weekdays[d.getDay()]})`;
}

function calcWorkingDate(workingDaysNeeded: number): { label: string; calDays: number } {
  const d = new Date();
  let counted = 0;
  let calDays = 0;
  while (counted < workingDaysNeeded) {
    d.setDate(d.getDate() + 1);
    calDays++;
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) counted++;
  }
  const [y, m, day] = d.toISOString().split('T')[0].split('-');
  const weekdays = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  return { label: `${day}.${m}.${y} (${weekdays[d.getDay()]})`, calDays };
}

function Stepper({ value, onChange, step = 1, min = 0 }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number;
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

export default function ForecastCalculator({
  totalRemaining,
  kitsRemaining,
  defaultWorkers = 1,
  defaultPerWorker = 0,
}: {
  totalRemaining: number;
  kitsRemaining?: number;
  defaultWorkers?: number;
  defaultPerWorker?: number;
}) {
  const [workers, setWorkers] = useState(defaultWorkers);
  const [perWorker, setPerWorker] = useState(defaultPerWorker);
  const [skipWeekends, setSkipWeekends] = useState(false);

  const totalDaily = workers * perWorker;
  const workingDaysNeeded = totalDaily > 0 ? Math.ceil(totalRemaining / totalDaily) : null;

  let estDateLabel: string | null = null;
  let subLabel: string | null = null;

  if (workingDaysNeeded !== null) {
    if (skipWeekends) {
      if (workingDaysNeeded === 0) {
        estDateLabel = calcCalendarDate(0);
        subLabel = 'сьогодні';
      } else {
        const { label, calDays } = calcWorkingDate(workingDaysNeeded);
        estDateLabel = label;
        subLabel = `${workingDaysNeeded} роб. дн. (≈ ${calDays} кал.)`;
      }
    } else {
      estDateLabel = calcCalendarDate(workingDaysNeeded);
      subLabel = workingDaysNeeded === 0 ? 'сьогодні' : `через ${workingDaysNeeded} дн.`;
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4">
          Калькулятор прогнозування
        </p>

        {/* Weekend toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-[12px] text-c4">Без вихідних</span>
          <button
            role="switch"
            aria-checked={skipWeekends}
            onClick={() => setSkipWeekends(v => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none
              ${skipWeekends ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow
              transition-transform duration-200 ${skipWeekends ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </label>
      </div>

      <div className="flex flex-wrap gap-6 items-end">
        <div>
          <p className="text-[11px] text-c4 mb-2">Кількість людей</p>
          <Stepper value={workers} onChange={setWorkers} step={1} min={1} />
        </div>

        <div>
          <p className="text-[11px] text-c4 mb-2">Шт / людину / день</p>
          <Stepper value={perWorker} onChange={setPerWorker} step={10} min={0} />
        </div>

        <div className="pb-1">
          <p className="text-[11px] text-c4 mb-1">Загалом / день</p>
          <p className="text-[22px] font-semibold tabular-nums leading-none"
             style={{ color: totalDaily > 0 ? 'var(--c1)' : 'var(--c4)' }}>
            {totalDaily > 0 ? totalDaily.toLocaleString() : '—'}
            <span className="text-[13px] font-normal text-c4 ml-1">шт</span>
          </p>
        </div>
      </div>

      {/* Result */}
      <div className="mt-4 pt-4 flex flex-wrap gap-6 items-start"
           style={{ borderTop: '1px solid var(--cbrd)' }}>
        {estDateLabel ? (
          <>
            <div>
              <p className="text-[11px] text-c4 mb-0.5">Прогнозована дата завершення</p>
              <p className="text-[16px] font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
                {estDateLabel}
              </p>
              <p className="text-[11px] text-c4 mt-0.5">{subLabel}</p>
            </div>
            <div>
              <p className="text-[11px] text-c4 mb-0.5">Залишилось виготовити</p>
              <p className="text-[16px] font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-snug">
                {totalRemaining.toLocaleString()} шт
              </p>
            </div>
            {kitsRemaining !== undefined && (
              <div>
                <p className="text-[11px] text-c4 mb-0.5">Залишилось поштоматів</p>
                <p className="text-[16px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums leading-snug">
                  {kitsRemaining} компл.
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-[13px] text-c4">
            Введіть кількість людей і норму на людину — побачите прогнозовану дату
          </p>
        )}
      </div>
    </div>
  );
}
