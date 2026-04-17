import {
  sheetGet, sheetBatchGet, sheetAppend, sheetUpdate, sheetUpsert, sheetEnsure, rowsToObjects,
} from './googleSheets';
import { calcKitStats } from './calculations';
import type { Employee, Position, ProductionPlan, DailyReport, KitStats, PositionStats, Shipment } from './types';
import { getTodayDate } from './calculations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// ─── Employees ────────────────────────────────────────────────────────────────
// Columns: id | повне_імя | telegram_id | посада | активний

function parseEmployee(e: Record<string, string>): Employee {
  return {
    id: e.id,
    fullName: e['повне_імя'],
    telegramId: e.telegram_id,
    position: e.посада,
    active: e.активний !== 'false',
  };
}

export async function getEmployees(): Promise<Employee[]> {
  const rows = await sheetGet('Працівники!A:E');
  return rowsToObjects(rows).filter(e => e.активний !== 'false').map(parseEmployee);
}

export async function getEmployeeByTelegramId(tgId: string): Promise<Employee | null> {
  const all = await getEmployees();
  return all.find(e => e.telegramId === tgId) ?? null;
}

export async function addEmployee(emp: Omit<Employee, 'id'>): Promise<{ id: string }> {
  const id = genId('emp');
  await sheetAppend('Працівники!A:E', [
    id, emp.fullName, emp.telegramId ?? '', emp.position ?? 'Монтажник', 'true',
  ]);
  return { id };
}

// ─── Positions ────────────────────────────────────────────────────────────────
// Columns: id | номер | назва | довжина_мм | кількість_на_почтомат | номери_комірок | залишок | тип | активний

function parsePosition(p: Record<string, string>): Position {
  return {
    id: p.id,
    number: p.номер,
    name: p.назва,
    lengthMm: Number(p['довжина_мм']),
    qtyPerPostomat: Number(p['кількість_на_почтомат']),
    cellNumbers: p['номери_комірок'],
    stock: Number(p.залишок),
    type: p.тип,
    active: p.активний !== 'false',
  };
}

export async function getPositions(): Promise<Position[]> {
  const rows = await sheetGet('Позиції!A:I');
  return rowsToObjects(rows).filter(p => p.активний !== 'false').map(parsePosition);
}

export async function updatePositionStock(positionId: string, stock: number): Promise<void> {
  const rows = await sheetGet('Позиції!A:I');
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === positionId);
  if (idx > 0) {
    // column G (index 6) = залишок
    await sheetUpdate(`Позиції!G${idx + 1}`, [[String(stock)]]);
  }
}

// ─── Production Plan ─────────────────────────────────────────────────────────
// Columns: id | позиція_id | планова_кількість | дедлайн | пріоритет

export async function getProductionPlan(): Promise<ProductionPlan[]> {
  const rows = await sheetGet('План_виробництва!A:E');
  return rowsToObjects(rows).map(p => ({
    id: p.id,
    positionId: p['позиція_id'],
    plannedQty: Number(p['планова_кількість']),
    deadline: p.дедлайн,
    priority: Number(p.пріоритет),
  }));
}

export async function setPlanForPosition(positionId: string, qty: number, deadline = ''): Promise<void> {
  await sheetUpsert('План_виробництва', 'A:E', 1, positionId, [
    `plan_${positionId}`, positionId, String(qty), deadline, '1',
  ]);
}

// ─── Daily Reports ────────────────────────────────────────────────────────────
// Columns: id | дата | працівник_id | позиція_id | кількість | години | коментар

function parseReport(r: Record<string, string>): DailyReport {
  return {
    id: r.id,
    date: r.дата,
    employeeId: r['працівник_id'],
    positionId: r['позиція_id'],
    qty: Number(r.кількість),
    hours: Number(r.години),
    comment: r.коментар,
  };
}

