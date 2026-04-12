// ==========================================
// ОПЕРАЦИИ С GOOGLE SHEETS
// Sheets.gs — CRUD слой
// ==========================================

// --- Константа: ID таблицы ---
var SPREADSHEET_ID = PropertiesService
  .getScriptProperties()
  .getProperty('SPREADSHEET_ID') || '1_M6Gp13wPXGKgp6diKq3vJNWZQBb5d_DNfGUuSMy4a0';

// ------------------------------------------------------------------
// Базовые утилиты
// ------------------------------------------------------------------

/**
 * Возвращает объект Sheet по имени листа.
 * Выбрасывает ошибку, если лист не найден.
 */
function getSheet(name) {
  var ss    = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Лист "' + name + '" не найден');
  return sheet;
}

// ------------------------------------------------------------------

/**
 * Конвертирует лист в массив объектов.
 * Первая строка — заголовки.
 */
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var result  = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }

  return result;
}

// ------------------------------------------------------------------

/**
 * Создаёт лист с заголовками, если он не существует.
 */
function createSheetIfNotExists(name, headers) {
  var ss    = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff');
    Logger.log('Создан лист: ' + name);
  }
  return sheet;
}

// ------------------------------------------------------------------
// Спецификация
// ------------------------------------------------------------------

/**
 * Возвращает активные позиции спецификации.
 */
function getKitSpec() {
  var sheet = getSheet('Спецификация');
  var rows  = sheetToObjects(sheet);
  return rows.filter(function (r) { return r['Активна']; });
}

// ------------------------------------------------------------------
// Остатки
// ------------------------------------------------------------------

/**
 * Возвращает текущие остатки как объект {длина: остаток}.
 */
function getCurrentStock() {
  var sheet = getSheet('Остатки');
  var rows  = sheetToObjects(sheet);
  var stock = {};
  rows.forEach(function (r) {
    stock[Number(r['Длина_мм'])] = Number(r['Остаток'] || 0);
  });
  return stock;
}

/**
 * Обновляет остаток конкретной длины (добавляет qty к текущему).
 */
function updateStock(lengthMm, qty) {
  var sheet   = getSheet('Остатки');
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var colLen  = headers.indexOf('Длина_мм');
  var colRem  = headers.indexOf('Остаток');
  var colTime = headers.indexOf('Обновлено_время');

  for (var i = 1; i < data.length; i++) {
    if (Number(data[i][colLen]) === Number(lengthMm)) {
      var newVal = Number(data[i][colRem] || 0) + Number(qty);
      sheet.getRange(i + 1, colRem + 1).setValue(newVal);
      sheet.getRange(i + 1, colTime + 1).setValue(new Date());
      return newVal;
    }
  }

  // Длина не найдена — добавляем строку
  var newId = sheet.getLastRow();
  sheet.appendRow([newId, Number(lengthMm), Number(qty), new Date()]);
  return Number(qty);
}

/**
 * Устанавливает точное значение остатка (не добавляет, а перезаписывает).
 */
function setStock(lengthMm, qty) {
  var sheet   = getSheet('Остатки');
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var colLen  = headers.indexOf('Длина_мм');
  var colRem  = headers.indexOf('Остаток');
  var colTime = headers.indexOf('Обновлено_время');

  for (var i = 1; i < data.length; i++) {
    if (Number(data[i][colLen]) === Number(lengthMm)) {
      sheet.getRange(i + 1, colRem + 1).setValue(Number(qty));
      sheet.getRange(i + 1, colTime + 1).setValue(new Date());
      return Number(qty);
    }
  }

  var newId = sheet.getLastRow();
  sheet.appendRow([newId, Number(lengthMm), Number(qty), new Date()]);
  return Number(qty);
}

// ------------------------------------------------------------------
// План
// ------------------------------------------------------------------

/**
 * Возвращает активный план на сегодня.
 * Если активного нет — возвращает план с наибольшей датой.
 */
function getCurrentPlan() {
  var sheet   = getSheet('План');
  var rows    = sheetToObjects(sheet);
  var today   = getMoscowDate();

  // Ищем активный план на сегодня
  var activePlans = rows.filter(function (r) {
    return r['Активен'] && String(r['Дата']).substring(0, 10) === today;
  });

  if (activePlans.length > 0) return activePlans[activePlans.length - 1];

  // Если нет — последний активный
  var active = rows.filter(function (r) { return r['Активен']; });
  if (active.length > 0) return active[active.length - 1];

  // Fallback — нулевой план
  return { id: 0, Дата: today, План_комплектов: 0, Комментарий: '', Активен: true };
}

/**
 * Создаёт новый план.
 */
function createPlan(date, planQty, comment) {
  // Деактивируем предыдущие планы на эту дату
  var sheet   = getSheet('План');
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var colDate = headers.indexOf('Дата');
  var colAct  = headers.indexOf('Активен');

  var dateStr = String(date).substring(0, 10);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colDate]).substring(0, 10) === dateStr) {
      sheet.getRange(i + 1, colAct + 1).setValue(false);
    }
  }

  var newId = sheet.getLastRow();
  sheet.appendRow([newId, date, Number(planQty), comment || '', true]);

  return { id: newId, Дата: date, План_комплектов: Number(planQty) };
}

// ------------------------------------------------------------------
// Производство
// ------------------------------------------------------------------

/**
 * Записывает новую строку производства.
 */
function addProductionRow(employeeId, employeeFio, telegramId, lengthMm, qty, comment, logDate) {
  var sheet  = getSheet('Производство');
  var now    = new Date();
  var date   = logDate || getMoscowDate(now);
  var dt     = getMoscowDateTime(now);
  var newId  = sheet.getLastRow();

  sheet.appendRow([
    newId,
    date,
    dt,
    employeeId   || '',
    employeeFio  || '',
    String(telegramId || ''),
    Number(lengthMm),
    Number(qty),
    comment || ''
  ]);

  // Обновляем остаток
  updateStock(lengthMm, qty);

  return newId;
}

/**
 * Возвращает журнал производства за дату (YYYY-MM-DD).
 * Если date не указана — возвращает за сегодня.
 */
function getProductionJournal(date, telegramId) {
  var sheet = getSheet('Производство');
  var rows  = sheetToObjects(sheet);
  var d     = date || getMoscowDate();

  var filtered = rows.filter(function (r) {
    var rowDate = String(r['Дата']).substring(0, 10);
    if (rowDate !== d) return false;
    if (telegramId) return String(r['Telegram_id']) === String(telegramId);
    return true;
  });

  return filtered;
}

/**
 * Возвращает суммарное производство по длинам за дату.
 */
function getProductionSummaryByDate(date) {
  var rows = getProductionJournal(date, null);
  return aggregateProduction(rows);
}
