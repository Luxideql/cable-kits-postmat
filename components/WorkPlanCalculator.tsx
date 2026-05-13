'use client';
import { useState, useMemo, useEffect } from 'react';
import StatsCard from './StatsCard';
import InfoTooltip from './InfoTooltip';

const LS_KEY = 'workplan_v5';

type PositionRow = { id: string; lengthMm: number; qtyPerPostomat: number; available: number };
type Props = { positions: PositionRow[] };

type ShiftCardItem = { posId: string; lengthMm: number; qty: number };
type ShiftCard = {
  id: string; date: string;
  workers_count: number; plan_per_worker: number; total_plan: number;
  status: 'issued' | 'confirmed' | 'cancelled';
  stock_applied: boolean;
  plan_items: ShiftCardItem[]; fact_items: ShiftCardItem[];
  created_at: string; fixed_at: string; cancelled_at: string;
};
type PrintData = {
  card: { date: string; workers_count: number; plan_per_worker: number; total_plan: number };
  items: ShiftCardItem[];
  label: string;
};

function isoToday() { return new Date().toISOString().split('T')[0]; }
function fmtDate(iso: string) { return iso.split('-').reverse().join('.'); }
function nextDay(iso: string) {
  const d = new Date(iso); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ label, value, onChange, disabled }: {
  label: string; value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-c4 mb-2">{label}</p>
      <div className="flex items-center gap-0">
        <button type="button" disabled={disabled} onClick={() => onChange(Math.max(1, value - 1))}
          className="w-8 h-8 rounded-l-lg flex items-center justify-center text-c3 transition-colors text-[16px] disabled:opacity-40"
          style={{ backgroundColor: 'var(--chov)', border: '1px solid var(--cbrd)', borderRight: 'none' }}>−</button>
        <input type="number" value={value} min={1} disabled={disabled}
          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) onChange(v); }}
          className="w-14 h-8 text-center text-[15px] font-semibold text-c1 bg-transparent outline-none tabular-nums disabled:opacity-40"
          style={{ border: '1px solid var(--cbrd)' }} />
        <button type="button" disabled={disabled} onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-r-lg flex items-center justify-center text-c3 transition-colors text-[16px] disabled:opacity-40"
          style={{ backgroundColor: 'var(--chov)', border: '1px solid var(--cbrd)', borderLeft: 'none' }}>+</button>
      </div>
    </div>
  );
}

// ── Bottleneck allocation algorithm ─────────────────────────────────────────
function computeAllocs(active: PositionRow[], totalCapacity: number): { allocs: Map<string, number>; projectedKits: number } {
  const allocs = new Map(active.map(p => [p.id, 0]));
  const vAvail = new Map(active.map(p => [p.id, p.available]));
  let cap = totalCapacity;

  while (cap > 0) {
    const kitsNow    = active.map(p => Math.floor(vAvail.get(p.id)! / p.qtyPerPostomat));
    const minKits    = Math.min(...kitsNow);
    const bottlenecks = active.filter((_, i) => kitsNow[i] === minKits);
    const needs      = bottlenecks.map(p => Math.max(0, (minKits + 1) * p.qtyPerPostomat - vAvail.get(p.id)!));
    const batchTotal = needs.reduce((s, n) => s + n, 0);
    if (batchTotal === 0) break;

    if (batchTotal <= cap) {
      bottlenecks.forEach((p, i) => {
        allocs.set(p.id, allocs.get(p.id)! + needs[i]);
        vAvail.set(p.id, (minKits + 1) * p.qtyPerPostomat);
      });
      cap -= batchTotal;
    } else {
      const totalQty = bottlenecks.reduce((s, p) => s + p.qtyPerPostomat, 0);
      const exact    = bottlenecks.map(p => cap * p.qtyPerPostomat / totalQty);
      const floors   = exact.map(Math.floor);
      const rem      = cap - floors.reduce((s, f) => s + f, 0);
      const extra    = [...floors];
      exact.map((e, i) => ({ i, frac: e - floors[i] }))
        .sort((a, b) => b.frac - a.frac).slice(0, rem)
        .forEach(({ i }) => extra[i]++);
      bottlenecks.forEach((p, i) => allocs.set(p.id, allocs.get(p.id)! + extra[i]));
      cap = 0;
    }
  }

  const projectedKits = active.length
    ? Math.min(...active.map(p => Math.floor(vAvail.get(p.id)! / p.qtyPerPostomat)))
    : 0;
  return { allocs, projectedKits };
}

