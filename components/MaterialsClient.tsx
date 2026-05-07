'use client';

import { useState, useRef } from 'react';
import type { Material } from '@/lib/types';

// ── Calculation ────────────────────────────────────────────────────────────────

interface MatCalc extends Material {
  remainMain: number;
  kitsLeft: number;
  deficit: number;
  deficitUnits: number; // deficit × qtyPerKit — скільки одиниць матеріалу не вистачає
  isBottleneck: boolean;
  status: 'ok' | 'low' | 'critical' | 'deficit';
}

function calcMat(m: Material, kitsProduced: number, planKits: number): MatCalc {
  const used       = m.qtyPerKit > 0 ? Math.min(m.stockMain, kitsProduced * m.qtyPerKit) : 0;
  const remainMain = Math.max(0, m.stockMain - used);
  const kitsLeft   = m.qtyPerKit > 0 ? Math.floor(remainMain / m.qtyPerKit) : 0;
  const deficit    = planKits > 0 ? Math.max(0, planKits - kitsProduced - kitsLeft) : 0;
  const deficitUnits = deficit * m.qtyPerKit;

  let status: MatCalc['status'] = 'ok';
  if (deficit > 0)        status = 'deficit';
  else if (kitsLeft < 10) status = 'critical';
  else if (kitsLeft < 50) status = 'low';

  return { ...m, remainMain, kitsLeft, deficit, deficitUnits, isBottleneck: false, status };
}

// ── Form default ──────────────────────────────────────────────────────────────

