import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import {
  sendMessage, answerCallback, mainMenuKeyboard,
} from '@/lib/telegram';
import {
  getContext, getPositions, getEmployees,
  getDailyReports, addDailyReport, addReportAndResetState, addEmployee,
  getKitStats, setBotState, addShipment,
} from '@/lib/data';
import { getTodayDate, formatDate } from '@/lib/calculations';
import type { Employee, DailyReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Update = Record<string, any>;

export async function POST(req: Request) {
  const update: Update = await req.json();

  // Respond to Telegram immediately — processing happens in background.
  // This prevents Telegram from retrying and removes the perceived delay.
  waitUntil(
    (update.callback_query
      ? handleCallback(update.callback_query)
      : update.message
        ? handleMessage(update.message)
        : Promise.resolve()
    ).catch(e => console.error('Telegram webhook error:', e))
  );

  return NextResponse.json({ ok: true });
}

// ─── Message handler ──────────────────────────────────────────────────────────

async function handleMessage(msg: Update) {
  const chatId = msg.chat.id;
  const tgId = String(msg.from?.id ?? chatId);
  const text = (msg.text ?? '').trim();

  // One GAS call for both employee + botState
  const ctx = await getContext(tgId);
  let employee = ctx.employee;
  const botState = ctx.botState;
  if (!employee) {
    const firstName = (msg.from?.first_name ?? '').trim();
    const lastName  = (msg.from?.last_name  ?? '').trim();
    const fullName  = [firstName, lastName].filter(Boolean).join(' ') || `Користувач ${tgId}`;
    const { id } = await addEmployee({ fullName, telegramId: tgId, position: 'Монтажник', active: true, notify: true });
    employee = { id, fullName, telegramId: tgId, position: 'Монтажник', active: true, notify: true };
  }

  if (botState?.state === 'await_qty' && text && !isNaN(Number(text))) {
    const qty = Number(text);
    if (qty <= 0) {
      await sendMessage(chatId, '❌ Кількість має бути більше 0. Введіть ще раз:');
      return;
    }
    const data = JSON.parse(botState.data || '{}');
    const empId = employee?.id ?? tgId;
    const empName = employee?.fullName ?? 'Невідомий';

    await addReportAndResetState({
      date: getTodayDate(),
      employeeId: empId,
      positionId: data.positionId,
      qty,
      hours: 0,
      comment: '',
    }, tgId);

    await sendMessage(
      chatId,
      `✅ Записано!\n👷 <b>${empName}</b>\n📏 ${data.positionName}\n🔢 <b>${qty} шт</b>`,
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (botState?.state === 'await_kits_all' && text && !isNaN(Number(text))) {
    const kits = Number(text);
    if (kits <= 0) {
      await sendMessage(chatId, '❌ Кількість має бути більше 0. Введіть ще раз:');
      return;
    }
    const empId = employee?.id ?? tgId;
    const empName = employee?.fullName ?? 'Невідомий';
    const today = getTodayDate();

    const positions = await getPositions();
    const active = positions.filter(p => p.qtyPerPostomat > 0);
    const totalUnits = active.reduce((s, p) => s + kits * p.qtyPerPostomat, 0);

    await Promise.all([
      ...active.map(p => addDailyReport({
        date: today,
        employeeId: empId,
        positionId: p.id,
        qty: kits * p.qtyPerPostomat,
        hours: 0,
        comment: `${kits} компл.`,
      })),
      setBotState(tgId, 'idle', ''),
    ]);

    const lines = active.map(p => `  • ${p.lengthMm} мм — ${kits * p.qtyPerPostomat} шт`).join('\n');
    await sendMessage(
      chatId,
      `✅ Записано!\n👷 <b>${empName}</b>\n📦 <b>${kits} готових комплектів</b> = ${totalUnits} шт\n\n${lines}`,
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (botState?.state === 'await_ship_qty' && text && !isNaN(Number(text))) {
    const qty = Number(text);
    if (qty <= 0) {
      await sendMessage(chatId, '❌ Кількість має бути більше 0. Введіть ще раз:');
      return;
    }
    await Promise.all([
      addShipment({ date: getTodayDate(), qty, comment: '' }),
      setBotState(tgId, 'idle', ''),
    ]);
    await sendMessage(
      chatId,
      `✅ Відвантажено!\n🚚 <b>${qty} компл.</b>`,
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  // Main menu commands
  switch (text) {
    case '/start':
    case '🏠 Головна':
      await handleStart(chatId, tgId, employee);
      break;

    case '➕ Додати виробіток':
      await handleAddProduction(chatId, tgId, employee);
      break;

    case '📊 Мій стан':
      await handleMyStats(chatId, tgId, employee);
      break;

    case '📋 Позиції':
      await handlePositions(chatId);
      break;

    case '📦 Залишки':
      await handleStock(chatId);
      break;

    case '🧮 Комплекти':
      await handleKits(chatId);
      break;

    case '🚚 Відвантаження':
      await handleShipment(chatId, tgId);
      break;

    case '🎯 План':
      await handlePlan(chatId);
      break;

    case '📈 Статистика':
      await handleAllStats(chatId);
      break;

    case '🔗 Таблиця':
      await sendMessage(chatId,
        '📊 <b>Google Таблиця:</b>\nhttps://docs.google.com/spreadsheets/d/1_M6Gp13wPXGKgp6diKq3vJNWZQBb5d_DNfGUuSMy4a0/edit',
        { reply_markup: mainMenuKeyboard() }
      );
      break;

    default:
      await sendMessage(chatId, 'Оберіть дію з меню:', { reply_markup: mainMenuKeyboard() });
  }
}

// ─── Callback handler ─────────────────────────────────────────────────────────

async function handleCallback(cb: Update) {
  const chatId = cb.message?.chat?.id;
  const tgId = String(cb.from?.id ?? chatId);
  const data: string = cb.data ?? '';

  await answerCallback(cb.id);

  if (data === 'prod|positions') {
    const positions = await getPositions();
    if (!positions.length) {
      await sendMessage(chatId, '❌ Позицій не знайдено.');
      return;
    }
    const buttons = positions.map(p => ([{
      text: `${p.lengthMm} мм (${p.qtyPerPostomat} шт/компл.)`,
      callback_data: `pos|${p.id}`,
    }]));
    await sendMessage(chatId, `📋 Оберіть позицію:`, {
      reply_markup: { inline_keyboard: buttons },
    });
  }

  if (data === 'prod|kits') {
    await setBotState(tgId, 'await_kits_all', '');
    await sendMessage(
      chatId,
      `📦 <b>Готові комплекти</b>\n\nВведіть кількість виготовлених комплектів:`,
      { reply_markup: { remove_keyboard: true } }
    );
  }

  if (data.startsWith('pos|')) {
    const posId = data.split('|')[1];
    const positions = await getPositions();
    const pos = positions.find(p => p.id === posId);
    const posName = pos ? `Кабель ${pos.lengthMm} мм` : posId;

    await setBotState(tgId, 'await_qty', JSON.stringify({ positionId: posId, positionName: posName }));
    await sendMessage(
      chatId,
      `📏 <b>${posName}</b>\n\nВведіть кількість виготовлених штук:`,
      { reply_markup: { remove_keyboard: true } }
    );
  }

  if (data.startsWith('emp:')) {
    // employee selection not needed in current flow
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleStart(chatId: number, tgId: string, employee: Employee) {
  const name = employee?.fullName ?? `Користувач ${tgId}`;
  await sendMessage(
    chatId,
    `👋 Привіт, <b>${name}</b>!\n\n📱 Система обліку виробництва кабелю\n\nОберіть дію:`,
    { reply_markup: mainMenuKeyboard() }
  );
}

async function handleAddProduction(chatId: number, tgId: string, employee: Employee) {
  await sendMessage(
    chatId,
    `👷 <b>${employee.fullName}</b>\n\nОберіть тип виробітку:`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '📋 Позиції', callback_data: 'prod|positions' },
          { text: '📦 Готові комплекти', callback_data: 'prod|kits' },
        ]],
      },
    }
  );
}

async function handleMyStats(chatId: number, tgId: string, employee: Employee) {

  const today = getTodayDate();
  const [reports, positions] = await Promise.all([getDailyReports(), getPositions()]);
  const posMap = Object.fromEntries(positions.map(p => [p.id, p]));

  const mine = reports
    .filter(r => r.employeeId === employee.id)
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  if (!mine.length) {
    await sendMessage(chatId,
      `📊 <b>${employee.fullName}</b>\n\nЗаписів ще немає.`,
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  // Group by date
  const byDate = new Map<string, typeof mine>();
  for (const r of mine) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push(r);
  }

  const sections: string[] = [];
  for (const date of Array.from(byDate.keys())) {
    const rows = byDate.get(date)!;
    const dayTotal = rows.reduce((s: number, r: DailyReport) => s + r.qty, 0);
    const lines = rows.map((r: DailyReport) => {
      const pos = posMap[r.positionId];
      return `  • ${pos?.lengthMm ?? '?'} мм — ${r.qty} шт`;
    }).join('\n');
    sections.push(`📅 <b>${formatDate(date)}</b> (разом: ${dayTotal} шт)\n${lines}`);
  }

  const totalAll = mine.reduce((s, r) => s + r.qty, 0);

  // Telegram limit: split if too long
  const header = `📊 <b>${employee.fullName}</b> | всього: ${totalAll} шт\n\n`;
  await sendMessage(chatId, header + sections.join('\n\n'), { reply_markup: mainMenuKeyboard() });
}

async function handlePositions(chatId: number) {
  const positions = await getPositions();
  const lines = positions.map(p =>
    `📏 <b>${p.lengthMm} мм</b> — ${p.qtyPerPostomat} шт | комірки: ${p.cellNumbers}`
  ).join('\n');
  await sendMessage(chatId, `📋 <b>Позиції (${positions.length}):</b>\n\n${lines}`, { reply_markup: mainMenuKeyboard() });
}

async function handleStock(chatId: number) {
  const stats = await getKitStats();

  const col1 = 9;
  const header = `${'Позиція'.padEnd(col1)} ${'Склад'.padStart(6)} ${'Вироб'.padStart(6)} ${'Разом'.padStart(6)}`;
  const divider = '─'.repeat(header.length);

  const rows = stats.positions.map(p => {
    const label    = `${p.lengthMm} мм`.padEnd(col1);
    const stock    = String(p.stock).padStart(6);
    const produced = String(p.produced).padStart(6);
    const total    = String(p.available).padStart(6); // склад + виробництво
    return `${label} ${stock} ${produced} ${total}`;
  }).join('\n');

  const table = `${header}\n${divider}\n${rows}`;
  await sendMessage(chatId,
    `📦 <b>Залишки:</b>\n<pre>${table}</pre>`,
    { reply_markup: mainMenuKeyboard() }
  );
}

async function handleKits(chatId: number) {
  const stats = await getKitStats();
  const lines = stats.positions.map(p =>
    `${p.lengthMm} мм — ${p.kits} компл. (є ${p.available}/${p.qtyPerPostomat} шт)`
  ).join('\n');
  const bn = stats.bottleneck;
  await sendMessage(chatId,
    `🧮 <b>Готових комплектів: ${stats.totalKits}</b>\n` +
    `🚚 <b>Відправлено: ${stats.shipped} компл.</b>\n\n` +
    (bn ? `🔴 Вузьке місце: <b>${bn.lengthMm} мм</b> (${bn.kits} компл.)\n\n` : '') +
    lines,
    { reply_markup: mainMenuKeyboard() }
  );
}

async function handleShipment(chatId: number, tgId: string) {
  await setBotState(tgId, 'await_ship_qty', '');
  await sendMessage(
    chatId,
    `🚚 <b>Відвантаження</b>\n\nВведіть кількість відправлених комплектів:`,
    { reply_markup: { remove_keyboard: true } }
  );
}

async function handlePlan(chatId: number) {
  const stats = await getKitStats();

  // planQty — plan in kits; remaining — shortage in units (already fixed in calcPositionStats)
  const lines = stats.positions.map(p => {
    if (p.planQty <= 0) return `${p.lengthMm} мм — план не задано`;

    const planKits    = p.planQty;
    const doneKits    = p.kits;
    const kitShortfall = Math.max(0, planKits - doneKits);
    const unitShortfall = p.remaining; // штук ще треба виробити
    const icon = kitShortfall === 0 ? '✅' : '🔴';
    return `${icon} <b>${p.lengthMm} мм</b> — план: ${planKits} компл. | є: ${doneKits} компл.`
      + (kitShortfall > 0 ? ` | треба ще: <b>${unitShortfall} шт</b>` : '');
  }).join('\n');

  const withPlan = stats.positions.filter(p => p.planQty > 0);
  const planKitsMin   = withPlan.length > 0 ? Math.min(...withPlan.map(p => p.planQty)) : 0;
  const totalKitShort = Math.max(0, planKitsMin - stats.totalKits);

  await sendMessage(chatId,
    `🎯 <b>План: ${planKitsMin} компл. | Готово: ${stats.totalKits} компл. | Недостача: ${totalKitShort} компл.</b>\n\n${lines}`,
    { reply_markup: mainMenuKeyboard() }
  );
}

async function handleAllStats(chatId: number) {
  const [reports, positions, employees] = await Promise.all([
    getDailyReports(),
    getPositions(),
    getEmployees(),
  ]);

  if (!reports.length) {
    await sendMessage(chatId, '📈 Записів ще немає.', { reply_markup: mainMenuKeyboard() });
    return;
  }

  const posMap = Object.fromEntries(positions.map(p => [p.id, p]));
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

  // Group: positionId → date → entries
  const tree = new Map<string, Map<string, { name: string; qty: number }[]>>();
  for (const r of reports) {
    if (!tree.has(r.positionId)) tree.set(r.positionId, new Map());
    const byDate = tree.get(r.positionId)!;
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date)!.push({
      name: empMap[r.employeeId]?.fullName ?? r.employeeId,
      qty:  r.qty,
    });
  }

  const sections: string[] = [];
  for (const pos of positions) {
    const byDate = tree.get(pos.id);
    if (!byDate || byDate.size === 0) continue;

    const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
    const dateLines = dates.map(date => {
      const entries = byDate.get(date)!;
      const total   = entries.reduce((s, e) => s + e.qty, 0);
      const names   = entries.map(e => `${e.name.split(' ')[0]}: ${e.qty}`).join(', ');
      return `  ${formatDate(date)} (${total} шт) — ${names}`;
    }).join('\n');

    const posTotal = reports
      .filter(r => r.positionId === pos.id)
      .reduce((s, r) => s + r.qty, 0);

    sections.push(`📏 <b>${pos.lengthMm} мм</b> | всього: ${posTotal} шт\n${dateLines}`);
  }

  // Split if message > 3800 chars
  const header = `📈 <b>Статистика виробництва</b>\n\n`;
  let msg = header;
  for (const section of sections) {
    const next = (msg === header ? msg + section : msg + '\n\n' + section);
    if (next.length > 3800) {
      await sendMessage(chatId, msg);
      msg = section;
    } else {
      msg = next;
    }
  }
  await sendMessage(chatId, msg, { reply_markup: mainMenuKeyboard() });
}

