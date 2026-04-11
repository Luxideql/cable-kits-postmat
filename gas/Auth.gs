// ==========================================
// АУТЕНТИФИКАЦИЯ И АВТОРИЗАЦИЯ
// Auth.gs
// ==========================================

/**
 * Возвращает объект сотрудника по Telegram ID.
 * Если сотрудник не найден — возвращает null.
 */
function getEmployeeByTelegramId(telegramId) {
  try {
    var sheet = getSheet('Сотрудники');
    var rows  = sheetToObjects(sheet);

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (String(r['Telegram_id']) === String(telegramId) && r['Активен']) {
        return {
          id:          r['id'],
          telegram_id: r['Telegram_id'],
          fio:         r['ФИО'],
          role:        r['Роль'],
          active:      r['Активен']
        };
      }
    }

    return null;
  } catch (e) {
    Logger.log('getEmployeeByTelegramId: ' + e.message);
    return null;
  }
}

// ------------------------------------------------------------------

/**
 * Автоматическая регистрация нового сотрудника.
 * Роль по умолчанию — «сотрудник».
 */
function registerEmployee(telegramId, fio, username) {
  try {
    var existing = getEmployeeByTelegramId(telegramId);
    if (existing) return existing;

    var sheet   = getSheet('Сотрудники');
    var lastId  = sheet.getLastRow(); // строк с заголовком
    var newId   = lastId;             // простой инкремент

    var displayName = fio || (username ? '@' + username : 'Пользователь ' + telegramId);

    sheet.appendRow([
      newId,
      String(telegramId),
      displayName,
      'сотрудник',
      true
    ]);

    Logger.log('Зарегистрирован новый сотрудник: ' + displayName + ' (' + telegramId + ')');

    return {
      id:          newId,
      telegram_id: String(telegramId),
      fio:         displayName,
      role:        'сотрудник',
      active:      true
    };
  } catch (e) {
    Logger.log('registerEmployee: ' + e.message);
    throw e;
  }
}

// ------------------------------------------------------------------

/**
 * Возвращает true, если пользователь имеет роль мастера/руководителя.
 */
function isManager(telegramId) {
  var emp = getEmployeeByTelegramId(telegramId);
  if (!emp) return false;
  var MANAGER_ROLES = ['мастер', 'руководитель', 'admin', 'менеджер'];
  return MANAGER_ROLES.indexOf(emp.role) !== -1;
}

// ------------------------------------------------------------------

/**
 * Обновляет ФИО сотрудника.
 */
function updateEmployeeFio(telegramId, newFio) {
  var sheet   = getSheet('Сотрудники');
  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var colTG   = headers.indexOf('Telegram_id');
  var colFIO  = headers.indexOf('ФИО');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colTG]) === String(telegramId)) {
      sheet.getRange(i + 1, colFIO + 1).setValue(newFio);
      return true;
    }
  }
  return false;
}

// ------------------------------------------------------------------

/**
 * Возвращает список всех активных сотрудников.
 */
function getAllEmployees() {
  var sheet = getSheet('Сотрудники');
  var rows  = sheetToObjects(sheet);
  return rows.filter(function (r) { return r['Активен']; });
}
