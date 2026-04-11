@echo off
chcp 65001 >nul
echo.
echo ████████████████████████���███
echo   Настройка Telegram бота
echo ████████████████████████████
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Python не найден!
    echo Скачайте с: https://python.org
    pause
    exit /b 1
)

echo [OK] Python найден
echo.
echo Устанавливаем зависимости...
pip install -r requirements.txt
echo.
echo [OK] Зависимости установлены
echo.
echo Для запуска выполните:
echo   set BOT_TOKEN=ваш_токен_из_BotFather
echo   set WEB_APP_URL=https://ваш_сайт/
echo   python bot.py
echo.
echo Или создайте файл ..\.env:
echo   BOT_TOKEN=ваш_токен
echo   WEB_APP_URL=https://ваш_сайт/
echo   python bot.py
echo.
pause
