export interface Employee {
  id: string;
  fullName: string;
  telegramId: string;
  position: string;
  active: boolean;
}

export interface Position {
  id: string;
  number: string;
  name: string;
  lengthMm: number;
  qtyPerPostomat: number;
  cellNumbers: string;
  stock: number;
  type: string;
  active: boolean;
}

export interface ProductionPlan {
  id: string;
  positionId: string;
  plannedQty: number;
  deadline: string;
  priority: number;
}

export interface DailyReport {
  id: string;
  date: string;
  employeeId: string;
  positionId: string;
  qty: number;
  hours: number;
  comment: string;
}

export interface PositionStats extends Position {
  produced: number;
  available: number;
  leftover: number;  // available − kits × qtyPerPostomat (залишок після повних комплектів)
  kits: number;
  remaining: number;
  planQty: number;
  progress: number; // 0-100%
}

export interface Shipment {
  id: string;
  date: string;
  qty: number;
  comment: string;
}

export interface KitStats {
  totalKits: number;
  shipped: number;
  bottleneck: PositionStats | null;
  positions: PositionStats[];
}

export interface EmployeeStats extends Employee {
  todayQty: number;
  weekQty: number;
  totalQty: number;
}
