// ==========================================
// РАСЧЁТЫ КАБЕЛЬНЫХ КОМПЛЕКТОВ
// Calculations.gs — бизнес-логика
// ==========================================

/**
 * Рассчитывает готовность комплектов.
 *
 * @param {Object} stock  — {длина_мм: остаток, ...}
 * @param {Array}  spec   — массив строк спецификации (объекты)
 * @param {number} plan   — план комплектов на день
 * @returns {Object}      — полный результат расчёта
 */
function calcKitReadiness(stock, spec, plan) {
  var lengths = [];
  var minKits = Infinity;
  var bottleneckLength = null;

  // --- первый проход: рассчитываем сырые данные по каждой длине ---
  for (var i = 0; i < spec.length; i++) {
    var item = spec[i];
    if (!item.Активна) continue;

    var len      = Number(item.Длина_мм);
    var qpc      = Number(item.Количество_на_комплект); // qty per kit
    var cur      = Number(stock[len] || 0);

    var kitsCanMake   = Math.floor(cur / qpc);
    var neededForPlan = qpc * plan;
    var deficit       = Math.max(0, neededForPlan - cur);
    var surplus       = Math.max(0, cur - neededForPlan);
    var remainder     = cur % qpc;
    var neededForNext = (remainder === 0 && cur > 0) ? 0 : (qpc - remainder) % qpc;
    // если cur === 0, то neededForNext = qpc (нужно сделать минимум один пакет)
    if (cur === 0) neededForNext = qpc;

    lengths.push({
      Длина_мм:              len,
      Количество_на_комплект: qpc,
      Остаток:               cur,
      Хватает_на_комплектов: kitsCanMake,
      Нужно_на_план:         neededForPlan,
      Дефицит:               deficit,
      Избыток:               surplus,
      Нужно_для_следующего:  neededForNext,
      Узкое_место:           false,
      Приоритет:             'низкий',
      Ячейки:                item.Ячейки  || '',
      Группа:                item.Группа  || ''
    });

    if (kitsCanMake < minKits) {
      minKits = kitsCanMake;
      bottleneckLength = len;
    }
  }

  // --- второй проход: расставляем приоритеты ---
  for (var j = 0; j < lengths.length; j++) {
    var L    = lengths[j];
    var diff = L.Хватает_на_комплектов - minKits;

    if (L.Длина_мм === bottleneckLength) {
      L.Узкое_место = true;
      L.Приоритет   = 'высокий';
    } else if (diff <= 2) {
      L.Приоритет = 'высокий';
    } else if (diff <= 5) {
      L.Приоритет = 'средний';
    } else {
      L.Приоритет = 'низкий';
    }
  }

  // --- сортировка: высокий → средний → низкий, внутри — по дефициту ↓ ---
  var ORDER = { 'высокий': 0, 'средний': 1, 'низкий': 2 };
  lengths.sort(function (a, b) {
    var po = ORDER[a.Приоритет] - ORDER[b.Приоритет];
    if (po !== 0) return po;
    return b.Дефицит - a.Дефицит;
  });

  var totalReady  = (minKits === Infinity) ? 0 : minKits;
  var remaining   = Math.max(0, plan - totalReady);
  var progressPct = plan > 0 ? Math.min(100, Math.round((totalReady / plan) * 100)) : 0;

  // --- что сделать для +1 комплекта ---
  var whatToDo = calcWhatToDo(stock, spec, minKits);

  return {
    success:           true,
    План_комплектов:   plan,
    Готово_комплектов: totalReady,
    Осталось_комплектов: remaining,
    Узкое_место:       bottleneckLength,
    Прогресс_процентов: progressPct,
    Что_сделать_сейчас: whatToDo,
    Длины:             lengths
  };
}

// ------------------------------------------------------------------

/**
 * Возвращает список действий, которые дадут +1 комплект.
 * Нужно подтянуть все «узкие» позиции до minKits+1.
 */
function calcWhatToDo(stock, spec, currentMin) {
  var actions = [];

  for (var i = 0; i < spec.length; i++) {
    var item = spec[i];
    if (!item.Активна) continue;

    var len = Number(item.Длина_мм);
    var qpc = Number(item.Количество_на_комплект);
    var cur = Number(stock[len] || 0);
    var kits = Math.floor(cur / qpc);

    if (kits === currentMin) {
      var remainder   = cur % qpc;
      var neededForNext = (remainder === 0) ? qpc : qpc - remainder;

      if (cur === 0) neededForNext = qpc;

      actions.push({
        Длина_мм:        len,
        Нужно_сделать:   neededForNext,
        Текущий_остаток: cur,
        Описание:        'Сделай ещё ' + neededForNext + ' шт → будет +1 комплект'
      });
    }
  }

  return actions;
}

// ------------------------------------------------------------------

/**
 * Принимает массив записей производства за период и возвращает
 * агрегированный остаток (сумму) по каждой длине.
 */
function aggregateProduction(prodRows) {
  var agg = {};
  for (var i = 0; i < prodRows.length; i++) {
    var r = prodRows[i];
    var len = Number(r.Длина_мм);
    agg[len] = (agg[len] || 0) + Number(r.Количество_сделано);
  }
  return agg;
}

// ------------------------------------------------------------------

/**
 * Строит сводку по сотрудникам: кто сколько сделал за день.
 */
function buildEmployeeSummary(prodRows) {
  var emp = {};
  for (var i = 0; i < prodRows.length; i++) {
    var r = prodRows[i];
    var key = r.Сотрудник || r.Telegram_id || 'Неизвестно';
    if (!emp[key]) {
      emp[key] = { ФИО: key, Всего_штук: 0, Позиций: 0, Длины: {} };
    }
    emp[key].Всего_штук += Number(r.Количество_сделано);
    emp[key].Позиций    += 1;
    var L = Number(r.Длина_мм);
    emp[key].Длины[L]   = (emp[key].Длины[L] || 0) + Number(r.Количество_сделано);
  }

  var result = [];
  for (var name in emp) {
    result.push(emp[name]);
  }
  result.sort(function (a, b) { return b.Всего_штук - a.Всего_штук; });
  return result;
}

// ------------------------------------------------------------------

/**
 * Возвращает дату в формате YYYY-MM-DD по московскому времени.
 */
function getMoscowDate(d) {
  var dt = d || new Date();
  // GAS выполняется в UTC, сдвигаем на +3
  var msk = new Date(dt.getTime() + 3 * 60 * 60 * 1000);
  var y   = msk.getUTCFullYear();
  var m   = String(msk.getUTCMonth() + 1).padStart(2, '0');
  var day = String(msk.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * Возвращает дату-время в формате ISO по московскому времени.
 */
function getMoscowDateTime(d) {
  var dt = d || new Date();
  var msk = new Date(dt.getTime() + 3 * 60 * 60 * 1000);
  return msk.toISOString().replace('T', ' ').substring(0, 19);
}
