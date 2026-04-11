# Настройка секретов GitHub для автодеплоя

После того как создали репозиторий на GitHub, добавьте секреты:
**Settings → Secrets and variables → Actions → New repository secret**

---

## Секрет 1: GAS_URL

```
Name:  GAS_URL
Value: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

Это URL вашего задеплоенного GAS Web App.
После добавления каждый push в main автоматически подставит URL во фронтенд.

---

## Секрет 2: CLASP_CREDENTIALS (для авто-деплоя GAS)

Нужен файл `~/.clasprc.json` с вашими Google credentials.

### Как получить:

1. На вашем компьютере выполните:
   ```bash
   npx clasp login
   cat ~/.clasprc.json
   ```
   (на Windows: `type %USERPROFILE%\.clasprc.json`)

2. Скопируйте всё содержимое файла

3. Добавьте секрет:
   ```
   Name:  CLASP_CREDENTIALS
   Value: (содержимое .clasprc.json)
   ```

---

## Секрет 3: CLASP_JSON

1. Содержимое файла `.clasp.json`:
   ```json
   {"scriptId":"YOUR_SCRIPT_ID","rootDir":"./gas"}
   ```

2. Добавьте секрет:
   ```
   Name:  CLASP_JSON
   Value: {"scriptId":"YOUR_REAL_SCRIPT_ID","rootDir":"./gas"}
   ```

---

## Итог

После настройки:
- Push в `gas/` → GitHub Actions автоматически деплоит GAS
- Push в `frontend/` → GitHub Actions автоматически деплоит Pages

Проверить статус: репозиторий → вкладка **Actions**
