// ==========================================
// ENTRY POINT — Google Apps Script Web App
// Code.gs — точка входа, роутер
// ==========================================
//
// ДЕПЛОЙ:
//   Extensions → Apps Script → Deploy → New deployment
//   Type: Web app
//   Execute as: Me
//   Who has access: Anyone
// ==========================================

var APP_VERSION = '1.3.0';

// ------------------------------------------------------------------
// HTTP handlers
// ------------------------------------------------------------------

/**
 * Обрабатывает GET-запросы.
 * Все параметры передаются как query string.
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * Обрабатывает POST-запросы.
 * Параметры могут быть в query string ИЛИ в JSON-теле.
 */
function doPost(e) {
  return handleRequest(e);
}

// ------------------------------------------------------------------

function handleRequest(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var params = {};

    // Сначала — GET-параметры
    if (e && e.parameter) {
      for (var k in e.parameter) {
        params[k] = e.parameter[k];
      }
    }

    // Потом — POST JSON-тело (перекрывает GET при совпадении ключей)
    if (e && e.postData && e.postData.contents) {
      try {
        var body = JSON.parse(e.postData.contents);
        for (var bk in body) {
          params[bk] = body[bk];
        }
      } catch (parseErr) {
        // Не JSON — игнорируем
      }
    }

    var action = params.action;
    if (!action) {
      output.setContent(JSON.stringify({
        success: false,
        error:   'Не указан параметр action',
        version: APP_VERSION
      }));
      return output;
    }

    var result = routeAction(action, params);
    output.setContent(JSON.stringify(result));

  } catch (err) {
    Logger.log('handleRequest ERROR: ' + err.message + '\n' + err.stack);
    output.setContent(JSON.stringify({
      success: false,
      error:   err.message,
      version: APP_VERSION
    }));
  }

  return output;
}

// ------------------------------------------------------------------
// Роутер
// ------------------------------------------------------------------

function routeAction(action, params) {
  switch (action) {

    // Справочники
    case 'getEmployeeByTelegramId': return apiGetEmployeeByTelegramId(params);
    case 'getKitSpec':              return apiGetKitSpec(params);
    case 'getCurrentStock':         return apiGetCurrentStock(params);
    case 'getCurrentPlan':          return apiGetCurrentPlan(params);

    // Расчёт готовности
    case 'getKitReadiness':         return apiGetKitReadiness(params);
    case 'getPriorityList':         return apiGetPriorityList(params);
    case 'recalcKitProgress':       return apiRecalcKitProgress(params);

    // Производство
    case 'addProductionLog':        return apiAddProductionLog(params);
    case 'getProductionJournal':    return apiGetProductionJournal(params);

    // Управление
    case 'getManagerDashboard':     return apiGetManagerDashboard(params);
    case 'setPlan':                 return apiSetPlan(params);
    case 'setStock':                return apiSetStock(params);

    // Сотрудники и назначения
    case 'getEmployees':    return apiGetEmployees(params);
    case 'getAssignments':  return apiGetAssignments(params);
    case 'setAssignment':   return apiSetAssignment(params);

    // Служебные
    case 'ping':
      return { success: true, message: 'pong', version: APP_VERSION, time: getMoscowDateTime() };

    case 'initSheets':
      initSheets();
      return { success: true, message: 'Таблицы инициализированы' };

    case 'initPlan':
      // Установка начального плана и первого менеджера (без авторизации)
      var planQty  = Number(params.plan_qty  || 10);
      var tgId     = params.telegram_id || '';
      var fio      = params.fio         || 'Администратор';
      createPlan(getMoscowDate(), planQty, 'Начальный план');
      if (tgId) {
        var existing = getEmployeeByTelegramId(tgId);
        if (!existing) registerEmployee(tgId, fio, '');
        // Повышаем до мастера
        var s = getSheet('Сотрудники');
        var data = s.getDataRange().getValues();
        var h = data[0];
        var ci = h.indexOf('Telegram_id'), cr = h.indexOf('Роль');
        for (var ri = 1; ri < data.length; ri++) {
          if (String(data[ri][ci]) === String(tgId)) {
            s.getRange(ri+1, cr+1).setValue('мастер');
          }
        }
      }
      return { success: true, message: 'План ' + planQty + ' установлен', plan_qty: planQty };

    default:
      return { success: false, error: 'Неизвестный action: "' + action + '"' };
  }
}

