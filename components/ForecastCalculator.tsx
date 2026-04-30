'use client';
import { useState, useMemo } from 'react';

const MONTHS_UK = ['Січень','Лютий','Березень','Квітень','Травень','Червень',
                   'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const WEEK_DAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

function isSkippedDay(date: Date, skipSat: boolean, skipSun: boolean) {
  const d = date.getDay();
  return (skipSat && d === 6) || (skipSun && d === 0);
}

function calcCompletion(workDaysNeeded: number, skipSat: boolean, skipSun: boolean) {
  if (workDaysNeeded === 0) return { date: new Date(), calDays: 0 };
  const d = new Date();
  let counted = 0, calDays = 0;
  while (counted < workDaysNeeded) {
    d.setDate(d.getDate() + 1);
    calDays++;
    if (!isSkippedDay(d, skipSat, skipSun)) counted++;
  }
  return { date: new Date(d), calDays };
}

function fmtDate(d: Date) {
  const day = String(d.getDate()).padStart(2, '0');
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const wd  = ['нд','пн','вт','ср','чт','пт','сб'][d.getDay()];
  return `${day}.${m}.${d.getFullYear()} (${wd})`;
}

function mondayOf(d: Date) {
  const copy = new Date(d);
  const dow = copy.getDay();
  copy.setDate(copy.getDate() - (dow === 0 ? 6 : dow - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function generateWeeks(today: Date, completionDate: Date | null): Date[][] {
  const start = mondayOf(today);
  const endBase = completionDate ? new Date(completionDate) : new Date(today);
  endBase.setDate(endBase.getDate() + 7);
  // cap at 14 weeks
  const maxEnd = new Date(start);
  maxEnd.setDate(maxEnd.getDate() + 98);
  const end = endBase < maxEnd ? endBase : maxEnd;

  const weeks: Date[][] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Stepper({ value, onChange, step = 1, min = 0 }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number;
}) {
  return (
    <div className="flex items-center gap-0 rounded-xl overflow-hidden w-fit"
         style={{ border: '1px solid var(--cbrd)' }}>
      <button onClick={() => onChange(Math.max(min, value - step))}
        className="w-9 h-10 flex items-center justify-center text-c3 hover:text-c1 transition-colors text-lg font-light"
        style={{ borderRight: '1px solid var(--cbrd)' }}>−</button>
      <input type="number" min={min} value={value || ''}
        onChange={e => onChange(Math.max(min, Number(e.target.value) || 0))}
        placeholder="0"
        className="w-16 h-10 text-center text-[18px] font-semibold text-c1 bg-transparent outline-none tabular-nums" />
      <button onClick={() => onChange(value + step)}
        className="w-9 h-10 flex items-center justify-center text-c3 hover:text-c1 transition-colors text-lg font-light"
        style={{ borderLeft: '1px solid var(--cbrd)' }}>+</button>
    </div>
  );
}

function WeekendBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
        ${active ? 'bg-indigo-500 text-white shadow-sm' : 'text-c4 hover:text-c2'}`}
      style={active ? {} : { border: '1px solid var(--cbrd)' }}>
      {label}
    </button>
  );
}

function ProductionCalendar({ today, completionDate, skipSat, skipSun, dailyQty }: {
  today: Date;
  completionDate: Date | null;
  skipSat: boolean;
  skipSun: boolean;
  dailyQty: number;
}) {
  const weeks = useMemo(
    () => generateWeeks(today, completionDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today.toDateString(), completionDate?.toDateString(), skipSat, skipSun]
  );

  let shownMonths = new Set<string>();

  return (
    <div className="mt-5 pt-5 overflow-x-auto" style={{ borderTop: '1px solid var(--cbrd)' }}>
      <table className="w-full border-collapse" style={{ minWidth: 320 }}>
        <thead>
          <tr>
            {WEEK_DAYS.map(d => (
              <th key={d} className="text-center pb-2 text-[11px] font-semibold text-c4 w-[14.28%]">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => {
            const monthKey = `${week[0].getFullYear()}-${week[0].getMonth()}`;
            const showMonth = !shownMonths.has(monthKey);
            if (showMonth) shownMonths.add(monthKey);
            // find first day of this month in week
            const monthLabelDay = week.find(d =>
              !shownMonths.has(`${d.getFullYear()}-${d.getMonth()}`) ||
              (showMonth && d.getDate() <= 7)
            );

            return (
              <>
                {showMonth && (
                  <tr key={`m-${wi}`}>
                    <td colSpan={7} className="pt-3 pb-1 px-1">
                      <span className="text-[11px] font-bold text-c4 uppercase tracking-[0.08em]">
                        {MONTHS_UK[week.find(d => d.getDate() <= 7 || wi === 0 ? true : false)!.getMonth()]} {week[0].getFullYear()}
                      </span>
                    </td>
                  </tr>
                )}
                <tr key={wi}>
                  {week.map((day, di) => {
                    const isToday      = isSameDay(day, today);
                    const isDone       = completionDate && isSameDay(day, completionDate);
                    const isPast       = day < today && !isToday;
                    const skipped      = isSkippedDay(day, skipSat, skipSun);
                    const inPlan       = !isPast && completionDate && day <= completionDate && !isToday;
                    const isWorking    = inPlan && !skipped;

                    let bg = 'transparent';
                    let textColor = 'var(--c4)';
                    let border = 'transparent';
                    let fontWeight = '400';

                    if (isDone) {
                      bg = 'rgba(16,185,129,0.15)';
                      textColor = 'var(--emerald, #059669)';
                      border = 'rgba(16,185,129,0.4)';
                      fontWeight = '700';
                    } else if (isToday) {
                      border = 'rgba(99,102,241,0.6)';
                      textColor = 'var(--c1)';
                      fontWeight = '700';
                    } else if (isWorking) {
                      bg = 'rgba(99,102,241,0.08)';
                      textColor = 'rgb(99,102,241)';
                    } else if (skipped && inPlan) {
                      bg = 'rgba(0,0,0,0.03)';
                      textColor = 'var(--c4)';
                    } else if (isPast) {
                      textColor = 'var(--c4)';
                    }

                    return (
                      <td key={di} className="p-0.5">
                        <div
                          title={isWorking && dailyQty > 0 ? `${dailyQty.toLocaleString()} шт` : undefined}
                          className="relative flex flex-col items-center justify-center rounded-lg h-10 select-none transition-colors duration-150"
                          style={{ backgroundColor: bg, border: `1.5px solid ${border}`, cursor: isWorking ? 'default' : undefined }}
                        >
                          <span className="text-[13px] leading-none tabular-nums"
                                style={{ color: textColor, fontWeight }}>
                            {day.getDate()}
                          </span>
                          {isWorking && dailyQty > 0 && (
                            <span className="text-[9px] leading-none mt-0.5 tabular-nums"
                                  style={{ color: 'rgba(99,102,241,0.7)' }}>
                              {dailyQty >= 1000 ? `${(dailyQty/1000).toFixed(1)}k` : dailyQty}
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[9px] leading-none mt-0.5" style={{ color: '#059669' }}>✓</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </>
            );
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3">
        {[
          { color: 'rgba(99,102,241,0.08)', border: 'transparent', text: 'Робочий день', textColor: 'rgb(99,102,241)' },
          { color: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: 'Завершення', textColor: '#059669' },
          { color: 'transparent', border: 'rgba(99,102,241,0.6)', text: 'Сьогодні', textColor: 'var(--c1)' },
          { color: 'rgba(0,0,0,0.03)', border: 'transparent', text: 'Вихідний', textColor: 'var(--c4)' },
        ].map(({ color, border, text, textColor }) => (
          <div key={text} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md shrink-0"
                 style={{ backgroundColor: color, border: `1.5px solid ${border || color}` }} />
            <span className="text-[11px]" style={{ color: textColor }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ForecastCalculator({
  positions = [],
  kitsRemaining = 0,
  kitPlan = 0,
  defaultWorkers = 1,
  defaultPerWorker = 0,
}: {
  positions?: { qtyPerPostomat: number; available: number }[];
  kitsRemaining?: number;
  kitPlan?: number;
  defaultWorkers?: number;
  defaultPerWorker?: number;
}) {
  const [workers, setWorkers]     = useState(defaultWorkers);
  const [perWorker, setPerWorker] = useState(defaultPerWorker);
  const [skipSat, setSkipSat]     = useState(false);
  const [skipSun, setSkipSun]     = useState(false);
  const [kits, setKits]           = useState(kitPlan || kitsRemaining || 0);

  const remaining = positions.length > 0
    ? positions.reduce((s, p) => s + Math.max(0, kits * p.qtyPerPostomat - p.available), 0)
    : 0;

  const totalDaily     = workers * perWorker;
  const workDaysNeeded = totalDaily > 0 && remaining > 0 ? Math.ceil(remaining / totalDaily)
                       : totalDaily > 0 && remaining === 0 ? 0 : null;
  const completion     = workDaysNeeded !== null ? calcCompletion(workDaysNeeded, skipSat, skipSun) : null;
  const today          = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  return (
    <div className="card p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4">
          Калькулятор прогнозування
        </p>
        <div className="flex gap-2">
          <WeekendBtn label="Без сб" active={skipSat} onClick={() => setSkipSat(v => !v)} />
          <WeekendBtn label="Без нд" active={skipSun} onClick={() => setSkipSun(v => !v)} />
        </div>
      </div>

      {/* Inputs */}
      <div className="flex flex-wrap gap-6 items-end">
        <div>
          <p className="text-[11px] text-c4 mb-2">Поштоматів (план)</p>
          <Stepper value={kits} onChange={setKits} step={10} min={0} />
        </div>
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

      {/* Result metrics */}
      <div className="mt-4 pt-4 flex flex-wrap gap-6 items-start"
           style={{ borderTop: '1px solid var(--cbrd)' }}>
        {completion ? (
          <>
            <div>
              <p className="text-[11px] text-c4 mb-0.5">Прогнозована дата завершення</p>
              <p className="text-[16px] font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
                {fmtDate(completion.date)}
              </p>
              <p className="text-[11px] text-c4 mt-0.5">
                {workDaysNeeded === 0
                  ? 'сьогодні'
                  : `${workDaysNeeded} роб. дн.${completion.calDays !== workDaysNeeded ? ` (≈ ${completion.calDays} кал.)` : ''}`}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-c4 mb-0.5">Залишилось виготовити</p>
              <p className="text-[16px] font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-snug">
                {remaining.toLocaleString()} шт
              </p>
            </div>
            <div>
              <p className="text-[11px] text-c4 mb-0.5">Поштоматів у плані</p>
              <p className="text-[16px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums leading-snug">
                {kits} компл.
              </p>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-c4">
            Введіть кількість людей і норму на людину — побачите прогнозовану дату
          </p>
        )}
      </div>

      {/* Calendar */}
      <ProductionCalendar
        today={today}
        completionDate={completion?.date ?? null}
        skipSat={skipSat}
        skipSun={skipSun}
        dailyQty={totalDaily}
      />
    </div>
  );
}
