'use client';
import { useState } from 'react';

type PositionRow = {
  id: string;
  lengthMm: number;
  qtyPerPostomat: number;
};

type Employee = {
  id: string;
  fullName: string;
};

type Props = {
  positions: PositionRow[];
  employees: Employee[];
  today: string;
};

type Mode = 'kits' | 'individual';

function NumInput({
  value, onChange, min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <input
      type="number"
      value={value === 0 ? '' : value}
      min={min}
      placeholder="0"
      onChange={e => {
        const v = parseInt(e.target.value);
        onChange(isNaN(v) ? 0 : Math.max(min, v));
      }}
      className="w-20 h-8 px-2 text-right text-[14px] font-semibold text-c1 bg-transparent outline-none rounded-lg tabular-nums"
      style={{ border: '1px solid var(--cbrd)' }}
    />
  );
}

function KitStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-8 h-8 rounded-l-lg flex items-center justify-center text-c3 hover:text-c1 transition-colors text-[16px] font-medium"
        style={{ backgroundColor: 'var(--chov)', border: '1px solid var(--cbrd)', borderRight: 'none' }}
      >−</button>
      <input
        type="number"
        value={value}
        min={1}
        onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) onChange(v); }}
        className="w-16 h-8 text-center text-[15px] font-semibold text-c1 bg-transparent outline-none tabular-nums"
        style={{ border: '1px solid var(--cbrd)' }}
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-r-lg flex items-center justify-center text-c3 hover:text-c1 transition-colors text-[16px] font-medium"
        style={{ backgroundColor: 'var(--chov)', border: '1px solid var(--cbrd)', borderLeft: 'none' }}
      >+</button>
    </div>
  );
}

