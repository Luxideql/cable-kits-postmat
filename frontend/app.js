// ==========================================
// ГЛАВНЫЙ КОНТРОЛЛЕР ПРИЛОЖЕНИЯ
// app.js — инициализация, логика, события
// ==========================================

var App = (function () {

  var _refreshTimer = null;
  var REFRESH_INTERVAL_MS = 60 * 1000; // авто-обновление каждые 60 сек

  // ------------------------------------------------------------------
  // Личный план — хранится в localStorage по ключу "myplan_ДАТА_TGID"
  // ------------------------------------------------------------------

  function _planKey() {
    var now = new Date();
    var d   = now.getFullYear()
      + '-' + String(now.getMonth() + 1).padStart(2, '0')
      + '-' + String(now.getDate()).padStart(2, '0');
    return 'myplan_' + d + '_' + (TG.getUserId() || 'anon');
  }

  function _loadSavedPlan() {
    try { return Number(localStorage.getItem(_planKey())) || null; } catch (e) { return null; }
  }

  function _savePlan(qty) {
    try { localStorage.setItem(_planKey(), String(qty)); } catch (e) {}
  }

  // ------------------------------------------------------------------
  // Инициализация
  // ------------------------------------------------------------------

  /**
   * Точка входа. Вызывается из index.html при DOMContentLoaded.
   */
  function init() {
    console.log('[App] Инициализация...');

    // 1. Инициализируем Telegram SDK
    TG.init();

    // 2. Подписываемся на изменения стейта → перерисовываем UI
    AppState.subscribe(function (state) {
      _render(state);
    });

    // 3. Проверяем, есть ли сохранённый URL GAS
    var gasUrl = localStorage.getItem('gas_url');
    if (gasUrl) API.setGasUrl(gasUrl);

    // 4. Показываем загрузку
    UI.showLoader('Подключение...');

    // 5. Загружаем данные
    _bootstrap();
  }

  // ------------------------------------------------------------------

  /**
   * Начальная загрузка данных.
   */
  function _bootstrap() {
    var tgId     = TG.getUserId();
    var tgName   = TG.getDisplayName();
    var tgUser   = TG.getUser();
    var username = TG.getUsername();

    AppState.set({ tgUser: tgUser });

    // Проверяем доступность сервера
    API.ping()
      .then(function (res) {
        console.log('[App] Сервер доступен. Версия:', res.version);
        return API.getEmployee(tgId, tgName, username);
      })
      .then(function (res) {
        var emp = res.employee || res;
        console.log('[App] Сотрудник:', emp);
        AppState.set({ employee: emp });
        return _loadReadiness();
      })
      .then(function () {
        UI.hideLoader();
        var saved = _loadSavedPlan();
        if (saved) {
          AppState.set({ personalPlan: saved });
          _setTab('dashboard');
        } else {
          _showWelcomeScreen();
        }
        _startAutoRefresh();
        console.log('[App] Готово.');
      })
      .catch(function (err) {
        console.error('[App] Ошибка инициализации:', err);
        UI.hideLoader();

        // Если URL не настроен — показываем конфиг
        if (API.getGasUrl().indexOf('YOUR_SCRIPT_ID') !== -1) {
          UI.renderConfigPanel();
        } else {
          UI.showError('Ошибка подключения: ' + err.message + '. Проверьте интернет.');
          TG.hapticError();
        }
      });
  }

  // ------------------------------------------------------------------

  /**
   * Загружает расчёт готовности комплектов.
   */
  function _loadReadiness() {
    return API.getKitReadiness()
      .then(function (data) {
        AppState.set({ readiness: data, plan: data.plan_record, error: null });
        return data;
      })
      .catch(function (err) {
        console.error('[App] Ошибка getKitReadiness:', err);
        AppState.set({ error: err.message });
        throw err;
      });
  }

  // ------------------------------------------------------------------
  // Экран приветствия и выбора плана
  // ------------------------------------------------------------------

  function _showWelcomeScreen() {
    var emp  = AppState.get().employee;
    var name = emp ? emp.fio : 'Сотрудник';
    UI.renderWelcomeScreen(name, 20, AppState.get().readiness);
  }

  /** Пользователь нажал «Приступить к работе» */
  function startWork() {
    var inp = document.getElementById('welcome-plan-qty');
    var qty = inp ? Math.max(1, parseInt(inp.value, 10) || 20) : 20;
    AppState.set({ personalPlan: qty });
    _savePlan(qty);
    var screen = document.getElementById('welcome-screen');
    if (screen) screen.classList.add('hidden');
    _setTab('dashboard');
    TG.hapticSuccess();
  }

  /** Кнопки −/+ на экране приветствия */
  function adjustPersonalPlan(delta) {
    var inp = document.getElementById('welcome-plan-qty');
    if (!inp) return;
    var val = Math.max(1, (parseInt(inp.value, 10) || 20) + delta);
    inp.value = val;
    UI.renderWelcomeNeeds(val, AppState.get().readiness);
    TG.haptic('light');
  }

  /** Пользователь вручную изменил число в поле */
  function onPlanInput(val) {
    var qty = Math.max(1, parseInt(val, 10) || 20);
    UI.renderWelcomeNeeds(qty, AppState.get().readiness);
  }

  /** Повторный выбор плана из дашборда */
  function changePlan() {
    _showWelcomeScreen();
    TG.haptic('light');
  }

  // ------------------------------------------------------------------
  // Авто-обновление
  // ------------------------------------------------------------------

  function _startAutoRefresh() {
    if (_refreshTimer) clearInterval(_refreshTimer);
    _refreshTimer = setInterval(function () {
      console.log('[App] Авто-обновление...');
      _loadReadiness().catch(function () { /* тихая ошибка при авто-обновлении */ });
    }, REFRESH_INTERVAL_MS);
  }

  function _stopAutoRefresh() {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  }

  // ------------------------------------------------------------------
  // Рендеринг
  // ------------------------------------------------------------------

  function _render(state) {
    var tab = state.activeTab;
    var mgr = AppState.isManager();

    UI.renderHeader(state);
    UI.renderTabs(tab, mgr);

    switch (tab) {
      case 'dashboard': UI.renderDashboard(state);                  break;
      case 'list':      UI.renderPriorityList(state);               break;
      case 'add':       UI.renderAddForm(state);                    break;
      case 'manager':   _loadManagerDashboard();                    break;
    }
  }

  // ------------------------------------------------------------------
  // Навигация
  // ------------------------------------------------------------------

  function _setTab(tab) {
    AppState.set({ activeTab: tab });
    TG.haptic('light');

    // Для вкладки «Список» всегда обновляем данные
    if (tab === 'list' && !AppState.get().readiness) {
      _loadReadiness();
    }
  }

  // Публичный метод для onclick в HTML
  function setTab(tab) { _setTab(tab); }

  // ------------------------------------------------------------------
  // Форма добавления производства
  // ------------------------------------------------------------------

  /**
   * Открывает форму добавления с предвыбранной длиной.
   */
  function openAddForm(lengthMm) {
    AppState.set({ selectedLength: lengthMm || null, activeTab: 'add' });
    TG.haptic('light');

    // Прокручиваем к форме
    setTimeout(function () {
      var sel = document.getElementById('form-length');
      if (sel && lengthMm) {
        sel.value = String(lengthMm);
      }
      var qty = document.getElementById('form-qty');
      if (qty) qty.focus();
    }, 100);
  }

  /**
   * Обработчик смены длины в селекте.
   */
  function onLengthChange(val) {
    AppState.set({ selectedLength: val || null });
  }

  /**
   * Устанавливает значение в поле количества.
   */
  function setQty(qty) {
    var inp = document.getElementById('form-qty');
    if (inp) inp.value = qty;
    TG.haptic('light');
  }

  /**
   * Отправляет форму производства.
   */
  function submitAddForm() {
    var lenEl = document.getElementById('form-length');
    var qtyEl = document.getElementById('form-qty');
    var cmtEl = document.getElementById('form-comment');

    if (!lenEl || !qtyEl) return;

    var lengthMm = Number(lenEl.value);
    var qty      = Number(qtyEl.value);
    var comment  = cmtEl ? cmtEl.value.trim() : '';

    if (!lengthMm) {
      UI.showToast('Выберите длину', 'error');
      TG.hapticError();
      return;
    }
    if (!qty || qty <= 0) {
      UI.showToast('Введите количество > 0', 'error');
      TG.hapticError();
      return;
    }

    var tgId     = TG.getUserId();
    var kitsBefore = AppState.getReadyKits();

    AppState.set({ loading: true });
    UI.showLoader('Сохраняю...');
    _stopAutoRefresh();

    API.addProduction(tgId, lengthMm, qty, comment, kitsBefore)
      .then(function (res) {
        UI.hideLoader();
        AppState.set({
          loading:    false,
          readiness:  res.readiness,
          lastAction: { message: res.message, delta: res.delta_kits }
        });

        // Очищаем форму
        if (qtyEl) qtyEl.value = '';
        if (cmtEl) cmtEl.value = '';

        UI.showResultModal(res.message, res.delta_kits);
        TG.hapticSuccess();

        // Переходим на дашборд
        setTimeout(function () {
          _setTab('dashboard');
        }, 800);

        _startAutoRefresh();
      })
      .catch(function (err) {
        UI.hideLoader();
        AppState.set({ loading: false });
        UI.showToast('Ошибка: ' + err.message, 'error', 5000);
        TG.hapticError();
        _startAutoRefresh();
      });
  }

  // ------------------------------------------------------------------
  // Менеджер
  // ------------------------------------------------------------------

  function _loadManagerDashboard() {
    var tgId = TG.getUserId();
    UI.showLoader('Загружаю дашборд...');

    API.getManagerDashboard(tgId)
      .then(function (data) {
        UI.hideLoader();
        UI.renderManagerDashboard(data);
      })
      .catch(function (err) {
        UI.hideLoader();
        UI.showError('Ошибка загрузки дашборда: ' + err.message);
      });
  }

  // ------------------------------------------------------------------
  // Ручное обновление
  // ------------------------------------------------------------------

  function refresh() {
    TG.haptic('light');
    UI.showLoader('Обновление...');
    _loadReadiness()
      .then(function () {
        UI.hideLoader();
        UI.showToast('Обновлено', 'success', 2000);
      })
      .catch(function (err) {
        UI.hideLoader();
        UI.showToast('Ошибка обновления: ' + err.message, 'error');
      });
  }

  // ------------------------------------------------------------------
  // Конфигурация
  // ------------------------------------------------------------------

  function saveConfig() {
    var urlEl = document.getElementById('config-url');
    if (!urlEl) return;
    var url = urlEl.value.trim();
    if (!url) {
      UI.showToast('Введите URL', 'error');
      return;
    }
    API.setGasUrl(url);
    var panel = document.getElementById('config-panel');
    if (panel) panel.classList.add('hidden');
    UI.showToast('Сохранено. Подключение...', 'info');
    UI.showLoader('Подключение...');
    _bootstrap();
  }

  // ------------------------------------------------------------------
  // Установка плана (для менеджера)
  // ------------------------------------------------------------------

  function setPlan(planQty) {
    if (!AppState.isManager()) {
      UI.showToast('Недостаточно прав', 'error');
      return;
    }

    var tgId = TG.getUserId();
    API.setPlan(tgId, planQty, null, null)
      .then(function (res) {
        UI.showToast('План установлен: ' + planQty, 'success');
        return _loadReadiness();
      })
      .catch(function (err) {
        UI.showToast('Ошибка: ' + err.message, 'error');
      });
  }

  // ------------------------------------------------------------------
  // Экспорт публичных методов
  // ------------------------------------------------------------------

  return {
    init:                init,
    setTab:              setTab,
    openAddForm:         openAddForm,
    onLengthChange:      onLengthChange,
    setQty:              setQty,
    submitAddForm:       submitAddForm,
    refresh:             refresh,
    saveConfig:          saveConfig,
    setPlan:             setPlan,
    startWork:           startWork,
    adjustPersonalPlan:  adjustPersonalPlan,
    onPlanInput:         onPlanInput,
    changePlan:          changePlan
  };

})();

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
  App.init();
});
