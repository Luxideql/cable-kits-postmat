#!/usr/bin/env node
// ==========================================
// Создаёт GitHub репозиторий и делает git push
// Запуск: node scripts/create-github-repo.js TOKEN
// ==========================================

const { execSync } = require('child_process');
const https = require('https');
const path  = require('path');
const fs    = require('fs');

const ROOT      = path.join(__dirname, '..');
const REPO_NAME = 'cable-kits-postmat';
const TOKEN     = process.argv[2];

if (!TOKEN) {
  console.error('Укажите токен: node scripts/create-github-repo.js YOUR_TOKEN');
  process.exit(1);
}

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path:     endpoint,
      method:   method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept':        'application/vnd.github+json',
        'User-Agent':    'cable-kits-setup',
        'Content-Type':  'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch(e) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
}

function runVisible(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

async function main() {
  console.log('\n🚀 Создаём GitHub репозиторий...\n');

  // 1. Получаем имя пользователя
  const userResp = await apiRequest('GET', '/user');
  if (userResp.status !== 200) {
    console.error('❌ Ошибка авторизации:', userResp.body.message);
    console.error('   Проверьте токен и права (нужен scope: repo)');
    process.exit(1);
  }
  const username = userResp.body.login;
  console.log(`✅ Авторизован как: ${username}`);

  // 2. Создаём репозиторий
  console.log(`\n📦 Создаём репозиторий: ${REPO_NAME}...`);
  const createResp = await apiRequest('POST', '/user/repos', {
    name:        REPO_NAME,
    description: 'Telegram Web App — учёт кабельных комплектов для почтоматов',
    private:     false,
    auto_init:   false
  });

  let repoUrl;
  if (createResp.status === 201) {
    repoUrl = createResp.body.html_url;
    console.log(`✅ Репозиторий создан: ${repoUrl}`);
  } else if (createResp.status === 422) {
    // Уже существует
    repoUrl = `https://github.com/${username}/${REPO_NAME}`;
    console.log(`⚠️  Репозиторий уже существует: ${repoUrl}`);
  } else {
    console.error('❌ Ошибка создания:', JSON.stringify(createResp.body));
    process.exit(1);
  }

  const remoteUrl = `https://${TOKEN}@github.com/${username}/${REPO_NAME}.git`;
  const pagesUrl  = `https://${username}.github.io/${REPO_NAME}/`;

  // 3. Обновляем WEB_APP_URL в .env
  const envPath = path.join(ROOT, '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  envContent = envContent.replace(/WEB_APP_URL=.*/, `WEB_APP_URL=${pagesUrl}`);
  if (!envContent.includes('WEB_APP_URL=')) envContent += `\nWEB_APP_URL=${pagesUrl}`;
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ WEB_APP_URL в .env: ${pagesUrl}`);

  // Обновляем bot.py
  const botPath = path.join(ROOT, 'bot', 'bot.py');
  if (fs.existsSync(botPath)) {
    let botContent = fs.readFileSync(botPath, 'utf8');
    botContent = botContent.replace(
      /WEB_APP_URL = os\.environ\.get\('WEB_APP_URL', '.*?'\)/,
      `WEB_APP_URL = os.environ.get('WEB_APP_URL', '${pagesUrl}')`
    );
    fs.writeFileSync(botPath, botContent);
    console.log(`✅ bot.py обновлён с URL: ${pagesUrl}`);
  }

  // 4. Git init + push
  console.log('\n📤 Инициализируем git и делаем push...');

  // Проверяем, инициализирован ли git
  const isGitRepo = fs.existsSync(path.join(ROOT, '.git'));

  if (!isGitRepo) {
    runVisible('git init');
    runVisible('git branch -M main');
  }

  // Настраиваем remote
  try { run('git remote remove origin'); } catch(e) { /* ignore */ }
  runVisible(`git remote add origin ${remoteUrl}`);

  // Коммитим всё
  runVisible('git add .');
  try {
    runVisible('git commit -m "Initial commit — cable kits tracking system"');
  } catch(e) {
    console.log('(нечего коммитить или уже закоммичено)');
  }

  // Push
  runVisible('git push -u origin main');

  // 5. Включаем GitHub Pages через API
  console.log('\n🌐 Включаем GitHub Pages...');
  const pagesResp = await apiRequest('POST',
    `/repos/${username}/${REPO_NAME}/pages`,
    { source: { branch: 'main', path: '/frontend' } }
  );

  if (pagesResp.status === 201 || pagesResp.status === 409) {
    console.log(`✅ GitHub Pages включены`);
  } else {
    console.log(`⚠️  Pages API: ${pagesResp.status} — включите вручную:`);
    console.log(`   ${repoUrl}/settings/pages`);
    console.log(`   Source: main / /frontend`);
  }

  // 6. Добавляем секрет GAS_URL (если уже есть в .env)
  const gasUrl = envContent.match(/GAS_URL=(https?:\/\/\S+)/)?.[1];
  if (gasUrl) {
    console.log('\n🔑 Добавляем секрет GAS_URL в GitHub...');
    // Для добавления секрета нужен public key репо
    const keyResp = await apiRequest('GET', `/repos/${username}/${REPO_NAME}/actions/secrets/public-key`);
    if (keyResp.status === 200) {
      // Шифрование требует libsodium — пропускаем, даём инструкцию
      console.log(`⚠️  Добавьте секрет вручную:`);
      console.log(`   ${repoUrl}/settings/secrets/actions/new`);
      console.log(`   Name: GAS_URL`);
      console.log(`   Value: ${gasUrl}`);
    }
  }

  // Итог
  console.log('\n' + '═'.repeat(50));
  console.log('✅ ГОТОВО!');
  console.log('═'.repeat(50));
  console.log(`\n  Репозиторий: ${repoUrl}`);
  console.log(`  Pages URL:   ${pagesUrl}`);
  console.log(`  (Pages будут доступны через ~1 минуту)\n`);

  // Сохраняем данные в конфиг
  const configPath = path.join(ROOT, 'deploy-config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    username, repoName: REPO_NAME, repoUrl, pagesUrl,
    createdAt: new Date().toISOString()
  }, null, 2));

  console.log(`  Следующий шаг:`);
  console.log(`  Добавьте секрет GAS_URL после деплоя GAS:`);
  console.log(`  ${repoUrl}/settings/secrets/actions/new\n`);
}

main().catch(e => {
  console.error('❌ Ошибка:', e.message);
  process.exit(1);
});
