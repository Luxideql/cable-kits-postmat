// ==========================================
// КАБЕЛЬНЫЕ КОМПЛЕКТЫ — планирование
// app.js
// ==========================================

(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) { tg.ready(); tg.expand(); }
})();

var _readiness   = null;
var _employees   = [];
var _assignments = [];

// ──────────────────────────────────────────
// Старт
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('hdr-date').value = _todayISO();

  document.getElementById('hdr-date').addEventListener('change', function () {
    _loadAll(false);
  });
  document.getElementById('btn-refresh').addEventListener('click', function () {
    _loadAll(true);
  });

  _loadAll(false);
});

function _getDate() {
  return document.getElementById('hdr-date').value || _todayISO();
}

// ──────────────────────────────────────────
// Загрузка
// ──────────────────────────────────────────
function _loadAll(showMsg) {
  _showLoader(true);
  var date = _getDate();

  Promise.all([
    API.getKitReadiness(),
    API.getEmployees(),
    API.getAssignments(date)
  ])
  .then(function (res) {
    _readiness   = res[0];
    _employees   = (res[1].employees || []).filter(function (e) { return e.active; });
    _assignments = res[2].assignments || [];
    _renderAll();
    _showLoader(false);
    _setLastUpd();
    if (showMsg) _toast('Обновлено', 'ok');
  })
  .catch(function (err) {
    _showLoader(false);
    _toast('Ошибка: ' + err.message, 'err');
  });
}

// ──────────────────────────────────────────
// Рендер
// ──────────────────────────────────────────
function _renderAll() {
  _renderStatus();
  _renderPlanTable();
}

function _renderStatus() {
  var r = _readiness;
  if (!r) return;

  var ready = r.Готово_комплектов || 0;
  document.getElementById('ready-num').textContent = ready;

  var bnEl = document.getElementById('bn-block');
  var bn   = r.Узкое_место;
  var todo = r.Что_сделать_сейчас || [];

  if (bn && todo.length > 0) {
    var t = todo[0];
    bnEl.className = 'bn-block bn-warn';
    bnEl.innerHTML = '⚠️ Узкое место: <strong>' + bn + ' мм</strong>'
      + ' · нужно <strong>' + t.Нужно_сделать + ' шт</strong> → +1 компл.';
  } else if (ready > 0) {
    bnEl.className = 'bn-block bn-ok';
    bnEl.textContent = '✅ Все позиции в норме';
  } else {
    bnEl.className = 'bn-block hidden';
  }
}

function _renderPlanTable() {
  var r    = _readiness;
  var emps = _employees;
  var wrap = document.getElementById('plan-table');

  if (!r || !r.Длины) {
    wrap.innerHTML = '<div class="empty">Нет данных о позициях</div>';
    return;
  }

  if (emps.length === 0) {
    wrap.innerHTML = '<div class="empty">Сотрудники не найдены.<br>'
      + 'Добавьте их на лист <strong>«Сотрудники»</strong> в таблице,<br>'
      + 'затем нажмите ↻ Обновить.</div>';
    return;
  }

  var planQty = r.plan_record
    ? Number(r.plan_record.План_комплектов || 0)
    : Number(r.План_комплектов || 0);

  // assignMap[lengthMm][fio] = planQty
  var assignMap = {};
  _assignments.forEach(function (a) {
    var len = String(a['Длина_мм']);
    var fio = a['Сотрудник_ФИО'];
    if (!assignMap[len]) assignMap[len] = {};
    assignMap[len][fio] = Number(a['План_шт'] || 0);
  });

  var html = '<div class="tbl-scroll"><table class="plan-tbl">';

  // Заголовок
  html += '<thead><tr>'
    + '<th class="th th--pos">Позиция</th>'
    + '<th class="th th--need">Потребность</th>';
  emps.forEach(function (emp) {
    html += '<th class="th th--person">' + _esc(emp.fio) + '</th>';
  });
  html += '</tr></thead><tbody>';

  // Строки по позициям
  r.Длины.forEach(function (L) {
    var isBn      = L.Узкое_место;
    var def       = L.Дефицит || 0;
    var totalNeed = planQty > 0
      ? Math.max(0, L.Количество_на_комплект * planQty - L.Остаток)
      : (def > 0 ? def : 0);

    var rowCls = isBn ? 'tr--red' : (def > 0 ? 'tr--yellow' : 'tr--green');

    html += '<tr class="' + rowCls + '">';

    // Позиция
    html += '<td class="td td--pos">'
      + '<span class="td-len">' + L.Длина_мм + ' мм</span>'
      + '<span class="td-sub">×' + L.Количество_на_комплект + ' · ост.&nbsp;' + L.Остаток + '</span>'
      + '</td>';

    // Потребность
    var needCls = isBn ? 'need--red' : (totalNeed > 0 ? 'need--yellow' : 'need--ok');
    html += '<td class="td td--need ' + needCls + '">'
      + (totalNeed > 0
        ? '<strong>' + totalNeed + '</strong><div class="td-sub">шт</div>'
        : '✓')
      + '</td>';

    // Ячейки по людям
    emps.forEach(function (emp) {
      var qty = (assignMap[String(L.Длина_мм)] && assignMap[String(L.Длина_мм)][emp.fio]) || 0;
      html += '<td class="td td--cell" data-len="' + L.Длина_мм + '" data-fio="' + _esc(emp.fio) + '">'
        + '<div class="cell-val">' + (qty > 0 ? qty : '—') + '</div>'
        + '</td>';
    });

    html += '</tr>';
  });

  // Итого
  html += '<tr class="tr--total">'
    + '<td class="td td--pos td--total-lbl">Итого план</td>'
    + '<td class="td td--need">—</td>';
  emps.forEach(function (emp) {
    var total = 0;
    (_assignments || []).forEach(function (a) {
      if (a['Сотрудник_ФИО'] === emp.fio) total += Number(a['План_шт'] || 0);
    });
    html += '<td class="td td--cell td--total">' + (total > 0 ? total : '—') + '</td>';
  });
  html += '</tr>';

  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  // Обработчики клика
  wrap.querySelectorAll('.td--cell:not(.td--total)').forEach(function (td) {
    td.addEventListener('click', function () {
      _editCell(td, td.dataset.len, td.dataset.fio);
    });
  });
}