export async function getDailyReports(dateFilter?: string, empId?: string): Promise<DailyReport[]> {
  const rows = await sheetGet('Щоденні_звіти!A:G');
  let reports = rowsToObjects(rows).map(parseReport);
  if (dateFilter) reports = reports.filter(r => r.date === dateFilter);
  if (empId) reports = reports.filter(r => r.employeeId === empId);
  return reports;
}

export async function addDailyReport(rep: Omit<DailyReport, 'id'>): Promise<{ id: string }> {
  const id = genId('rep');
  await sheetAppend('Щоденні_звіти!A:G', [
    id, rep.date || getTodayDate(), rep.employeeId, rep.positionId,
    String(rep.qty), String(rep.hours ?? 0), rep.comment ?? '',
  ]);
  return { id };
}

// ─── Shipments ────────────────────────────────────────────────────────────────
// Columns: id | дата | кількість_компл | коментар

function parseShipment(r: Record<string, string>): Shipment {
  return {
    id: r.id,
    date: r['дата'],
    qty: Number(r['кількість_компл']),
    comment: r['коментар'],
  };
}

const SHIPMENT_HEADERS = ['id', 'дата', 'кількість_компл', 'коментар'];

export async function getShipments(): Promise<Shipment[]> {
  try {
    const rows = await sheetGet('Відвантаження!A:D');
    return rowsToObjects(rows).map(parseShipment);
  } catch {
    return [];
  }
}

export async function addShipment(ship: Omit<Shipment, 'id'>): Promise<{ id: string }> {
  await sheetEnsure('Відвантаження', SHIPMENT_HEADERS);
  const id = genId('ship');
  await sheetAppend('Відвантаження!A:D', [
    id, ship.date || getTodayDate(), String(ship.qty), ship.comment ?? '',
  ]);
  return { id };
}

// ─── Kit Stats (calculated in TS, not GAS) ────────────────────────────────────

export async function getKitStats(): Promise<KitStats & { positions: PositionStats[] }> {
  const [positions, reports, plan, shipments] = await Promise.all([
    getPositions(),
    getDailyReports(),
    getProductionPlan(),
    getShipments(),
  ]);
  return calcKitStats(positions, reports, plan, shipments) as KitStats & { positions: PositionStats[] };
}

// ─── Bot State ────────────────────────────────────────────────────────────────
// Columns: telegram_id | state | data | updated_at

export async function getBotState(tgId: string): Promise<{ state: string; data: string } | null> {
  const rows = await sheetGet('BotState!A:D');
  const obj = rowsToObjects(rows).find(r => r.telegram_id === tgId);
  return obj ? { state: obj.state, data: obj.data } : null;
}

export async function setBotState(tgId: string, state: string, data = ''): Promise<void> {
  await sheetUpsert('BotState', 'A:D', 0, tgId, [
    tgId, state, data, new Date().toISOString(),
  ]);
}

// ─── Combined context (1 API call: employees + botState) ─────────────────────

export async function getContext(tgId: string): Promise<{
  employee: Employee | null;
  botState: { state: string; data: string } | null;
}> {
  const [empRows, stateRows] = await sheetBatchGet(['Працівники!A:E', 'BotState!A:D']);

  const employees = rowsToObjects(empRows).filter(e => e.активний !== 'false');
  const empRow = employees.find(e => e.telegram_id === tgId);

  const states = rowsToObjects(stateRows);
  const stateRow = states.find(s => s.telegram_id === tgId);

  return {
    employee: empRow ? parseEmployee(empRow) : null,
    botState: stateRow ? { state: stateRow.state, data: stateRow.data } : null,
  };
}

// ─── Add report + reset state in one function (2 parallel API calls) ──────────

export async function addReportAndResetState(
  rep: Omit<DailyReport, 'id'>,
  tgId: string,
): Promise<{ id: string }> {
  const [result] = await Promise.all([
    addDailyReport(rep),
    setBotState(tgId, 'idle', ''),
  ]);
  return result;
}
