# ARCHITECTURE.md — Архитектура системы

## Общая схема

```
Telegram App
    │
    ▼
Telegram Web App (index.html)
    │  fetch()
    ▼
GAS Web App (script.google.com)
    │  SpreadsheetApp
    ▼
Google Sheets (данные)
```

## Компоненты

### Frontend (SPA, нет фреймворков)

```
index.html     — единственный HTML-файл, разметка всех экранов
style.css      — mobile-first стили, CSS-переменные для тем Telegram
state.js       — глобальный иммутабельный стейт с pub/sub подпиской
telegram.js    — обёртка над window.Telegram.WebApp SDK
api.js         — HTTP-клиент к GAS (fetch + timeout + retry)
ui.js          — чистые функции рендеринга (DOM-манипуляции)
app.js         — контроллер: инициализация, бизнес-события, навигация
```

**Паттерн данных:**
```
API → AppState.set() → subscribe callback → UI.render*()
```
Нет двусторонних привязок. Стейт → UI — однонаправленный поток.

### Backend (Google Apps Script)

```
Code.gs         — doGet/doPost, роутер action → handler
Api.gs          — обработчики каждого action, возвращают JSON
Sheets.gs       — CRUD: getSheet, sheetToObjects, updateStock, ...
Calculations.gs — calcKitReadiness, calcWhatToDo, aggregateProduction
Auth.gs         — getEmployeeByTelegramId, registerEmployee, isManager
```

**Зависимости (вверх = зависит от нижнего):**
```
Code.gs
  ├── Api.gs
  │     ├── Sheets.gs
  │     ├── Calculations.gs
  │     └── Auth.gs
  │           └── Sheets.gs
  └── Calculations.gs (через Api.gs)
```

### Хранилище данных

Google Sheets, 5 листов:
```
Спецификация  — справочник (10 строк, меняется редко)
Остатки       — текущее состояние (10 строк, обновляется при каждой записи)
План          — дневные планы (добавляется по 1 строке в день)
Производство  — журнал (растёт неограниченно)
Сотрудники    — справочник (< 100 строк)
```

---

## Поток данных при внесении производства

```
1. Сотрудник нажимает "Сохранить" в форме
2. app.js.submitAddForm()
   → читает form-length, form-qty, form-comment
   → запоминает kitsBefore = AppState.getReadyKits()
3. API.addProduction(tgId, lengthMm, qty, comment, kitsBefore)
   → POST /exec?action=addProductionLog
4. GAS: apiAddProductionLog(params)
   → getEmployeeByTelegramId(tgId) — или авторегистрация
   → addProductionRow(...) → Sheets.gs
     → getSheet('Производство').appendRow([...])
     → updateStock(lengthMm, qty) → Остатки[lengthMm] += qty
   → apiGetKitReadiness() — пересчёт
     → getKitSpec() + getCurrentStock()
     → calcKitReadiness(stock, spec, plan)
   → вернуть { message, delta_kits, readiness }
5. app.js получает ответ
   → AppState.set({ readiness: res.readiness })
   → UI.showResultModal("+1 комплект 🎉")
   → TG.hapticSuccess()
   → setTimeout → setTab('dashboard')
```

---

## Поток инициализации

```
DOMContentLoaded
  → App.init()
  → TG.init()             — Telegram.WebApp.ready() + expand()
  → API.ping()            — проверка доступности GAS
  → API.getEmployee(tgId) — идентификация / авторегистрация
  → API.getKitReadiness() — загрузка данных
  → AppState.set(...)     — обновление стейта
  → UI.render*()          — отрисовка
  → setInterval(60s)      — авто-обновление
```

---

## Расчёт готовности (Calculations.gs)

```
calcKitReadiness(stock, spec, plan):
  Для каждой длины:
    kits = floor(stock[длина] / spec.qty_per_kit)
    deficit = max(0, spec.qty_per_kit × plan - stock[длина])
    surplus = max(0, stock[длина] - spec.qty_per_kit × plan)
    priority = fn(kits, minKits)

  minKits = min(kits по всем длинам)
  bottleneck = длина с minKits

  return {
    Готово_комплектов: minKits,
    Узкое_место: bottleneck,
    Что_сделать_сейчас: calcWhatToDo(stock, spec, minKits),
    Длины: [...сортировка по приоритету...]
  }
```

---

## Безопасность

- Авторизация мягкая: проверяется роль из листа Сотрудники
- Мутирующие операции (`setPlan`, `setStock`) проверяют `isManager()`
- `addProductionLog` доступен всем авторизованным пользователям
- Telegram `initData` не верифицируется на сервере (GAS не имеет встроенного HMAC) — для production нужна верификация через отдельный сервер или Cloud Functions

---

## Ограничения GAS

| Лимит | Значение |
|-------|---------|
| Время выполнения | 6 минут (один запрос) |
| Запросы к Sheets | ~60 000/день |
| Размер ответа | ~50 MB |
| Одновременные пользователи | ~30 (бесплатный план) |

При > 30 одновременных пользователей рекомендуется мигрировать на Firebase + Cloud Functions.
