# ESP32 Starter

Минимальный стартовый проект для ESP32 на `PlatformIO` и `Arduino framework`.

## Что внутри

- Плата: `esp32dev`
- Фреймворк: `arduino`
- Порт монитора: `115200`
- Пример: мигание светодиодом на `GPIO2` и вывод сообщений в Serial

## Структура

- `platformio.ini` - конфигурация проекта
- `src/main.cpp` - основная прошивка

## Как запустить

1. Открой папку `esp32-starter` в VS Code.
2. Установи расширение `PlatformIO IDE`, если его еще нет.
3. Подключи ESP32 по USB.
4. Собери проект: `PlatformIO: Build`
5. Прошей плату: `PlatformIO: Upload`
6. Открой монитор порта: `PlatformIO: Monitor`

## Команды CLI

Если `pio` установлен в системе:

```bash
pio run
pio run -t upload
pio device monitor
```

## Важно

На некоторых платах встроенный светодиод может быть не на `GPIO2`. Если светодиод не мигает, поменяй `kLedPin` в `src/main.cpp`.
