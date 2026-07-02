const API_BASE = 'http://localhost:8080/api';
let currentConfig = null;

// ===== Theme =====
function initTheme() {
  const saved = localStorage.getItem('teyvat_theme');
  const isDark = saved === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = isDark ? '\u2600\uFE0F 亮色' : '\uD83C\uDF19 暗色';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const isDark = current !== 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
  localStorage.setItem('teyvat_theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = isDark ? '\u2600\uFE0F 亮色' : '\uD83C\uDF19 暗色';
}

// ===== Auth =====
function getToken() { return localStorage.getItem('teyvat_token'); }
function getAuthHeaders() {
  const token = getToken();
  return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

let userPermissions = [];

async function loadPermissions() {
  try {
    const res = await fetch(API_BASE + '/auth/me');
    const data = await res.json();
    if (data.success) {
      userPermissions = data.permissions || [];
      localStorage.setItem('teyvat_perms', JSON.stringify(userPermissions));
    }
  } catch {}
}

function hasPerm(perm) {
  if (!userPermissions.length) {
    const cached = localStorage.getItem('teyvat_perms');
    if (cached) userPermissions = JSON.parse(cached);
  }
  return userPermissions.includes('*') || userPermissions.includes(perm);
}

function applyPermissions() {
  // 侧边栏权限控制
  const navMap = {
    'players': 'players',
    'gacha': 'gacha',
    'activities': 'activities',
    'items': 'items',
    'plugins': 'plugins',
    'logs': 'logs',
    'database': 'database',
    'config': 'config',
    'proxy': 'proxy'
  };
  Object.entries(navMap).forEach(([page, perm]) => {
    const el = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (el && !hasPerm(perm)) el.style.display = 'none';
  });
}

function checkLogin() {
  const token = getToken();
  if (!token) { window.location.href = '/login.html'; return false; }
  const user = JSON.parse(localStorage.getItem('teyvat_user') || '{}');
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  if (nameEl) nameEl.textContent = user.username || '未知';
  if (roleEl) { roleEl.textContent = user.role || '--'; roleEl.className = 'badge badge-green'; }
  return true;
}

function logout() {
  localStorage.removeItem('teyvat_token');
  localStorage.removeItem('teyvat_user');
  window.location.href = '/login.html';
}

// 所有 API 请求自动附加 Token
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  if (typeof url === 'string' && url.startsWith(API_BASE)) {
    const token = getToken();
    if (token) {
      options.headers = options.headers || {};
      if (!options.headers['Authorization']) {
        options.headers['Authorization'] = 'Bearer ' + token;
      }
    }
  }
  return originalFetch(url, options);
};

// Page switching
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('page-' + item.dataset.page).classList.add('active');

    const pageNames = {
      'dashboard': '仪表盘', 'proxy': '代理状态', 'gacha': '卡池编辑器',
      'items': '物品浏览器', 'players': '玩家管理', 'logs': '日志中心',
      'database': '数据库工具', 'config': '配置管理', 'security': '权限与安全',
      'gacha-history': '抽卡历史', 'multiplayer': '多人联机', 'quests': '剧情任务', 'activities': '活动系统', 'game-data': '游戏数据', 'plugins': '插件管理'
    };
    const groupNames = {
      'dashboard': '概览', 'proxy': '游戏管理', 'gacha': '游戏管理',
      'items': '游戏管理', 'gacha-history': '游戏管理', 'multiplayer': '游戏管理', 'players': '游戏管理', 'quests': '游戏管理',
      'logs': '系统', 'database': '系统', 'config': '系统', 'security': '系统',
      'activities': '游戏管理', 'game-data': '游戏管理', 'plugins': '系统'
    };
    document.getElementById('breadcrumb').innerHTML =
      groupNames[item.dataset.page] + ' / <strong>' + pageNames[item.dataset.page] + '</strong>';

    if (item.dataset.page === 'config') loadConfig();
    if (item.dataset.page === 'database') { loadBackups(); loadDBStats(); }
    if (item.dataset.page === 'players') loadPlayers();
    if (item.dataset.page === 'logs') loadSystemLogs();
    if (item.dataset.page === 'gacha') loadGacha();
    if (item.dataset.page === 'proxy') { checkCert(); checkGamePath(); }
    if (item.dataset.page === 'plugins') loadPlugins();
    if (item.dataset.page === 'items') loadItems();
    if (item.dataset.page === 'activities') loadActivitiesPage();
    if (item.dataset.page === 'gacha-history') loadGachaHistory();
    if (item.dataset.page === 'multiplayer') { loadMultiplayer(); }
    if (item.dataset.page === 'security') { loadAuditLog(); loadAnomalyAlerts(); }
    if (item.dataset.page === 'quests') loadQuests();
    if (item.dataset.page === 'game-data') loadGameDataFiles();
  });
});

// Tab switching
function switchTab(tabEl, contentId) {
  const parent = tabEl.parentElement;
  parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabEl.classList.add('active');
  parent.parentElement.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(contentId).style.display = 'block';
}

// Server Status
async function checkStatus() {
  try {
    const res = await fetch(API_BASE + '/status');
    const data = await res.json();
    updateStatusUI(data);
  } catch { updateStatusUI({ running: false }); }
}

function updateStatusUI(data) {
  const gcRunning = data.grasscutter?.running || data.running;
  const mongoRunning = data.mongodb?.running || false;

  // Topbar status
  const pill = document.getElementById('statusPill');
  const text = document.getElementById('statusText');
  const btn = document.getElementById('serverBtn');
  if (gcRunning) {
    pill.className = 'status-chip on';
    text.textContent = '服务端运行中';
    btn.textContent = '停止服务';
    btn.className = 'btn primary';
  } else {
    pill.className = 'status-chip';
    text.textContent = '服务端已停止';
    btn.textContent = '启动服务';
    btn.className = 'btn';
  }

  // Dashboard service console
  const mongoBadge = document.getElementById('mongoStatusText');
  const gcBadge = document.getElementById('gcStatusText');
  const proxyBadge = document.getElementById('proxyStatusText');
  const startBtn = document.getElementById('startAllBtn');
  const stopBtn = document.getElementById('stopAllBtn');

  if (mongoBadge) {
    mongoBadge.className = 'badge ' + (mongoRunning ? 'badge-green' : 'badge-red');
    mongoBadge.textContent = mongoRunning ? '运行中' : '已停止';
  }
  if (gcBadge) {
    gcBadge.className = 'badge ' + (gcRunning ? 'badge-green' : 'badge-red');
    gcBadge.textContent = gcRunning ? '运行中' : '已停止';
  }
  if (proxyBadge) {
    const proxyRunning = data.proxy?.running || false;
    proxyBadge.className = 'badge ' + (proxyRunning ? 'badge-green' : 'badge-red');
    proxyBadge.textContent = proxyRunning ? '运行中' : '已停止';
  }
  if (startBtn && stopBtn) {
    if (mongoRunning && gcRunning) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'inline-block';
    } else {
      startBtn.style.display = 'inline-block';
      stopBtn.style.display = 'none';
    }
  }

  // Proxy page buttons — always clickable
  const proxyStartBtn = document.getElementById('proxyStartBtn');
  const proxySystemStatus = document.getElementById('proxySystemStatus');
  const proxyWarning = document.getElementById('proxyWarning');
  if (proxyStartBtn && data.proxy) {
    proxyStartBtn.disabled = false;
    if (data.proxy.running) {
      proxyStartBtn.textContent = '停止代理';
      proxyStartBtn.className = 'btn';
      if (proxyWarning) proxyWarning.style.display = 'none';
    } else {
      proxyStartBtn.textContent = '启动代理';
      proxyStartBtn.className = 'btn primary';
      if (proxyWarning) proxyWarning.style.display = 'none';
    }
  }
  if (proxySystemStatus && data.proxy) {
    proxySystemStatus.className = 'badge ' + (data.proxy.running ? 'badge-green' : 'badge-yellow');
    proxySystemStatus.textContent = data.proxy.running ? '已启用 (127.0.0.1:' + data.proxy.port + ')' : '未启用';
  }
}

