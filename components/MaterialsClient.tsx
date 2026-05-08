'use client';

import { useState, useRef } from 'react';
import type { Material } from '@/lib/types';
import InfoTooltip from '@/components/InfoTooltip';

// ── Calculation ────────────────────────────────────────────────────────────────

interface MatCalc extends Material {
  remainMain: number;
  kitsLeft: number;      // для первинних — повний ланцюжок; для вторинних — залишок після поглинання
  kitsFromSelf: number;  // скільки компл. дає лише ця позиція (без ланцюга)
  deficit: number;
  deficitUnits: number;
  isBottleneck: boolean;
  isSecondary: boolean;
  predecessorName: string;
  status: 'ok' | 'low' | 'critical' | 'deficit';
}

// Рекурсивний обхід ланцюжка: скільки комплектів залишається починаючи від m,
// якщо producedForThisLevel комплектів вже "спожито" на цьому рівні.
function chainKitsLeft(
  mats: Material[],
  m: Material,
  producedForThisLevel: number,
  visited = new Set<string>(),
): { kitsLeft: number; remainMain: number } {
  if (visited.has(m.id) || !m.qtyPerKit) return { kitsLeft: 0, remainMain: m.stockMain };
  visited.add(m.id);

  const capacity  = Math.floor(m.stockMain / m.qtyPerKit);
  const usedUnits = Math.min(m.stockMain, producedForThisLevel * m.qtyPerKit);
  const remainMain = Math.max(0, m.stockMain - usedUnits);
  const kitsLeftSelf = Math.floor(remainMain / m.qtyPerKit);
  const overflow  = Math.max(0, producedForThisLevel - capacity);

  if (m.nextMaterialId) {
    const next = mats.find(n => n.id === m.nextMaterialId);
    if (next) {
      const { kitsLeft: kitsFromNext } = chainKitsLeft(mats, next, overflow, new Set(visited));
      return { kitsLeft: kitsLeftSelf + kitsFromNext, remainMain };
    }
  }
  return { kitsLeft: kitsLeftSelf, remainMain };
}

function buildCalced(mats: Material[], kitsProduced: number, planKits: number): MatCalc[] {
  const secondaryIds = new Set(mats.map(m => m.nextMaterialId).filter(Boolean));

  return mats.map(m => {
    const isSecondary = secondaryIds.has(m.id);
    const predecessor = isSecondary ? mats.find(p => p.nextMaterialId === m.id) : undefined;
    const predecessorName = predecessor?.name ?? '';

    if (isSecondary && predecessor) {
      const predCapacity = predecessor.qtyPerKit > 0
        ? Math.floor(predecessor.stockMain / predecessor.qtyPerKit) : 0;
      const overflowKits = Math.max(0, kitsProduced - predCapacity);
      const { kitsLeft, remainMain } = chainKitsLeft(mats, m, overflowKits);
      const kitsFromSelf = m.qtyPerKit > 0 ? Math.floor(remainMain / m.qtyPerKit) : 0;
      return { ...m, remainMain, kitsLeft, kitsFromSelf, deficit: 0, deficitUnits: 0, isBottleneck: false, isSecondary: true, predecessorName, status: 'ok' as const };
    }

    const { kitsLeft, remainMain } = chainKitsLeft(mats, m, kitsProduced);
    const kitsFromSelf = m.qtyPerKit > 0 ? Math.floor(remainMain / m.qtyPerKit) : 0;
    const deficit      = planKits > 0 ? Math.max(0, planKits - kitsProduced - kitsLeft) : 0;
    const deficitUnits = deficit * m.qtyPerKit;

    let status: MatCalc['status'] = 'ok';
    if (deficit > 0)        status = 'deficit';
    else if (kitsLeft < 10) status = 'critical';
    else if (kitsLeft < 50) status = 'low';

    return { ...m, remainMain, kitsLeft, kitsFromSelf, deficit, deficitUnits, isBottleneck: false, isSecondary: false, predecessorName: '', status };
  });
}

// Впорядковує список так, щоб вторинні позиції йшли одразу після своєї первинної
function sortByChain(calced: MatCalc[]): MatCalc[] {
  const placed = new Set<string>();
  const result: MatCalc[] = [];
  for (const c of calced) {
    if (placed.has(c.id)) continue;
    placed.add(c.id);
    result.push(c);
    let cur = c;
    while (cur.nextMaterialId) {
      const next = calced.find(n => n.id === cur.nextMaterialId);
      if (!next || placed.has(next.id)) break;
      placed.add(next.id);
      result.push(next);
      cur = next;
    }
  }
  return result;
}

