# Кабельные комплекты для почтоматов
## Telegram Web App — Production System

Система управления изготовлением кабельных комплектов.
Отвечает на главный вопрос: **сколько готовых комплектов можно собрать прямо сейчас**.

---

## Быстрый старт

### 1. Google Sheets — создать таблицу

1. Создайте новую Google Таблицу
2. Скопируйте `SPREADSHEET_ID` из URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

### 2. Google Apps Script — задеплоить бэкенд

1. Откройте таблицу → **Extensions → Apps Script**
2. Создайте файлы из папки `/gas/`:
   - `Code.gs`
   - `Api.gs`
   - `Sheets.gs`
   - `Calculations.gs`
   - `Auth.gs`
3. В разделе **Project Settings → Script Properties** добавьте:
   ```
   SPREADSHEET_ID = ваш_id_таблицы
   ```
4. Запустите функцию `initSheets()` один раз (создаст листы и заполнит спецификацию)
5. **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Скопируйте URL деплоя (вида `https://script.google.com/macros/s/.../exec`)

### 3. Frontend — подключить к GAS

Вариант A — через `localStorage` (рекомендуется для первого запуска):
```javascript
// В браузере (DevTools консоль) или в index.html перед app.js:
localStorage.setItem('gas_url', 'https://script.google.com/macros/s/YOUR_ID/exec');
```

Вариант B — хардкод в `api.js`:
```javascript
// api.js, строка 7:
var GAS_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
```

### 4. Хостинг фронтенда

Выберите любой бесплатный хостинг для статики:

**GitHub Pages:**
```bash
git init
git add frontend/
git commit -m "init"
git branch -M main
git remote add origin https://github.com/yourname/cables-app.git
git push -u origin main
# Включить Pages в настройках репозитория → Source: /frontend
```

**Cloudflare Pages:**
- Подключите репозиторий, укажите папку `/frontend` как root

**Netlify:**
- Перетащите папку `/frontend` на netlify.com/drop

### 5. Telegram Bot — подключить Web App

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Команда: `/newbot` → введите имя → получите TOKEN
3. Добавьте Web App кнопку:
   ```
   /mybots → ваш бот → Bot Settings → Menu Button → Configure menu button
   URL: https://yoursite.github.io/cables-app/
   ```
   Или через inline-кнопку:
   ```
   /newapp → выберите бота → введите URL
   ```

---

## Структура данных (Google Sheets)

| Лист | Назначение |
|------|-----------|
| Спецификация | Состав комплекта (длины + количество) |
| Остатки | Текущий остаток каждой длины |
| План | Дневной план комплектов |
| Производство | Журнал всех внесённых записей |
| Сотрудники | Telegram ID → ФИО, роль |

---

## Роли

| Роль | Доступ |
|------|--------|
| `сотрудник` | Вносить производство, видеть свой прогресс |
| `мастер` | Всё + дашборд мастера, установка плана |
| `руководитель` | То же, что мастер |
| `admin` | То же, что мастер |

Роль задаётся вручную в листе **Сотрудники** → колонка **Роль**.

---

## Как пользоваться

### Сотрудник
1. Открыть Web App через Telegram
2. Вкладка **Итог** — видите: готово / план / что делать сейчас
3. Вкладка **Список** — карточки длин с приоритетами
4. Вкладка **Внести** — выбрать длину, ввести количество → **Сохранить**
5. После сохранения система покажет: `+1 комплект 🎉` или `нужно ещё X шт`

### Мастер / Руководитель
1. Вкладка **Мастер** (появляется автоматически при роли `мастер`)
2. Видите: итог дня, проблемные позиции, кто сколько сделал

---

## Переменные окружения (Script Properties в GAS)

| Ключ | Значение |
|------|----------|
| `SPREADSHEET_ID` | ID вашей Google Таблицы |

---

## Файлы проекта

```
/gas/         — Google Apps Script (бэкенд)
/frontend/    — HTML/CSS/JS (фронтенд, Telegram Web App)
/docs/        — Документация потоков
```
