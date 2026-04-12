// ==========================================
// UI РЕНДЕРИНГ КОМПОНЕНТОВ
// ui.js — чистые функции, без побочных эффектов
// ==========================================

var UI = (function () {

  // ------------------------------------------------------------------
  // Утилиты
  // ------------------------------------------------------------------

  function el(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setHTML(id, html) {
    var e = el(id);
    if (e) e.innerHTML = html;
  }

  function setText(id, text) {
    var e = el(id);
    if (e) e.textContent = text;
  }

  function show(id) {
    var e = el(id);
    if (e) e.classList.remove('hidden');
  }

  function hide(id) {
    var e = el(id);
    if (e) e.classList.add('hidden');
  }

  function setClass(id, cls, active) {
    var e = el(id);
    if (!e) return;
    if (active) e.classList.add(cls);
    else        e.classList.remove(cls);
  }

  /**
   * Русский plural.
   * plural(3, 'комплект', 'комплекта', 'комплектов') → 'комплекта'
   */
  function plural(n, f1, f2, f5) {
    var n10  = Math.abs(n) % 10;
    var n100 = Math.abs(n) % 100;
    if (n100 >= 11 && n100 <= 19) return f5;
    if (n10 === 1) return f1;
    if (n10 >= 2 && n10 <= 4) return f2;
    return f5;
  }

  /**
   * Форматирует дату YYYY-MM-DD → DD.MM.YYYY
   */
  function formatDate(d) {
    if (!d) return '';
    var s = String(d).substring(0, 10);
    var parts = s.split('-');
    if (parts.length !== 3) return s;
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  /**
   * Сегодняшняя дата в формате DD.MM.YYYY
   */
  function todayFormatted() {
    var now = new Date();
    var d   = String(now.getDate()).padStart(2, '0');
    var m   = String(now.getMonth() + 1).padStart(2, '0');
    var y   = now.getFullYear();
    return d + '.' + m + '.' + y;
  }

  // ------------------------------------------------------------------
  // Экран загрузки
  // ------------------------------------------------------------------

  function showLoader(msg) {
    var wrap = el('loader-wrap');
    if (wrap) {
      wrap.innerHTML = '<div class="loader-spinner"></div><p>' + (msg || 'Загрузка...') + '</p>';
      wrap.classList.remove('hidden');
    }
  }

  function hideLoader() {
    var wrap = el('loader-wrap');
    if (wrap) wrap.classList.add('hidden');
  }

  // ------------------------------------------------------------------
  // Toast-уведомление
  // ------------------------------------------------------------------

  var _toastTimer = null;

  function showToast(msg, type, durationMs) {
    var toast = el('toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.className   = 'toast toast--' + (type || 'info') + ' toast--visible';

    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      toast.classList.remove('toast--visible');
    }, durationMs || 3000);
  }

  // ------------------------------------------------------------------
  // Шапка (header)
  // ------------------------------------------------------------------

  function renderHeader(state) {
    var emp    = state.employee;
    var r      = state.readiness;
    var myPlan = state.personalPlan;

    setText('header-name', emp ? emp.fio : '...');
    setText('header-date', todayFormatted());

    if (r) {
      var ready = r.Готово_комплектов || 0;

      // Используем личный план если установлен, иначе менеджерский
      var plan, left, pct;
      if (myPlan) {
        plan = myPlan;
        left = Math.max(0, plan - ready);
        pct  = plan > 0 ? Math.min(100, Math.round(ready / plan * 100)) : 0;
        setText('header-plan', 'Мой план: ' + plan);
      } else {
        plan = r.План_комплектов || 0;
        left = r.Осталось_комплектов || Math.max(0, plan - ready);
        pct  = r.Прогресс_процентов || 0;
        setText('header-plan', 'Общий план: ' + plan);
      }

      setText('header-ready', String(ready));
      setText('header-left',  String(left));

      var bar = el('progress-bar-fill');
      if (bar) bar.style.width = pct + '%';

      var pctEl = el('progress-pct');
      if (pctEl) pctEl.textContent = pct + '%';
    }
  }

  // ------------------------------------------------------------------
  // Dashboard (главный экран)
  // ------------------------------------------------------------------

  function renderDashboard(state) {
    var r      = state.readiness;
    var myPlan = state.personalPlan;
    if (!r) return;

    var ready = r.Готово_комплектов || 0;

    // Прогресс по личному плану (если задан) или по менеджерскому
    var plan, left, pct;
    if (myPlan) {
      plan = myPlan;
      left = Math.max(0, plan - ready);
      pct  = plan > 0 ? Math.min(100, Math.round(ready / plan * 100)) : 0;
    } else {
      plan = r.План_комплектов || 0;
      left = r.Осталось_комплектов || Math.max(0, plan - ready);
      pct  = r.Прогресс_процентов  || 0;
    }

    var bn   = r.Узкое_место;
    var todo = r.Что_сделать_сейчас || [];

    // --- Большой счётчик ---
    setText('dash-ready', String(ready));
    setText('dash-plan',  'из ' + plan + (myPlan ? ' (мой план)' : ''));
    setText('dash-left',  left > 0
      ? ('Осталось: ' + left + ' ' + plural(left, 'комплект', 'комплекта', 'комплектов'))
      : 'План выполнен! 🎉');

    setClass('dash-left', 'dash-left--done', left === 0);

    // Прогресс-бар
    var fill = el('dash-progress-fill');
    if (fill) fill.style.width = pct + '%';
    setText('dash-pct', pct + '%');

    // --- Узкое место ---
    var bnBlock = el('dash-bottleneck');
    if (bnBlock) {
      if (bn) {
        bnBlock.classList.remove('hidden');
        setText('dash-bn-length', bn + ' мм');

        // Подсказка: что сделать
        var todoHtml = '';
        if (todo.length > 0) {
          todoHtml = todo.map(function (t) {
            return '<div class="bn-action">'
              + '<span class="bn-action__len">' + t.Длина_мм + ' мм</span>'
              + '<span class="bn-action__desc">' + t.Описание + '</span>'
              + '</div>';
          }).join('');
        }
        setHTML('dash-bn-actions', todoHtml);
      } else {
        bnBlock.classList.add('hidden');
      }
    }

    // --- Кнопка изменения плана ---
    var changePlanBtn = el('dash-change-plan');
    if (changePlanBtn) {
      changePlanBtn.style.display = myPlan ? 'inline-block' : 'none';
    }

    // --- Что делать сейчас (карточка действия) ---
    renderActionCard(state);
  }

  /**
   * Карточка «Что делать прямо сейчас»
   */
  function renderActionCard(state) {
    var r    = state.readiness;
    var wrap = el('dash-action-card');
    if (!wrap || !r) return;

    var todo   = r.Что_сделать_сейчас || [];
    var left   = r.Осталось_комплектов || 0;
    var lengths = r.Длины || [];

    if (left === 0) {
      wrap.innerHTML = '<div class="action-card action-card--done">'
        + '<div class="action-card__icon">✅</div>'
        + '<div class="action-card__title">Дневной план выполнен!</div>'
        + '<div class="action-card__sub">Отличная работа 🎉</div>'
        + '</div>';
      return;
    }

    if (todo.length === 0) {
      wrap.innerHTML = '<div class="action-card action-card--ok">'
        + '<div class="action-card__icon">✔</div>'
        + '<div class="action-card__title">Все позиции в норме</div>'
        + '</div>';
      return;
    }

    var mainTodo = todo[0];
    var html = '<div class="action-card action-card--urgent">'
      + '<div class="action-card__badge">СДЕЛАЙ СЕЙЧАС</div>'
      + '<div class="action-card__length">' + mainTodo.Длина_мм + ' мм</div>'
      + '<div class="action-card__qty">' + mainTodo.Нужно_сделать + ' шт</div>'
      + '<div class="action-card__desc">' + mainTodo.Описание + '</div>'
      + '<button class="action-card__btn btn btn--primary" onclick="App.openAddForm(' + mainTodo.Длина_мм + ')">'
      + '+ Внести сейчас</button>'
      + '</div>';

    if (todo.length > 1) {
      html += '<div class="action-card__more">+ ещё ' + (todo.length - 1) + ' позиций требуют внимания</div>';
    }

    wrap.innerHTML = html;
  }

  // ------------------------------------------------------------------
  // Список приоритетов (вкладка «Список»)
  // ------------------------------------------------------------------

  function renderPriorityList(state) {
    var r    = state.readiness;
    var wrap = el('list-wrap');
    if (!wrap || !r) return;

    var lengths  = r.Длины || [];
    var ready    = r.Готово_комплектов || 0;

    if (lengths.length === 0) {
      wrap.innerHTML = '<div class="empty-state">Нет данных</div>';
      return;
    }

    var html = '';

    lengths.forEach(function (L) {
      var cls    = 'card card--' + priorityClass(L.Приоритет, L.Узкое_место);
      var badge  = priorityBadge(L.Приоритет, L.Узкое_место);
      var pct    = L.Нужно_на_план > 0
                 ? Math.min(100, Math.round((L.Остаток / L.Нужно_на_план) * 100))
                 : 100;

      html += '<div class="' + cls + '">'
        + '<div class="card__header">'
        +   '<div class="card__length">' + L.Длина_мм + ' мм</div>'
        +   badge
        + '</div>'

        + '<div class="card__stats">'
        +   '<div class="card__stat">'
        +     '<div class="card__stat-val">' + L.Остаток + '</div>'
        +     '<div class="card__stat-lbl">Остаток</div>'
        +   '</div>'
        +   '<div class="card__stat">'
        +     '<div class="card__stat-val">' + L.Хватает_на_комплектов + '</div>'
        +     '<div class="card__stat-lbl">Хватает</div>'
        +   '</div>'
        +   '<div class="card__stat">'
        +     '<div class="card__stat-val card__stat-val--' + (L.Дефицит > 0 ? 'bad' : 'good') + '">'
        +       (L.Дефицит > 0 ? '-' + L.Дефицит : '✓')
        +     '</div>'
        +     '<div class="card__stat-lbl">Дефицит</div>'
        +   '</div>'
        +   '<div class="card__stat">'
        +     '<div class="card__stat-val">' + L.Количество_на_комплект + '</div>'
        +     '<div class="card__stat-lbl">На 1 компл.</div>'
        +   '</div>'
        + '</div>'

        + '<div class="card__progress">'
        +   '<div class="card__progress-fill" style="width:' + pct + '%"></div>'
        + '</div>'
        + '<div class="card__progress-label">' + pct + '% от плана</div>'

        + (L.Нужно_для_следующего > 0 && L.Узкое_место
          ? '<div class="card__hint">👉 Сделай ещё ' + L.Нужно_для_следующего + ' шт → +1 комплект</div>'
          : '')

        + '<button class="btn btn--outline card__add-btn" '
        +   'onclick="App.openAddForm(' + L.Длина_мм + ')">'
        +   '+ Внести</button>'
        + '</div>';
    });

    wrap.innerHTML = html;
  }

  function priorityClass(priority, isBottleneck) {
    if (isBottleneck) return 'red';
    switch (priority) {
      case 'высокий': return 'red';
      case 'средний': return 'yellow';
      default:        return 'green';
    }
  }

  function priorityBadge(priority, isBottleneck) {
    if (isBottleneck) {
      return '<div class="badge badge--red">🔴 Узкое место</div>';
    }
    switch (priority) {
      case 'высокий': return '<div class="badge badge--red">высокий</div>';
      case 'средний': return '<div class="badge badge--yellow">средний</div>';
      default:        return '<div class="badge badge--green">норма</div>';
    }
  }

  // ------------------------------------------------------------------
  // Форма добавления производства
  // ------------------------------------------------------------------

  function renderAddForm(state) {
    var r        = state.readiness;
    var selLen   = state.selectedLength;
    var lengths  = r ? (r.Длины || []) : [];
    var wrap     = el('add-form-wrap');
    if (!wrap) return;

    // Строим список длин для селекта
    var optHtml = '<option value="">— выберите длину —</option>';
    lengths.forEach(function (L) {
      var selected = (selLen && Number(L.Длина_мм) === Number(selLen)) ? ' selected' : '';
      var info     = ' (ост: ' + L.Остаток + ', дефицит: ' + L.Дефицит + ')';
      optHtml += '<option value="' + L.Длина_мм + '"' + selected + '>'
               + L.Длина_мм + ' мм' + info + '</option>';
    });

    // Быстрые кнопки для выбранной длины
    var quickHtml = '';
    if (selLen && r) {
      var selData = lengths.find(function (L) { return Number(L.Длина_мм) === Number(selLen); });
      if (selData) {
        var needed = selData.Нужно_для_следующего;
        quickHtml = '<div class="quick-btns">'
          + '<button class="btn btn--quick" onclick="App.setQty(1)">+1</button>'
          + '<button class="btn btn--quick" onclick="App.setQty(5)">+5</button>'
          + '<button class="btn btn--quick" onclick="App.setQty(10)">+10</button>'
          + (needed > 0
            ? '<button class="btn btn--quick btn--quick-needed" onclick="App.setQty(' + needed + ')">'
              + '+' + needed + ' (нужно)</button>'
            : '')
          + '</div>'
          + '<div class="quick-hint">Нужно для +1 комплекта: '
          + (needed > 0 ? needed + ' шт' : 'уже хватает')
          + '</div>';
      }
    }

    wrap.innerHTML =
      '<div class="form-group">'
      + '<label class="form-label">Длина</label>'
      + '<select class="form-select" id="form-length" onchange="App.onLengthChange(this.value)">'
      + optHtml
      + '</select>'
      + '</div>'

      + quickHtml

      + '<div class="form-group">'
      + '<label class="form-label">Количество (шт)</label>'
      + '<input type="number" class="form-input" id="form-qty" min="1" placeholder="0">'
      + '</div>'

      + '<div class="form-group">'
      + '<label class="form-label">Комментарий (необязательно)</label>'
      + '<input type="text" class="form-input" id="form-comment" placeholder="...">'
      + '</div>';
  }

  // ------------------------------------------------------------------
  // Дашборд менеджера
  // ------------------------------------------------------------------

  function renderManagerDashboard(data) {
    var wrap = el('manager-wrap');
    if (!wrap || !data) return;

    var rs   = data.readiness_summary || {};
    var emps = data.employee_summary  || [];
    var prbl = data.problem_positions || [];

    var html = '';

    // --- Сводка ---
    html += '<div class="mgr-section">'
      + '<div class="mgr-title">Итог дня</div>'
      + '<div class="mgr-stats">'
      +   '<div class="mgr-stat"><div class="mgr-stat__val">' + (rs.Готово || 0) + '</div><div class="mgr-stat__lbl">Готово</div></div>'
      +   '<div class="mgr-stat"><div class="mgr-stat__val">' + (rs.План   || 0) + '</div><div class="mgr-stat__lbl">План</div></div>'
      +   '<div class="mgr-stat"><div class="mgr-stat__val">' + (rs.Осталось || 0) + '</div><div class="mgr-stat__lbl">Осталось</div></div>'
      +   '<div class="mgr-stat"><div class="mgr-stat__val">' + (rs.Прогресс || 0) + '%</div><div class="mgr-stat__lbl">Прогресс</div></div>'
      + '</div>'
      + (rs.Узкое_место ? '<div class="mgr-bottleneck">Узкое место: <strong>' + rs.Узкое_место + ' мм</strong></div>' : '')
      + '</div>';

    // --- Проблемные позиции ---
    if (prbl.length > 0) {
      html += '<div class="mgr-section">'
        + '<div class="mgr-title mgr-title--red">⚠️ Проблемные позиции</div>';
      prbl.forEach(function (L) {
        html += '<div class="mgr-problem">'
          + '<span class="mgr-problem__len">' + L.Длина_мм + ' мм</span>'
          + '<span class="mgr-problem__info">Дефицит: ' + L.Дефицит + ' шт, хватает на ' + L.Хватает_на_комплектов + ' компл.</span>'
          + '</div>';
      });
      html += '</div>';
    }

    // --- Сотрудники ---
    if (emps.length > 0) {
      html += '<div class="mgr-section">'
        + '<div class="mgr-title">Сотрудники</div>';
      emps.forEach(function (e) {
        html += '<div class="mgr-emp">'
          + '<div class="mgr-emp__name">' + e.ФИО + '</div>'
          + '<div class="mgr-emp__stats">'
          +   'Штук: <strong>' + e.Всего_штук + '</strong>, '
          +   'Позиций: <strong>' + e.Позиций + '</strong>'
          + '</div>'
          + '</div>';
      });
      html += '</div>';
    }

    wrap.innerHTML = html;
  }

  // ------------------------------------------------------------------
  // Навигация (нижние табы)
  // ------------------------------------------------------------------

  function renderTabs(activeTab, isManager) {
    var tabs = ['dashboard', 'list', 'add'];
    if (isManager) tabs.push('manager');

    tabs.forEach(function (tab) {
      var btn = el('tab-' + tab);
      if (btn) {
        if (tab === activeTab) btn.classList.add('tab--active');
        else                   btn.classList.remove('tab--active');
      }
    });

    // Показываем/скрываем экраны
    ['dashboard', 'list', 'add', 'manager'].forEach(function (tab) {
      var screen = el('screen-' + tab);
      if (screen) {
        if (tab === activeTab) screen.classList.remove('hidden');
        else                   screen.classList.add('hidden');
      }
    });

    // Показываем/скрываем таб менеджера
    var managerTab = el('tab-manager');
    if (managerTab) {
      if (isManager) managerTab.classList.remove('hidden');
      else           managerTab.classList.add('hidden');
    }
  }

  // ------------------------------------------------------------------
  // Модальное окно результата
  // ------------------------------------------------------------------

  function showResultModal(msg, delta) {
    var modal = el('result-modal');
    if (!modal) return;

    setText('result-modal-msg', msg);

    var icon = el('result-modal-icon');
    if (icon) {
      if (delta && delta > 0) {
        icon.textContent = '🎉';
        icon.className   = 'result-icon result-icon--success';
      } else {
        icon.textContent = '✓';
        icon.className   = 'result-icon result-icon--info';
      }
    }

    modal.classList.remove('hidden');
    modal.classList.add('modal--visible');

    setTimeout(function () {
      hideResultModal();
    }, 3500);
  }

  function hideResultModal() {
    var modal = el('result-modal');
    if (modal) {
      modal.classList.remove('modal--visible');
      setTimeout(function () { modal.classList.add('hidden'); }, 300);
    }
  }

  // ------------------------------------------------------------------
  // Inline error
  // ------------------------------------------------------------------

  function showError(msg) {
    var err = el('global-error');
    if (err) {
      err.textContent = msg;
      err.classList.remove('hidden');
    }
  }

  function hideError() {
    var err = el('global-error');
    if (err) err.classList.add('hidden');
  }

  // ------------------------------------------------------------------
  // Экран приветствия и выбора личного плана
  // ------------------------------------------------------------------

  function renderWelcomeScreen(name, defaultPlan, readiness) {
    var screen = el('welcome-screen');
    if (!screen) return;

    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Доброе утро' : (hour < 18 ? 'Добрый день' : 'Добрый вечер');

    screen.innerHTML =
      '<div class="welcome-card">'
      + '<div class="welcome-emoji">📦</div>'
      + '<div class="welcome-greeting">' + greeting + ', ' + escapeHtml(name) + '!</div>'
      + '<div class="welcome-subtitle">Сколько комплектов<br>планируешь сегодня?</div>'

      + '<div class="welcome-plan-row">'
      +   '<button class="plan-adj-btn" onclick="App.adjustPersonalPlan(-5)">−5</button>'
      +   '<button class="plan-adj-btn" onclick="App.adjustPersonalPlan(-1)">−</button>'
      +   '<input type="number" id="welcome-plan-qty" class="welcome-plan-input"'
      +     ' value="' + defaultPlan + '" min="1" max="999"'
      +     ' oninput="App.onPlanInput(this.value)">'
      +   '<button class="plan-adj-btn" onclick="App.adjustPersonalPlan(1)">+</button>'
      +   '<button class="plan-adj-btn" onclick="App.adjustPersonalPlan(5)">+5</button>'
      + '</div>'

      + '<div id="welcome-needs"></div>'

      + '<button class="btn btn--primary welcome-start-btn" onclick="App.startWork()">'
      +   'Приступить к работе →'
      + '</button>'
      + '</div>';

    screen.classList.remove('hidden');
    renderWelcomeNeeds(defaultPlan, readiness);
  }

  /**
   * Рендерит список «что нужно приготовить» для выбранного количества комплектов.
   * Расчёт: нужно = qty_per_kit × plan − stock (≥ 0)
   */
  function renderWelcomeNeeds(planQty, readiness) {
    var wrap = el('welcome-needs');
    if (!wrap) return;

    if (!readiness || !readiness.Длины || readiness.Длины.length === 0) {
      wrap.innerHTML = '';
      return;
    }

    var n = Math.max(1, parseInt(planQty, 10) || 20);
    var lengths = readiness.Длины;

    var html = '<div class="welcome-needs-title">Нужно приготовить для ' + n + ' ' + plural(n, 'комплекта', 'комплектов', 'комплектов') + ':</div>'
      + '<div class="welcome-needs-list">';

    lengths.forEach(function (L) {
      var totalNeeded = L.Количество_на_комплект * n;
      var deficit     = Math.max(0, totalNeeded - L.Остаток);
      var cls = deficit > 0 ? 'need-row need-row--deficit' : 'need-row need-row--ok';
      var lenCls = deficit > 0 ? 'need-row__len need-row__len--red' : 'need-row__len need-row__len--green';

      html += '<div class="' + cls + '">'
        + '<div class="' + lenCls + '">' + L.Длина_мм + ' мм'
        +   '<span class="need-row__spec"> ×' + L.Количество_на_комплект + '</span>'
        + '</div>'
        + '<div class="need-row__right">'
        +   (deficit > 0
             ? '<span class="need-row__need">нужно: ' + deficit + ' шт</span>'
               + '<span class="need-row__stock">есть: ' + L.Остаток + '</span>'
             : '<span class="need-row__ok">✓ есть (' + L.Остаток + ' шт)</span>')
        + '</div>'
        + '</div>';
    });

    html += '</div>';
    wrap.innerHTML = html;
  }

  // ------------------------------------------------------------------
  // Конфиг-панель (для первоначальной настройки)
  // ------------------------------------------------------------------

  function renderConfigPanel() {
    var wrap = el('config-panel');
    if (!wrap) return;

    var url = API.getGasUrl();
    wrap.innerHTML = '<div class="config-form">'
      + '<div class="config-title">⚙️ Настройка подключения</div>'
      + '<label class="form-label">URL GAS Web App</label>'
      + '<input class="form-input" id="config-url" type="url" value="' + url + '" '
      +   'placeholder="https://script.google.com/macros/s/.../exec">'
      + '<button class="btn btn--primary" style="margin-top:12px" onclick="App.saveConfig()">Сохранить</button>'
      + '</div>';
    wrap.classList.remove('hidden');
  }

  // ------------------------------------------------------------------
  // Экспорт
  // ------------------------------------------------------------------

  return {
    el:                   el,
    show:                 show,
    hide:                 hide,
    setHTML:              setHTML,
    setText:              setText,
    showLoader:           showLoader,
    hideLoader:           hideLoader,
    showToast:            showToast,
    renderHeader:         renderHeader,
    renderDashboard:      renderDashboard,
    renderPriorityList:   renderPriorityList,
    renderAddForm:        renderAddForm,
    renderManagerDashboard: renderManagerDashboard,
    renderTabs:           renderTabs,
    showResultModal:      showResultModal,
    hideResultModal:      hideResultModal,
    showError:            showError,
    hideError:            hideError,
    renderConfigPanel:    renderConfigPanel,
    renderWelcomeScreen:  renderWelcomeScreen,
    renderWelcomeNeeds:   renderWelcomeNeeds,
    todayFormatted:       todayFormatted,
    plural:               plural
  };

})();