// ── Form default ──────────────────────────────────────────────────────────────

const EMPTY: Omit<Material, 'id'> = {
  name: '', unit: 'шт', qtyPerKit: 1,
  stockMain: 0, stockActual: 0,
  nextMaterialId: '',
  note: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MaterialsClient({
  initialMaterials,
  kitsProduced,
  shipped,
}: {
  initialMaterials: Material[];
  kitsProduced: number;
  shipped: number;
}) {
  const [mats, setMats]         = useState<Material[]>(initialMaterials);
  const [tab, setTab]           = useState<'data' | 'inventory'>('data');
  const [planKits, setPlanKits] = useState(() =>
    typeof window !== 'undefined' ? Number(localStorage.getItem('mat_plan_v1') || '0') : 0
  );
  const [calcBase, setCalcBase] = useState<'produced' | 'shipped'>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('mat_base_v1') as 'produced' | 'shipped' || 'produced') : 'produced'
  );
  const [saving, setSaving]     = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMat, setEditMat]   = useState<Material | null>(null);
  const [form, setForm]         = useState<Omit<Material, 'id'>>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  // ── Calculations ──────────────────────────────────────────────────────────

  const baseKits = calcBase === 'shipped' ? shipped : kitsProduced;
  const calced = buildCalced(mats, baseKits, planKits);
  const sortedCalced = sortByChain(calced);
  const primary = calced.filter(c => !c.isSecondary);
  if (primary.length > 0) {
    const minKits = Math.min(...primary.map(c => c.kitsLeft));
    primary.forEach(c => { c.isBottleneck = c.kitsLeft === minKits; });
  }
  const deficitCount = primary.filter(c => c.deficit > 0).length;
  const bottleneck   = primary.find(c => c.isBottleneck);
  const minKits      = primary.length > 0 ? Math.min(...primary.map(c => c.kitsLeft)) : 0;

  // ── Plan ──────────────────────────────────────────────────────────────────

  const handlePlan = (v: string) => {
    const n = Math.max(0, Number(v) || 0);
    setPlanKits(n);
    localStorage.setItem('mat_plan_v1', String(n));
  };

  // ── Stock inline edit ─────────────────────────────────────────────────────

  const patchStock = async (id: string, field: keyof Material, value: number) => {
    setSaving(id + field);
    setMats(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    await fetch(`/api/materials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving(null);
  };

  // ── Add / Edit ────────────────────────────────────────────────────────────

  const openAdd = () => { setEditMat(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (m: Material) => {
    setEditMat(m);
    setForm({ name: m.name, unit: m.unit, qtyPerKit: m.qtyPerKit, stockMain: m.stockMain, stockActual: m.stockActual, nextMaterialId: m.nextMaterialId, note: m.note });
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
        <div className="flex items-center gap-2">
          <InfoTooltip>
            <p className="font-semibold text-c1 text-[13px] mb-1">Як це працює</p>

            <p className="font-semibold text-c2 mt-2">Закуплено</p>
            <p>Скільки матеріалу є на складі (вводиш вручну). Натисни на цифру щоб змінити.</p>

            <p className="font-semibold text-c2 mt-2">Залишок</p>
            <p>Розраховується автоматично: <span className="font-mono text-[11px]">Закуплено − (вироблено × норма/компл.)</span>. Показує скільки матеріалу залишилось після списання.</p>

            <p className="font-semibold text-c2 mt-2">Компл.</p>
            <p>Скільки ще комплектів можна зібрати із залишку. Якщо є черга позицій — рахується сумарно по всьому ланцюжку.</p>

            <p className="font-semibold text-c2 mt-2">Дефіцит</p>
            <p><span className="font-mono text-[11px]">план − база − залишок компл.</span> — скільки комплектів не вистачає матеріалу для виконання плану.</p>

            <p className="font-semibold text-c2 mt-2">База розрахунку</p>
            <p><b>Від готових</b> — списання від усіх зібраних комплектів.<br/><b>Від відправлених</b> — тільки від відправлених (зібрані але не відправлені ще потребують матеріалу).</p>

            <p className="font-semibold text-c2 mt-2">Черга позицій (↓ далі: …)</p>
            <p>Перша позиція вичерпується повністю. Після цього автоматично починає витрачатись наступна. Вказується у формі редагування.</p>

            <p className="font-semibold text-c2 mt-2">Вкладка «Інвентаризація»</p>
            <p>Вводиш фактичний підрахунок складу. Система порівнює з розрахунковим залишком і показує відхилення (надлишок / нестача). Дата підрахунку зберігається автоматично.</p>
          </InfoTooltip>
          <button onClick={openAdd} className="btn-primary">
            + Додати
          </button>
        </div>
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
        <p className="text-[13px] font-medium text-c2 shrink-0">Планова кількість:</p>
        <input
          type="number" min={0} value={planKits || ''} onChange={e => handlePlan(e.target.value)}
          placeholder="0"
          className="w-28 px-3 py-1.5 rounded-lg text-[14px] font-semibold text-c1 tabular-nums
                     border border-[var(--cbrd)] bg-[var(--csr)] outline-none
                     focus:border-indigo-400 transition-colors"
        />

        {/* Перемикач бази розрахунку */}
        <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ backgroundColor: 'var(--csr2)', border: '1px solid var(--cbrd)' }}>
          {([
            { id: 'produced', label: 'Від готових', value: kitsProduced },
            { id: 'shipped',  label: 'Від відправлених', value: shipped },
          ] as const).map(opt => (
            <button key={opt.id}
              onClick={() => { setCalcBase(opt.id); localStorage.setItem('mat_base_v1', opt.id); }}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-all ${
                calcBase === opt.id
                  ? 'bg-indigo-500 text-white'
                  : 'text-c3 hover:bg-[var(--chov)]'
              }`}>
              {opt.label} <span className={`tabular-nums ${calcBase === opt.id ? 'text-indigo-200' : 'text-c4'}`}>({opt.value})</span>
            </button>
          ))}
        </div>

        {planKits > 0 && (
          <p className="text-[12px] text-c4">
            Залишилось: <span className="font-semibold text-c2">{Math.max(0, planKits - baseKits)}</span> компл.
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
              Автосписання від <span className="font-semibold text-c2">{baseKits}</span> {calcBase === 'shipped' ? 'відправлених' : 'готових'} компл. · натисніть на цифру для редагування
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                  <th className="th text-left min-w-[180px] sticky left-0 z-10" style={{ backgroundColor: 'var(--csr)' }}>Матеріал</th>
                  <th className="th text-center min-w-[72px]">
                    На 1 компл.
                    <ColTip>Норма витрати матеріалу на один зібраний комплект. Задається при додаванні матеріалу.</ColTip>
                  </th>
                  <th className="th text-center min-w-[88px]">
                    Закуплено
                    <ColTip>Загальний запас матеріалу на складі. Натисніть на цифру щоб змінити.</ColTip>
                  </th>
                  <th className="th text-center min-w-[88px]">
                    Залишок
                    <ColTip>Закуплено − (база × норма/компл.). Скільки матеріалу залишилось після списання на вже зроблені комплекти.</ColTip>
                  </th>
                  <th className="th text-center min-w-[96px]" style={{ borderLeft: '2px solid var(--cbrd)' }}>
                    Інв. підрахунок
                    <ColTip>Фактичний підрахунок складу. Натисніть щоб ввести. Відхилення = факт − розрахунок (зелений — надлишок, червоний — нестача).</ColTip>
                    <br/><span className="text-[9px] normal-case tracking-normal font-normal">факт. підрахунок</span>
                  </th>
                  <th className="th text-center min-w-[80px]">
                    Компл.
                    <ColTip>Скільки ще комплектів можна зробити із залишку. Якщо є черга позицій — рахується сумарно; цифри нижче показують розбивку (своя + наступна).</ColTip>
                  </th>
                  <th className="th text-center min-w-[130px]">
                    Дефіцит
                    <ColTip>Скільки комплектів та одиниць матеріалу не вистачає для виконання плану. Відображається лише якщо задана «Планова кількість».</ColTip>
                  </th>
                  <th className="th text-center min-w-[64px]">Дії</th>
                </tr>
              </thead>
              <tbody>
                {sortedCalced.map((c, i) => {
                  const isLast = i === sortedCalced.length - 1;
                  return (
                    <tr key={c.id}
                      style={{
                        ...(c.isSecondary ? { backgroundColor: 'var(--csr2)' } : {}),
                        ...(!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}),
                      }}>

                      {/* Матеріал */}
                      <td className="px-4 py-3 sticky left-0 z-10" style={{ backgroundColor: c.isSecondary ? 'var(--csr2)' : 'var(--csr)' }}>
                        <div className="flex items-center gap-2">
                          {c.isSecondary
                            ? <span className="text-[14px] text-indigo-400 shrink-0" title="Поглинає переповнення">↑</span>
                            : c.isBottleneck
                              ? <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Вузьке місце" />
                              : null
                          }
                          <div>
                            <p className="text-[13px] font-semibold text-c1 leading-tight">{c.name}</p>
                            {c.isSecondary
                              ? <p className="text-[10px] text-indigo-400">↑ після «{c.predecessorName}»</p>
                              : c.nextMaterialId
                                ? <p className="text-[10px] text-c4">↓ далі: {mats.find(m => m.id === c.nextMaterialId)?.name ?? '—'}</p>
                                : <p className="text-[11px] text-c4">{c.unit}</p>
                            }
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
                          <p className="text-[10px] text-c4 mt-0.5">
                            −{c.stockMain - c.remainMain} {c.isSecondary ? 'погл.' : 'вик.'}
                          </p>
                        )}
                      </td>

                      {/* Інвентаризація */}
                      <InvCell
                        id={c.id} field="stockActual" value={c.stockActual}
                        calcRemain={c.remainMain} saving={saving} onSave={patchStock}
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
                        {!c.isSecondary && c.nextMaterialId && c.kitsLeft !== c.kitsFromSelf && (
                          <p className="text-[10px] text-c4 mt-0.5 tabular-nums">
                            {c.kitsFromSelf}+{c.kitsLeft - c.kitsFromSelf}
                          </p>
                        )}
                      </td>

                      {/* Дефіцит */}
                      <td className="px-3 py-3 text-center">
                        {c.isSecondary ? (
                          <span className="text-[11px] text-c4">в черзі</span>
                        ) : c.deficit > 0 ? (
                          <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-lg
                              text-[13px] font-semibold tabular-nums
                              text-red-700 dark:text-red-300 bg-red-500/10">
                              −{c.deficit} <span className="text-[10px] font-normal">компл.</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 h-7 rounded-lg
                              text-[13px] font-semibold tabular-nums
                              text-orange-700 dark:text-orange-300 bg-orange-500/10">
                              {c.deficitUnits} <span className="text-[10px] font-normal">{c.unit}</span>
                            </span>
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
                  {sortedCalced.map((c, i) => {
                    const isLast = i === sortedCalced.length - 1;
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
                        <InvCell id={c.id} field="stockActual" value={c.stockActual} calcRemain={c.remainMain} saving={saving} onSave={patchStock} />
                        {/* Відхилення */}
                        <td className="px-3 py-3 text-center">
                          {diff !== null ? (
                            <div>
                              <span className={`text-[15px] font-bold tabular-nums ${diffColor(diff)}`}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                              <p className="text-[10px] text-c4 mt-0.5">{diff > 0 ? 'надлишок' : diff < 0 ? 'нестача' : 'збіг'}</p>
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

              <FormField label="Наступна позиція (якщо ця вичерпається)">
                <select className={inputCls} value={form.nextMaterialId}
                  onChange={e => setForm(f => ({ ...f, nextMaterialId: e.target.value }))}>
                  <option value="">— не вказано —</option>
                  {mats
                    .filter(m => m.id !== editMat?.id)
                    .map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                  }
                </select>
              </FormField>

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

// ── Column tooltip ─────────────────────────────────────────────────────────────

function ColTip({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex ml-1 cursor-help align-middle">
      <span className="text-[9px] text-c4/60 border border-c4/30 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center leading-none select-none">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2.5 rounded-xl
                       text-[11px] text-c2 leading-relaxed text-left font-normal normal-case tracking-normal whitespace-normal
                       bg-[var(--csr)] border border-[var(--cbrd)] shadow-xl
                       opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
        {children}
      </span>
    </span>
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

function InvCell({ id, field, value, calcRemain, saving, onSave }: {
  id: string;
  field: keyof Material;
  value: number;
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