async function toggleServer() {
  const isRunning = document.getElementById('statusPill').classList.contains('on');
  try {
    const res = await fetch(API_BASE + '/server/' + (isRunning ? 'stop' : 'start'), { method: 'POST' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    setTimeout(checkStatus, 1500);
  } catch (err) { showToast('请求失败: ' + err.message, 'error'); }
}

// 一键启动所有服务
async function startAllServices() {
  const btn = document.getElementById('startAllBtn');
  if (btn) { btn.disabled = true; btn.textContent = '启动中...'; }
  try {
    const res = await fetch(API_BASE + '/server/start-all', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      const details = data.details.map(d => d.service + ': ' + (d.status === 'started' ? '已启动' : d.status === 'already-running' ? '已在运行' : '失败')).join(', ');
      showToast('一键启动完成 — ' + details, 'success');
    } else {
      showToast('启动失败: ' + (data.details?.find(d => d.status === 'failed')?.error || data.message), 'error');
    }
    setTimeout(checkStatus, 2000);
  } catch (err) { showToast('请求失败: ' + err.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '\u25B6 一键启动'; } }
}

// 一键停止所有服务
async function stopAllServices() {
  const btn = document.getElementById('stopAllBtn');
  if (btn) { btn.disabled = true; btn.textContent = '停止中...'; }
  try {
    const res = await fetch(API_BASE + '/server/stop-all', { method: 'POST' });
    const data = await res.json();
    showToast(data.message, 'success');
    setTimeout(checkStatus, 2000);
  } catch (err) { showToast('请求失败: ' + err.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '\u25A0 一键停止'; } }
}

// Config Editor — with real editable inputs
async function loadConfig() {
  const genForm = document.getElementById('cfgGeneralForm');
  const gameForm = document.getElementById('cfgGameForm');
  const netForm = document.getElementById('cfgNetForm');
  genForm.innerHTML = '<div class="loading-msg">加载中...</div>';
  gameForm.innerHTML = '<div class="loading-msg">加载中...</div>';
  netForm.innerHTML = '<div class="loading-msg">加载中...</div>';
  try {
    const res = await fetch(API_BASE + '/config');
    const result = await res.json();
    if (!result.success) { genForm.innerHTML = '<div class="loading-msg" style="color:var(--danger);">加载失败</div>'; return; }
    currentConfig = result.data;
    const s = currentConfig.server || {};
    const g = currentConfig.game || {};
    const q = currentConfig.game?.questing || {};

    genForm.innerHTML = '<div>' +
      fieldInput('服务器名称', 'cfg_name', s.name || '', 'text') +
      fieldSelect('语言', 'cfg_language', s.language || 'zh_CN', [['zh_CN','简体中文'],['en_US','English']]) +
      fieldInput('最大在线人数', 'cfg_maxPlayers', s.maxPlayers != null ? s.maxPlayers : -1, 'number', '-1 表示无限制') +
      fieldToggle('自动创建账号', 'cfg_autoCreate', s.autoCreate !== false) +
      '</div>';

    gameForm.innerHTML = '<div>' +
      fieldToggle('无限体力', 'cfg_stamina', !!g.enableStamina) +
      fieldToggle('剧情系统', 'cfg_questing', q.enabled !== false) +
      fieldInput('世界等级上限', 'cfg_worldLevel', g.worldLevel || 8, 'number') +
      fieldTextarea('欢迎消息', 'cfg_welcomeMsg', s.welcomeMessage || '') +
      '</div>';

    netForm.innerHTML = '<div>' +
      fieldInput('游戏服务器端口', 'cfg_gamePort', s.game?.bindPort || 22102, 'number') +
      fieldInput('Dispatch 端口', 'cfg_dispatchPort', s.dispatch?.bindPort || 443, 'number') +
      fieldInput('HTTP API 端口', 'cfg_httpPort', s.http?.bindPort || 8080, 'number') +
      fieldToggle('启用 HTTPS', 'cfg_https', !!s.http?.useEncryption) +
      '</div>';

    // Also update raw JSON
    const rawEl = document.getElementById('cfgRawJson');
    if (rawEl) rawEl.value = JSON.stringify(currentConfig, null, 2);
  } catch { genForm.innerHTML = '<div class="loading-msg" style="color:var(--danger);">无法连接后端</div>'; }
}

function fieldInput(label, id, value, type, hint) {
  return '<div class="form-group"><label class="form-label">' + label + '</label>' +
    '<input type="' + (type||'text') + '" class="form-input" id="' + id + '" value="' + (value!=null?value:'') + '">' +
    (hint ? '<p class="form-hint">' + hint + '</p>' : '') + '</div>';
}

function fieldTextarea(label, id, value) {
  return '<div class="form-group"><label class="form-label">' + label + '</label>' +
    '<textarea class="form-input" rows="3" id="' + id + '">' + (value||'') + '</textarea></div>';
}

function fieldSelect(label, id, val, options) {
  const opts = options.map(o => '<option value="'+o[0]+'"'+(val===o[0]?' selected':'')+'>'+o[1]+'</option>').join('');
  return '<div class="form-group"><label class="form-label">' + label + '</label>' +
    '<select class="form-input" id="' + id + '">' + opts + '</select></div>';
}

function fieldToggle(label, id, on) {
  return '<div class="form-group"><label class="form-label">' + label + '</label>' +
    '<div class="toggle ' + (on ? 'on' : '') + '" id="' + id + '" onclick="this.classList.toggle(\'on\')">' +
    '<div class="toggle-track"></div><span>' + (on ? '开启' : '关闭') + '</span></div></div>';
}

function isToggleOn(id) {
  const el = document.getElementById(id);
  return el ? el.classList.contains('on') : false;
}

async function saveConfig() {
  if (!currentConfig) { showToast('请先加载配置', 'error'); return; }

  const data = JSON.parse(JSON.stringify(currentConfig));
  data.server.name = document.getElementById('cfg_name')?.value || data.server.name;
  data.server.language = document.getElementById('cfg_language')?.value || data.server.language;
  data.server.maxPlayers = parseInt(document.getElementById('cfg_maxPlayers')?.value) || -1;
  data.server.autoCreate = isToggleOn('cfg_autoCreate');
  data.game.enableStamina = isToggleOn('cfg_stamina');
  if (!data.game.questing) data.game.questing = {};
  data.game.questing.enabled = isToggleOn('cfg_questing');
  data.game.worldLevel = parseInt(document.getElementById('cfg_worldLevel')?.value) || 8;
  data.server.welcomeMessage = document.getElementById('cfg_welcomeMsg')?.value || '';
  if (!data.server.game) data.server.game = {};
  data.server.game.bindPort = parseInt(document.getElementById('cfg_gamePort')?.value) || 22102;
  if (!data.server.dispatch) data.server.dispatch = {};
  data.server.dispatch.bindPort = parseInt(document.getElementById('cfg_dispatchPort')?.value) || 443;
  if (!data.server.http) data.server.http = {};
  data.server.http.bindPort = parseInt(document.getElementById('cfg_httpPort')?.value) || 8080;
  data.server.http.useEncryption = isToggleOn('cfg_https');

  try {
    const res = await fetch(API_BASE + '/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    showToast(result.message || '配置已保存', result.success ? 'success' : 'error');
  } catch (err) { showToast('保存失败: ' + err.message, 'error'); }
}

// Backups
async function loadBackups() {
  const list = document.getElementById('backupList');
  list.innerHTML = '<div class="empty-row">加载中...</div>';
  try {
    const res = await fetch(API_BASE + '/config/backups');
    const result = await res.json();
    if (!result.success || !result.data.length) { list.innerHTML = '<div class="empty-row">暂无备份</div>'; return; }
    list.innerHTML = result.data.map(b =>
      '<div class="card-item"><div><p style="font-weight:600;">' + b.name + '</p>' +
      '<p style="font-size:0.75rem;color:var(--muted);">' + new Date(b.time).toLocaleString() + ' | ' + (b.size/1024).toFixed(1) + ' KB</p></div>' +
      '<button class="btn btn-sm" onclick="restoreBackup(\'' + b.name + '\')">恢复</button></div>'
    ).join('');
  } catch { list.innerHTML = '<div class="empty-row">加载失败</div>'; }
}

async function restoreBackup(name) {
  if (!confirm('确定恢复备份 ' + name + '？')) return;
  try {
    const res = await fetch(API_BASE + '/config/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupName: name })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadBackups();
  } catch (err) { showToast('恢复失败', 'error'); }
}

// Modal
function showModal(id) { document.getElementById(id).classList.add('show'); }
function hideModal(id) { document.getElementById(id).classList.remove('show'); }

// Toast
function showToast(msg, type) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Copy
function copyCmd(cmd) {
  navigator.clipboard.writeText(cmd).then(() => showToast('已复制: ' + cmd, 'success'));
}

// Item search
function searchItems() {
  const term = document.getElementById('itemSearch').value.toLowerCase();
  const rows = document.getElementById('itemTableBody').querySelectorAll('tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(term) ? '' : 'none';
  });
}

// Players
async function loadPlayers() {
  const tbody = document.querySelector('#page-players .data-table tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="empty-row">加载中...</td></tr>';
  try {
    const res = await fetch(API_BASE + '/players');
    const result = await res.json();
    if (!result.success || !result.data.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-row">暂无玩家数据（请确保 MongoDB 和 Grasscutter 已启动）</td></tr>';
      return;
    }
    tbody.innerHTML = result.data.map(p => {
      const banBtn = p.banned
        ? '<button class="btn btn-sm primary" onclick="unbanPlayer(' + p.uid + ')">解封</button>'
        : '<button class="btn btn-sm" onclick="banPlayer(' + p.uid + ')">封禁</button>';
      return '<tr>' +
      '<td>' + p.uid + '</td>' +
      '<td>' + p.nickname + '</td>' +
      '<td>' + p.adventureRank + '</td>' +
      '<td>' + p.worldLevel + '</td>' +
      '<td>' + p.avatarCount + '</td>' +
      '<td>' + p.lastLogin + '</td>' +
      '<td><span class="badge ' + (p.online ? 'badge-green' : 'badge-yellow') + '">' + (p.online ? '在线' : '离线') + '</span></td>' +
      '<td>' + (p.banned ? '<span class="badge badge-red">已封禁</span>' : '<span class="badge badge-green">正常</span>') + '</td>' +
      '<td>' +
        '<button class="btn btn-sm" onclick="openGiveItemModal(' + p.uid + ',\'' + p.nickname + '\')">发物品</button> ' +
        '<button class="btn btn-sm" onclick="setPlayerLevel(' + p.uid + ')">等级</button> ' +
        '<button class="btn btn-sm" onclick="setWorldLevel(' + p.uid + ')">世界</button> ' +
        '<button class="btn btn-sm" onclick="kickPlayer(' + p.uid + ')">踢出</button> ' + banBtn +
      '</td>' +
      '</tr>';
    }).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-row">加载失败（后端未启动或 MongoDB 未连接）</td></tr>';
  }
}

async function banPlayer(uid) {
  if (!confirm('确定封禁 UID ' + uid + ' 吗？')) return;
  try {
    const res = await fetch(API_BASE + '/players/' + uid + '/ban', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    loadPlayers();
  } catch (err) { showToast('封禁失败: ' + err.message, 'error'); }
}

async function unbanPlayer(uid) {
  if (!confirm('确定解封 UID ' + uid + ' 吗？')) return;
  try {
    const res = await fetch(API_BASE + '/players/' + uid + '/unban', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    loadPlayers();
  } catch (err) { showToast('解封失败: ' + err.message, 'error'); }
}

async function kickPlayer(uid) {
  if (!confirm('确定踢出 UID ' + uid + ' 吗？')) return;
  try {
    const res = await fetch(API_BASE + '/players/' + uid + '/kick', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    loadPlayers();
  } catch (err) { showToast('操作失败: ' + err.message, 'error'); }
}

async function setPlayerLevel(uid) {
  const level = prompt('设置冒险等阶 (1-60):', '60');
  if (!level) return;
  try {
    const res = await fetch(API_BASE + '/players/' + uid + '/setlevel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: parseInt(level) })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('操作失败: ' + err.message, 'error'); }
}

async function setWorldLevel(uid) {
  const wl = prompt('设置世界等级 (0-8):', '8');
  if (!wl) return;
  try {
    const res = await fetch(API_BASE + '/players/' + uid + '/setworldlevel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worldLevel: parseInt(wl) })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('操作失败: ' + err.message, 'error'); }
}

// System Logs
async function loadSystemLogs() {
  const container = document.getElementById('log-sys');
  if (!container) return;
  const termBox = container.querySelector('.term-box');
  if (!termBox) return;
  termBox.innerHTML = '<div class="term-line"><span class="term-time">--:--:--</span><span class="term-level info">INFO</span><span>加载日志中...</span></div>';
  try {
    const res = await fetch(API_BASE + '/logs/system');
    const result = await res.json();
    if (!result.success || !result.data.length) {
      termBox.innerHTML = '<div class="term-line"><span class="term-time">--:--:--</span><span class="term-level info">INFO</span><span>暂无日志</span></div>';
      return;
    }
    termBox.innerHTML = result.data.map(l =>
      '<div class="term-line"><span class="term-time">' + (l.time || '--:--:--') + '</span>' +
      '<span class="term-level ' + l.level + '">' + l.level.toUpperCase() + '</span>' +
      '<span>' + escapeHtml(l.message) + '</span></div>'
    ).join('');
  } catch {
    termBox.innerHTML = '<div class="term-line"><span class="term-time">--:--:--</span><span class="term-level err">ERR</span><span>日志加载失败</span></div>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// Proxy toggle
async function toggleProxy() {
  const btn = document.getElementById('proxyStartBtn');
  const isRunning = btn && btn.textContent === '停止代理';
  try {
    const res = await fetch(API_BASE + '/proxy/' + (isRunning ? 'stop' : 'start'), { method: 'POST' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    setTimeout(checkStatus, 1500);
  } catch (err) { showToast('请求失败: ' + err.message, 'error'); }
}

// Certificate
async function checkCert() {
  try {
    const res = await fetch(API_BASE + '/proxy/cert');
    const data = await res.json();
    const badge = document.getElementById('certStatus');
    const btn = document.getElementById('installCertBtn');
    if (badge) {
      badge.className = 'badge ' + (data.installed ? 'badge-green' : 'badge-yellow');
      badge.textContent = data.installed ? '已安装' : '未安装';
    }
    if (btn) {
      btn.style.display = data.installed ? 'none' : 'inline-block';
    }
  } catch {}
}

async function installCert() {
  try {
    const res = await fetch(API_BASE + '/proxy/cert/install', { method: 'POST' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    checkCert();
  } catch (err) { showToast('安装失败: ' + err.message, 'error'); }
}

// Game Path - 从服务器读取已保存路径
let detectedGamePath = null;
async function checkGamePath() {
  try {
    const res = await fetch(API_BASE + '/game/path');
    const data = await res.json();
    const input = document.getElementById('gamePathInput');
    if (data.exists && data.path && input) {
      detectedGamePath = data.path;
      input.value = data.path;
    } else {
      detectedGamePath = null;
    }
  } catch {}
}

// 验证路径（支持目录自动查找 exe）
async function verifyGamePath() {
  const input = document.getElementById('gamePathInput');
  const hint = document.getElementById('gamePathHint');
  const val = input ? input.value.trim() : '';
  if (!val) { if (hint) hint.textContent = '请输入路径'; return; }
  try {
    const res = await fetch(API_BASE + '/game/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: val })
    });
    const data = await res.json();
    if (data.success) {
      detectedGamePath = data.path;
      input.value = data.path;
      if (hint) { hint.textContent = data.message; hint.style.color = 'var(--success)'; }
      showToast('路径验证成功: ' + data.path, 'success');
    } else {
      if (hint) { hint.textContent = data.message; hint.style.color = 'var(--danger)'; }
      showToast(data.message, 'error');
    }
  } catch (err) { showToast('验证失败: ' + err.message, 'error'); }
}

// ===== File Browser Dialog =====
let browseSelectedPath = null;
let browseCurrentDir = '';

async function openBrowseDialog() {
  browseSelectedPath = null;
  browseCurrentDir = '';
  showModal('browseModal');
  document.getElementById('browsePathBar').value = '';
  document.getElementById('browseUpBtn').style.display = 'none';
  await browseDir('');
}

async function browseDir(dir) {
  browseCurrentDir = dir;
  document.getElementById('browsePathBar').value = dir || '(选择驱动器)';
  document.getElementById('browseUpBtn').style.display = dir ? 'inline-block' : 'none';
  const list = document.getElementById('browseList');
  list.innerHTML = '<div class="loading-msg">加载中...</div>';

  try {
    const url = dir ? API_BASE + '/game/browse?dir=' + encodeURIComponent(dir) : API_BASE + '/game/browse';
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) { list.innerHTML = '<div class="empty-row">' + data.message + '</div>'; return; }

    if (data.type === 'drives') {
      // 显示驱动器和常见目录
      let html = '';
      if (data.drives) {
        data.drives.forEach(d => {
          html += '<div class="browse-item" onclick="browseDir(\'' + d + ':\\\\\')"><span class="browse-icon">&#128190;</span><span class="browse-name">' + d + ':\\</span></div>';
        });
      }
      if (data.commonDirs && data.commonDirs.length) {
        html += '<div class="browse-item" style="color:var(--muted);font-size:0.75rem;padding:0.3rem 0.8rem;border:0;">常见游戏目录</div>';
        data.commonDirs.forEach(d => {
          const label = d.label ? ' <span style="color:var(--accent);font-size:0.7rem;">[' + d.label + ']</span>' : '';
          html += '<div class="browse-item" onclick="browseDir(\'' + d.path.replace(/\\/g, '\\\\') + '\')"><span class="browse-icon">&#128193;</span><span class="browse-name">' + d.path + label + '</span></div>';
        });
      }
      list.innerHTML = html;
    } else if (data.type === 'listing') {
      let html = '';
      data.items.forEach(item => {
        if (item.isDir) {
          const escaped = item.path.replace(/\\/g, '\\\\');
          html += '<div class="browse-item" onclick="browseDir(\'' + escaped + '\')"><span class="browse-icon">&#128193;</span><span class="browse-name">' + item.name + '</span></div>';
        } else if (item.isExe) {
          const escaped = item.path.replace(/\\/g, '\\\\');
          html += '<div class="browse-item" onclick="selectBrowseItem(this, \'' + escaped + '\')" data-path="' + escaped + '"><span class="browse-icon">&#128190;</span><span class="browse-name exe">' + item.name + '</span></div>';
        }
        // 忽略非 exe 文件
      });
      if (!html) html = '<div class="empty-row">该目录为空</div>';
      list.innerHTML = html;
    }
  } catch (err) {
    list.innerHTML = '<div class="empty-row">加载失败</div>';
  }
}

function browseUp() {
  if (!browseCurrentDir) return;
  const parts = browseCurrentDir.split('\\').filter(p => p);
  parts.pop();
  const parent = parts.length > 0 ? parts.join('\\') : '';
  if (parent) {
    browseDir(parent);
  } else {
    browseDir('');
  }
}

function selectBrowseItem(el, filePath) {
  document.querySelectorAll('#browseList .browse-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  browseSelectedPath = filePath;
  document.getElementById('browseSelectBtn').textContent = '选择: ' + filePath.split('\\').pop();
}

function selectBrowsedPath() {
  if (!browseSelectedPath) { showToast('请先选择一个 exe 文件', 'error'); return; }
  detectedGamePath = browseSelectedPath;
  document.getElementById('gamePathInput').value = browseSelectedPath;
  hideModal('browseModal');
  // 保存路径到服务器
  fetch(API_BASE + '/game/path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: browseSelectedPath })
  });
  showToast('已选择并保存: ' + browseSelectedPath, 'success');
}

// Launch Game
async function launchGame() {
  const customPath = document.getElementById('gamePathInput')?.value;
  if (customPath) detectedGamePath = customPath;
  if (!detectedGamePath) {
    showToast('请先设置游戏客户端路径', 'error');
    return;
  }
  try {
    const res = await fetch(API_BASE + '/game/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: detectedGamePath })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('启动失败: ' + err.message, 'error'); }
}

// ===== GM Commands =====
let gmTargetUid = '10001';
function updateGmTarget() {
  gmTargetUid = document.getElementById('gmTargetUid')?.value || '10001';
}

async function sendGmCmd(cmd) {
  // 替换 {uid} 占位符
  const resolved = cmd.replace(/\{uid\}/g, gmTargetUid);
  // 去掉前导 / （GC 不需要）
  const gcCmd = resolved.startsWith('/') ? resolved.slice(1) : resolved;
  try {
    const res = await fetch(API_BASE + '/server/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: gcCmd })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    appendGmLog(cmd, data.success);
  } catch (err) { showToast('发送失败: ' + err.message, 'error'); }
}

async function sendCustomGmCmd() {
  const input = document.getElementById('gmCmdInput');
  const cmd = input ? input.value.trim() : '';
  if (!cmd) { showToast('请输入指令', 'error'); return; }
  await sendGmCmd(cmd);
  if (input) input.value = '';
}

function appendGmLog(cmd, success) {
  const box = document.getElementById('gmLogBox');
  if (!box) return;
  const time = new Date().toLocaleTimeString();
  const level = success ? 'info' : 'error';
  const line = document.createElement('div');
  line.className = 'term-line';
  line.innerHTML = '<span class="term-time">' + time + '</span><span class="term-level ' + level + '">' + (success ? 'OK' : 'ERR') + '</span><span>' + cmd + '</span>';
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

// ===== Plugin Management =====
async function loadPlugins() {
  const list = document.getElementById('pluginsList');
  if (list) list.innerHTML = '<div class="loading-msg">加载中...</div>';
  try {
    const res = await fetch(API_BASE + '/plugins');
    const data = await res.json();
    if (!data.success || !data.plugins.length) {
      if (list) list.innerHTML = '<div class="empty-row">暂无插件</div>';
      return;
    }
    let html = '<table class="data-table"><thead><tr><th>插件名</th><th>类型</th><th>配置</th><th>大小</th><th>操作</th></tr></thead><tbody>';
    data.plugins.forEach(p => {
      const isDisabled = p.name.endsWith('.disabled');
      const displayName = isDisabled ? p.name.replace(/\.disabled$/, '') : p.name;
      const type = p.isDir ? '文件夹' : 'JAR';
      const size = p.size ? (p.size / 1024).toFixed(0) + ' KB' : '-';
      const config = p.hasConfig ? '<span class="badge badge-green">有</span>' : '<span class="badge">无</span>';
      const status = isDisabled ? '<span class="badge badge-red">已禁用</span>' : '<span class="badge badge-green">已启用</span>';
      const btnText = isDisabled ? '启用' : '禁用';
      const btnClass = isDisabled ? 'primary' : '';
      html += '<tr><td>' + displayName + '</td><td>' + type + '</td><td>' + config + '</td><td>' + size + '</td><td>' + status + ' <button class="btn btn-sm ' + btnClass + '" onclick="togglePlugin(\'' + p.name + '\')">' + btnText + '</button></td></tr>';
    });
    html += '</tbody></table>';
    if (list) list.innerHTML = html;
  } catch (err) {
    if (list) list.innerHTML = '<div class="empty-row">加载失败</div>';
  }
}

async function togglePlugin(name) {
  try {
    const res = await fetch(API_BASE + '/plugins/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    loadPlugins();
  } catch (err) { showToast('操作失败: ' + err.message, 'error'); }
}

let currentGiveUid = null;

function openGiveItemModal(uid, nickname) {
  currentGiveUid = parseInt(uid) || 0;
  document.getElementById('giveItemTarget').value = 'UID ' + uid + ' - ' + (nickname || '未知');
  document.getElementById('giveItemId').value = '';
  document.getElementById('giveItemAmount').value = 1;
  showModal('giveItemModal');
}

async function submitGiveItem() {
  if (currentGiveUid === null || currentGiveUid === undefined) { showToast('未选择玩家', 'error'); return; }
  const itemId = document.getElementById('giveItemId').value.trim();
  const amount = parseInt(document.getElementById('giveItemAmount').value) || 1;
  if (!itemId) { showToast('请输入物品ID', 'error'); return; }

  try {
    const res = await fetch(API_BASE + '/players/' + currentGiveUid + '/give', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: parseInt(itemId), amount: amount })
    });
    const data = await res.json();
    hideModal('giveItemModal');
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('发放失败: ' + err.message, 'error'); }
}

function viewPlayer(uid) {
  showToast('查看玩家 UID ' + uid + ' 的详情（开发中）', 'info');
}

// ===== Activity System =====
let activityData = [];
let announcementData = [];
let gameAnnouncementData = { t: '{{SYSTEM_TIME}}', list: [], total: 0 };

function switchActivityTab(tab) {
  document.querySelectorAll('#page-activities .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#page-activities .tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('#page-activities .tab[data-tab="' + tab + '"]').classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

async function loadActivitiesPage() {
  await loadActivities();
  await loadAnnouncements();
  await loadGameAnnouncements();
}

async function loadActivities() {
  const el = document.getElementById('activitiesEditor');
  if (!el) return;
  try {
    const res = await fetch(API_BASE + '/activities');
    const data = await res.json();
    activityData = data.activities || [];
    renderActivities();
  } catch (err) { el.innerHTML = '<div class="empty-row">加载失败</div>'; }
}

function renderActivities() {
  const el = document.getElementById('activitiesEditor');
  if (!el) return;
  if (!activityData.length) { el.innerHTML = '<div class="empty-row">暂无活动</div>'; return; }
  let html = '';
  activityData.forEach((a, i) => {
    html += '<div class="activity-row">';
    html += '<div class="row-header"><span>活动 #' + (i + 1) + '</span><button class="btn btn-sm" onclick="removeActivity(' + i + ')">删除</button></div>';
    html += '<div class="row-fields">';
    html += '<input placeholder="activityId" value="' + (a.activityId || '') + '" onchange="updateActivity(' + i + ',\'activityId\',this.value)">';
    html += '<input placeholder="activityType" value="' + (a.activityType || '') + '" onchange="updateActivity(' + i + ',\'activityType\',this.value)">';
    html += '<input placeholder="scheduleId" value="' + (a.scheduleId || '') + '" onchange="updateActivity(' + i + ',\'scheduleId\',this.value)">';
    html += '<input placeholder="beginTime" value="' + (a.beginTime || '') + '" onchange="updateActivity(' + i + ',\'beginTime\',this.value)">';
    html += '<input placeholder="endTime" value="' + (a.endTime || '') + '" onchange="updateActivity(' + i + ',\'endTime\',this.value)">';
    html += '<input placeholder="meetCondList (逗号分隔)" value="' + (a.meetCondList || []).join(',') + '" onchange="updateActivity(' + i + ',\'meetCondList\',this.value)">';
    html += '</div></div>';
  });
  el.innerHTML = html;
}

function updateActivity(index, field, value) {
  if (!activityData[index]) return;
  if (field === 'meetCondList') {
    activityData[index][field] = value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  } else if (['activityId','activityType','scheduleId'].includes(field)) {
    activityData[index][field] = parseInt(value) || value;
  } else {
    activityData[index][field] = value;
  }
}

function addActivity() {
  activityData.push({ activityId: 5001, activityType: 1, scheduleId: 5001001, meetCondList: [], beginTime: '2024-01-01T00:00:00+08:00', endTime: '2025-01-01T00:00:00+08:00' });
  renderActivities();
}

function removeActivity(index) {
  activityData.splice(index, 1);
  renderActivities();
}

async function saveActivities() {
  try {
    const res = await fetch(API_BASE + '/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: activityData })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('保存失败: ' + err.message, 'error'); }
}

async function loadAnnouncements() {
  const el = document.getElementById('announcementsEditor');
  if (!el) return;
  try {
    const res = await fetch(API_BASE + '/announcements');
    const data = await res.json();
    announcementData = data.announcements || [];
    renderAnnouncements();
  } catch (err) { el.innerHTML = '<div class="empty-row">加载失败</div>'; }
}

function renderAnnouncements() {
  const el = document.getElementById('announcementsEditor');
  if (!el) return;
  if (!announcementData.length) { el.innerHTML = '<div class="empty-row">暂无公告</div>'; return; }
  let html = '';
  announcementData.forEach((a, i) => {
    html += '<div class="activity-row">';
    html += '<div class="row-header"><span>公告 #' + (i + 1) + '</span><button class="btn btn-sm" onclick="removeAnnouncement(' + i + ')">删除</button></div>';
    html += '<div class="row-fields">';
    html += '<input placeholder="templateId" value="' + (a.templateId || '') + '" onchange="updateAnnouncement(' + i + ',\'templateId\',this.value)">';
    html += '<input placeholder="type (CENTER/COUNTDOWN)" value="' + (a.type || '') + '" onchange="updateAnnouncement(' + i + ',\'type\',this.value)">';
    html += '<input placeholder="frequency" value="' + (a.frequency || '') + '" onchange="updateAnnouncement(' + i + ',\'frequency\',this.value)">';
    html += '<input placeholder="beginTime" value="' + (a.beginTime || '') + '" onchange="updateAnnouncement(' + i + ',\'beginTime\',this.value)">';
    html += '<input placeholder="endTime" value="' + (a.endTime || '') + '" onchange="updateAnnouncement(' + i + ',\'endTime\',this.value)">';
    html += '<input placeholder="interval" value="' + (a.interval || '') + '" onchange="updateAnnouncement(' + i + ',\'interval\',this.value)">';
    html += '</div>';
    html += '<input placeholder="content" value="' + (a.content || '').replace(/"/g, '&quot;') + '" onchange="updateAnnouncement(' + i + ',\'content\',this.value)" style="width:100%;margin-top:0.5rem;">';
    html += '</div>';
  });
  el.innerHTML = html;
}

function updateAnnouncement(index, field, value) {
  if (!announcementData[index]) return;
  if (['templateId','frequency','interval'].includes(field)) {
    announcementData[index][field] = parseInt(value) || value;
  } else {
    announcementData[index][field] = value;
  }
}

function addAnnouncement() {
  announcementData.push({ templateId: 1, type: 'CENTER', frequency: 1, content: 'Welcome!', beginTime: '2024-01-01T00:00:00+08:00', endTime: '2025-01-01T00:00:00+08:00', tick: false, interval: 1 });
  renderAnnouncements();
}

function removeAnnouncement(index) {
  announcementData.splice(index, 1);
  renderAnnouncements();
}

async function saveAnnouncements() {
  try {
    const res = await fetch(API_BASE + '/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcements: announcementData })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('保存失败: ' + err.message, 'error'); }
}

async function loadGameAnnouncements() {
  const el = document.getElementById('gameAnnouncementsEditor');
  if (!el) return;
  try {
    const res = await fetch(API_BASE + '/game-announcements');
    const data = await res.json();
    gameAnnouncementData = data.data || { t: '{{SYSTEM_TIME}}', list: [], total: 0 };
    renderGameAnnouncements();
  } catch (err) { el.innerHTML = '<div class="empty-row">加载失败</div>'; }
}

function renderGameAnnouncements() {
  const el = document.getElementById('gameAnnouncementsEditor');
  if (!el) return;
  const list = gameAnnouncementData.list || [];
  if (!list.length) { el.innerHTML = '<div class="empty-row">暂无游戏公告</div>'; return; }
  let html = '';
  list.forEach((a, i) => {
    html += '<div class="activity-row">';
    html += '<div class="row-header"><span>公告 #' + (i + 1) + '</span><button class="btn btn-sm" onclick="removeGameAnnouncement(' + i + ')">删除</button></div>';
    html += '<div class="row-fields">';
    html += '<input placeholder="ann_id" value="' + (a.ann_id || '') + '" onchange="updateGameAnnouncement(' + i + ',\'ann_id\',this.value)">';
    html += '<input placeholder="lang" value="' + (a.lang || '') + '" onchange="updateGameAnnouncement(' + i + ',\'lang\',this.value)">';
    html += '<input placeholder="subtitle" value="' + (a.subtitle || '').replace(/"/g, '&quot;') + '" onchange="updateGameAnnouncement(' + i + ',\'subtitle\',this.value)">';
    html += '</div>';
    html += '<input placeholder="title" value="' + (a.title || '').replace(/"/g, '&quot;') + '" onchange="updateGameAnnouncement(' + i + ',\'title\',this.value)" style="width:100%;margin-top:0.5rem;">';
    html += '<input placeholder="banner URL" value="' + (a.banner || '').replace(/"/g, '&quot;') + '" onchange="updateGameAnnouncement(' + i + ',\'banner\',this.value)" style="width:100%;margin-top:0.5rem;">';
    html += '<textarea placeholder="content (HTML)" onchange="updateGameAnnouncement(' + i + ',\'content\',this.value)" style="width:100%;margin-top:0.5rem;background:var(--bg2);border:1px solid var(--rule);border-radius:4px;padding:0.35rem 0.5rem;color:var(--ink);font-size:0.8rem;min-height:60px;font-family:inherit;">' + (a.content || '') + '</textarea>';
    html += '</div>';
  });
  el.innerHTML = html;
}

function updateGameAnnouncement(index, field, value) {
  if (!gameAnnouncementData.list[index]) return;
  if (field === 'ann_id') {
    gameAnnouncementData.list[index][field] = parseInt(value) || value;
  } else {
    gameAnnouncementData.list[index][field] = value;
  }
  gameAnnouncementData.total = gameAnnouncementData.list.length;
}

function addGameAnnouncement() {
  if (!gameAnnouncementData.list) gameAnnouncementData.list = [];
  gameAnnouncementData.list.push({ ann_id: gameAnnouncementData.list.length + 1, title: 'New Announcement', subtitle: 'Subtitle', banner: '', content: '<p>Content</p>', lang: 'zh-CN' });
  gameAnnouncementData.total = gameAnnouncementData.list.length;
  renderGameAnnouncements();
}

function removeGameAnnouncement(index) {
  gameAnnouncementData.list.splice(index, 1);
  gameAnnouncementData.total = gameAnnouncementData.list.length;
  renderGameAnnouncements();
}

async function saveGameAnnouncements() {
  try {
    const res = await fetch(API_BASE + '/game-announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: gameAnnouncementData })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('保存失败: ' + err.message, 'error'); }
}

// ===== Item Browser =====
let itemCategories = [];
let allItems = [];

async function loadItems() {
  const list = document.getElementById('itemsList');
  if (list) list.innerHTML = '<div class="loading-msg">加载中...</div>';
  try {
    const res = await fetch(API_BASE + '/items');
    const data = await res.json();
    if (!data.success) { if (list) list.innerHTML = '<div class="empty-row">加载失败</div>'; return; }
    itemCategories = data.categories || [];
    allItems = data.items || [];
    // 填充分类下拉框
    const sel = document.getElementById('itemCategory');
    if (sel) {
      sel.innerHTML = '<option value="">全部分类</option>';
      itemCategories.forEach(c => {
        sel.innerHTML += '<option value="' + c.id + '">' + c.name + '</option>';
      });
    }
    renderItems(allItems);
  } catch (err) {
    if (list) list.innerHTML = '<div class="empty-row">加载失败</div>';
  }
}

function renderItems(items) {
  const list = document.getElementById('itemsList');
  if (!list) return;
  if (!items.length) { list.innerHTML = '<div class="empty-row">未找到物品</div>'; return; }
  let html = '<table class="data-table"><thead><tr><th>ID</th><th>名称</th><th>分类</th><th>稀有度</th><th>GM 指令</th></tr></thead><tbody>';
  items.forEach(item => {
    const catName = itemCategories.find(c => c.id === item.category)?.name || item.category;
    const stars = '&#11088;'.repeat(item.rarity || 1);
    const cmd = '/give ' + item.id + ' x1';
    html += '<tr><td><code>' + item.id + '</code></td><td>' + item.name + '</td><td>' + catName + '</td><td>' + stars + '</td><td><button class="btn btn-sm" onclick="sendGmCmd(\'' + cmd + '\')">发送</button></td></tr>';
  });
  html += '</tbody></table>';
  list.innerHTML = html;
}

async function searchItems() {
  const q = document.getElementById('itemSearch')?.value.trim() || '';
  const cat = document.getElementById('itemCategory')?.value || '';
  try {
    const url = API_BASE + '/items?q=' + encodeURIComponent(q) + (cat ? '&category=' + encodeURIComponent(cat) : '');
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) renderItems(data.items || []);
  } catch (err) {}
}

// 自动恢复开关
async function toggleAutoRecover(cb) {
  try {
    const res = await fetch(API_BASE + '/proxy/autorecover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: cb.checked })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('设置失败: ' + err.message, 'error'); }
}

// 更新代理统计
async function updateProxyStats() {
  try {
    const res = await fetch(API_BASE + '/proxy/stats');
    const data = await res.json();
    if (data.stats) {
      const ic = document.getElementById('proxyInterceptCount');
      const ec = document.getElementById('proxyErrorCount');
      if (ic) ic.textContent = data.stats.interceptCount || 0;
      if (ec) ec.textContent = data.stats.errorCount || 0;
      const cb = document.getElementById('autoRecoverCheck');
      if (cb) cb.checked = data.stats.autoRecover !== false;
    }
  } catch {}
}

async function loadAuditLog() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="empty-row">加载中...</td></tr>';
  try {
    const res = await fetch(API_BASE + '/audit?limit=50');
    const data = await res.json();
    if (!data.success || !data.records.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-row">暂无审计记录</td></tr>';
      return;
    }
    tbody.innerHTML = data.records.map(r => {
      const time = r.time ? r.time.replace('T',' ').substring(0,19) : '--';
      const badge = r.action === '封禁玩家' ? 'badge-red' : (r.action === 'GM指令' ? 'badge-yellow' : 'badge-green');
      return '<tr><td>' + time + '</td><td>' + (r.user || '--') + '</td><td><span class="badge ' + badge + '">' + r.action + '</span></td><td>' + (r.target || '--') + '</td><td>' + (r.details || '--') + '</td></tr>';
    }).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">加载失败</td></tr>';
  }
}

// ===== Game Data Editor =====
let currentGameDataFile = '';

async function loadGameDataFiles() {
  const sel = document.getElementById('gameDataFileSelect');
  if (!sel) return;
  try {
    const res = await fetch(API_BASE + '/game-data');
    const data = await res.json();
    if (data.success) {
      sel.innerHTML = '<option value="">选择文件...</option>';
      data.files.forEach(f => {
        const label = f.name + (f.exists ? '' : ' (缺失)');
        sel.innerHTML += '<option value="' + f.name + '" ' + (f.exists ? '' : 'disabled') + '>' + label + '</option>';
      });
    }
  } catch {}
}

async function loadGameDataFile() {
  const sel = document.getElementById('gameDataFileSelect');
  const editor = document.getElementById('gameDataEditor');
  if (!sel || !editor) return;
  const file = sel.value;
  if (!file) { editor.value = ''; currentGameDataFile = ''; return; }
  currentGameDataFile = file;
  try {
    const res = await fetch(API_BASE + '/game-data/' + encodeURIComponent(file));
    const data = await res.json();
    if (data.success) {
      editor.value = data.content;
    }
  } catch {
    editor.value = '// 加载失败';
  }
}

async function saveGameDataFile() {
  const editor = document.getElementById('gameDataEditor');
  if (!editor || !currentGameDataFile) { showToast('未选择文件', 'error'); return; }
  try {
    const res = await fetch(API_BASE + '/game-data/' + encodeURIComponent(currentGameDataFile), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editor.value })
    });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('保存失败: ' + err.message, 'error'); }
}

// ===== Performance Charts =====
let perfHistory = [];

async function loadPerfData() {
  try {
    const res = await fetch(API_BASE + '/perf');
    const data = await res.json();
    if (data.success) {
      perfHistory = data.history || [];
      updatePerfDisplay();
      drawOnlineChart();
      drawPerfChart();
    }
  } catch {}
}

function updatePerfDisplay() {
  if (!perfHistory.length) return;
  const latest = perfHistory[perfHistory.length - 1];
  const onlineEl = document.getElementById('onlineCount');
  const peakEl = document.getElementById('onlinePeak');
  const cpuEl = document.getElementById('cpuValue');
  const memEl = document.getElementById('memValue');
  const memUsedEl = document.getElementById('memUsed');
  const memTotalEl = document.getElementById('memTotal');

  const maxOnline = Math.max(...perfHistory.map(p => p.online || 0));
  if (onlineEl) onlineEl.textContent = latest.online || 0;
  if (peakEl) peakEl.textContent = maxOnline;
  if (cpuEl) cpuEl.textContent = latest.cpu || 0;
  if (memEl) memEl.textContent = latest.memory || 0;
  if (memUsedEl) memUsedEl.textContent = latest.memoryUsed || 0;
  if (memTotalEl) memTotalEl.textContent = latest.memoryTotal || 0;
}

function drawOnlineChart() {
  const canvas = document.getElementById('onlineChart');
  if (!canvas || !perfHistory.length) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const data = perfHistory.map(p => p.online || 0);
  const max = Math.max(1, ...data);
  const stepX = w / Math.max(1, data.length - 1);

  // 网格
  ctx.strokeStyle = 'rgba(148,163,184,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = h - (h * i / 4);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // 面积
  ctx.fillStyle = 'rgba(59,130,246,0.15)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  data.forEach((v, i) => {
    const x = i * stepX;
    const y = h - (v / max) * (h - 10);
    ctx.lineTo(x, y);
  });
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // 线
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * stepX;
    const y = h - (v / max) * (h - 10);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawPerfChart() {
  const canvas = document.getElementById('perfChart');
  if (!canvas || !perfHistory.length) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cpuData = perfHistory.map(p => p.cpu || 0);
  const memData = perfHistory.map(p => p.memory || 0);
  const stepX = w / Math.max(1, perfHistory.length - 1);

  // 网格
  ctx.strokeStyle = 'rgba(148,163,184,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = h - (h * i / 4);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // CPU 线 (青色)
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  cpuData.forEach((v, i) => {
    const x = i * stepX;
    const y = h - (v / 100) * (h - 10);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 内存线 (橙色)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  memData.forEach((v, i) => {
    const x = i * stepX;
    const y = h - (v / 100) * (h - 10);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 图例
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#10b981'; ctx.fillText('● CPU', 10, 14);
  ctx.fillStyle = '#f59e0b'; ctx.fillText('● 内存', 60, 14);
}

// ===== Quest Management =====
let allQuestScripts = [];

async function loadQuests() {
  const list = document.getElementById('questsList');
  if (list) list.innerHTML = '<div class="loading-msg">加载中...</div>';
  try {
    const res = await fetch(API_BASE + '/quests');
    const data = await res.json();
    if (!data.success) { if (list) list.innerHTML = '<div class="empty-row">加载失败</div>'; return; }
    allQuestScripts = data.scripts || [];
    // Update stats
    const stats = document.getElementById('questStats');
    if (stats) stats.textContent = `共 ${data.total} 个 | 已启用 ${data.enabled} | 已禁用 ${data.disabled}`;
    // Update category filter
    const sel = document.getElementById('questCatFilter');
    if (sel) {
      sel.innerHTML = '<option value="">全部分类</option>';
      Object.keys(data.categories || {}).forEach(c => {
        sel.innerHTML += '<option value="' + c + '">' + c + ' (' + data.categories[c] + ')</option>';
      });
    }
    renderQuests(allQuestScripts);
  } catch (err) {
    if (list) list.innerHTML = '<div class="empty-row">加载失败: ' + err.message + '</div>';
  }
}

function renderQuests(scripts) {
  const list = document.getElementById('questsList');
  if (!list) return;
  if (!scripts.length) { list.innerHTML = '<div class="empty-row">暂无任务脚本。<br>点击"初始化示例脚本"创建剧情任务。</div>'; return; }
  let html = '<table class="data-table"><thead><tr><th>脚本名称</th><th>分类</th><th>大小</th><th>状态</th><th>最后修改</th><th>操作</th></tr></thead><tbody>';
  scripts.forEach(s => {
    const size = (s.size / 1024).toFixed(1) + ' KB';
    const modified = s.modified ? s.modified.replace('T', ' ').substring(0, 16) : '--';
    const status = s.disabled
      ? '<span class="badge badge-red">已禁用</span>'
      : '<span class="badge badge-green">已启用</span>';
    const toggleBtn = s.disabled
      ? '<button class="btn btn-sm primary" onclick="toggleQuestScript(\'' + encodeURIComponent(s.relativePath) + '\')">启用</button>'
      : '<button class="btn btn-sm" onclick="toggleQuestScript(\'' + encodeURIComponent(s.relativePath) + '\')">禁用</button>';
    html += '<tr>' +
      '<td><strong>' + s.name + '</strong></td>' +
      '<td><span class="badge badge-blue">' + s.category + '</span></td>' +
      '<td>' + size + '</td>' +
      '<td>' + status + '</td>' +
      '<td>' + modified + '</td>' +
      '<td>' +
        '<button class="btn btn-sm" onclick="editQuestScript(\'' + encodeURIComponent(s.relativePath) + '\')">编辑</button> ' +
        toggleBtn + ' ' +
        '<button class="btn btn-sm" onclick="deleteQuestScript(\'' + encodeURIComponent(s.relativePath) + '\')">删除</button>' +
      '</td></tr>';
  });
  html += '</tbody></table>';
  list.innerHTML = html;
}

function filterQuests() {
  const q = (document.getElementById('questSearchInput')?.value || '').toLowerCase();
  const cat = document.getElementById('questCatFilter')?.value || '';
  let filtered = allQuestScripts;
  if (cat) filtered = filtered.filter(s => s.category === cat);
  if (q) filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.category.includes(q));
  renderQuests(filtered);
}

function showCreateScriptModal() {
  document.getElementById('scriptModalTitle').textContent = '新建 Lua 脚本';
  document.getElementById('scriptFileName').value = '';
  document.getElementById('scriptCategory').value = 'main';
  document.getElementById('scriptContent').value = '-- 新剧情任务脚本\n\nfunction OnQuestStart(player)\n    player:SendMessage("任务开始！")\n    player:AddQuestStep("第一步")\nend\n\nfunction OnQuestStepComplete(player, stepId)\n    if stepId == 1 then\n        player:CompleteQuest(0)\n    end\nend\n';
  document.getElementById('scriptEditPath').value = '';
  showModal('scriptModal');
}

async function editQuestScript(relPath) {
  try {
    const res = await fetch(API_BASE + '/quests/' + relPath);
    const data = await res.json();
    if (!data.success) { showToast('加载失败', 'error'); return; }
    document.getElementById('scriptModalTitle').textContent = '编辑: ' + relPath;
    document.getElementById('scriptFileName').value = relPath.split('/').pop();
    document.getElementById('scriptCategory').value = relPath.split('/').slice(0, -1).join('/') || '';
    document.getElementById('scriptContent').value = data.content;
    document.getElementById('scriptEditPath').value = relPath;
    showModal('scriptModal');
  } catch (err) { showToast('加载失败: ' + err.message, 'error'); }
}

async function saveScript() {
  const name = document.getElementById('scriptFileName').value.trim();
  const category = document.getElementById('scriptCategory').value;
  const content = document.getElementById('scriptContent').value;
  const editPath = document.getElementById('scriptEditPath').value;

  if (!name) { showToast('请输入文件名', 'error'); return; }
  if (!name.endsWith('.lua')) { showToast('文件名必须以 .lua 结尾', 'error'); return; }

  const relPath = editPath || (category ? category + '/' + name : name);

  try {
    const res = await fetch(API_BASE + '/quests/' + encodeURIComponent(relPath), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await res.json();
    hideModal('scriptModal');
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadQuests();
  } catch (err) { showToast('保存失败: ' + err.message, 'error'); }
}

async function deleteQuestScript(relPath) {
  if (!confirm('确定删除脚本 ' + decodeURIComponent(relPath) + ' 吗？此操作不可恢复。')) return;
  try {
    const res = await fetch(API_BASE + '/quests/' + relPath, { method: 'DELETE' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadQuests();
  } catch (err) { showToast('删除失败: ' + err.message, 'error'); }
}

async function toggleQuestScript(relPath) {
  try {
    const res = await fetch(API_BASE + '/quests/' + relPath + '/toggle', { method: 'POST' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadQuests();
  } catch (err) { showToast('操作失败: ' + err.message, 'error'); }
}

async function reloadAllScripts() {
  showToast('正在热重载所有脚本...', 'info');
  try {
    const res = await fetch(API_BASE + '/quests/reload', { method: 'POST' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadQuests();
  } catch (err) { showToast('重载失败: ' + err.message, 'error'); }
}

async function initSampleScripts() {
  if (!confirm('将创建示例剧情脚本（主线/世界/传说/活动），已存在的脚本不会被覆盖。确定？')) return;
  try {
    const res = await fetch(API_BASE + '/quests/init-samples', { method: 'POST' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadQuests();
  } catch (err) { showToast('初始化失败: ' + err.message, 'error'); }
}

// ===== Database Tool (Real) =====
async function loadDBStats() {
  try {
    const res = await fetch(API_BASE + '/database/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      const el = document.querySelector('#page-database .panel:first-child .form-group:nth-child(2) p');
      if (el) el.innerHTML = '<strong>' + s.dbSize + '</strong> / 500 MB 限制';
      const collEl = document.querySelector('#page-database .panel:first-child .form-group:nth-child(3) p');
      if (collEl) collEl.textContent = s.collections + ' 个集合 (' + s.objects + ' 个文档)';
    }
  } catch {}
}

async function executeDBQuery() {
  const queryEl = document.getElementById('mongoQuery');
  const resultEl = document.querySelector('#page-database .code-block pre');
  if (!queryEl || !resultEl) return;
  const query = queryEl.value.trim();
  if (!query) { showToast('请输入查询', 'error'); return; }

  // Parse collection name from query
  const collMatch = query.match(/db\.(\w+)\.find/);
  const collection = collMatch ? collMatch[1] : 'players';

  resultEl.textContent = '执行中...';
  try {
    const res = await fetch(API_BASE + '/database/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, query, limit: 50 })
    });
    const data = await res.json();
    if (data.success) {
      resultEl.textContent = JSON.stringify(data.data, null, 2) || '(无结果)';
      showToast('返回 ' + data.count + ' 条记录', 'success');
    } else {
      resultEl.textContent = '错误: ' + data.message;
      showToast(data.message, 'error');
    }
  } catch (err) {
    resultEl.textContent = '查询失败: ' + err.message;
  }
}

// ===== Multiplayer Management =====
async function loadMultiplayer() {
  loadMpStats();
  loadMpPlayers();
  loadMpRooms();
  loadMpChat();
  loadMpKcp();
}

async function loadMpStats() {
  try {
    const res = await fetch(API_BASE + '/multiplayer/stats');
    const data = await res.json();
    if (data.stats) {
      document.getElementById('mpOnline').textContent = data.stats.estimatedOnline || '0';
      document.getElementById('mpRooms').textContent = data.stats.coOpRooms || '0';
      document.getElementById('mpTotal').textContent = data.stats.totalPlayers || '0';
    }
  } catch {}
}

async function loadMpPlayers() {
  const tbody = document.getElementById('mpPlayerTable');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="empty-row">加载中...</td></tr>';
  try {
    const res = await fetch(API_BASE + '/multiplayer/players');
    const data = await res.json();
    if (!data.players || !data.players.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-row">暂无玩家数据</td></tr>';
      return;
    }
    const sceneNames = { 3: '提瓦特', 4: '矿洞', 5: '渊下宫', 6: '尘歌壶', 7: '金苹果', 9: '须弥沙漠' };
    tbody.innerHTML = data.players.map(function(p) {
      var pos = p.position || {};
      var x = (pos.x || 0).toFixed(0), y = (pos.y || 0).toFixed(0), z = (pos.z || 0).toFixed(0);
      var scene = sceneNames[p.sceneId] || ('场景' + (p.sceneId || '?'));
      var gameTime = p.playerGameTime ? Math.floor(p.playerGameTime / 3600) + 'h' : '--';
      var account = p.account ? (p.account.username || '--').substring(0, 15) : '--';
      return '<tr>' +
        '<td><code>' + (p.uid || '?') + '</code></td>' +
        '<td>' + (p.nickname || '旅行者') + '</td>' +
        '<td>' + scene + '</td>' +
        '<td style="font-size:0.75rem;">(' + x + ', ' + y + ', ' + z + ')</td>' +
        '<td>' + gameTime + '</td>' +
        '<td style="font-size:0.75rem;">' + account + '</td>' +
        '<td>' +
          '<button class="btn btn-sm" onclick="mpKick(' + (p.uid||0) + ')">踢出</button> ' +
          '<button class="btn btn-sm" onclick="mpTeleport(' + (p.uid||0) + ')">传送</button>' +
        '</td></tr>';
    }).join('');
    drawPlayerMap(data.players);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">加载失败</td></tr>';
  }
}

function drawPlayerMap(players) {
  var canvas = document.getElementById('playerMapCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // 提瓦特大陆坐标范围（近似）
  var mapMinX = -5000, mapMaxX = 5000, mapMinZ = -5000, mapMaxZ = 5000;
  var scaleX = w / (mapMaxX - mapMinX);
  var scaleZ = h / (mapMaxZ - mapMinZ);

  // 绘制主要城市标记
  var cities = [
    { name: '蒙德', x: 2848, z: -1075 }, { name: '璃月', x: -956, z: 1364 },
    { name: '稻妻', x: -3228, z: -3411 }, { name: '须弥', x: 2874, z: -1882 },
    { name: '枫丹', x: 4280, z: -2134 },
  ];
  ctx.font = '9px sans-serif';
  cities.forEach(function(c) {
    var cx = (c.x - mapMinX) * scaleX;
    var cy = (c.z - mapMinZ) * scaleZ;
    ctx.fillStyle = '#64748b';
    ctx.fillText(c.name, cx - 8, cy - 3);
    ctx.fillStyle = 'rgba(100,116,139,0.3)';
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
  });

  // 绘制在线玩家（此处展示所有玩家位置）
  ctx.fillStyle = '#ef4444';
  players.forEach(function(p) {
    var pos = p.position || {};
    var px = ((pos.x || 0) - mapMinX) * scaleX;
    var py = ((pos.z || 0) - mapMinZ) * scaleZ;
    if (px > 0 && px < w && py > 0 && py < h) {
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(p.nickname || p.uid, px + 5, py + 3);
      ctx.fillStyle = '#ef4444';
    }
  });
}

async function loadMpRooms() {
  var list = document.getElementById('mpRoomsList');
  if (!list) return;
  try {
    var res = await fetch(API_BASE + '/multiplayer/rooms');
    var data = await res.json();
    if (!data.rooms || !data.rooms.length) {
      list.innerHTML = '<div class="empty-row">暂无联机房间</div>';
      return;
    }
    list.innerHTML = data.rooms.map(function(r) {
      return '<div class="card-item"><div>' +
        '<strong>主机 UID: ' + r.hostUid + '</strong> ' +
        '<span style="font-size:0.75rem;color:var(--muted);">' + r.count + '人</span>' +
        '</div>' +
        '<button class="btn btn-sm" onclick="mpKick(' + r.hostUid + ')">解散</button>' +
        '</div>';
    }).join('');
  } catch { list.innerHTML = '<div class="empty-row">加载失败</div>'; }
}

async function loadMpChat() {
  var box = document.getElementById('mpChatBox');
  if (!box) return;
  try {
    var res = await fetch(API_BASE + '/multiplayer/chat?limit=30');
    var data = await res.json();
    if (!data.messages || !data.messages.length) {
      box.innerHTML = '<div class="term-line"><span>暂无消息</span></div>';
      return;
    }
    box.innerHTML = data.messages.map(function(m) {
      var time = m.time ? m.time.replace('T', ' ').substring(11, 19) : '--:--:--';
      var user = m.type === 'server' ? '<span style="color:var(--accent2);">[服务器]</span>' : ('<strong>' + (m.user || '?') + '</strong>');
      return '<div class="term-line"><span class="term-time">' + time + '</span>' + user + ' ' + (m.message || '') + '</div>';
    }).join('');
  } catch {}
}

async function mpSendChat() {
  var input = document.getElementById('mpChatInput');
  var msg = input ? input.value.trim() : '';
  if (!msg) { showToast('输入为空', 'error'); return; }
  try {
    var res = await fetch(API_BASE + '/multiplayer/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, type: 'server' })
    });
    var data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success && input) { input.value = ''; loadMpChat(); }
  } catch (err) { showToast('发送失败', 'error'); }
}

async function mpKick(uid) {
  if (!confirm('确定踢出 UID ' + uid + ' 吗？')) return;
  try {
    var res = await fetch(API_BASE + '/multiplayer/kick', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid })
    });
    var data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadMpPlayers();
  } catch (err) { showToast('操作失败', 'error'); }
}

async function mpTeleport(uid) {
  var preset = prompt('传送预设 (mondstadt/liyue/inazuma/sumeru/fontaine):', 'mondstadt');
  if (!preset) return;
  try {
    var res = await fetch(API_BASE + '/teleport/player', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid, preset: preset })
    });
    var data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('操作失败', 'error'); }
}

async function mpInvite() {
  var toUid = document.getElementById('mpInviteUid').value.trim();
  var hostUid = document.getElementById('mpHostUid').value.trim();
  if (!toUid || !hostUid) { showToast('请输入目标UID和主机UID', 'error'); return; }
  try {
    var res = await fetch(API_BASE + '/multiplayer/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUid: parseInt(hostUid), toUid: parseInt(toUid) })
    });
    var data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
  } catch (err) { showToast('邀请失败', 'error'); }
}

function mpKickFromInput() {
  var uid = document.getElementById('mpInviteUid').value.trim();
  if (uid) mpKick(parseInt(uid));
}

async function loadMpKcp() {
  try {
    var kcpRes = await fetch(API_BASE + '/multiplayer/kcp-status');
    var kcpData = await kcpRes.json();
    var el = document.getElementById('mpKcp');
    var detail = document.getElementById('mpKcpDetail');
    if (el && kcpData.config) {
      var interval = kcpData.config.interval || 20;
      var estLatency = interval + 2;
      el.textContent = '~' + estLatency + 'ms';
      el.style.color = estLatency <= 15 ? 'var(--success)' : 'var(--warning)';
    }
    // Also run diagnostic
    try {
      var diagRes = await fetch(API_BASE + '/multiplayer/diagnostic');
      var diagData = await diagRes.json();
      if (diagData.diagnostic && detail) {
        var d = diagData.diagnostic;
        detail.textContent = 'KCP优化: ' + (d.kcp.optimization || 'standard') + ' | 端口: ' + (d.kcp.reachable ? '可达' : '检测中');
      }
    } catch (e) {}
  } catch (e) {}
}

// ===== Gacha History =====
async function loadGachaHistory() {
  var uid = document.getElementById('ghUidInput') ? document.getElementById('ghUidInput').value.trim() : '10001';
  if (!uid) { showToast('请输入UID', 'error'); return; }
  var tbody = document.getElementById('ghTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-row">加载中...</td></tr>';
  try {
    var res = await fetch(API_BASE + '/gacha/history/' + uid + '?limit=200');
    var data = await res.json();
    if (!data.success) { if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-row">查询失败</td></tr>'; return; }

    // Stats
    document.getElementById('ghStats').style.display = '';
    document.getElementById('ghTotal').textContent = data.total;
    document.getElementById('ghCount5').textContent = data.stats.count5;
    document.getElementById('ghAvg5').textContent = data.stats.avgPity5 + '抽';
    document.getElementById('ghPity').textContent = data.stats.currentPity + '抽';

    // By type
    var typeDiv = document.getElementById('ghByType');
    if (typeDiv) {
      typeDiv.innerHTML = Object.entries(data.stats.byType).map(function(e) {
        return '<div style="display:flex;justify-content:space-between;padding:0.2rem 0;">' +
          '<span>' + e[0] + '</span><strong>' + e[1] + '抽</strong></div>';
      }).join('');
    }

    // Timeline table
    var typeNames = { 301: '限定角色', 400: '限定角色II', 302: '限定武器', 200: '常驻', 100: '新手' };
    if (tbody) {
      tbody.innerHTML = data.timeline.map(function(r) {
        var stars = r.rarity === 5 ? '<span class="badge badge-yellow">★5</span>' : r.rarity === 4 ? '<span class="badge badge-purple">★4</span>' : '★3';
        var time = (r.time || '').replace('T', ' ').substring(0, 19);
        return '<tr>' +
          '<td>' + time + '</td>' +
          '<td><code>' + r.itemId + '</code></td>' +
          '<td>' + r.itemName + '</td>' +
          '<td>' + stars + '</td>' +
          '<td>' + (typeNames[r.gachaType] || r.gachaType) + '</td></tr>';
      }).join('');
    }

    // Timeline chart
    var canvas = document.getElementById('ghTimeline');
    if (canvas && data.timeline.length) {
      var ctx = canvas.getContext('2d');
      var w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      var items = data.timeline.slice(0, 100).reverse();
      var barW = Math.max(1, w / items.length);
      items.forEach(function(r, i) {
        var x = i * barW;
        var color = r.rarity === 5 ? '#f59e0b' : r.rarity === 4 ? '#8b5cf6' : '#94a3b8';
        var barH = r.rarity === 5 ? h * 0.8 : r.rarity === 4 ? h * 0.4 : h * 0.15;
        ctx.fillStyle = color;
        ctx.fillRect(x, h - barH, barW - 1, barH);
      });
    }
  } catch (err) { if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-row">加载失败</td></tr>'; }
}

// ===== Anomaly Detection =====
async function loadAnomalyAlerts() {
  try {
    const res = await fetch(API_BASE + '/anomaly/alerts?limit=30');
    const data = await res.json();
    if (!data.success) return;
    // Update stats
    const statsEl = document.getElementById('anomalyStats');
    if (statsEl) statsEl.textContent = `共 ${data.stats.totalAlerts} 条告警 | 未处理 ${data.stats.unhandled}`;
    // Update alerts table
    const tbody = document.getElementById('anomalyAlertsBody');
    if (!tbody) return;
    if (!data.alerts.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-row">暂无异常告警 🎉</td></tr>'; return; }
    tbody.innerHTML = data.alerts.map(a => {
      const badge = a.action === 'block_and_confirm' ? 'badge-red' : a.action === 'freeze_give' ? 'badge-yellow' : 'badge-blue';
      return `<tr>
        <td>${(a.time||'').replace('T',' ').substring(0,19)}</td>
        <td><span class="badge ${badge}">${a.ruleId}</span></td>
        <td><strong>${a.ruleName}</strong></td>
        <td>${a.user || '--'}</td>
        <td>${a.detail}</td>
        <td>${a.handled ? '<span class="badge badge-green">已处理</span>' : '<button class="btn btn-sm primary" onclick="handleAnomalyAlert(\''+a.id+'\')">标记处理</button>'}</td>
      </tr>`;
    }).join('');
  } catch {}
}

async function handleAnomalyAlert(alertId) {
  try {
    const res = await fetch(API_BASE + '/anomaly/alerts/' + alertId + '/handle', { method: 'POST' });
    const data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) loadAnomalyAlerts();
  } catch (err) { showToast('操作失败', 'error'); }
}

// ===== WebSocket 实时推送 =====
let wsReconnectTimer = null;
function connectWebSocket() {
  try {
    const ws = new WebSocket('ws://localhost:8082');
    ws.onopen = () => { console.log('[WS] Connected'); if (wsReconnectTimer) clearTimeout(wsReconnectTimer); };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'status') updateStatusUI(data);
        if (data.type === 'status' && data.perf) {
          // Update dashboard stats in real-time
          const cpu = document.getElementById('dashCpu');
          const mem = document.getElementById('dashMem');
          const online = document.getElementById('dashOnline');
          if (cpu) cpu.textContent = (data.perf.cpu || 0) + '%';
          if (mem) mem.textContent = (data.perf.memory || 0) + '%';
          if (online) online.textContent = data.perf.online || '0';
        }
      } catch (e) {}
    };
    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 5s...');
      wsReconnectTimer = setTimeout(connectWebSocket, 5000);
    };
    ws.onerror = () => ws.close();
  } catch (e) {
    wsReconnectTimer = setTimeout(connectWebSocket, 5000);
  }
}

// Init
initTheme();
if (!checkLogin()) {
  // 未登录，checkLogin 已跳转
} else {
  loadPermissions().then(() => { applyPermissions(); });
  checkStatus();
  connectWebSocket(); // WebSocket 实时推送替代轮询
  setInterval(checkStatus, 30000); // 降级为 30s 备用轮询
  checkCert();
  setInterval(updateProxyStats, 15000);
  loadPerfData();
  setInterval(loadPerfData, 30000);
}
