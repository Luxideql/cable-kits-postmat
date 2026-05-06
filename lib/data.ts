import {
  sheetGet, sheetBatchGet, sheetAppend, sheetUpdate, sheetUpdateFormula, sheetUpsert, sheetEnsure, rowsToObjects,
} from './googleSheets';
import { calcKitStats } from './calculations';
import type { Employee, Position, ProductionPlan, DailyReport, KitStats, PositionStats, Shipment, WorkCard, Material } from './types';
import { getTodayDate } from './calculations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// ─── Employees ────────────────────────────────────────────────────────────────
// Columns: id | повне_імя | telegram_id | посада | активний | сповіщення | бот_звіт

function parseEmployee(e: Record<string, string>): Employee {
  return {
    id: e.id,
    fullName: e['повне_імя'],
    telegramId: e.telegram_id,
    position: e.посада,
    active: e.активний !== 'false',
    notify: e.сповіщення !== 'false',
    botReport: e['бот_звіт'] !== 'false',
  };
}

export async function getEmployees(): Promise<Employee[]> {
  const rows = await sheetGet('Працівники!A:G');
  return rowsToObjects(rows).filter(e => e.активний !== 'false').map(parseEmployee);
}

export async function setEmployeeNotify(empId: string, notify: boolean): Promise<void> {
  const rows = await sheetGet('Працівники!A:G');
  if (!rows[0] || rows[0].length < 6 || !rows[0][5]) {
    await sheetUpdate('Працівники!F1', [['сповіщення']]);
  }
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === empId);
  if (idx > 0) {
    await sheetUpdate(`Працівники!F${idx + 1}`, [[String(notify)]]);
  }
}

export async function setEmployeeBotReport(empId: string, allowed: boolean): Promise<void> {
  const rows = await sheetGet('Працівники!A:G');
  if (!rows[0] || rows[0].length < 7 || !rows[0][6]) {
    await sheetUpdate('Працівники!G1', [['бот_звіт']]);
  }
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === empId);
  if (idx > 0) {
    await sheetUpdate(`Працівники!G${idx + 1}`, [[String(allowed)]]);
  }
}

export async function getEmployeeByTelegramId(tgId: string): Promise<Employee | null> {
  const all = await getEmployees();
  return all.find(e => e.telegramId === tgId) ?? null;
}

