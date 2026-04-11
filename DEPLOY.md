# DEPLOY.md — Инструкция по деплою

## Шаг 1. Google Sheets

1. Перейдите на [sheets.google.com](https://sheets.google.com)
2. Создайте новую таблицу
3. Скопируйте ID из URL:
   ```
   https://docs.google.com/spreadsheets/d/[ЭТО_И_ЕСТЬ_ID]/edit
   ```

## Шаг 2. Google Apps Script

### 2.1 Создание проекта

1. В таблице: **Расширения → Apps Script**
2. Откроется редактор скриптов

### 2.2 Загрузка файлов

Создайте следующие файлы (кнопка `+` → Script):

| Имя файла | Содержимое |
|-----------|-----------|
| `Code.gs` | `/gas/Code.gs` |
| `Api.gs` | `/gas/Api.gs` |
| `Sheets.gs` | `/gas/Sheets.gs` |
| `Calculations.gs` | `/gas/Calculations.gs` |
| `Auth.gs` | `/gas/Auth.gs` |

> Исходный `Code.gs` можно переименовать — или вставить содержимое в него.

### 2.3 Настройка переменных

1. Шестерёнка (⚙️) → **Project Settings**
2. Вкладка **Script Properties**
3. Кнопка **Add property**:
   ```
   Key:   SPREADSHEET_ID
   Value: [ваш ID таблицы]
   ```

### 2.4 Инициализация таблиц

1. В редакторе выберите функцию: `initSheets`
2. Нажмите ▶ **Run**
3. Разрешите доступ к таблицам при запросе
4. Убедитесь: в таблице появились листы `Спецификация`, `Остатки`, `План`, `Производство`, `Сотрудники`

### 2.5 Деплой Web App

1. Кнопка **Deploy → New deployment**
2. Тип: **Web app**
3. Настройки:
   ```
   Execute as: Me (ваш аккаунт)
   Who has access: Anyone
   ```
4. Нажмите **Deploy**
5. Скопируйте URL деплоя — вида:
   ```
   https://script.google.com/macros/s/AKfy.../exec
   ```

> ⚠️ При каждом изменении кода нужен новый деплой:
> **Deploy → Manage deployments → Edit → New version → Deploy**

---

## Шаг 3. Frontend

### 3.1 Настройка URL

В файле `frontend/api.js`, строка 7, замените:
```javascript
var GAS_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
```
на ваш реальный URL.

### 3.2 Хостинг

#### GitHub Pages (рекомендуется)

```bash
# Создайте репозиторий на github.com
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

На GitHub: Settings → Pages → Source: `main` branch → `/frontend` folder → Save

Ваш URL: `https://USERNAME.github.io/REPO/`

#### Netlify Drop

1. Зайдите на [netlify.com/drop](https://netlify.com/drop)
2. Перетащите папку `frontend/`
3. Получите URL вида `https://random-name.netlify.app`

#### Локальный тест

```bash
# Python 3
cd frontend
python -m http.server 8080
# Открыть http://localhost:8080
```

---

## Шаг 4. Telegram Bot

### 4.1 Создание бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. `/newbot` → введите имя → получите TOKEN

### 4.2 Создание Web App

Вариант A — Встроенная кнопка меню:
```
/mybots → ваш бот → Bot Settings → Menu Button
→ Configure menu button
URL: https://USERNAME.github.io/REPO/
Text: 📦 Комплекты
```

Вариант B — Через команду:
```
/newapp → выберите бота → Short name → URL
```

Вариант C — Inline кнопка (в боте):
```python
# Python пример
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

keyboard = [[
    InlineKeyboardButton(
        "📦 Открыть систему",
        web_app=WebAppInfo(url="https://yoursite.com/")
    )
]]
```

---

## Шаг 5. Добавление первого сотрудника с ролью мастера

1. Откройте Web App через Telegram — система автоматически создаст запись с ролью `сотрудник`
2. В Google Sheets, лист **Сотрудники**, найдите строку с вашим Telegram ID
3. Измените **Роль** на `мастер`
4. Перезагрузите Web App — появится вкладка **Мастер**

---

## Шаг 6. Установка плана

1. Откройте Web App как мастер
2. Вкладка **Мастер** (или напрямую через GAS):
   ```
   POST ?action=setPlan
   Body: {"telegram_id": "ваш_id", "plan_qty": 10, "date": "2024-01-15"}
   ```

Или вручную в Google Sheets → лист **План** → добавьте строку:
```
id | Дата       | План_комплектов | Комментарий | Активен
1  | 2024-01-15 | 10              |             | TRUE
```

---

## Проверка работы

```bash
# Проверка GAS API (замените URL)
curl "https://script.google.com/macros/s/YOUR_ID/exec?action=ping"
# Ожидаемый ответ: {"success":true,"message":"pong",...}

curl "https://script.google.com/macros/s/YOUR_ID/exec?action=getKitReadiness"
# Ожидаемый ответ: {"success":true,"Готово_комплектов":0,...}
```
