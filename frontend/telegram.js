// ==========================================
// TELEGRAM WEB APP ИНТЕГРАЦИЯ
// telegram.js
// ==========================================

var TG = (function () {

  var _twa = null;    // window.Telegram.WebApp
  var _user = null;

  /**
   * Инициализирует Telegram Web App SDK.
   * Вызывать один раз при старте.
   */
  function init() {
    if (window.Telegram && window.Telegram.WebApp) {
      _twa  = window.Telegram.WebApp;
      _user = _twa.initDataUnsafe && _twa.initDataUnsafe.user
              ? _twa.initDataUnsafe.user
              : null;

      _twa.ready();
      _twa.expand();

      // Цветовая схема — подстраиваемся под тему Telegram
      _applyTheme();

      console.log('[TG] WebApp инициализирован. User:', _user);
    } else {
      console.warn('[TG] Telegram WebApp SDK не найден. Работаем в browser-режиме.');
      _user = _getFallbackUser();
    }
  }

  /**
   * Применяет CSS переменные на основе темы Telegram.
   */
  function _applyTheme() {
    if (!_twa) return;
    var theme = _twa.themeParams || {};
    var root  = document.documentElement;

    if (theme.bg_color)          root.style.setProperty('--tg-bg',        theme.bg_color);
    if (theme.text_color)        root.style.setProperty('--tg-text',       theme.text_color);
    if (theme.hint_color)        root.style.setProperty('--tg-hint',       theme.hint_color);
    if (theme.link_color)        root.style.setProperty('--tg-link',       theme.link_color);
    if (theme.button_color)      root.style.setProperty('--tg-btn',        theme.button_color);
    if (theme.button_text_color) root.style.setProperty('--tg-btn-text',   theme.button_text_color);
    if (theme.secondary_bg_color)root.style.setProperty('--tg-secondary',  theme.secondary_bg_color);
  }

  /**
   * Возвращает демо-пользователя для тестирования в браузере.
   */
  function _getFallbackUser() {
    return {
      id:         123456789,
      first_name: 'Тест',
      last_name:  'Сотрудников',
      username:   'testworker'
    };
  }

  /**
   * Возвращает объект пользователя Telegram.
   */
  function getUser() {
    return _user;
  }

  /**
   * Возвращает telegram_id пользователя.
   */
  function getUserId() {
    return _user ? String(_user.id) : null;
  }

  /**
   * Возвращает имя пользователя для отображения.
   */
  function getDisplayName() {
    if (!_user) return 'Гость';
    var parts = [];
    if (_user.first_name) parts.push(_user.first_name);
    if (_user.last_name)  parts.push(_user.last_name);
    return parts.join(' ') || _user.username || ('User ' + _user.id);
  }

  /**
   * Возвращает username (без @).
   */
  function getUsername() {
    return _user ? (_user.username || null) : null;
  }

  /**
   * Показывает нативный алерт Telegram.
   */
  function alert(msg, callback) {
    if (_twa && _twa.showAlert) {
      _twa.showAlert(msg, callback);
    } else {
      window.alert(msg);
      if (callback) callback();
    }
  }

  /**
   * Показывает нативный confirm Telegram.
   */
  function confirm(msg, callback) {
    if (_twa && _twa.showConfirm) {
      _twa.showConfirm(msg, callback);
    } else {
      var res = window.confirm(msg);
      if (callback) callback(res);
    }
  }

  /**
   * Тактильная вибрация.
   * type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
   */
  function haptic(type) {
    try {
      if (_twa && _twa.HapticFeedback) {
        _twa.HapticFeedback.impactOccurred(type || 'light');
      }
    } catch (e) { /* игнорируем */ }
  }

  /**
   * Уведомление-успех.
   */
  function hapticSuccess() {
    try {
      if (_twa && _twa.HapticFeedback) {
        _twa.HapticFeedback.notificationOccurred('success');
      }
    } catch (e) { /* игнорируем */ }
  }

  /**
   * Уведомление-ошибка.
   */
  function hapticError() {
    try {
      if (_twa && _twa.HapticFeedback) {
        _twa.HapticFeedback.notificationOccurred('error');
      }
    } catch (e) { /* игнорируем */ }
  }

  /**
   * Показывает основную кнопку Telegram (синяя снизу).
   */
  function showMainButton(text, onClick) {
    if (!_twa) return;
    _twa.MainButton.setText(text);
    _twa.MainButton.onClick(onClick);
    _twa.MainButton.show();
  }

  /**
   * Скрывает основную кнопку Telegram.
   */
  function hideMainButton() {
    if (_twa) _twa.MainButton.hide();
  }

  /**
   * Возвращает true, если приложение запущено внутри Telegram.
   */
  function isInsideTelegram() {
    return !!(window.Telegram && window.Telegram.WebApp && _twa && _twa.initData);
  }

  /**
   * Возвращает colorScheme: 'light' | 'dark'.
   */
  function getColorScheme() {
    return (_twa && _twa.colorScheme) ? _twa.colorScheme : 'light';
  }

  return {
    init:             init,
    getUser:          getUser,
    getUserId:        getUserId,
    getDisplayName:   getDisplayName,
    getUsername:      getUsername,
    alert:            alert,
    confirm:          confirm,
    haptic:           haptic,
    hapticSuccess:    hapticSuccess,
    hapticError:      hapticError,
    showMainButton:   showMainButton,
    hideMainButton:   hideMainButton,
    isInsideTelegram: isInsideTelegram,
    getColorScheme:   getColorScheme
  };

})();
