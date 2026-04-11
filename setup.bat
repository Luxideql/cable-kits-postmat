@echo off
chcp 65001 >nul
echo.
echo ██████████████████████████���███████████████
echo   АВТОМАТИЧЕСКИЙ ЗАПУСК СИСТЕМЫ
echo   Кабельные комплекты для почтоматов
echo ██████████████████████████████████████████
echo.

:: Проверяем Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден!
    echo Скачайте с: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js найден

:: Проверяем npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] npm не найден!
    pause
    exit /b 1
)
echo [OK] npm найден

echo.
echo Устанавливаем зависимости...
call npm install

echo.
echo Запускаем интерактивный setup...
call node scripts/setup.js

pause
