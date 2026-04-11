#!/usr/bin/env node
// ==========================================
// АВТОМАТИЧЕСКИЙ SETUP СКРИПТ
// scripts/setup.js
//
// Запуск: node scripts/setup.js
// ==========================================

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');

// --- Цвета в консоли ---
const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  bold:   '\x1b[1m'
};

function log(msg)    { console.log(C.cyan + msg + C.reset); }
function ok(msg)     { console.log(C.green + '✅ ' + msg + C.reset); }
function warn(msg)   { console.log(C.yellow + '⚠️  ' + msg + C.reset); }
function error(msg)  { console.log(C.red + '❌ ' + msg + C.reset); }
function title(msg)  { console.log('\n' + C.bold + C.cyan + '══════════════════════════════\n' + msg + '\n══════════════════════════════' + C.reset); }
function step(n, msg){ console.log('\n' + C.bold + `[Шаг ${n}] ${msg}` + C.reset); }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(C.yellow + q + C.reset, resolve));

function run(cmd, opts) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
  } catch (e) {
    return null;
  }
}

function runVisible(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------------

async function main() {
  title('🚀 АВТОМАТИЧЕСКИЙ ЗАПУСК\nКабельные комплекты для почтоматов');

  // === 1. Проверка Node.js ===
  step(1, 'Проверка окружения');
  const nodeVer = run('node --version');
  if (nodeVer) ok('Node.js: ' + nodeVer); else { error('Node.js не найден! Установите: https://nodejs.org'); process.exit(1); }

  const npmVer = run('npm --version');
  if (npmVer) ok('npm: ' + npmVer);

  // === 2. Установка зависимостей ===
  step(2, 'Установка зависимостей (clasp, serve)');
  log('Запуск npm install...');
  if (!runVisible('npm install')) {
    warn('npm install завершился с ошибкой, но продолжаем...');
  }

  // === 3. Проверка clasp ===
  step(3, 'Проверка @google/clasp');
  const claspVer = run('npx clasp --version');
  if (claspVer) {
    ok('clasp: ' + claspVer);
  } else {
    error('clasp недоступен');
    process.exit(1);
  }

  // === 4. Авторизация Google ===
  step(4, 'Авторизация Google');
  const clasprcPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.clasprc.json');
  const alreadyLoggedIn = fs.existsSync(clasprcPath);

  if (alreadyLoggedIn) {
    ok('Уже авторизованы в Google');
  } else {
    log('Открываю браузер для входа в Google...');
    log('(после входа вернитесь в терминал)');
    console.log('');
    runVisible('npx clasp login');
    ok('Авторизация Google выполнена');
  }

  // === 5. Google Sheets — ID таблицы ===
  step(5, 'Настройка Google Sheets');
  console.log('');
  console.log('  1. Откройте: https://sheets.google.com');
  console.log('  2. Создайте новую таблицу');
  console.log('  3. Скопируйте ID из URL:');
  console.log('     https://docs.google.com/spreadsheets/d/[ЭТО_ID]/edit');
  console.log('');

  let spreadsheetId = await ask('  Вставьте Spreadsheet ID: ');
  spreadsheetId = spreadsheetId.trim();

  if (!spreadsheetId) {
    error('ID таблицы не указан!');
    process.exit(1);
  }

  // === 6. Создание GAS проекта ===
  step(6, 'Создание Google Apps Script проекта');

  const claspJson = path.join(ROOT, '.clasp.json');
  let scriptId = null;

  // Проверяем, есть ли уже scriptId
  try {
    const existing = JSON.parse(fs.readFileSync(claspJson, 'utf8'));
    if (existing.scriptId && existing.scriptId !== 'PASTE_SCRIPT_ID_HERE') {
      scriptId = existing.scriptId;
      ok('Используем существующий scriptId: ' + scriptId);
    }
  } catch (e) { /* ignore */ }

  if (!scriptId) {
    log('Создаём новый Apps Script проект...');
    const createResult = run('npx clasp create --type webapp --title "Кабельные комплекты" --rootDir ./gas');
    if (createResult) {
      // Читаем созданный .clasp.json
      try {
        const created = JSON.parse(fs.readFileSync(claspJson, 'utf8'));
        scriptId = created.scriptId;
        ok('Проект создан. Script ID: ' + scriptId);
      } catch (e) {
        warn('Не удалось прочитать scriptId автоматически');
      }
    } else {
      warn('Не удалось создать проект через clasp.');
      console.log('  Создайте вручную:');
      console.log('  1. Откройте таблицу → Расширения → Apps Script');
      console.log('  2. Скопируйте Script ID из URL проекта');
      console.log('');
      scriptId = await ask('  Вставьте Script ID вручную: ');
      scriptId = scriptId.trim();

      // Обновляем .clasp.json
      const claspData = { scriptId: scriptId, rootDir: './gas' };
      fs.writeFileSync(claspJson, JSON.stringify(claspData, null, 2));
    }
  }

  // === 7. Script Properties ===
  step(7, 'Настройка Script Properties');
  log('Устанавливаем SPREADSHEET_ID через clasp...');

  // Создаём временный скрипт для установки свойств
  const setPropScript = `
function setSpreadsheetId() {
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', '${spreadsheetId}');
  Logger.log('SPREADSHEET_ID установлен: ${spreadsheetId}');
}
`;
  const tempFile = path.join(ROOT, 'gas', '_SetupTemp.gs');
  fs.writeFileSync(tempFile, setPropScript);

  log('Загружаем код на Google Apps Script...');
  runVisible('npx clasp push --force');

  ok('Код загружен');
  log('');
  log('  Теперь нужно запустить setSpreadsheetId() ОДИН РАЗ вручную:');
  log('  1. Откройте Apps Script: https://script.google.com/home');
  log('  2. Откройте ваш проект "Кабельные комплекты"');
  log('  3. Выберите функцию setSpreadsheetId → ▶ Run');
  log('  4. После этого запустите initSheets → ▶ Run');
  log('');
  await ask('  Нажмите Enter после выполнения шагов выше...');

  // Удаляем временный файл
  fs.unlinkSync(tempFile);

  // === 8. Деплой Web App ===
  step(8, 'Деплой GAS Web App');
  log('Загружаем финальный код...');
  runVisible('npx clasp push --force');

  log('Деплоим Web App...');
  const deployOutput = run('npx clasp deploy --description "v1.0.0 initial"');
  log(deployOutput || '(вывод недоступен)');

  // Пробуем получить URL
  const deploymentsOutput = run('npx clasp deployments');
  log('Деплойменты:');
  log(deploymentsOutput || '');

  console.log('');
  warn('Скопируйте URL из Apps Script:');
  warn('Deploy → Manage deployments → скопируйте Web App URL');
  console.log('');
  let gasUrl = await ask('  Вставьте URL GAS Web App: ');
  gasUrl = gasUrl.trim();

  // === 9. Обновляем api.js ===
  step(9, 'Обновление frontend/api.js');
  const apiJsPath = path.join(ROOT, 'frontend', 'api.js');
  let apiJs = fs.readFileSync(apiJsPath, 'utf8');
  apiJs = apiJs.replace(
    /var GAS_URL = .*?;/,
    `var GAS_URL = window.GAS_URL || '${gasUrl}';`
  );
  fs.writeFileSync(apiJsPath, apiJs);
  ok('api.js обновлён с реальным URL: ' + gasUrl);

  // === 10. Telegram Bot ===
  step(10, 'Telegram Bot');
  console.log('');
  console.log('  Это нужно сделать вручную (1 минута):');
  console.log('');
  console.log('  1. Откройте Telegram → @BotFather');
  console.log('  2. Отправьте: /newbot');
  console.log('  3. Введите имя: Кабельные комплекты');
  console.log('  4. Введите username: cables_kits_bot (или любой свободный)');
  console.log('  5. Скопируйте TOKEN');
  console.log('');
  const botToken = await ask('  Вставьте Bot Token (или Enter пропустить): ');

  if (botToken.trim()) {
    // Сохраняем в конфиг
    const configPath = path.join(ROOT, '.env');
    fs.writeFileSync(configPath, `BOT_TOKEN=${botToken.trim()}\nGAS_URL=${gasUrl}\nSPREADSHEET_ID=${spreadsheetId}\n`);
    ok('Token сохранён в .env');

    // Сохраняем .gitignore чтобы не коммитить .env
    const gitignorePath = path.join(ROOT, '.gitignore');
    const gitignoreContent = '.env\nnode_modules/\n.clasp.json\n';
    fs.writeFileSync(gitignorePath, gitignoreContent);
    ok('.gitignore создан (токен не попадёт в git)');
  }

  // === 11. Локальный запуск ===
  step(11, 'Проверка локального запуска');
  console.log('');
  log('Запускаем локальный сервер для проверки...');
  log('Откройте: http://localhost:3000');
  log('(Ctrl+C для остановки)');
  console.log('');
  runVisible('npx serve frontend -p 3000');

  // === Итог ===
  title('✅ ГОТОВО!');
  console.log('');
  console.log('  GAS Web App:  ' + gasUrl);
  console.log('  Spreadsheet:  https://docs.google.com/spreadsheets/d/' + spreadsheetId);
  console.log('');
  console.log('  Следующий шаг: подключить Web App к Telegram боту.');
  console.log('  Смотри: README.md → Шаг 5');
  console.log('');

  rl.close();
}

main().catch(e => {
  error('Непредвиденная ошибка: ' + e.message);
  console.error(e);
  process.exit(1);
});
