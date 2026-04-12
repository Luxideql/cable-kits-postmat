// ==========================================
// КАБЕЛЬНЫЕ КОМПЛЕКТЫ — одна страница
// app.js
// ==========================================

// Инициализация Telegram Web App
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) { tg.ready(); tg.expand(); }
})();

// ──────────────────────────────────────────
// Состояние
// ──────────────────────────────────────────
var _readiness = null;
var _journal   = [];
var _autoTimer = null;

// ──────────────────────────────────────────
// Старт
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  _initForm();

  document.getElementById('btn-save').addEventListener('click', _submit);
  document.getElementById('btn-refresh').addEventListener('click', function () { _loadAll(true); });
  document.getElementById('f-date').addEventListener('change', function () {
    _loadJournal(this.value);
    _setJournalLabel(this.value);
  });

  _loadAll(false);
  _startAutoRefresh();
});

// ──────────────────────────────────────────
// Инициализация формы
// ──────────────────────────────────────────
function _initForm() {
  // Дата — сегодня
  var today = _todayISO();
  document.getElementById('f-date').value = today;
  document.getElementById('hdr-date').textContent = _fmtDate(today);
  _setJournalLabel(today);

  // Имя — из Telegram если доступен
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    var u = tg.initDataUnsafe.user;
    var name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '';
    if (name) document.getElementById('f-name').value = name;
  }
}

// ──────────────────────────────────────────
// Загрузка данных
// ──────────────────────────────────────────
function _loadAll(showMsg) {
  _showLoader(true);
  var date = document.getElementById('f-date').value || _todayISO();

  Promise.all([
    API.getKitReadiness(),
    API.getJournal(date, null)
  ])
  .then(function (res) {
    _readiness = res[0];
    _journal   = res[1].rows || [];
    _renderAll();
    _showLoader(false);
    _setLastUpd();
    if (showMsg) _toast('Обновлено', 'ok');
  })
  .catch(function (err) {
    _showLoader(false);
    _toast('Ошибка: ' + err.message, 'err');
    console.error('[App]', err);
  });
}

function _loadJournal(date) {
  API.getJournal(date || _todayISO(), null)
    .then(function (res) {
      _journal = res.rows || [];
      _renderJournal();
    })
    .catch(function (err) { console.error('[Journal]', err); });
}

function _startAutoRefresh() {
  if (_autoTimer) clearInterval(_autoTimer);
  _autoTimer = setInterval(function () { _loadAll(false); }, 60000);
}

// ──────────────────────────────────────────
// Отправка формы
// ──────────────────────────────────────────
function _submit() {
  var date  = document.getElementById('f-date').value  || _todayISO();
  var name  = document.getElementById('f-name').value.trim();
  var lenMm = document.getElementById('f-length').value;
  var qty   = parseInt(document.getElementById('f-qty').value, 10);

  if (!name)       { _formMsg('Укажите имя сотрудника', 'err'); return; }
  if (!lenMm)      { _formMsg('Выберите длину кабеля', 'err'); return; }
  if (!qty || qty < 1) { _formMsg('Введите количество (> 0)', 'err'); return; }

  var btn = document.getElementById('btn-save');
  btn.disabled    = true;
  btn.textContent = 'Сохраняю...';

  var tgId       = _getTgId();
  var kitsBefore = _readiness ? (_readiness.Готово_комплектов || 0) : 0;

  API.addProduction(tgId, lenMm, qty, '', kitsBefore, name, date)
    .then(function (res) {
      btn.disabled    = false;
      btn.textContent = '✓ Сохранить';

      document.getElementById('f-qty').value = '';
      _formMsg(res.message || 'Записано ✓', 'ok');

      // Обновляем состояние без полной перезагрузки
      if (res.readiness) _readiness = res.readiness;
      _renderStatus();
      _renderPositions();
      _loadJournal(date);
      _haptic('success');
    })
    .catch(function (err) {
      btn.disabled    = false;
      btn.textContent = '✓ Сохранить';
      _formMsg('Ошибка: ' + err.message, 'err');
      _haptic('error');
    });
}

// ──────────────────────────────────────────
// Рендеринг
// ──────────────────────────────────────────
function _renderAll() {
  _renderStatus();
  _renderPositions();
  _renderJournal();
  _populateLengths();
}

function _renderStatus() {
  var r = _readiness;
  if (!r) return;

  var ready = r.Готово_комплектов || 0;
  var bn    = r.Узкое_место;
  var todo  = r.Что_сделать_сейчас || [];

  document.getElementById('ready-num').textContent = ready;

  var bnEl = document.getElementById('bn-block');
  if (bn && todo.length > 0) {
    var t = todo[0];
    bnEl.className  = 'bn-block bn-warn';
    bnEl.innerHTML  = '⚠️ Узкое место: <strong>' + bn + ' мм</strong><br>'
      + 'Нужно сделать <strong>' + t.Нужно_сделать + ' шт</strong> → +1 комплект';
  } else if (ready > 0) {
    bnEl.className  = 'bn-block bn-ok';
    bnEl.textContent = '✅ Все позиции в норме';
  } else {
    bnEl.className = 'bn-block hidden';
  }
}