export async function addEmployee(emp: Omit<Employee, 'id'>): Promise<{ id: string }> {
  const id = genId('emp');
  await sheetAppend('Працівники!A:G', [
    id, emp.fullName, emp.telegramId ?? '', emp.position ?? 'Монтажник', 'true', 'true', 'true',
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
    stockDate: p['дата_переобліку'] || '',
    type: p.тип,
    active: p.активний !== 'false',
  };
}

export async function getPositions(): Promise<Position[]> {
  const rows = await sheetGet('Позиції!A:K');
  return rowsToObjects(rows).filter(p => p.активний !== 'false').map(parsePosition);
}

export async function updatePositionStock(positionId: string, stock: number, stockDate?: string): Promise<void> {
  const rows = await sheetGet('Позиції!A:K');
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === positionId);
  if (idx < 1) return;
  if (!rows[0]?.[10]) {
    await sheetUpdate('Позиції!K1', [['дата_переобліку']]);
  }
  await sheetUpdate(`Позиції!G${idx + 1}`, [[String(stock)]]);
  if (stockDate !== undefined) {
    await sheetUpdate(`Позиції!K${idx + 1}`, [[stockDate]]);
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

// ─── Sync actual stock column to Google Sheets (column J) ────────────────────

export async function syncActualStockColumn(positions: PositionStats[]): Promise<void> {
  const rows = await sheetGet('Позиції!A:A');
  if (rows.length < 2) return;

  const updates: string[][] = [['фактичний_залишок']];
  for (let i = 1; i < rows.length; i++) {
    const posId = rows[i][0];
    const pos = positions.find(p => p.id === posId);
    updates.push([pos ? String(pos.available) : '']);
  }
  await sheetUpdate(`Позиції!J1:J${rows.length}`, updates);
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

// ─── Daily Plan Settings ──────────────────────────────────────────────────────

export async function getDailyPlanQty(): Promise<number> {
  try {
    const rows = await sheetGet('Налаштування!A:B');
    const obj = rowsToObjects(rows).find(r => r['ключ'] === 'daily_qty_plan');
    return obj ? Number(obj['значення']) || 0 : 0;
  } catch { return 0; }
}

export async function setDailyPlanQty(qty: number): Promise<void> {
  await sheetEnsure('Налаштування', ['ключ', 'значення']);
  await sheetUpsert('Налаштування', 'A:B', 0, 'daily_qty_plan', ['daily_qty_plan', String(qty)]);
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
  const [empRows, stateRows] = await sheetBatchGet(['Працівники!A:G', 'BotState!A:D']);

  const employees = rowsToObjects(empRows).filter(e => e.активний !== 'false');
  const empRow = employees.find(e => e.telegram_id === tgId);

  const states = rowsToObjects(stateRows);
  const stateRow = states.find(s => s.telegram_id === tgId);

  return {
    employee: empRow ? parseEmployee(empRow) : null,
    botState: stateRow ? { state: stateRow.state, data: stateRow.data } : null,
  };
}

// ─── Work Cards ───────────────────────────────────────────────────────────────
// Columns: id | date | employeeName | employeeId | tasks (JSON) | status

const WORKCARD_HEADERS = ['id', 'date', 'employeeName', 'employeeId', 'tasks', 'status'];

function parseWorkCard(r: Record<string, string>): WorkCard {
  let tasks: WorkCard['tasks'] = [];
  try { tasks = JSON.parse(r.tasks || '[]'); } catch { tasks = []; }
  return {
    id: r.id,
    date: r.date,
    employeeName: r.employeeName,
    employeeId: r.employeeId,
    tasks,
    status: (r.status || 'issued') as WorkCard['status'],
  };
}

export async function getWorkCards(date?: string): Promise<WorkCard[]> {
  try {
    const rows = await sheetGet('WorkCards!A:F');
    let cards = rowsToObjects(rows).map(parseWorkCard);
    if (date) cards = cards.filter(c => c.date === date);
    return cards;
  } catch { return []; }
}

export async function addWorkCard(card: Omit<WorkCard, 'id'>): Promise<{ id: string }> {
  await sheetEnsure('WorkCards', WORKCARD_HEADERS);
  const id = genId('wc');
  await sheetAppend('WorkCards!A:F', [
    id, card.date, card.employeeName, card.employeeId,
    JSON.stringify(card.tasks), card.status,
  ]);
  return { id };
}

export async function updateWorkCard(
  id: string,
  updates: { status?: WorkCard['status']; tasks?: WorkCard['tasks'] },
): Promise<void> {
  const rows = await sheetGet('WorkCards!A:F');
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === id);
  if (idx < 1) return;
  if (updates.tasks !== undefined) {
    await sheetUpdate(`WorkCards!E${idx + 1}`, [[JSON.stringify(updates.tasks)]]);
  }
  if (updates.status !== undefined) {
    await sheetUpdate(`WorkCards!F${idx + 1}`, [[updates.status]]);
  }
}

// ─── Materials ────────────────────────────────────────────────────────────────
// Columns: id | назва | одиниця | кількість_на_комплект | альт_назва | альт_кількість
//          | запас_осн | фактичний_осн | запас_альт | фактичний_альт | примітка | активний

const MATERIAL_HEADERS = [
  'id', 'назва', 'одиниця', 'кількість_на_комплект',
  'альт_назва', 'альт_кількість',
  'запас_осн', 'фактичний_осн', 'запас_альт', 'фактичний_альт',
  'примітка', 'активний',
];

function parseMaterial(r: Record<string, string>): Material {
  return {
    id: r.id,
    name: r.назва,
    unit: r.одиниця || 'шт',
    qtyPerKit: Number(r['кількість_на_комплект']) || 0,
    altName: r['альт_назва'] || '',
    altQtyPerKit: Number(r['альт_кількість']) || 0,
    stockMain: Number(r['запас_осн']) || 0,
    stockActual: Number(r['фактичний_осн']) || 0,
    stockAlt: Number(r['запас_альт']) || 0,
    stockAltActual: Number(r['фактичний_альт']) || 0,
    note: r.примітка || '',
  };
}

export async function getMaterials(): Promise<Material[]> {
  try {
    const rows = await sheetGet('Матеріали!A:L');
    return rowsToObjects(rows)
      .filter(r => r.id && r.активний !== 'false')
      .map(parseMaterial);
  } catch { return []; }
}

export async function addMaterial(m: Omit<Material, 'id'>): Promise<{ id: string }> {
  await sheetEnsure('Матеріали', MATERIAL_HEADERS);
  const id = genId('mat');
  await sheetAppend('Матеріали!A:L', [
    id, m.name, m.unit, String(m.qtyPerKit),
    m.altName || '', String(m.altQtyPerKit || 0),
    String(m.stockMain || 0), String(m.stockActual || 0),
    String(m.stockAlt || 0), String(m.stockAltActual || 0),
    m.note || '', 'true',
  ]);
  return { id };
}

export async function updateMaterial(id: string, updates: Partial<Omit<Material, 'id'>>): Promise<void> {
  const rows = await sheetGet('Матеріали!A:L');
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === id);
  if (idx < 1) return;
  const cur = parseMaterial(
    Object.fromEntries(MATERIAL_HEADERS.map((h, i) => [h, rows[idx][i] ?? '']))
  );
  const u = { ...cur, ...updates };
  await sheetUpdate(`Матеріали!A${idx + 1}:L${idx + 1}`, [[
    u.id, u.name, u.unit, String(u.qtyPerKit),
    u.altName || '', String(u.altQtyPerKit || 0),
    String(u.stockMain || 0), String(u.stockActual || 0),
    String(u.stockAlt || 0), String(u.stockAltActual || 0),
    u.note || '', 'true',
  ]]);
}

export async function deleteMaterial(id: string): Promise<void> {
  const rows = await sheetGet('Матеріали!A:A');
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === id);
  if (idx < 1) return;
  await sheetUpdate(`Матеріали!L${idx + 1}`, [['false']]);
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
