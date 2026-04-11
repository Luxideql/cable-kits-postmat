#!/usr/bin/env node
// ==========================================
// Обновляет GAS_URL в frontend/api.js
// Запуск: node scripts/set-webapp-url.js https://script.google.com/...
// ==========================================

const fs   = require('fs');
const path = require('path');

const url = process.argv[2];
if (!url || !url.startsWith('https://')) {
  console.error('Использование: node scripts/set-webapp-url.js https://script.google.com/macros/s/.../exec');
  process.exit(1);
}

const apiJsPath = path.join(__dirname, '..', 'frontend', 'api.js');
let content     = fs.readFileSync(apiJsPath, 'utf8');

const before = content.match(/var GAS_URL = .*?;/)?.[0] || '(не найдено)';
content = content.replace(
  /var GAS_URL = .*?;/,
  `var GAS_URL = window.GAS_URL || '${url}';`
);

fs.writeFileSync(apiJsPath, content);
console.log('✅ api.js обновлён');
console.log('   Было:  ' + before);
console.log('   Стало: var GAS_URL = window.GAS_URL || \'' + url + '\';');
