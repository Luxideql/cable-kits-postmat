import type { Position, ProductionPlan, DailyReport, PositionStats, KitStats, Shipment } from './types';

export function calcPositionStats(
  pos: Position,
  reports: DailyReport[],
  plan: ProductionPlan[],
  shipments: Shipment[] = []
): PositionStats {
  const d = pos.stockDate || '';

  // Якщо є дата переобліку — рахуємо тільки звіти та відвантаження ПІСЛЯ неї.
  // Якщо дати немає — враховуємо всю історію (backward-compatible).
  const produced = reports
    .filter(r => r.positionId === pos.id && (!d || r.date >= d))
    .reduce((s, r) => s + r.qty, 0);

  const shippedKits = shipments
    .filter(s => !d || s.date >= d)
    .reduce((s, r) => s + r.qty, 0);

  // stock = фактичний залишок на дату переобліку (або початковий ввід)
  const available = Math.max(0, pos.stock + produced - shippedKits * pos.qtyPerPostomat);
  const kits      = pos.qtyPerPostomat > 0 ? Math.floor(available / pos.qtyPerPostomat) : 0;
  const leftover  = available - kits * pos.qtyPerPostomat;

  const planEntry = plan.find(p => p.positionId === pos.id);
  const planQty   = planEntry?.plannedQty ?? 0;
  const planUnits = planQty * pos.qtyPerPostomat;
  const remaining = Math.max(0, planUnits - available);
  const progress  = planUnits > 0 ? Math.min(100, Math.round((available / planUnits) * 100)) : 0;

  return { ...pos, produced, available, leftover, kits, remaining, planQty, progress };
}

export function calcKitStats(
  positions: Position[],
  reports: DailyReport[],
  plan: ProductionPlan[],
  shipments: Shipment[] = []
): KitStats {
  const shipped = shipments.reduce((s, r) => s + r.qty, 0);
  const stats = positions.map(p => calcPositionStats(p, reports, plan, shipments));
  const active = stats.filter(s => s.qtyPerPostomat > 0);

  const totalKits = active.length > 0 ? Math.min(...active.map(s => s.kits)) : 0;
  const bottleneck = active.length > 0
    ? active.reduce((min, s) => (s.kits < min.kits ? s : min))
    : null;

  return { totalKits, shipped, bottleneck, positions: stats };
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
