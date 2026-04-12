// ==========================================
// ОБРАБОТЧИКИ API ДЕЙСТВИЙ
// Api.gs
// ==========================================

// ------------------------------------------------------------------
// getEmployeeByTelegramId
// ------------------------------------------------------------------

function apiGetEmployeeByTelegramId(params) {
  var tgId = params.telegram_id;
  if (!tgId) return { success: false, error: 'Не указан telegram_id' };

  var emp = getEmployeeByTelegramId(tgId);

  if (!emp) {
    // Авторегистрация
    emp = registerEmployee(tgId, params.fio || null, params.username || null);
  }

  return { success: true, employee: emp };
}

// ------------------------------------------------------------------
// getKitSpec
// ------------------------------------------------------------------

function apiGetKitSpec(params) {
  var spec = getKitSpec();
  return { success: true, spec: spec };
}

// ------------------------------------------------------------------
// getCurrentStock
// ------------------------------------------------------------------

function apiGetCurrentStock(params) {
  var stock = getCurrentStock();
  return { success: true, stock: stock };
}

// ------------------------------------------------------------------
// getCurrentPlan
// ------------------------------------------------------------------

function apiGetCurrentPlan(params) {
  var plan = getCurrentPlan();
  return { success: true, plan: plan };
}

// ------------------------------------------------------------------
// getKitReadiness — ГЛАВНЫЙ МЕТОД
// ------------------------------------------------------------------

function apiGetKitReadiness(params) {
  var spec  = getKitSpec();
  var stock = getCurrentStock();
  var plan  = getCurrentPlan();
  var planQty = Number(plan.План_комплектов || 0);

  var readiness = calcKitReadiness(stock, spec, planQty);

  readiness.plan_record = plan;
  return readiness;
}

// ------------------------------------------------------------------
// getPriorityList
// ------------------------------------------------------------------

function apiGetPriorityList(params) {
  var readiness = apiGetKitReadiness(params);

  // Возвращаем только список приоритетов + что делать сейчас
  return {
    success:           true,
    Готово_комплектов: readiness.Готово_комплектов,
    Узкое_место:       readiness.Узкое_место,
    Что_сделать_сейчас: readiness.Что_сделать_сейчас,
    Список:            readiness.Длины
  };
}

// ------------------------------------------------------------------
// addProductionLog
// ------------------------------------------------------------------

function apiAddProductionLog(params) {
  var tgId       = params.telegram_id || '';
  var lenMm      = params.length_mm;
  var qty        = Number(params.qty || 0);
  var comment    = params.comment    || '';
  var workerName = params.worker_name || '';  // имя из формы
  var logDate    = params.log_date   || '';  // дата из формы (YYYY-MM-DD)

  if (!lenMm)   return { success: false, error: 'Не указана длина' };
  if (qty <= 0) return { success: false, error: 'Количество должно быть > 0' };

  // Если есть telegram_id — регистрируем сотрудника
  var emp    = null;
  var empId  = 0;
  var empFio = workerName;

  if (tgId) {
    emp = getEmployeeByTelegramId(tgId);
    if (!emp) emp = registerEmployee(tgId, workerName || params.fio || null, params.username || null);
    empId = emp.id;
    if (!empFio) empFio = emp.fio;
  }

  if (!empFio) empFio = 'Сотрудник';

  var rowId = addProductionRow(
    empId,
    empFio,
    tgId,
    lenMm,
    qty,
    comment,
    logDate || null
  );

  // Пересчитываем готовность
  var before_ready = params.kits_before ? Number(params.kits_before) : null;
  var readiness    = apiGetKitReadiness(params);
  var after_ready  = readiness.Готово_комплектов;

  var delta = (before_ready !== null) ? (after_ready - before_ready) : null;
  var message;

  if (delta !== null && delta > 0) {
    message = '+' + delta + ' комплект' + plural(delta, '', 'а', 'ов') + ' 🎉';
  } else if (delta === 0) {
    message = 'Записано. Не хватает ещё для нового комплекта.';
  } else {
    message = 'Записано.';
  }

  return {
    success:           true,
    row_id:            rowId,
    message:           message,
    delta_kits:        delta,
    Готово_комплектов: after_ready,
    readiness:         readiness
  };
}

