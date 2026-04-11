# ⚡ БЫСТРЫЙ СТАРТ — 4 шага

## Шаг 1: Запускаем автоматический setup

```bat
# Windows — двойной клик или в терминале:
setup.bat
```

Скрипт сам:
- Установит `clasp` (инструмент деплоя GAS)
- Откроет браузер для входа в Google
- Создаст Google Apps Script проект
- Загрузит и задеплоит бэкенд
- Обновит URL в `frontend/api.js`
- Запустит локальный сервер для проверки

---

## Шаг 2: Создаём бота в Telegram (1 минута, вручную)

```
1. Откройте Telegram → @BotFather
2. /newbot
3. Название: Кабельные комплекты
4. Username: cables_kits_bot  (или любой свободный)
5. Скопируйте TOKEN: 123456789:ABC...
```

---

## Шаг 3: Запускаем бота

```bat
cd bot
setup_bot.bat

# Затем:
set BOT_TOKEN=123456789:ABCdef...
set WEB_APP_URL=https://YOURNAME.github.io/REPO/
python bot.py
```

---

## Шаг 4: Публикуем фронтенд (GitHub Pages — бесплатно)

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/YOURNAME/REPO.git
git push -u origin main
```

На GitHub: **Settings → Pages → Source: main / /frontend → Save**

Добавьте секрет: **Settings → Secrets → GAS_URL = ваш_url_из_шага_1**

После этого каждый `git push` = автодеплой. ✅

---

## Итог

| Компонент | Статус | Где |
|-----------|--------|-----|
| Google Sheets | ✅ auto | sheets.google.com |
| GAS Backend | ✅ auto | script.google.com |
| Frontend | ✅ auto | github.io |
| Telegram Bot | ✅ auto | bot.py |

---

## Что нужно от вас (только 3 действия):

1. **Создать Google Таблицу** → скопировать ID (setup.bat спросит)
2. **Создать бота в @BotFather** → вставить TOKEN
3. **Создать репозиторий на GitHub** → git push

Всё остальное делает автоматика.

---

## Если что-то пошло не так

```bat
# Обновить только GAS:
npm run gas:push
npm run gas:deploy

# Обновить только URL в api.js:
node scripts/set-webapp-url.js https://script.google.com/macros/s/.../exec

# Посмотреть логи GAS:
npm run gas:logs
```

---

## Архитектура (коротко)

```
Telegram → Web App (GitHub Pages)
               ↓ fetch
         GAS Web App
               ↓ SpreadsheetApp
         Google Sheets
```