// ------------------------------------------------------------------
// Инициализация таблиц (запустить ОДИН РАЗ через Apps Script UI)
// ------------------------------------------------------------------

function initSheets() {
  createSheetIfNotExists('Спецификация',
    ['id', 'Длина_мм', 'Количество_на_комплект', 'Ячейки', 'Группа', 'Активна']);

  createSheetIfNotExists('Остатки',
    ['id', 'Длина_мм', 'Остаток', 'Обновлено_время']);

  createSheetIfNotExists('План',
    ['id', 'Дата', 'План_комплектов', 'Комментарий', 'Активен']);

  createSheetIfNotExists('Производство',
    ['id', 'Дата', 'Дата_время', 'Сотрудник_id', 'Сотрудник', 'Telegram_id',
     'Длина_мм', 'Количество_сделано', 'Комментарий']);

  createSheetIfNotExists('Сотрудники',
    ['id', 'Telegram_id', 'ФИО', 'Роль', 'Активен']);

  createSheetIfNotExists('Назначения',
    ['id', 'Дата', 'Длина_мм', 'Сотрудник_ФИО', 'План_шт']);

  fillDefaultSpec();
  Logger.log('✅ Инициализация завершена');
}

// ------------------------------------------------------------------

/**
 * Заполняет спецификацию стандартными данными.
 * Вызывается из initSheets(), не перезаписывает существующие данные.
 */
function fillDefaultSpec() {
  var sheet = getSheet('Спецификация');
  if (sheet.getLastRow() > 1) {
    Logger.log('Спецификация уже заполнена — пропускаем');
    return;
  }

  // [id, Длина_мм, Количество_на_комплект, Ячейки, Группа, Активна]
  var rows = [
    [1,  2225, 3,  'A1:A3',   'верхние',  true],
    [2,  2000, 11, 'B1:B11',  'средние',  true],
    [3,  1800, 2,  'C1:C2',   'средние',  true],
    [4,  1650, 4,  'D1:D4',   'средние',  true],
    [5,  1550, 4,  'E1:E4',   'средние',  true],
    [6,  1400, 1,  'F1',      'нижние',   true],
    [7,  1350, 2,  'G1:G2',   'нижние',   true],
    [8,  1250, 3,  'H1:H3',   'нижние',   true],
    [9,  1000, 2,  'I1:I2',   'нижние',   true],
    [10, 780,  2,  'J1:J2',   'нижние',   true]
  ];

  for (var i = 0; i < rows.length; i++) {
    sheet.appendRow(rows[i]);
  }

  // Инициализируем остатки нулями
  var stockSheet = getSheet('Остатки');
  if (stockSheet.getLastRow() <= 1) {
    for (var j = 0; j < rows.length; j++) {
      stockSheet.appendRow([j + 1, rows[j][1], 0, new Date()]);
    }
  }

  Logger.log('✅ Спецификация заполнена (' + rows.length + ' позиций)');
}

// ------------------------------------------------------------------
// Тест (запустить вручную через Apps Script для проверки)
// ------------------------------------------------------------------

function testCalc() {
  var stock = {
    2225: 9, 2000: 55, 1800: 10, 1650: 20,
    1550: 20, 1400: 5, 1350: 10, 1250: 15,
    1000: 10, 780: 10
  };
  var spec = getKitSpec();
  var r    = calcKitReadiness(stock, spec, 10);
  Logger.log(JSON.stringify(r, null, 2));
}