const EMPTY: Omit<Material, 'id'> = {
  name: '', unit: 'шт', qtyPerKit: 1,
  stockMain: 0, stockActual: 0, stockActualDate: '',
  note: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaterialsClient({
  initialMaterials,
  kitsProduced,
}: {
  initialMaterials: Material[];
  kitsProduced: number;
}) {
  const [mats, setMats]         = useState<Material[]>(initialMaterials);
  const [tab, setTab]           = useState<'data' | 'inventory'>('data');
  const [planKits, setPlanKits] = useState(() =>
    typeof window !== 'undefined' ? Number(localStorage.getItem('mat_plan_v1') || '0') : 0
  );
  const [saving, setSaving]     = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMat, setEditMat]   = useState<Material | null>(null);
  const [form, setForm]         = useState<Omit<Material, 'id'>>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  // ── Calculations ──────────────────────────────────────────────────────────

  const calced = mats.map(m => calcMat(m, kitsProduced, planKits));
  if (calced.length > 0) {
    const minKits = Math.min(...calced.map(c => c.kitsLeft));
    calced.forEach(c => { c.isBottleneck = c.kitsLeft === minKits; });
  }
  const deficitCount = calced.filter(c => c.deficit > 0).length;
  const bottleneck   = calced.find(c => c.isBottleneck);
  const minKits      = calced.length > 0 ? Math.min(...calced.map(c => c.kitsLeft)) : 0;

  // ── Plan ──────────────────────────────────────────────────────────────────

  const handlePlan = (v: string) => {
    const n = Math.max(0, Number(v) || 0);
    setPlanKits(n);
    localStorage.setItem('mat_plan_v1', String(n));
  };

  // ── Stock inline edit ─────────────────────────────────────────────────────

  const patchStock = async (id: string, field: keyof Material, value: number) => {
    setSaving(id + field);
    const today = new Date().toISOString().slice(0, 10);
    const extra = field === 'stockActual'
      ? { stockActualDate: value > 0 ? today : '' }
      : {};
    setMats(prev => prev.map(m => m.id === id ? { ...m, [field]: value, ...extra } : m));
    await fetch(`/api/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value, ...extra }),
    });
    setSaving(null);
  };

  // ── Add / Edit ────────────────────────────────────────────────────────────

  const openAdd = () => { setEditMat(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (m: Material) => {
    setEditMat(m);
    setForm({ name: m.name, unit: m.unit, qtyPerKit: m.qtyPerKit, stockMain: m.stockMain, stockActual: m.stockActual, stockActualDate: m.stockActualDate, note: m.note });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditMat(null); setForm(EMPTY); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (editMat) {
      await fetch(`/api/materials/${editMat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setMats(prev => prev.map(m => m.id === editMat.id ? { id: editMat.id, ...form } : m));
    } else {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const { id } = await res.json();
      setMats(prev => [...prev, { id, ...form }]);
    }
    setSubmitting(false);
    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити матеріал?')) return;
    await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    setMats(prev => prev.filter(m => m.id !== id));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-up">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-c4 mb-1">Облік</p>
          <h1 className="text-[22px] font-semibold text-c1 leading-none tracking-tight">Розхідні матеріали</h1>
        </div>
        <button onClick={openAdd} className="btn-primary">
          + Додати
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--csr2)', border: '1px solid var(--cbrd)' }}>
        {([
          { id: 'data',      label: 'Поточні дані',   sub: 'розрахунок списання' },
          { id: 'inventory', label: 'Інвентаризація', sub: 'фактичний підрахунок' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-150 ${
              tab === t.id
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-c3 hover:bg-[var(--chov)]'
            }`}>
            <span className="text-[13px] font-semibold leading-tight">{t.label}</span>
            <span className={`text-[10px] leading-tight mt-0.5 ${tab === t.id ? 'text-indigo-200' : 'text-c4'}`}>{t.sub}</span>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Матеріалів',      value: mats.length,                              sub: 'позицій',             color: '' },
          { label: 'Дефіцит',         value: deficitCount,                             sub: 'потребує поповнення', color: deficitCount > 0 ? 'text-red-500' : 'text-emerald-500' },
          { label: 'Мін. комплектів', value: calced.length > 0 ? minKits : '—',        sub: bottleneck?.name || 'немає даних', color: '' },
          { label: 'Вироблено',       value: kitsProduced,                             sub: 'комплектів',          color: '' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="card-hover p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 mb-2">{label}</p>
            <p className={`text-[22px] font-semibold leading-none ${color || 'text-c1'}`}>{value}</p>
            <p className="text-[11px] text-c4 mt-1 truncate">{sub}</p>
          </div>
        ))}
      </div>

      {/* Plan row */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <p className="text-[13px] font-medium text-c2 shrink-0">Планова кількість комплектів:</p>
        <input
          type="number" min={0} value={planKits || ''} onChange={e => handlePlan(e.target.value)}
          placeholder="0"
          className="w-28 px-3 py-1.5 rounded-lg text-[14px] font-semibold text-c1 tabular-nums
                     border border-[var(--cbrd)] bg-[var(--csr)] outline-none
                     focus:border-indigo-400 transition-colors"
        />
        {planKits > 0 && (
          <p className="text-[12px] text-c4">
            Залишилось: <span className="font-semibold text-c2">{Math.max(0, planKits - kitsProduced)}</span> компл.
            {deficitCount > 0 && (
              <span className="ml-2 text-red-500 font-semibold">· {deficitCount} матеріалів у дефіциті</span>
            )}
          </p>
        )}
      </div>

      {/* ── TAB: Поточні дані ── */}
      {tab === 'data' && mats.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[14px] text-c4">Матеріалів ще немає</p>
          <p className="text-[12px] text-c4 mt-1">Натисніть "+ Додати" щоб додати перший розхідний матеріал</p>
        </div>
      ) : tab === 'data' ? (
        <div className="card overflow-hidden">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--cbrd)' }}>
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-c4">Розрахунок по матеріалах</p>
            <p className="text-[11px] text-c4 mt-0.5">
              Автосписання від {kitsProduced} вироблених компл. · натисніть на цифру для редагування
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                  <th className="th text-left min-w-[180px] sticky left-0 z-10" style={{ backgroundColor: 'var(--csr)' }}>Матеріал</th>
                  <th className="th text-center min-w-[72px]">На 1 компл.</th>
                  <th className="th text-center min-w-[88px]">Закуплено</th>
                  <th className="th text-center min-w-[88px]">Залишок</th>
                  <th className="th text-center min-w-[96px]" style={{ borderLeft: '2px solid var(--cbrd)' }}>
                    Інв. підрахунок<br/><span className="text-[9px] normal-case tracking-normal font-normal">факт. підрахунок</span>
                  </th>
                  <th className="th text-center min-w-[80px]">Компл.</th>
                  <th className="th text-center min-w-[80px]">Дефіцит<br/><span className="text-[9px] normal-case tracking-normal font-normal">компл.</span></th>
                  <th className="th text-center min-w-[90px]">Треба докупити<br/><span className="text-[9px] normal-case tracking-normal font-normal">од. матеріалу</span></th>
                  <th className="th text-center min-w-[64px]">Дії</th>
                </tr>
              </thead>
              <tbody>
                {calced.map((c, i) => {
                  const isLast = i === calced.length - 1;
                  return (
                    <tr key={c.id} style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}>

                      {/* Матеріал */}
                      <td className="px-4 py-3 sticky left-0 z-10" style={{ backgroundColor: 'var(--csr)' }}>
                        <div className="flex items-center gap-2">
                          {c.isBottleneck && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Вузьке місце" />}
                          <div>
                            <p className="text-[13px] font-semibold text-c1 leading-tight">{c.name}</p>
                            <p className="text-[11px] text-c4">{c.unit}</p>
                          </div>
                        </div>
                      </td>

                      {/* На 1 компл. */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-[13px] tabular-nums text-c2">{c.qtyPerKit}</span>
                      </td>

                      {/* Закуплено (editable) */}
                      <StockCell id={c.id} field="stockMain" value={c.stockMain} saving={saving} onSave={patchStock} />

                      {/* Залишок (calculated) */}
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[13px] tabular-nums font-medium ${c.remainMain === 0 ? 'text-red-500' : 'text-c2'}`}>
                          {c.remainMain}
                        </span>
                        {c.stockMain - c.remainMain > 0 && (
                          <p className="text-[10px] text-c4 mt-0.5">−{c.stockMain - c.remainMain} вик.</p>
                        )}
                      </td>

                      {/* Інвентаризація */}
                      <InvCell
                        id={c.id} field="stockActual" value={c.stockActual}
                        date={c.stockActualDate} calcRemain={c.remainMain} saving={saving} onSave={patchStock}
                      />

                      {/* Компл. */}
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex items-center justify-center px-2 h-7 min-w-[36px] rounded-lg
                          text-[13px] font-semibold tabular-nums
                          ${c.kitsLeft > 0
                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                            : 'text-red-600 dark:text-red-400 bg-red-500/10'}`}>
                          {c.kitsLeft}
                        </span>
                      </td>

                      {/* Дефіцит компл. */}
                      <td className="px-3 py-3 text-center">
                        {c.deficit > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 h-7 rounded-lg
                            text-[13px] font-semibold tabular-nums
                            text-red-700 dark:text-red-300 bg-red-500/10">
                            −{c.deficit}
                          </span>
                        ) : planKits > 0 ? (
                          <span className="text-emerald-500 text-[13px]">✓</span>
                        ) : (
                          <span className="text-[12px] text-c4">—</span>
                        )}
                      </td>

                      {/* Треба докупити (одиниці матеріалу) */}
                      <td className="px-3 py-3 text-center">
                        {c.deficitUnits > 0 ? (
                          <div>
                            <span className="inline-flex items-center justify-center px-2 h-7 rounded-lg
                              text-[13px] font-semibold tabular-nums
                              text-orange-700 dark:text-orange-300 bg-orange-500/10">
                              {c.deficitUnits}
                            </span>
                            <p className="text-[10px] text-c4 mt-0.5">{c.unit}</p>
                          </div>
                        ) : planKits > 0 ? (
                          <span className="text-emerald-500 text-[13px]">✓</span>
                        ) : (
                          <span className="text-[12px] text-c4">—</span>
                        )}
                      </td>

                      {/* Дії */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px]
                                       text-c4 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                            title="Редагувати">✎</button>
                          <button onClick={() => handleDelete(c.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px]
                                       text-c4 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Видалити">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-5 py-3 flex flex-wrap gap-4" style={{ borderTop: '1px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
            <span className="flex items-center gap-1.5 text-[11px] text-c4">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Вузьке місце
            </span>
            <span className="text-[11px] text-c4">· Закуплено — натисніть для редагування · Залишок — автоматично після списання {kitsProduced} компл.</span>
          </div>
        </div>
      ) : null}

      {/* ── TAB: Інвентаризація ── */}
      {tab === 'inventory' && (
        mats.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-[14px] text-c4">Матеріалів ще немає</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--cbrd)' }}>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-c4">Інвентаризація</p>
              <p className="text-[11px] text-c4 mt-0.5">
                Введіть фактичний підрахунок по кожній позиції · відхилення = факт − розрахунок
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                    <th className="th text-left min-w-[200px] sticky left-0 z-10" style={{ backgroundColor: 'var(--csr)' }}>Матеріал</th>
                    <th className="th text-center min-w-[120px]">Розрахунковий залишок</th>
                    <th className="th text-center min-w-[120px]" style={{ borderLeft: '2px solid var(--cbrd)' }}>Факт. підрахунок</th>
                    <th className="th text-center min-w-[110px]">Відхилення</th>
                  </tr>
                </thead>
                <tbody>
                  {calced.map((c, i) => {
                    const isLast = i === calced.length - 1;
                    const diff   = c.stockActual > 0 ? c.stockActual - c.remainMain : null;
                    const diffColor = (d: number | null) =>
                      d === null ? 'text-c4' : d > 0 ? 'text-emerald-600 dark:text-emerald-400' : d < 0 ? 'text-red-500' : 'text-c2';
                    return (
                      <tr key={c.id} style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}>
                        {/* Матеріал */}
                        <td className="px-4 py-3 sticky left-0 z-10" style={{ backgroundColor: 'var(--csr)' }}>
                          <p className="text-[13px] font-semibold text-c1">{c.name}</p>
                          <p className="text-[11px] text-c4">{c.unit}</p>
                        </td>
                        {/* Розрахунковий залишок */}
                        <td className="px-3 py-3 text-center">
                          <span className={`text-[14px] font-semibold tabular-nums ${c.remainMain === 0 ? 'text-red-500' : 'text-c2'}`}>
                            {c.remainMain}
                          </span>
                          <p className="text-[10px] text-c4 mt-0.5">{c.unit}</p>
                        </td>
                        {/* Факт. підрахунок */}
                        <InvCell id={c.id} field="stockActual" value={c.stockActual} date={c.stockActualDate} calcRemain={c.remainMain} saving={saving} onSave={patchStock} />
                        {/* Відхилення */}
                        <td className="px-3 py-3 text-center">
                          {diff !== null ? (
                            <div>
                              <span className={`text-[15px] font-bold tabular-nums ${diffColor(diff)}`}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                              <p className="text-[10px] text-c4 mt-0.5">{diff > 0 ? 'надлишок' : diff < 0 ? 'нестача' : 'збіг'}</p>
                              {c.stockActualDate && <p className="text-[9px] text-c4 mt-0.5">{fmtDate(c.stockActualDate)}</p>}
                            </div>
                          ) : (
                            <span className="text-[12px] text-c4">не підраховано</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
             onClick={e => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-[15px] font-semibold text-c1 mb-5">
              {editMat ? 'Редагувати матеріал' : 'Додати матеріал'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <FormField label="Назва" required>
                <input required className={inputCls} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="напр. Термоусадка 20мм" />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Одиниця виміру">
                  <input className={inputCls} value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="шт / м / кг" />
                </FormField>
                <FormField label="Кількість на 1 компл.">
                  <input type="number" min={0} step="any" className={inputCls}
                    value={form.qtyPerKit || ''}
                    onChange={e => setForm(f => ({ ...f, qtyPerKit: Number(e.target.value) || 0 }))}
                    placeholder="1" />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Закуплено (кількість)">
                  <input type="number" min={0} className={inputCls}
                    value={form.stockMain || ''}
                    onChange={e => setForm(f => ({ ...f, stockMain: Number(e.target.value) || 0 }))}
                    placeholder="0" />
                </FormField>
                <FormField label="Факт. залишок складу">
                  <input type="number" min={0} className={inputCls}
                    value={form.stockActual || ''}
                    onChange={e => setForm(f => ({ ...f, stockActual: Number(e.target.value) || 0 }))}
                    placeholder="0" />
                </FormField>
              </div>

              <FormField label="Примітка">
                <input className={inputCls} value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="необов'язково" />
              </FormField>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeForm} className="btn-ghost flex-1 justify-center">
                  Скасувати
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? 'Збереження…' : editMat ? 'Зберегти' : 'Додати'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Input style helper ─────────────────────────────────────────────────────────

const inputCls = `w-full px-3 py-2 rounded-xl text-[13px] text-c1
  border border-[var(--cbrd)] bg-[var(--csr)] outline-none
  focus:border-indigo-400 transition-colors placeholder:text-c4`;

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-c4 uppercase tracking-wide mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Inventory cell — editable count + discrepancy vs calculated remain ────────

function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function InvCell({ id, field, value, date, calcRemain, saving, onSave }: {
  id: string;
  field: keyof Material;
  value: number;
  date?: string;
  calcRemain: number;
  saving: string | null;
  onSave: (id: string, field: keyof Material, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState('');
  const inputRef              = useRef<HTMLInputElement>(null);
  const isSaving              = saving === id + field;

  const start = () => { setVal(String(value)); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commit = () => {
    const n = Number(val);
    if (!isNaN(n) && n !== value) onSave(id, field, n);
    setEditing(false);
  };

  const diff = value > 0 ? value - calcRemain : null;

  if (editing) {
    return (
      <td className="px-2 py-2 text-center" style={{ borderLeft: '2px solid var(--cbrd)' }}>
        <input ref={inputRef} type="number" min={0} value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-20 px-2 py-1 text-[13px] text-center tabular-nums rounded-lg
                     border border-amber-400 bg-[var(--csr)] text-c1 outline-none"
          autoFocus />
      </td>
    );
  }

  return (
    <td className="px-3 py-3 text-center cursor-pointer group" style={{ borderLeft: '2px solid var(--cbrd)' }}
        onClick={start} title="Натисніть щоб ввести фактичний підрахунок">
      {isSaving ? (
        <span className="text-[12px] text-amber-400 animate-pulse">…</span>
      ) : value > 0 ? (
        <div>
          <span className="text-[13px] tabular-nums font-semibold text-amber-600 dark:text-amber-400
                           group-hover:text-amber-500 transition-colors border-b border-dashed
                           border-transparent group-hover:border-amber-400">
            {value}
          </span>
          {diff !== null && (
            <p className={`text-[10px] mt-0.5 tabular-nums font-semibold
              ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-red-500' : 'text-c4'}`}>
              {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '='}
            </p>
          )}
          {date && <p className="text-[9px] text-c4 mt-0.5">{fmtDate(date)}</p>}
        </div>
      ) : (
        <span className="text-[11px] text-c4 group-hover:text-amber-400 transition-colors">
          підрахувати
        </span>
      )}
    </td>
  );
}