export default function ProductionBatchEntry({ positions, employees, today }: Props) {
  const [mode, setMode] = useState<Mode>('kits');
  const [kits, setKits] = useState(1);
  const [individualQtys, setIndividualQtys] = useState<Record<string, number>>({});
  const [date, setDate] = useState(today);
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const kitsTotalUnits = positions.reduce((s, p) => s + kits * p.qtyPerPostomat, 0);
  const individualTotalUnits = Object.values(individualQtys).reduce((s, v) => s + (v || 0), 0);

  function setQty(posId: string, qty: number) {
    setIndividualQtys(prev => ({ ...prev, [posId]: qty }));
  }

  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    try {
      const body =
        mode === 'kits'
          ? { kits, date, employeeId }
          : {
              entries: positions.map(p => ({ positionId: p.id, qty: individualQtys[p.id] || 0 })),
              date,
              employeeId,
            };

      const res = await fetch('/api/production/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        const units = data.totalUnits ?? kitsTotalUnits;
        const suffix =
          mode === 'kits'
            ? `${kits} компл. · ${units} одиниць по ${data.count} позиціях`
            : `${units} одиниць по ${data.count} позиціях`;
        setResult({ ok: true, msg: `Збережено: ${suffix}` });
        if (mode === 'individual') setIndividualQtys({});
      } else {
        setResult({ ok: false, msg: data.error || 'Помилка збереження' });
      }
    } catch {
      setResult({ ok: false, msg: 'Помилка мережі' });
    }
    setLoading(false);
  }

  const canSubmit =
    mode === 'kits'
      ? kits > 0
      : Object.values(individualQtys).some(v => v > 0);

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Employee */}
          <div>
            <p className="text-[12px] font-medium text-c4 mb-2">Працівник</p>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="h-8 px-3 rounded-lg text-[13px] text-c1 outline-none w-full"
              style={{ border: '1px solid var(--cbrd)', backgroundColor: 'var(--cbg)' }}
            >
              <option value="">— не вказано —</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <p className="text-[12px] font-medium text-c4 mb-2">Дата</p>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="h-8 px-3 rounded-lg text-[13px] text-c1 bg-transparent outline-none"
              style={{ border: '1px solid var(--cbrd)', colorScheme: 'dark' }}
            />
          </div>

          {/* Mode tabs */}
          <div>
            <p className="text-[12px] font-medium text-c4 mb-2">Режим введення</p>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--cbrd)' }}>
              <button
                type="button"
                onClick={() => { setMode('kits'); setResult(null); }}
                className="flex-1 h-8 text-[13px] font-medium transition-colors"
                style={{
                  backgroundColor: mode === 'kits' ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: mode === 'kits' ? 'rgb(99,102,241)' : 'var(--c4)',
                  borderRight: '1px solid var(--cbrd)',
                }}
              >
                По компл.
              </button>
              <button
                type="button"
                onClick={() => { setMode('individual'); setResult(null); }}
                className="flex-1 h-8 text-[13px] font-medium transition-colors"
                style={{
                  backgroundColor: mode === 'individual' ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: mode === 'individual' ? 'rgb(99,102,241)' : 'var(--c4)',
                }}
              >
                Поштучно
              </button>
            </div>
          </div>
        </div>

        {/* Kits stepper — visible only in kits mode */}
        {mode === 'kits' && (
          <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid var(--cbrd)' }}>
            <div>
              <p className="text-[12px] font-medium text-c4 mb-2">Кількість комплектів</p>
              <div className="flex items-center gap-2">
                <KitStepper value={kits} onChange={setKits} />
                <button type="button" onClick={() => setKits(v => v + 10)} className="btn-ghost text-[12px] px-2 py-1">+10</button>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[12px] text-c4">Всього одиниць</p>
              <p className="text-[22px] font-semibold text-c1 tabular-nums leading-tight">{kitsTotalUnits}</p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="btn-primary disabled:opacity-40"
          >
            {loading
              ? 'Збереження…'
              : mode === 'kits'
                ? `Записати ${kits} компл.`
                : `Записати ${individualTotalUnits} шт`}
          </button>
          {mode === 'individual' && individualTotalUnits > 0 && (
            <span className="text-[13px] text-c4">
              Всього: <span className="font-semibold text-c1 tabular-nums">{individualTotalUnits}</span> шт
            </span>
          )}
        </div>

        {/* Result */}
        {result && (
          <div
            className="mt-3 px-4 py-2.5 rounded-xl text-[13px] font-medium"
            style={{
              backgroundColor: result.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${result.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: result.ok ? '#10b981' : '#ef4444',
            }}
          >
            {result.ok ? '✓ ' : '✗ '}{result.msg}
          </div>
        )}
      </div>

      {/* Positions table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cbrd)' }}>
          <div>
            <h2 className="text-[15px] font-semibold text-c1">
              {mode === 'kits' ? 'Розподіл по позиціях' : 'Введення по позиціях'}
            </h2>
            <p className="text-[12px] text-c4 mt-0.5">
              {mode === 'kits'
                ? 'Кількість одиниць = комплекти × к-сть/компл.'
                : 'Введіть кількість виготовлених одиниць для кожної позиції'}
            </p>
          </div>
          <span className="badge-indigo">{positions.length} позицій</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                <th className="th text-left">Позиція</th>
                <th className="th text-right">К-сть/компл.</th>
                <th className="th text-right">
                  {mode === 'kits' ? 'Одиниць буде записано' : 'Виготовлено, шт'}
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const isLast = i === positions.length - 1;
                const kitsUnits = kits * p.qtyPerPostomat;
                const indQty = individualQtys[p.id] || 0;

                return (
                  <tr
                    key={p.id}
                    className="row-hover"
                    style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}
                  >
                    <td className="px-5 py-3">
                      <span className="text-[14px] font-semibold text-c1">{p.lengthMm} мм</span>
                    </td>
                    <td className="px-5 py-3 text-right text-[13px] text-c4 tabular-nums">
                      {p.qtyPerPostomat}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {mode === 'kits' ? (
                        <>
                          <span className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {kitsUnits}
                          </span>
                          <span className="text-[11px] text-c4 ml-1">шт</span>
                        </>
                      ) : (
                        <NumInput
                          value={indQty}
                          onChange={v => setQty(p.id, v)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--cbrd)' }}>
                <td className="px-5 py-3 text-[13px] font-semibold text-c3" colSpan={2}>Всього</td>
                <td className="px-5 py-3 text-right">
                  <span className="text-[16px] font-bold text-c1 tabular-nums">
                    {mode === 'kits' ? kitsTotalUnits : individualTotalUnits}
                  </span>
                  <span className="text-[12px] text-c4 ml-1">шт</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
