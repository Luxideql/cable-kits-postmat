// ==========================================
// ГЛАВНЫЙ КОНТРОЛЛЕР ПРИЛОЖЕНИЯ
// app.js — инициализация, логика, события
// ==========================================

var App = (function () {

  var _refreshTimer = null;
  var REFRESH_INTERVAL_MS = 60 * 1000; // авто-обновление каждые 60 сек

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
        _setTab('dashboard');
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
    init:           init,
    setTab:         setTab,
    openAddForm:    openAddForm,
    onLengthChange: onLengthChange,
    setQty:         setQty,
    submitAddForm:  submitAddForm,
    refresh:        refresh,
    saveConfig:     saveConfig,
    setPlan:        setPlan
  };

})();

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
  App.init();
});
