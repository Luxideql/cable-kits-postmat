export interface Employee {
  id: string;
  fullName: string;
  telegramId: string;
  position: string;
  active: boolean;
  notify: boolean;
  botReport: boolean;
}

export interface Position {
  id: string;
  number: string;
  name: string;
  lengthMm: number;
  qtyPerPostomat: number;
  cellNumbers: string;
  stock: number;
  stockDate: string; // дата останнього переобліку (YYYY-MM-DD), '' = ніколи
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

export interface WorkCardTask {
  posId: string;
  lengthMm: number;
  plannedQty: number;
  actualQty: number;
}

export interface WorkCard {
  id: string;
  date: string;
  employeeName: string;
  employeeId: string;
  tasks: WorkCardTask[];
  status: 'issued' | 'confirmed' | 'cancelled';
}

export interface ShiftCardItem {
  posId: string;
  lengthMm: number;
  qty: number;
}

export interface ShiftCard {
  id: string;
  date: string;
  workers_count: number;
  plan_per_worker: number;
  total_plan: number;
  status: 'issued' | 'confirmed' | 'cancelled';
  stock_applied: boolean;
  plan_items: ShiftCardItem[];
  fact_items: ShiftCardItem[];
  created_at: string;
  fixed_at: string;
  cancelled_at: string;
}

export interface EmployeeStats extends Employee {
  todayQty: number;
  weekQty: number;
  totalQty: number;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  qtyPerKit: number;
  stockMain: number;
  stockActual: number;
  nextMaterialId: string;  // ID наступного матеріалу в черзі, '' = немає
  note: string;
}
