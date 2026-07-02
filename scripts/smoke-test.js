// 冒烟测试 (P3-3)
// 验证所有关键 API 端点可用
// 用法: node scripts/smoke-test.js

const BASE = 'http://localhost:8080/api';
let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

async function get(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok && !data.success) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function post(path, body, opts = {}) {
  const res = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...opts.headers }, body: JSON.stringify(body), ...opts });
  const data = await res.json();
  if (!res.ok && !data.success) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function run() {
  console.log('\n🔍 提瓦特管理台 冒烟测试\n');

  // Public endpoints
  await test('登录 API', () => post('/auth/login', { username: 'admin', password: 'admin123' }));
  await test('卡池版本列表', () => get('/gacha/versions'));
  await test('物品搜索', () => get('/items?q=原石'));

  // Get auth token for protected routes
  let TOKEN;
  await test('获取 JWT Token', async () => {
    const d = await post('/auth/login', { username: 'admin', password: 'admin123' });
    TOKEN = d.token;
    if (!TOKEN) throw new Error('Token missing');
  });

  const auth = { headers: { 'Authorization': 'Bearer ' + TOKEN } };

  // Protected endpoints
  await test('状态检查', () => get('/status', auth));
  await test('代理状态', () => get('/proxy/status', auth));
  await test('卡池列表', () => get('/gacha', auth));
  await test('玩家列表', () => get('/players', auth));
  await test('审计日志', () => get('/audit', auth));
  await test('异常规则', () => get('/anomaly/rules', auth));
  await test('场景传送预设', () => get('/teleport/presets', auth));
  await test('指令模板', () => get('/commands/templates'));
  await test('系统信息', () => get('/system/info', auth));
  await test('备份列表', () => get('/backups', auth));
  await test('抽卡历史', () => get('/gacha/history/10001?limit=2', auth));
  await test('多人联机统计', () => get('/multiplayer/stats', auth));
  await test('KCP 状态', () => get('/multiplayer/kcp-status'));
  await test('性能数据', () => get('/perf', auth));
  await test('数据库集合', () => get('/database/collections', auth));

  // Banners.json validation
  await test('Banners.json 格式有效', async () => {
    const path = require('path');
    const fs = require('fs');
    const bp = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'cultivation', 'grasscutter', 'data', 'Banners.json');
    const banners = JSON.parse(fs.readFileSync(bp, 'utf-8'));
    if (!Array.isArray(banners)) throw new Error('Not an array');
    banners.forEach(b => {
      if (!b.gachaType) throw new Error('Missing gachaType');
      if (!b.scheduleId) throw new Error('Missing scheduleId');
    });
    console.log(`    (${banners.length} banners valid)`);
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