// ── Print ────────────────────────────────────────────────────────────────────
const PrintIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

function PrintModal({ card, items, label, onClose }: {
  card: { date: string; workers_count: number; plan_per_worker: number; total_plan: number };
  items: ShiftCardItem[];
  label: string;
  onClose: () => void;
}) {
  const dateDisp = fmtDate(card.date);
  const total    = items.reduce((s, i) => s + i.qty, 0);
  const title    = label || `Зміна ${dateDisp}`;

  function handlePrint() {
    const rows = items.map(t => `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:11px 0;font-size:17px;color:#374151;font-weight:500">${t.lengthMm} мм</td>
        <td style="padding:11px 0;text-align:right;font-size:22px;font-weight:800;color:#111827">${t.qty} шт</td>
      </tr>`).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>* {box-sizing:border-box;margin:0;padding:0;} body {font-family:-apple-system,sans-serif;background:white;} @media print {@page {size:A4;margin:0;}}</style>
    </head><body><div style="padding:36px 48px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
        <div>
          <div style="font-size:24px;font-weight:800;color:#111827">${title}</div>
          ${label ? `<div style="font-size:13px;color:#374151;margin-top:2px">${dateDisp}</div>` : ''}
          <div style="font-size:13px;color:#6b7280;margin-top:4px">${card.workers_count} прац. × ${card.plan_per_worker} шт</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">Загальний план</div>
          <div style="font-size:44px;font-weight:800;color:#4f46e5;line-height:1">${total}</div>
          <div style="font-size:13px;color:#6b7280">одиниць</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:2px solid #e5e7eb">
          <th style="text-align:left;padding:8px 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Позиція</th>
          <th style="text-align:right;padding:8px 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Кількість</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="border-top:2px solid #e5e7eb">
          <td style="padding:10px 0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">Разом</td>
          <td style="padding:10px 0;text-align:right;font-size:22px;font-weight:800;color:#4f46e5">${total} шт</td>
        </tr></tfoot>
      </table>
      <div style="margin-top:24px;padding-top:14px;border-top:1px dashed #d1d5db;display:flex;justify-content:space-between;font-size:12px;color:#9ca3af">
        <span>Виконано: _______ шт</span>
        <span>Підпис: _________________________</span>
      </div>
    </div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="flex items-center justify-between px-6 py-3 shrink-0"
           style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{title} · {dateDisp}</p>
        <div className="flex items-center gap-2">
          <button onClick={onClose}
            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer', background: 'none', border: 'none' }}>
            Закрити
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5"
            style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: '#4f46e5', border: 'none', cursor: 'pointer' }}>
            <PrintIcon /> Друкувати
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#e5e7eb' }}>
        <div style={{ maxWidth: '794px', margin: '0 auto', backgroundColor: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', padding: '28px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '22px', fontWeight: 800, color: '#111827', margin: 0 }}>{title}</p>
              {label && <p style={{ fontSize: '13px', color: '#374151', marginTop: '2px' }}>{dateDisp}</p>}
              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{card.workers_count} прац. × {card.plan_per_worker} шт</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Загальний план</p>
              <p style={{ fontSize: '38px', fontWeight: 800, color: '#4f46e5', margin: 0, lineHeight: 1 }}>{total}</p>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>одиниць</p>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Позиція</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Кількість</th>
              </tr>
            </thead>
            <tbody>
              {items.map(t => (
                <tr key={t.posId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '11px 0', fontSize: '17px', color: '#374151', fontWeight: 500 }}>{t.lengthMm} мм</td>
                  <td style={{ padding: '11px 0', textAlign: 'right', fontSize: '22px', fontWeight: 800, color: '#111827' }}>{t.qty} шт</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                <td style={{ padding: '10px 0', fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Разом</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontSize: '22px', fontWeight: 800, color: '#4f46e5' }}>{total} шт</td>
              </tr>
            </tfoot>
          </table>
          <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px dashed #d1d5db', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
            <span>Виконано: _______ шт</span>
            <span>Підпис: _________________________</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function WorkPlanCalculator({ positions }: Props) {
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
  }, []);

  const [workers,       setWorkers]       = useState<number>(saved?.workers       ?? 3);
  const [planPerWorker, setPlanPerWorker] = useState<number>(saved?.planPerWorker ?? 40);
  const [cardDate,      setCardDate]      = useState<string>(saved?.cardDate      ?? isoToday());
  const [label,         setLabel]         = useState<string>(saved?.label         ?? '');
  const [factMap,       setFactMap]       = useState<Record<string, number>>({});
  const [historyCards,  setHistoryCards]  = useState<ShiftCard[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [issuing,          setIssuing]          = useState(false);
  const [confirming,       setConfirming]       = useState(false);
  const [cancelling,       setCancelling]       = useState(false);
  const [restoringId,      setRestoringId]      = useState<string | null>(null);
  const [deletingId,       setDeletingId]       = useState<string | null>(null);
  const [confirmingHistId, setConfirmingHistId] = useState<string | null>(null);
  const [printData,        setPrintData]        = useState<PrintData | null>(null);
  const [localPositions,   setLocalPositions]   = useState<PositionRow[]>(positions);

  // Derived: active (non-cancelled) card for selected date
  const todayCard = useMemo(
    () => historyCards.find(c => c.date === cardDate && c.status !== 'cancelled') ?? null,
    [historyCards, cardDate]
  );

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ workers, planPerWorker, cardDate, label }));
  }, [workers, planPerWorker, cardDate, label]);

  useEffect(() => {
    setHistoryLoading(true);
    fetch('/api/workcards')
      .then(r => r.json())
      .then((cards: ShiftCard[]) => {
        setHistoryCards([...cards].sort((a, b) => b.date.localeCompare(a.date)));
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  async function refreshPositions() {
    const res = await fetch('/api/positions');
    const { positions: fresh } = await res.json();
    setLocalPositions(prev => prev.map(p => {
      const f = (fresh as { id: string; available: number }[]).find(x => x.id === p.id);
      return f ? { ...p, available: f.available } : p;
    }));
  }

  // Pre-fill factMap when an issued card becomes active for the selected date
  useEffect(() => {
    if (todayCard?.status !== 'issued') return;
    const m: Record<string, number> = {};
    for (const it of todayCard.plan_items) m[it.posId] = it.qty;
    setFactMap(m);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayCard?.id]);

  const totalPlan = workers * planPerWorker;

  const { planItems, projectedKits, stockKits, kitsGain, deficitRows } = useMemo(() => {
    const active = localPositions.filter(p => p.qtyPerPostomat > 0);
    if (!active.length) return { planItems: [], projectedKits: 0, stockKits: 0, kitsGain: 0, deficitRows: [] };

    const stockKits = Math.min(...active.map(p => Math.floor(p.available / p.qtyPerPostomat)));
    const { allocs, projectedKits } = computeAllocs(active, totalPlan);

    const planItems: ShiftCardItem[] = active
      .map(p => ({ posId: p.id, lengthMm: p.lengthMm, qty: allocs.get(p.id) || 0 }))
      .filter(i => i.qty > 0);

    const deficitRows = active
      .map(p => ({
        id: p.id, lengthMm: p.lengthMm,
        currentKits: Math.floor(p.available / p.qtyPerPostomat),
        producing:   allocs.get(p.id) || 0,
        projKits:    Math.floor((p.available + (allocs.get(p.id) || 0)) / p.qtyPerPostomat),
        qtyPerKit:   p.qtyPerPostomat,
      }))
      .sort((a, b) => a.currentKits - b.currentKits);

    return { planItems, projectedKits, stockKits, kitsGain: projectedKits - stockKits, deficitRows };
  }, [localPositions, totalPlan]);

  const unitsPerKit = useMemo(
    () => localPositions.filter(p => p.qtyPerPostomat > 0).reduce((s, p) => s + p.qtyPerPostomat, 0),
    [localPositions]
  );
  const toKits = (units: number) => unitsPerKit > 0 ? Math.floor(units / unitsPerKit) : 0;

  function getFact(posId: string, planned: number) { return factMap[posId] ?? planned; }
  function setFact(posId: string, val: number) { setFactMap(prev => ({ ...prev, [posId]: val })); }

  const isIssued    = todayCard?.status === 'issued';
  const isConfirmed = todayCard?.status === 'confirmed';
  const hasCard     = isIssued || isConfirmed;

  const cardItems: ShiftCardItem[] = isConfirmed
    ? todayCard!.fact_items
    : isIssued
      ? todayCard!.plan_items
      : planItems;

  const cardMeta = hasCard
    ? { workers_count: todayCard!.workers_count, plan_per_worker: todayCard!.plan_per_worker, total_plan: todayCard!.total_plan, date: todayCard!.date }
    : { workers_count: workers, plan_per_worker: planPerWorker, total_plan: totalPlan, date: cardDate };

  // ── Actions ────────────────────────────────────────────────────────────────

  async function issueCard() {
    setIssuing(true);
    const now  = new Date().toISOString();
    const body = {
      date: cardDate,
      workers_count: workers, plan_per_worker: planPerWorker, total_plan: totalPlan,
      status: 'issued' as const, stock_applied: false,
      plan_items: planItems, fact_items: planItems,
      created_at: now, fixed_at: '', cancelled_at: '',
    };
    try {
      const res = await fetch('/api/workcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const { id } = await res.json();
      const card: ShiftCard = { id, ...body };
      setHistoryCards(prev => [card, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      const m: Record<string, number> = {};
      for (const it of planItems) m[it.posId] = it.qty;
      setFactMap(m);
    } finally { setIssuing(false); }
  }

  async function confirmCard() {
    if (!todayCard) return;
    setConfirming(true);
    try {
      const now  = new Date().toISOString();
      const date = todayCard.date;
      const fact_items: ShiftCardItem[] = todayCard.plan_items.map(it => ({
        posId: it.posId, lengthMm: it.lengthMm, qty: getFact(it.posId, it.qty),
      }));

      await Promise.all(fact_items.filter(it => it.qty > 0).map(it =>
        fetch('/api/reports', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: 'shift', positionId: it.posId, qty: it.qty, date }),
        })
      ));

      const posRes = await fetch('/api/positions');
      const { positions: cur } = await posRes.json();
      await Promise.all(fact_items.filter(it => it.qty > 0).map(it => {
        const pos = (cur as { id: string; available: number }[]).find(p => p.id === it.posId);
        if (!pos) return Promise.resolve();
        return fetch('/api/positions/stock', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: it.posId, stock: pos.available + it.qty, stockDate: date }),
        });
      }));

      await fetch(`/api/workcards/${todayCard.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', fact_items, fixed_at: now, stock_applied: true }),
      });

      const updated = { ...todayCard, status: 'confirmed' as const, fact_items, fixed_at: now, stock_applied: true };
      setHistoryCards(prev => prev.map(c => c.id === todayCard.id ? updated : c));
      await refreshPositions();
    } finally { setConfirming(false); }
  }

  async function cancelCard(card: ShiftCard) {
    setCancelling(true);
    try {
      const now = new Date().toISOString();
      if (card.stock_applied && card.fact_items.length > 0) {
        const posRes = await fetch('/api/positions');
        const { positions: cur } = await posRes.json();
        await Promise.all(card.fact_items.filter(it => it.qty > 0).map(it => {
          const pos = (cur as { id: string; available: number }[]).find(p => p.id === it.posId);
          if (!pos) return Promise.resolve();
          return fetch('/api/positions/stock', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: it.posId, stock: Math.max(0, pos.available - it.qty), stockDate: card.date }),
          });
        }));
      }
      const didRollback = card.stock_applied && card.fact_items.length > 0;
      await fetch(`/api/workcards/${card.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelled_at: now, ...(didRollback ? { stock_applied: false } : {}) }),
      });
      const updated = { ...card, status: 'cancelled' as const, cancelled_at: now, stock_applied: didRollback ? false : card.stock_applied };
      setHistoryCards(prev => prev.map(c => c.id === card.id ? updated : c));
      if (didRollback) await refreshPositions();
    } finally { setCancelling(false); }
  }

  async function restoreCard(card: ShiftCard) {
    setRestoringId(card.id);
    try {
      await fetch(`/api/workcards/${card.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'issued', cancelled_at: '' }),
      });
      const updated = { ...card, status: 'issued' as const, cancelled_at: '' };
      setHistoryCards(prev => prev.map(c => c.id === card.id ? updated : c));
    } finally { setRestoringId(null); }
  }

  async function deleteCard(card: ShiftCard) {
    if (!confirm(`Видалити картку ${fmtDate(card.date)}? Це незворотньо.`)) return;
    setDeletingId(card.id);
    try {
      if (card.stock_applied && card.fact_items.length > 0) {
        const posRes = await fetch('/api/positions');
        const { positions: cur } = await posRes.json();
        await Promise.all(card.fact_items.filter(it => it.qty > 0).map(it => {
          const pos = (cur as { id: string; available: number }[]).find(p => p.id === it.posId);
          if (!pos) return Promise.resolve();
          return fetch('/api/positions/stock', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: it.posId, stock: Math.max(0, pos.available - it.qty), stockDate: card.date }),
          });
        }));
        await refreshPositions();
      }
      await fetch(`/api/workcards/${card.id}`, { method: 'DELETE' });
      setHistoryCards(prev => prev.filter(c => c.id !== card.id));
    } finally { setDeletingId(null); }
  }

  async function confirmHistoryCard(card: ShiftCard) {
    if (!confirm(`Зафіксувати зміну ${fmtDate(card.date)} на склад?`)) return;
    setConfirmingHistId(card.id);
    try {
      const now        = new Date().toISOString();
      const fact_items = card.fact_items.length > 0 ? card.fact_items : card.plan_items;
      const posRes     = await fetch('/api/positions');
      const { positions: cur } = await posRes.json();
      await Promise.all(fact_items.filter(it => it.qty > 0).map(it => {
        const pos = (cur as { id: string; available: number }[]).find(p => p.id === it.posId);
        if (!pos) return Promise.resolve();
        return fetch('/api/positions/stock', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: it.posId, stock: pos.available + it.qty, stockDate: card.date }),
        });
      }));
      await fetch(`/api/workcards/${card.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed', fact_items, fixed_at: now, stock_applied: true }),
      });
      const updated = { ...card, status: 'confirmed' as const, fact_items, fixed_at: now, stock_applied: true };
      setHistoryCards(prev => prev.map(c => c.id === card.id ? updated : c));
    } finally { setConfirmingHistId(null); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4">Прогноз зміни</p>
        <InfoTooltip>
          <p><b>Загальний виробіток</b> — скільки штук зроблять усі разом (працівники × план).</p>
          <p><b>Готових комплектів</b> — скільки повних комплектів буде після зміни.</p>
          <p><b>Приріст за зміну</b> — на скільки комплектів більше стане.</p>
        </InfoTooltip>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatsCard title="Загальний виробіток" value={`${totalPlan} шт`}
          sub={`${workers} прац. × ${planPerWorker} шт/зміна`} color="emerald"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
        <StatsCard title="Готових комплектів" value={projectedKits}
          sub={`після зміни · зараз ${stockKits}`} color="indigo"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>} />
        <StatsCard title="Приріст за зміну" value={`+${kitsGain}`}
          sub="нових готових комплектів" color="violet"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>} />
      </div>

      {/* Parameters */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4">Параметри зміни</p>
            <InfoTooltip>
              <p><b>Кількість працівників</b> — скільки людей у зміні.</p>
              <p><b>План на 1 прац.</b> — скільки штук має зробити один працівник.</p>
              <p><b>Дата зміни</b> — можна вибрати будь-яку дату для створення картки.</p>
              <p><b>Назва зміни</b> — довільна позначка (відображається на картці та у друку).</p>
              <p><b>Загальний план</b> = Працівники × План. Алгоритм розподіляє цю суму між дефіцитними позиціями.</p>
              {hasCard && <p className="pt-1" style={{borderTop:'1px solid var(--cbrd)'}}>Параметри зафіксовані в картці зміни. Скасуйте картку щоб змінити.</p>}
            </InfoTooltip>
          </div>
          <button type="button"
            onClick={() => setPrintData({ card: cardMeta, items: isConfirmed ? todayCard!.fact_items : cardItems, label })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-indigo-600 dark:text-indigo-400 transition-colors"
            style={{ border: '1px solid var(--cbrd)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--chov)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
            <PrintIcon /> Друкувати
          </button>
        </div>
        <div className="flex flex-wrap gap-6 items-end">
          <Stepper label="Кількість працівників" value={hasCard ? cardMeta.workers_count : workers} onChange={setWorkers} disabled={hasCard} />
          <Stepper label="План на 1 прац. (шт)"  value={hasCard ? cardMeta.plan_per_worker : planPerWorker} onChange={setPlanPerWorker} disabled={hasCard} />
          {/* Date picker */}
          <div>
            <p className="text-[12px] font-medium text-c4 mb-2">Дата зміни</p>
            <input
              type="date"
              value={hasCard ? cardMeta.date : cardDate}
              disabled={hasCard}
              onChange={e => { if (e.target.value) setCardDate(e.target.value); }}
              className="h-8 px-2.5 text-[13px] font-semibold text-c1 bg-transparent outline-none rounded-lg disabled:opacity-40"
              style={{ border: '1px solid var(--cbrd)' }}
            />
          </div>
          {/* Custom label */}
          <div>
            <p className="text-[12px] font-medium text-c4 mb-2">Назва зміни</p>
            <input
              type="text"
              value={label}
              placeholder="необов."
              maxLength={50}
              onChange={e => setLabel(e.target.value)}
              className="h-8 px-2.5 text-[13px] font-medium text-c1 bg-transparent outline-none rounded-lg"
              style={{ border: '1px solid var(--cbrd)', minWidth: '130px' }}
            />
          </div>
          <div>
            <p className="text-[12px] font-medium text-c4 mb-2">Загальний план</p>
            <p className="text-[26px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums leading-none">
              {cardMeta.total_plan} <span className="text-[14px] font-normal text-c4">шт</span>
            </p>
          </div>
        </div>
      </div>

      {/* Shift card */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-c4">Картка зміни</p>
        <InfoTooltip>
          <p><b>Видати в роботу</b> — фіксує план зміни. Картка зберігається у таблиці зі статусом "видано".</p>
          <p><b>Факт</b> — після виконання введіть скільки фактично зроблено по кожній позиції.</p>
          <p><b>Зафіксувати</b> — записує факт на склад. Залишки оновлюються одразу.</p>
          <p><b>Скасувати</b> — відміняє картку. Якщо вже зафіксована — склад відкочується назад.</p>
        </InfoTooltip>
      </div>

      <div className="card overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-3 flex items-center justify-between"
             style={{ borderBottom: '1px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold text-white shrink-0
              ${isConfirmed ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              : isIssued   ? 'bg-gradient-to-br from-amber-500 to-orange-500'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
              {isConfirmed ? '✓' : isIssued ? '▶' : '◻'}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-c1">
                {label || `Зміна ${fmtDate(cardMeta.date)}`}
              </p>
              <p className="text-[11px] text-c4 mt-0.5">
                {label && `${fmtDate(cardMeta.date)} · `}{cardMeta.workers_count} прац. × {cardMeta.plan_per_worker} шт = {cardMeta.total_plan} шт
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isConfirmed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : isIssued  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
          }`}>
            {isConfirmed ? '✓ зафіксовано' : isIssued ? '▶ в роботі' : '◻ не видано'}
          </span>
        </div>

        {/* Position rows */}
        {cardItems.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] text-c4">Всі позиції в нормі — завдань немає</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--cbrd)' }}>
            <div className="grid px-5 py-2" style={{ gridTemplateColumns: '1fr auto auto', gap: '16px' }}>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4">Позиція</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 text-right w-20">План</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4 text-right w-20">Факт</span>
            </div>
            {cardItems.map(item => {
              const fact = getFact(item.posId, item.qty);
              return (
                <div key={item.posId} className="grid items-center px-5 py-2.5"
                     style={{ gridTemplateColumns: '1fr auto auto', gap: '16px' }}>
                  <span className="text-[14px] font-semibold text-c1">{item.lengthMm} мм</span>
                  <span className="text-[14px] text-c4 tabular-nums text-right w-20">{item.qty} шт</span>
                  {isConfirmed ? (
                    <span className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-right w-20">{item.qty} шт</span>
                  ) : isIssued ? (
                    <input type="number" min={0} value={fact}
                      onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 0) setFact(item.posId, v); }}
                      className="w-20 text-right text-[15px] font-bold text-c1 bg-transparent outline-none tabular-nums border-b-2 border-indigo-400/50"
                    />
                  ) : (
                    <span className="text-[14px] text-c4 tabular-nums text-right w-20">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer with totals + buttons */}
        <div className="px-5 py-3 flex items-center justify-between gap-3"
             style={{ borderTop: '2px solid var(--cbrd)', backgroundColor: 'var(--csr2)' }}>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-c4 mr-2">План</span>
              <span className="text-[15px] font-bold text-c2 tabular-nums">
                {cardItems.reduce((s, i) => s + i.qty, 0)} шт
              </span>
              {(() => { const k = toKits(cardItems.reduce((s,i)=>s+i.qty,0)); return k > 0 && <span className="text-[12px] text-c4 tabular-nums ml-1">≈{k} к.</span>; })()}
            </div>
            {isIssued && (() => {
              const factUnits = cardItems.reduce((s, i) => s + getFact(i.posId, i.qty), 0);
              return (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-c4 mr-2">Факт</span>
                  <span className="text-[15px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{factUnits} шт</span>
                  {toKits(factUnits) > 0 && <span className="text-[12px] text-indigo-400/70 tabular-nums ml-1">≈{toKits(factUnits)} к.</span>}
                </div>
              );
            })()}
            {isConfirmed && (() => {
              const factUnits = todayCard!.fact_items.reduce((s, i) => s + i.qty, 0);
              return (
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-c4 mr-2">Факт</span>
                  <span className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{factUnits} шт</span>
                  {toKits(factUnits) > 0 && <span className="text-[12px] text-emerald-500/70 tabular-nums ml-1">≈{toKits(factUnits)} к.</span>}
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            {isConfirmed ? (
              <>
                <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Зафіксовано на склад</span>
                <button type="button" onClick={() => setCardDate(nextDay(cardMeta.date))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white"
                  style={{ backgroundColor: '#d97706' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b45309')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#d97706')}>
                  ＋ Нова зміна
                </button>
                <button type="button" onClick={() => cancelCard(todayCard!)} disabled={cancelling}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
                  style={{ border: '1px solid var(--cbrd)', color: 'var(--cc4)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--cc4)')}>
                  {cancelling ? '...' : '↩ Скасувати'}
                </button>
              </>
            ) : isIssued ? (
              <>
                <button type="button" onClick={confirmCard} disabled={confirming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#059669' }}
                  onMouseEnter={e => { if (!confirming) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#047857'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#059669'; }}>
                  {confirming ? '...' : '✓ Зафіксувати'}
                </button>
                <button type="button" onClick={() => cancelCard(todayCard!)} disabled={cancelling}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
                  style={{ border: '1px solid #ef4444', color: '#ef4444' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  {cancelling ? '...' : '✕ Скасувати'}
                </button>
              </>
            ) : (
              <button type="button" onClick={issueCard} disabled={issuing || cardItems.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: '#d97706' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#b45309')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#d97706')}>
                {issuing ? '...' : '▶ Видати в роботу'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deficit breakdown */}
      {deficitRows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cbrd)' }}>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-c4">Розподіл по позиціях</p>
              <p className="text-[11px] text-c4 mt-0.5">Тільки дефіцитні позиції отримують завдання</p>
            </div>
            <InfoTooltip>
              <p><b>Пріоритет (червоний)</b> — вузьке місце: найменше комплектів, стримує весь випуск.</p>
              <p><b>Поповнення (синій)</b> — теж дефіцитна, але не критична.</p>
              <p><b>Достатньо (сірий)</b> — цієї позиції вже вистачає, завдання не розподіляється.</p>
            </InfoTooltip>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cbrd)' }}>
                  {['Позиція', 'Зараз компл.', 'Виробляємо шт', 'Буде компл.', 'Статус'].map((h, i) => (
                    <th key={h} className={`th ${i === 0 || i === 4 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deficitRows.map((row, idx) => {
                  const isBottleneck = row.currentKits === deficitRows[0].currentKits;
                  const isSkipped    = row.producing === 0;
                  const isLast       = idx === deficitRows.length - 1;
                  return (
                    <tr key={row.id} className={isBottleneck ? 'bg-red-500/[0.04]' : ''}
                      style={!isLast ? { borderBottom: '1px solid var(--cbrd)' } : {}}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0
                            ${isBottleneck ? 'bg-red-500' : isSkipped ? 'bg-c4' : 'bg-indigo-500/50'}`} />
                          <span className="text-[13px] font-semibold text-c1">{row.lengthMm} мм</span>
                          <span className="text-[11px] text-c4">×{row.qtyPerKit} шт/компл</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-[14px] font-semibold tabular-nums ${isBottleneck ? 'text-red-600 dark:text-red-400' : 'text-c3'}`}>
                          {row.currentKits}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {row.producing > 0
                          ? <span className="text-[14px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">+{row.producing}</span>
                          : <span className="text-[13px] text-c4">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-[14px] font-bold tabular-nums ${row.projKits > row.currentKits ? 'text-indigo-600 dark:text-indigo-400' : 'text-c3'}`}>
                          {row.projKits}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {isSkipped ? <span className="badge-slate">достатньо</span>
                          : isBottleneck ? <span className="badge-red">пріоритет</span>
                          : <span className="badge-indigo">поповнення</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--cbrd)' }}>
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-c4">Журнал карточок</p>
            <InfoTooltip>
              <p><b>Журнал</b> — всі картки по датах, новіші зверху.</p>
              <p><b>↩ Відновити</b> — повертає скасовану картку в статус "видано".</p>
              <p><b>✓ Зафіксувати</b> — фіксує картку минулих днів на склад.</p>
              <p><b>Скасувати</b> — скасовує картку. Якщо була зафіксована — склад відкочується.</p>
            </InfoTooltip>
          </div>
          {historyLoading && <span className="text-[12px] text-c4 animate-pulse">Завантаження...</span>}
        </div>

        {!historyLoading && historyCards.length === 0 && (
          <p className="px-5 py-4 text-[13px] text-c4">Карточок ще немає</p>
        )}

        {historyCards.length > 0 && (() => {
          const byDate = new Map<string, ShiftCard[]>();
          for (const c of historyCards) {
            if (!byDate.has(c.date)) byDate.set(c.date, []);
            byDate.get(c.date)!.push(c);
          }
          const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
          return (
            <div>
              {dates.map(date => (
                <div key={date}>
                  <div className="px-5 py-2 sticky top-0" style={{ backgroundColor: 'var(--csr2)', borderBottom: '1px solid var(--cbrd)' }}>
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-c4">{fmtDate(date)}</span>
                  </div>
                  {byDate.get(date)!.map(card => {
                    const factTotal = (card.status === 'confirmed' ? card.fact_items : card.plan_items)
                      .reduce((s, i) => s + i.qty, 0);
                    const histItems = card.status === 'confirmed' ? card.fact_items : card.plan_items;
                    return (
                      <div key={card.id} className="px-5 py-3" style={{ borderBottom: '1px solid var(--cbrd)' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-semibold text-c2">
                                {card.workers_count} прац. × {card.plan_per_worker} шт
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                card.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : card.status === 'cancelled' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {card.status === 'confirmed' ? '✓ зафіксовано' : card.status === 'cancelled' ? '✕ скасовано' : '▶ видано'}
                              </span>
                              <span className="text-[12px] text-c3 tabular-nums">
                                {factTotal} шт
                                {toKits(factTotal) > 0 && (
                                  <span className="text-c4 ml-1">· {toKits(factTotal)} к.</span>
                                )}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {histItems.map(it => (
                                <span key={it.posId} className="text-[12px] text-c4">
                                  {it.lengthMm} мм: <span className="font-semibold text-c2">{it.qty}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Print history card */}
                            <button type="button"
                              onClick={() => setPrintData({ card, items: histItems, label: '' })}
                              title="Друкувати"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-c4 transition-colors"
                              style={{ border: '1px solid var(--cbrd)' }}
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--chov)'; e.currentTarget.style.color = 'var(--cc2)'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                              <PrintIcon />
                            </button>
                            {card.status === 'cancelled' && (
                              <>
                                <button type="button" onClick={() => restoreCard(card)} disabled={restoringId === card.id}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
                                  style={{ border: '1px solid #6366f1', color: '#6366f1' }}
                                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.08)')}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                                  {restoringId === card.id ? '...' : '↩ Відновити'}
                                </button>
                                <button type="button" onClick={() => deleteCard(card)} disabled={deletingId === card.id}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
                                  style={{ border: '1px solid #ef4444', color: '#ef4444' }}
                                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)')}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                                  {deletingId === card.id ? '...' : '🗑 Видалити'}
                                </button>
                              </>
                            )}
                            {card.status === 'issued' && (
                              <button type="button" onClick={() => confirmHistoryCard(card)} disabled={confirmingHistId === card.id}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40"
                                style={{ border: '1px solid #059669', color: '#059669' }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(5,150,105,0.08)')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                                {confirmingHistId === card.id ? '...' : '✓ Зафіксувати'}
                              </button>
                            )}
                            {card.status !== 'cancelled' && (
                              <button type="button" onClick={() => cancelCard(card)} disabled={cancelling}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
                                style={{ border: '1px solid var(--cbrd)', color: 'var(--cc4)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--cc4)')}>
                                Скасувати
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Print modal */}
      {printData && (
        <PrintModal
          card={printData.card}
          items={printData.items}
          label={printData.label}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
}