function _renderPositions() {
  var r    = _readiness;
  var body = document.getElementById('pos-body');
  if (!r || !r.Длины) { body.innerHTML = ''; return; }

  var html = '';
  r.Длины.forEach(function (L) {
    var kits  = L.Хватает_на_комплектов || 0;
    var isBn  = L.Узкое_место;
    var def   = L.Дефицит || 0;
    var cls   = isBn ? 'row-red' : (def > 0 ? 'row-yellow' : 'row-green');
    var icon  = isBn ? '🔴' : (def > 0 ? '🟡' : '✅');

    html += '<tr class="' + cls + '">'
      + '<td class="td-len">' + L.Длина_мм + ' мм</td>'
      + '<td>×' + L.Количество_на_комплект + '</td>'
      + '<td>' + L.Остаток + ' шт</td>'
      + '<td><strong>' + kits + '</strong></td>'
      + '<td>' + icon + '</td>'
      + '</tr>';
  });
  body.innerHTML = html;
}

function _renderJournal() {
  var wrap = document.getElementById('journal');
  var rows = _journal;

  if (!rows || rows.length === 0) {
    wrap.innerHTML = '<div class="empty">Нет записей</div>';
    return;
  }

  var rev  = rows.slice().reverse();
  var html = '';
  rev.forEach(function (row) {
    var dt   = String(row['Дата_время'] || '');
    var time = dt.length >= 16 ? dt.substring(11, 16) : '';
    var name = row['Сотрудник'] || '—';
    var len  = row['Длина_мм']  ? row['Длина_мм'] + ' мм' : '—';
    var qty  = row['Количество_сделано'] || 0;

    html += '<div class="j-row">'
      + '<span class="j-time">' + _esc(time) + '</span>'
      + '<span class="j-name">' + _esc(name) + '</span>'
      + '<span class="j-len">'  + _esc(len)  + '</span>'
      + '<span class="j-qty">'  + qty + ' шт</span>'
      + '</div>';
  });
  wrap.innerHTML = html;
}

function _populateLengths() {
  var r   = _readiness;
  var sel = document.getElementById('f-length');
  if (!r || !r.Длины) return;

  var cur = sel.value;
  sel.innerHTML = '<option value="">— выберите длину —</option>';
  r.Длины.forEach(function (L) {
    var opt = document.createElement('option');
    opt.value       = L.Длина_мм;
    opt.textContent = L.Длина_мм + ' мм  (×' + L.Количество_на_комплект
      + ' на компл., остаток: ' + L.Остаток + ')';
    if (String(L.Длина_мм) === cur) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ──────────────────────────────────────────
// Утилиты
// ──────────────────────────────────────────
function _getTgId() {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    return String(tg.initDataUnsafe.user.id);
  }
  return '';
}

function _todayISO() {
  var n = new Date();
  return n.getFullYear()
    + '-' + String(n.getMonth() + 1).padStart(2, '0')
    + '-' + String(n.getDate()).padStart(2, '0');
}

function _fmtDate(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  if (p.length !== 3) return iso;
  var dn = new Date(iso + 'T00:00:00');
  var days   = ['вс','пн','вт','ср','чт','пт','сб'];
  var months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return days[dn.getDay()] + ', ' + p[2] + ' ' + months[parseInt(p[1], 10) - 1] + ' ' + p[0];
}

function _setJournalLabel(iso) {
  document.getElementById('j-date-label').textContent = _fmtDate(iso);
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _showLoader(on) {
  var el = document.getElementById('loader');
  if (el) el.style.display = on ? 'flex' : 'none';
}

var _fmsgTimer = null;
function _formMsg(msg, type) {
  var el = document.getElementById('form-msg');
  el.textContent = msg;
  el.className   = 'form-msg form-msg--' + (type || 'ok');
  if (_fmsgTimer) clearTimeout(_fmsgTimer);
  if (msg) _fmsgTimer = setTimeout(function () {
    el.textContent = '';
    el.className   = 'form-msg';
  }, 5000);
}

var _toastTimer = null;
function _toast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = 'toast toast--' + (type || 'ok') + ' toast--show';
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { el.className = 'toast'; }, 3000);
}

function _setLastUpd() {
  var n = new Date();
  document.getElementById('last-upd').textContent =
    'обновлено ' + String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
}

function _haptic(type) {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (!tg || !tg.HapticFeedback) return;
  if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
  else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
  else tg.HapticFeedback.impactOccurred('light');
}