// ── Inline editable stock cell ─────────────────────────────────────────────────

function StockCell({ id, field, value, saving, onSave }: {
  id: string;
  field: keyof Material;
  value: number;
  saving: string | null;
  onSave: (id: string, field: keyof Material, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState('');
  const inputRef              = useRef<HTMLInputElement>(null);
  const isSaving              = saving === id + field;

  const start = () => { setVal(String(value)); setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
  const commit = () => {
    const n = Number(val);
    if (!isNaN(n) && n !== value) onSave(id, field, n);
    setEditing(false);
  };

  if (editing) {
    return (
      <td className="px-2 py-2 text-center">
        <input ref={inputRef} type="number" min={0} value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-20 px-2 py-1 text-[13px] text-center tabular-nums rounded-lg
                     border border-indigo-400 bg-[var(--csr)] text-c1 outline-none"
          autoFocus />
      </td>
    );
  }

  return (
    <td className="px-3 py-3 text-center cursor-pointer group" onClick={start} title="Натисніть щоб змінити">
      {isSaving ? (
        <span className="text-[12px] text-indigo-400 animate-pulse">…</span>
      ) : (
        <span className="text-[13px] tabular-nums text-c2 group-hover:text-indigo-500 transition-colors
                         border-b border-dashed border-transparent group-hover:border-indigo-400">
          {value}
        </span>
      )}
    </td>
  );
}
