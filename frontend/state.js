// ==========================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// state.js
// ==========================================

var AppState = (function () {

  var _state = {
    // Telegram
    tgUser:     null,   // объект Telegram.WebApp.initDataUnsafe.user

    // Сотрудник (из GAS)
    employee:   null,   // { id, telegram_id, fio, role, active }

    // Готовность комплектов
    readiness:  null,   // полный ответ getKitReadiness

    // Текущий план
    plan:       null,   // { id, Дата, План_комплектов, ... }

    // Журнал за сегодня
    journal:    [],

    // UI
    activeTab:       'dashboard',   // 'dashboard' | 'list' | 'add' | 'manager'
    selectedLength:  null,          // выбранная длина в форме добавления
    loading:         false,
    error:           null,

    // Последнее действие-результат
    lastAction: null    // { message, delta_kits }
  };

  var _listeners = [];

  function get() {
    return _state;
  }

  function set(patch) {
    for (var k in patch) {
      _state[k] = patch[k];
    }
    _notify();
  }

  function subscribe(fn) {
    _listeners.push(fn);
    return function () {
      _listeners = _listeners.filter(function (l) { return l !== fn; });
    };
  }

  function _notify() {
    _listeners.forEach(function (fn) { fn(_state); });
  }

  // --- удобные геттеры ---

  function isManager() {
    var emp = _state.employee;
    if (!emp) return false;
    return ['мастер', 'руководитель', 'admin', 'менеджер'].indexOf(emp.role) !== -1;
  }

  function getReadyKits() {
    return _state.readiness ? (_state.readiness.Готово_комплектов || 0) : 0;
  }

  function getPlanKits() {
    return _state.readiness ? (_state.readiness.План_комплектов || 0) : 0;
  }

  function getBottleneck() {
    return _state.readiness ? _state.readiness.Узкое_место : null;
  }

  function getLengths() {
    return (_state.readiness && _state.readiness.Длины) ? _state.readiness.Длины : [];
  }

  function getWhatToDo() {
    return (_state.readiness && _state.readiness.Что_сделать_сейчас)
      ? _state.readiness.Что_сделать_сейчас
      : [];
  }

  return {
    get:          get,
    set:          set,
    subscribe:    subscribe,
    isManager:    isManager,
    getReadyKits: getReadyKits,
    getPlanKits:  getPlanKits,
    getBottleneck:getBottleneck,
    getLengths:   getLengths,
    getWhatToDo:  getWhatToDo
  };

})();