// ──────────────────────────────────────────
// Редактирование ячейки
// ──────────────────────────────────────────
function _editCell(td, lengthMm, fio) {
  if (td.querySelector('input')) return;

  var valEl = td.querySelector('.cell-val');
  var cur   = parseInt(valEl ? valEl.textContent : '0', 10);
  if (isNaN(cur)) cur = 0;

  td.innerHTML =
    '<input type="number" min="0" class="cell-input" value="' + cur + '">'
    + '<div class="cell-btns">'
    +   '<button class="cell-btn cell-btn--ok">✓</button>'
    +   '<button class="cell-btn cell-btn--cancel">✕</button>'
    + '</div>';

  var inp   = td.querySelector('input');
  var btnOk = td.querySelector('.cell-btn--ok');
  var btnCn = td.querySelector('.cell-btn--cancel');

  inp.focus();
  inp.select();

  function restore(val) {
    td.innerHTML = '<div class="cell-val">' + (val > 0 ? val : '—') + '</div>';
    td.addEventListener('click', function h() {
      td.removeEventListener('click', h);
      _editCell(td, lengthMm, fio);
    });
  }

  function commit() {
    var newQty = parseInt(inp.value, 10);
    if (isNaN(newQty) || newQty < 0) newQty = 0;
    if (newQty === cur) { restore(cur); return; }

    inp.disabled      = true;
    btnOk.disabled    = true;
    btnOk.textContent = '…';

    API.setAssignment(_getDate(), lengthMm, fio, newQty)
      .then(function () {
        // Обновляем локальный кеш
        _assignments = _assignments.filter(function (a) {
          return !(String(a['Длина_мм']) === String(lengthMm) && a['Сотрудник_ФИО'] === fio);
        });
        if (newQty > 0) {
          _assignments.push({ 'Длина_мм': lengthMm, 'Сотрудник_ФИО': fio, 'План_шт': newQty });
        }
        restore(newQty);
        _updateTotals();
        _haptic('success');
      })
      .catch(function (err) {
        _toast('Ошибка: ' + err.message, 'err');
        restore(cur);
        _haptic('error');
      });
  }

  btnOk.addEventListener('click',  function (e) { e.stopPropagation(); commit(); });
  btnCn.addEventListener('click',  function (e) { e.stopPropagation(); restore(cur); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') restore(cur);
  });
}

// Обновляет только строку «Итого» без полного ре-рендера
function _updateTotals() {
  var totalCells = document.querySelectorAll('.td--total');
  totalCells.forEach(function (td, i) {
    var emp = _employees[i];
    if (!emp) return;
    var total = 0;
    _assignments.forEach(function (a) {
      if (a['Сотрудник_ФИО'] === emp.fio) total += Number(a['План_шт'] || 0);
    });
    td.textContent = total > 0 ? total : '—';
  });
}

// ──────────────────────────────────────────
// Утилиты
// ──────────────────────────────────────────
function _todayISO() {
  var n = new Date();
  return n.getFullYear()
    + '-' + String(n.getMonth() + 1).padStart(2, '0')
    + '-' + String(n.getDate()).padStart(2, '0');
}

function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _showLoader(on) {
  var el = document.getElementById('loader');
  if (el) el.style.display = on ? 'flex' : 'none';
}

function _setLastUpd() {
  var n = new Date();
  document.getElementById('last-upd').textContent =
    'обновлено ' + String(n.getHours()).padStart(2, '0')
    + ':' + String(n.getMinutes()).padStart(2, '0');
}

var _toastTimer = null;
function _toast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast toast--' + (type || 'ok') + ' toast--show';
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { el.className = 'toast'; }, 3000);
}

function _haptic(type) {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (!tg || !tg.HapticFeedback) return;
  if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
  else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
}