// ------------------------------------------------------------------
// getProductionJournal
// ------------------------------------------------------------------

function apiGetProductionJournal(params) {
  var date   = params.date   || getMoscowDate();
  var tgId   = params.telegram_id || null;

  var rows   = getProductionJournal(date, tgId);
  var totals = aggregateProduction(rows);

  return {
    success: true,
    date:    date,
    rows:    rows,
    totals:  totals
  };
}

// ------------------------------------------------------------------
// getManagerDashboard
// ------------------------------------------------------------------

function apiGetManagerDashboard(params) {
  var tgId = params.telegram_id;
  if (!tgId) return { success: false, error: 'Не указан telegram_id' };

  // Проверяем роль (мягкая проверка — не блокируем, просто помечаем)
  var emp     = getEmployeeByTelegramId(tgId);
  var isMgr   = emp && isManager(tgId);

  var date    = params.date || getMoscowDate();
  var rows    = getProductionJournal(date, null);
  var empSumm = buildEmployeeSummary(rows);
  var totals  = aggregateProduction(rows);

  var readiness = apiGetKitReadiness(params);

  // Проблемные позиции — дефицит > 0 и приоритет высокий
  var problems = readiness.Длины.filter(function (L) {
    return L.Дефицит > 0 && L.Приоритет === 'высокий';
  });

  return {
    success:            true,
    is_manager:         isMgr,
    date:               date,
    plan:               readiness.plan_record,
    readiness_summary:  {
      Готово:   readiness.Готово_комплектов,
      Осталось: readiness.Осталось_комплектов,
      План:     readiness.План_комплектов,
      Прогресс: readiness.Прогресс_процентов,
      Узкое_место: readiness.Узкое_место
    },
    employee_summary:   empSumm,
    production_totals:  totals,
    problem_positions:  problems,
    all_lengths:        readiness.Длины
  };
}

// ------------------------------------------------------------------
// recalcKitProgress — пересчёт без изменений (GET)
// ------------------------------------------------------------------

function apiRecalcKitProgress(params) {
  return apiGetKitReadiness(params);
}

// ------------------------------------------------------------------
// setPlan — установить план на дату (только для менеджера)
// ------------------------------------------------------------------

function apiSetPlan(params) {
  var tgId    = params.telegram_id;
  var planQty = Number(params.plan_qty || 0);
  var date    = params.date    || getMoscowDate();
  var comment = params.comment || '';

  if (!tgId)    return { success: false, error: 'Не указан telegram_id' };
  if (planQty <= 0) return { success: false, error: 'Укажите план > 0' };

  if (!isManager(tgId)) {
    return { success: false, error: 'Недостаточно прав' };
  }

  var record = createPlan(date, planQty, comment);
  return { success: true, plan: record };
}

// ------------------------------------------------------------------
// setStock — ручная корректировка остатка (только для менеджера)
// ------------------------------------------------------------------

function apiSetStock(params) {
  var lenMm = params.length_mm;
  var qty   = Number(params.qty);

  if (!lenMm)         return { success: false, error: 'Не указана длина' };
  if (isNaN(qty) || qty < 0) return { success: false, error: 'Некорректное количество' };

  setStock(lenMm, qty);

  // Возвращаем обновлённую готовность
  var readiness = apiGetKitReadiness(params);
  return { success: true, length_mm: lenMm, new_stock: qty, readiness: readiness };
}

// ------------------------------------------------------------------
// Утилиты
// ------------------------------------------------------------------

/**
 * Русский plural: plural(n, '', 'а', 'ов') → '' | 'а' | 'ов'
 */
function plural(n, form1, form2, form5) {
  var n10  = n % 10;
  var n100 = n % 100;
  if (n100 >= 11 && n100 <= 19) return form5;
  if (n10 === 1) return form1;
  if (n10 >= 2 && n10 <= 4) return form2;
  return form5;
}
