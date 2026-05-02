import type { Position, ProductionPlan, DailyReport, PositionStats, KitStats, Shipment } from './types';

export function calcPositionStats(
  pos: Position,
  reports: DailyReport[],
  plan: ProductionPlan[],
  shippedKits = 0
): PositionStats {
  const produced = reports
    .filter(r => r.positionId === pos.id)
    .reduce((s, r) => s + r.qty, 0);

  // Subtract units consumed by shipped kits
  const available = Math.max(0, pos.stock + produced - shippedKits * pos.qtyPerPostomat);
  const kits      = pos.qtyPerPostomat > 0 ? Math.floor(available / pos.qtyPerPostomat) : 0;
  const leftover  = available - kits * pos.qtyPerPostomat; // штук, що не увійшли у повний комплект

  const planEntry   = plan.find(p => p.positionId === pos.id);
  const planQty     = planEntry?.plannedQty ?? 0;          // план у комплектах
  const planUnits   = planQty * pos.qtyPerPostomat;         // перевести в штуки
  const remaining   = Math.max(0, planUnits - available);   // недостача в штуках
  const progress    = planUnits > 0 ? Math.min(100, Math.round((available / planUnits) * 100)) : 0;

  return { ...pos, produced, available, leftover, kits, remaining, planQty, progress };
}

export function calcKitStats(
  positions: Position[],
  reports: DailyReport[],
  plan: ProductionPlan[],
  shipments: Shipment[] = []
): KitStats {
  const shipped = shipments.reduce((s, r) => s + r.qty, 0);
  const stats = positions.map(p => calcPositionStats(p, reports, plan, shipped));
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
