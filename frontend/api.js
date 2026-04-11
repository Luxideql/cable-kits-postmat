// ==========================================
// API CLIENT — вызовы GAS Web App
// api.js
// ==========================================

var API = (function () {

  // !! Замените на URL вашего задеплоенного GAS Web App !!
  var GAS_URL = window.GAS_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

  var TIMEOUT_MS = 15000;

  // ------------------------------------------------------------------
  // Базовый транспорт
  // ------------------------------------------------------------------

  /**
   * Выполняет GET-запрос к GAS.
   * Все параметры передаются как query string.
   *
   * @param {string} action
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  function call(action, params) {
    var p = Object.assign({}, params || {}, { action: action });
    var qs = Object.keys(p)
      .filter(function (k) { return p[k] !== null && p[k] !== undefined; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]); })
      .join('&');

    var url = GAS_URL + '?' + qs;

    return new Promise(function (resolve, reject) {
      var controller = null;
      var timer      = null;

      // AbortController для таймаута (если поддерживается)
      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timer = setTimeout(function () {
          controller.abort();
          reject(new Error('Timeout: сервер не ответил за ' + (TIMEOUT_MS / 1000) + ' сек'));
        }, TIMEOUT_MS);
      }

      fetch(url, {
        method: 'GET',
        signal: controller ? controller.signal : undefined
      })
        .then(function (res) {
          if (timer) clearTimeout(timer);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (data && data.success === false) {
            reject(new Error(data.error || 'Ошибка сервера'));
          } else {
            resolve(data);
          }
        })
        .catch(function (err) {
          if (timer) clearTimeout(timer);
          console.error('[API] ' + action + ' failed:', err);
          reject(err);
        });
    });
  }

  /**
   * Выполняет POST-запрос к GAS.
   * Параметры передаются в JSON-теле.
   */
  function post(action, params) {
    var body = Object.assign({}, params || {}, { action: action });

    return new Promise(function (resolve, reject) {
      var timer = null;
      var controller = null;

      if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timer = setTimeout(function () {
          controller.abort();
          reject(new Error('Timeout'));
        }, TIMEOUT_MS);
      }

      fetch(GAS_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },  // GAS требует text/plain, не application/json
        body:    JSON.stringify(body),
        signal:  controller ? controller.signal : undefined
      })
        .then(function (res) {
          if (timer) clearTimeout(timer);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (data && data.success === false) {
            reject(new Error(data.error || 'Ошибка сервера'));
          } else {
            resolve(data);
          }
        })
        .catch(function (err) {
          if (timer) clearTimeout(timer);
          reject(err);
        });
    });
  }

  // ------------------------------------------------------------------
  // Публичные методы
  // ------------------------------------------------------------------

  function ping() {
    return call('ping');
  }

  /**
   * Загружает данные сотрудника по telegram_id.
   * Если сотрудник не зарегистрирован — создаётся автоматически.
   */
  function getEmployee(telegramId, fio, username) {
    return call('getEmployeeByTelegramId', {
      telegram_id: telegramId,
      fio:         fio     || '',
      username:    username || ''
    });
  }

  /**
   * Возвращает спецификацию комплекта.
   */
  function getKitSpec() {
    return call('getKitSpec');
  }

  /**
   * Возвращает текущие остатки.
   */
  function getCurrentStock() {
    return call('getCurrentStock');
  }

  /**
   * Возвращает текущий план.
   */
  function getCurrentPlan() {
    return call('getCurrentPlan');
  }

  /**
   * ГЛАВНЫЙ МЕТОД: возвращает полный расчёт готовности комплектов.
   */
  function getKitReadiness() {
    return call('getKitReadiness');
  }

  /**
   * Возвращает список позиций с приоритетами.
   */
  function getPriorityList() {
    return call('getPriorityList');
  }

  /**
   * Добавляет запись производства и пересчитывает остатки.
   *
   * @param {string} telegramId
   * @param {number} lengthMm
   * @param {number} qty
   * @param {string} comment
   * @param {number} kitsBefore — текущее кол-во комплектов (для расчёта дельты)
   */
  function addProduction(telegramId, lengthMm, qty, comment, kitsBefore) {
    return post('addProductionLog', {
      telegram_id:  telegramId,
      length_mm:    lengthMm,
      qty:          qty,
      comment:      comment || '',
      kits_before:  kitsBefore !== undefined ? kitsBefore : ''
    });
  }

  /**
   * Возвращает журнал производства за дату.
   *
   * @param {string|null} date       — YYYY-MM-DD или null (сегодня)
   * @param {string|null} telegramId — фильтр по сотруднику
   */
  function getJournal(date, telegramId) {
    return call('getProductionJournal', {
      date:        date       || '',
      telegram_id: telegramId || ''
    });
  }

  /**
   * Дашборд для менеджера.
   */
  function getManagerDashboard(telegramId, date) {
    return call('getManagerDashboard', {
      telegram_id: telegramId,
      date:        date || ''
    });
  }

  /**
   * Устанавливает план (только менеджер).
   */
  function setPlan(telegramId, planQty, date, comment) {
    return post('setPlan', {
      telegram_id: telegramId,
      plan_qty:    planQty,
      date:        date    || '',
      comment:     comment || ''
    });
  }

  /**
   * Корректирует остаток вручную (только менеджер).
   */
  function setStock(telegramId, lengthMm, qty) {
    return post('setStock', {
      telegram_id: telegramId,
      length_mm:   lengthMm,
      qty:         qty
    });
  }

  /**
   * Изменяет URL сервера (для конфигурации).
   */
  function setGasUrl(url) {
    GAS_URL = url;
    try { localStorage.setItem('gas_url', url); } catch (e) { /* игнорируем */ }
  }

  /**
   * Возвращает текущий URL сервера.
   */
  function getGasUrl() {
    return GAS_URL;
  }

  // Восстанавливаем URL из localStorage
  (function () {
    try {
      var saved = localStorage.getItem('gas_url');
      if (saved) GAS_URL = saved;
    } catch (e) { /* игнорируем */ }
  })();

  return {
    ping:               ping,
    getEmployee:        getEmployee,
    getKitSpec:         getKitSpec,
    getCurrentStock:    getCurrentStock,
    getCurrentPlan:     getCurrentPlan,
    getKitReadiness:    getKitReadiness,
    getPriorityList:    getPriorityList,
    addProduction:      addProduction,
    getJournal:         getJournal,
    getManagerDashboard:getManagerDashboard,
    setPlan:            setPlan,
    setStock:           setStock,
    setGasUrl:          setGasUrl,
    getGasUrl:          getGasUrl
  };

})();
