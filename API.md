# API.md — Документация GAS API

## Базовый URL

```
https://script.google.com/macros/s/{SCRIPT_ID}/exec
```

Все запросы — GET с параметром `action`.

---

## Методы

### ping
Проверка доступности сервера.

```
GET ?action=ping
```

**Ответ:**
```json
{
  "success": true,
  "message": "pong",
  "version": "1.0.0",
  "time": "2024-01-15 09:00:00"
}
```

---

### getEmployeeByTelegramId
Получить/создать сотрудника по Telegram ID.

```
GET ?action=getEmployeeByTelegramId&telegram_id=123456789&fio=Иван+Петров&username=ivanpetrov
```

| Параметр | Обязателен | Описание |
|----------|-----------|----------|
| telegram_id | ✅ | Telegram User ID |
| fio | — | Имя (для авторегистрации) |
| username | — | Username в Telegram |

**Ответ:**
```json
{
  "success": true,
  "employee": {
    "id": 1,
    "telegram_id": "123456789",
    "fio": "Иван Петров",
    "role": "сотрудник",
    "active": true
  }
}
```

---

### getKitReadiness ⭐ ГЛАВНЫЙ МЕТОД

Полный расчёт готовности комплектов.

```
GET ?action=getKitReadiness
```

**Ответ:**
```json
{
  "success": true,
  "План_комплектов": 10,
  "Готово_комплектов": 3,
  "Осталось_комплектов": 7,
  "Узкое_место": 2000,
  "Прогресс_процентов": 30,
  "Что_сделать_сейчас": [
    {
      "Длина_мм": 2000,
      "Нужно_сделать": 3,
      "Текущий_остаток": 30,
      "Описание": "Сделай ещё 3 шт → будет +1 комплект"
    }
  ],
  "Длины": [
    {
      "Длина_мм": 2000,
      "Количество_на_комплект": 11,
      "Остаток": 30,
      "Хватает_на_комплектов": 2,
      "Нужно_на_план": 110,
      "Дефицит": 80,
      "Избыток": 0,
      "Нужно_для_следующего": 3,
      "Узкое_место": true,
      "Приоритет": "высокий",
      "Ячейки": "B1:B11",
      "Группа": "средние"
    }
  ],
  "plan_record": {
    "id": 1,
    "Дата": "2024-01-15",
    "План_комплектов": 10,
    "Активен": true
  }
}
```

---

### addProductionLog
Добавить запись производства.

```
POST ?action=addProductionLog
Body (JSON): {
  "telegram_id": "123456789",
  "length_mm": 2000,
  "qty": 11,
  "comment": "утренняя партия",
  "kits_before": 3
}
```

| Параметр | Обязателен | Описание |
|----------|-----------|----------|
| telegram_id | ✅ | Telegram User ID |
| length_mm | ✅ | Длина кабеля в мм |
| qty | ✅ | Количество (> 0) |
| comment | — | Комментарий |
| kits_before | — | Кол-во комплектов до операции (для расчёта дельты) |

**Ответ:**
```json
{
  "success": true,
  "row_id": 15,
  "message": "+1 комплект 🎉",
  "delta_kits": 1,
  "Готово_комплектов": 4,
  "readiness": { ... }
}
```

---

### getProductionJournal
Журнал производства за дату.

```
GET ?action=getProductionJournal&date=2024-01-15&telegram_id=123456789
```

| Параметр | Обязателен | Описание |
|----------|-----------|----------|
| date | — | YYYY-MM-DD (по умолчанию: сегодня) |
| telegram_id | — | Фильтр по сотруднику |

---

### getManagerDashboard
Дашборд менеджера.

```
GET ?action=getManagerDashboard&telegram_id=123456789
```

**Ответ:**
```json
{
  "success": true,
  "is_manager": true,
  "readiness_summary": { "Готово": 5, "Осталось": 5, "План": 10, "Прогресс": 50 },
  "employee_summary": [
    { "ФИО": "Иван Петров", "Всего_штук": 45, "Позиций": 3 }
  ],
  "problem_positions": [ ... ],
  "all_lengths": [ ... ]
}
```

---

### setPlan
Установить план на день. **Только для менеджера.**

```
POST ?action=setPlan
Body: { "telegram_id": "123", "plan_qty": 10, "date": "2024-01-15", "comment": "" }
```

---

### setStock
Ручная корректировка остатка. **Только для менеджера.**

```
POST ?action=setStock
Body: { "telegram_id": "123", "length_mm": 2000, "qty": 55 }
```

---

## Коды ошибок

| Поле | Значение |
|------|----------|
| `success` | `false` при ошибке |
| `error` | Текст ошибки на русском |

Пример:
```json
{ "success": false, "error": "Не указан telegram_id" }
```
