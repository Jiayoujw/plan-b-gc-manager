// 加载 .env 环境变量（必须在其他 require 之前）
require('dotenv').config();

const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const configRoutes = require('./routes/config');
const playerRoutes = require('./routes/players');
const gachaRoutes = require('./routes/gacha');
const logRoutes = require('./routes/logs');
const questRoutes = require('./routes/quests');
const gcService = require('./services/grasscutter');
const launcher = require('./services/launcher');
const proxyService = require('./services/proxy');
const authService = require('./services/auth');
const auditService = require('./services/audit');
const gachaVersions = require('./services/gachaVersions');
const perfmon = require('./services/perfmon');
const anomalyDetector = require('./services/anomalyDetector');
const srvFeatures = require('./services/serverFeatures');
const multiplayer = require('./services/multiplayer');

const GC_DIR = process.env.GC_DIR
  ? process.env.GC_DIR.replace('%USERPROFILE%', process.env.USERPROFILE || '')
  : path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'cultivation', 'grasscutter');

const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = parseInt(process.env.WEB_PORT) || 8080;

// 安全 + 性能中间件
app.use(compression()); // gzip 压缩响应
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 限制请求体大小

// 登录接口限流 (防暴力破解)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟窗口
  max: 20,                    // 最多 20 次尝试
  message: { success: false, message: '登录尝试过多，请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API 通用限流
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, message: '请求过于频繁' },
});

app.use('/api', apiLimiter);

// 认证 API（公开）
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请输入用户名和密码' });
  }
  const result = authService.login(username, password);
  res.status(result.success ? 200 : 401).json(result);
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请输入用户名和密码' });
  }
  const result = authService.register(username, password, role);
  res.status(result.success ? 200 : 400).json(result);
});

// 静态文件（登录页面不需要认证）
app.use(express.static(path.join(__dirname, 'public')));

// API 路由
app.use('/api/config', configRoutes);
app.use('/api/players', authService.middleware, playerRoutes);
app.use('/api/logs', logRoutes);

// 卡池版本库（公开，EXACT routes must come BEFORE /api/gacha router）
app.get('/api/gacha/versions', (req, res) => {
  const result = gachaVersions.listVersions();
  const current = gachaVersions.getCurrentVersion();
  res.json({ ...result, current });
});
app.post('/api/gacha/versions/apply', authService.middleware, (req, res) => {
  const { version } = req.body;
  if (!version) return res.status(400).json({ success: false, message: '版本名为空' });
  const result = gachaVersions.applyVersion(version);
  if (result.success) auditService.logAction(req.user.username, req.user.role, '切换卡池', version, '', req.ip);
  res.json(result);
});
// 卡池物品搜索（公开，供编辑器使用）
app.get('/api/gacha/items/search', (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase();
    const rarity = parseInt(req.query.rarity) || 0;
    const gachaService = require('./services/gachaService');
    let results = [];
    for (const [id, name] of Object.entries(gachaService.NAMES)) {
      const numId = parseInt(id);
      let estRarity = numId >= 1001 && numId <= 1099 ? ([1002,1003,1016,1022,1026,1029,1030,1033,1035,1037,1038,1041,1042,1046,1047,1049].includes(numId)?5:4) : numId >= 11000 ? (numId % 100 < 10 ? 5 : 4) : 4;
      if (rarity && estRarity !== rarity) continue;
      if (q && !name.toLowerCase().includes(q) && !id.includes(q)) continue;
      results.push({ id: numId, name, rarity: estRarity, type: numId < 10000 ? 'character' : 'weapon' });
    }
    results = results.slice(0, 100);
    res.json({ success: true, items: results, total: results.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
// 卡池管理路由（需认证）
app.use('/api/gacha', authService.middleware, gachaRoutes);
app.use('/api/quests', authService.middleware, questRoutes);

// 启动服务端（仅 Grasscutter，保留旧 API 兼容）
app.post('/api/server/start', async (req, res) => {
  try {
    const result = await gcService.start();
    res.json({ success: true, message: '服务端已启动', pid: result.pid });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 停止服务端（仅 Grasscutter，保留旧 API 兼容）
app.post('/api/server/stop', async (req, res) => {
  try {
    await gcService.stop();
    res.json({ success: true, message: '服务端已停止' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 一键启动所有服务（MongoDB + Grasscutter）
app.post('/api/server/start-all', async (req, res) => {
  try {
    const result = await launcher.startAll();
    res.json({ success: result.success, message: '一键启动完成', details: result.results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 一键停止所有服务
app.post('/api/server/stop-all', async (req, res) => {
  try {
    const result = await launcher.stopAll();
    res.json({ success: true, message: '一键停止完成', details: result.results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 代理状态
app.get('/api/proxy/status', async (req, res) => {
  const running = await proxyService.checkProxy();
  res.json({
    running,
    port: proxyService.getProxyPort()
  });
});

// 启动代理
app.post('/api/proxy/start', async (req, res) => {
  try {
    const result = await proxyService.startProxy();
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 停止代理
app.post('/api/proxy/stop', async (req, res) => {
  try {
    const result = await proxyService.stopProxy();
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 证书状态 (含有效期检查)
app.get('/api/proxy/cert', async (req, res) => {
  try {
    const installed = await proxyService.isCaInstalled();
    const expiry = proxyService.checkCertExpiry();
    res.json({
      success: true,
      installed,
      path: proxyService.getCaCertPath(),
      ...expiry,
      renewalWarning: expiry.daysLeft > 0 && expiry.daysLeft <= 7
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 安装证书
app.post('/api/proxy/cert/install', async (req, res) => {
  try {
    await proxyService.installCaCert();
    res.json({ success: true, message: 'CA 证书已安装到系统信任存储' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 扫描目录查找游戏 exe
app.get('/api/game/browse', (req, res) => {
  const dir = (req.query.dir || '').trim();
  if (!dir) {
    // 返回常见游戏安装目录列表
    const drives = ['C', 'D', 'E', 'F'].filter(d => fs.existsSync(d + ':\\'));
    const commonDirs = [];

    // 加入 Cultivation 配置中的路径
    const cultivationCfg = path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'cultivation', 'configuration.json');
    try {
      if (fs.existsSync(cultivationCfg)) {
        const cfg = JSON.parse(fs.readFileSync(cultivationCfg, 'utf-8'));
        const cultPath = cfg.game_install_path || cfg.gameInstallPath || null;
        if (cultPath) {
          const dirPath = path.dirname(cultPath);
          if (fs.existsSync(dirPath)) {
            commonDirs.push({ path: dirPath, exists: true, label: 'Cultivation 配置' });
          }
        }
      }
    } catch {}

    for (const d of drives) {
      const candidates = [
        d + ':\\GenshinImpact',
        d + ':\\GenshinImpact_4.0',
        d + ':\\Program Files\\Genshin Impact',
        d + ':\\Games\\Genshin Impact',
        d + ':\\miHoYo\\Genshin Impact',
        d + ':\\HoyoPlay\\Genshin Impact'
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          commonDirs.push({ path: c, exists: true });
        }
      }
      // 也列出该盘根目录下的文件夹（最多20个，排除系统目录）
      try {
        const skipDirs = ['$Recycle.Bin', '$WinREAgent', '$RECYCLE.BIN', 'PerfLogs', 'Recovery',
          'System Volume Information', 'Config.Msi', 'DeliveryOptimization', 'ProgramData',
          'Program Files', 'Program Files (x86)', 'Windows', 'Users', 'inetpub', 'tmp', 'persistent_data'];
        const items = fs.readdirSync(d + ':\\', { withFileTypes: true })
          .filter(f => f.isDirectory() && !skipDirs.includes(f.name) && !f.name.startsWith('.') && !f.name.startsWith('$'))
          .slice(0, 20)
          .map(f => ({ path: d + ':\\' + f.name, exists: true }));
        commonDirs.push(...items);
      } catch {}
    }
    return res.json({ success: true, type: 'drives', drives, commonDirs });
  }

  // 浏览指定目录
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return res.json({ success: false, message: '目录不存在' });
  }
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
      .filter(f => {
        if (f.name.startsWith('.') || f.name.startsWith('$')) return false;
        return true;
      })
      .sort((a, b) => {
        // 目录在前
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 50)
      .map(f => ({
        name: f.name,
        path: path.join(dir, f.name),
        isDir: f.isDirectory(),
        isExe: f.name.endsWith('.exe')
      }));

    res.json({ success: true, type: 'listing', currentDir: dir, items });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// 检测游戏客户端路径（从配置文件读取已保存的路径）
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveSettings(settings) {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

app.get('/api/game/path', (req, res) => {
  // 1. 先读取本服务保存的设置
  const settings = loadSettings();
  const saved = settings.gamePath || null;
  if (saved && fs.existsSync(saved)) {
    return res.json({ success: true, path: saved, exists: true, source: 'saved' });
  }

  // 2. 再读取 Cultivation 配置中的路径
  const cultivationCfg = path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'cultivation', 'configuration.json');
  try {
    if (fs.existsSync(cultivationCfg)) {
      const cfg = JSON.parse(fs.readFileSync(cultivationCfg, 'utf-8'));
      const cultPath = cfg.game_install_path || cfg.gameInstallPath || null;
      if (cultPath && fs.existsSync(cultPath)) {
        return res.json({ success: true, path: cultPath, exists: true, source: 'cultivation' });
      }
    }
  } catch {}

  res.json({ success: true, path: null, exists: false, source: 'none' });
});

// 验证游戏路径（支持输入目录自动查找 exe）
app.post('/api/game/verify', (req, res) => {
  const input = (req.body.path || '').trim();
  if (!input) {
    return res.json({ success: false, message: '请输入路径' });
  }

  // 如果直接是 exe 文件
  if (input.endsWith('.exe') && fs.existsSync(input)) {
    // 验证是否为原神客户端（文件大小 > 20MB）
    const stat = fs.statSync(input);
    if (stat.size < 20 * 1024 * 1024) {
      return res.json({ success: false, message: '文件过小（' + (stat.size/1024/1024).toFixed(1) + ' MB），不是原神客户端' });
    }
    return res.json({ success: true, path: input, message: '找到游戏客户端（' + (stat.size/1024/1024).toFixed(0) + ' MB）' });
  }

  // 如果是目录，自动查找 exe
  if (fs.existsSync(input) && fs.statSync(input).isDirectory()) {
    const exes = ['GenshinImpact.exe', 'YuanShen.exe'];
    // 先检查根目录
    for (const exe of exes) {
      const p = path.join(input, exe);
      if (fs.existsSync(p)) {
        return res.json({ success: true, path: p, message: '找到: ' + p });
      }
    }
    // 再检查子目录 "Genshin Impact Game"
    for (const exe of exes) {
      const p = path.join(input, 'Genshin Impact Game', exe);
      if (fs.existsSync(p)) {
        return res.json({ success: true, path: p, message: '找到: ' + p });
      }
    }
    return res.json({ success: false, message: '目录中未找到 GenshinImpact.exe 或 YuanShen.exe' });
  }

  res.json({ success: false, message: '路径不存在: ' + input });
});

// 启动游戏客户端
app.post('/api/game/launch', (req, res) => {
  const gamePath = req.body.path;
  if (!gamePath) {
    return res.status(400).json({ success: false, message: '请先设置游戏客户端路径' });
  }
  if (!fs.existsSync(gamePath)) {
    return res.status(404).json({ success: false, message: '未找到游戏客户端: ' + gamePath });
  }
  try {
    // Windows 上启动 GUI 程序需要用 cmd /c start
    const env = {
      ...process.env,
      HTTP_PROXY: 'http://127.0.0.1:8081',
      HTTPS_PROXY: 'http://127.0.0.1:8081',
      http_proxy: 'http://127.0.0.1:8081',
      https_proxy: 'http://127.0.0.1:8081',
      NO_PROXY: 'localhost,127.0.0.1'
    };
    spawn('cmd', ['/c', 'start', '', gamePath], {
      env,
      windowsHide: false,
      detached: true
    });
    res.json({ success: true, message: '游戏客户端已启动（已配置代理）' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 保存游戏路径设置
app.post('/api/game/path', (req, res) => {
  const gamePath = (req.body.path || '').trim();
  if (!gamePath) {
    return res.json({ success: false, message: '路径为空' });
  }
  const settings = loadSettings();
  settings.gamePath = gamePath;
  saveSettings(settings);
  res.json({ success: true, message: '路径已保存' });
});

// GM 指令发送
app.post('/api/server/command', authService.middleware, async (req, res) => {
  const cmd = (req.body.command || '').trim();
  if (!cmd) {
    return res.status(400).json({ success: false, message: '指令为空' });
  }
  const result = await gcService.sendCommand(cmd);
  auditService.logAction(req.user.username, req.user.role, 'GM指令', '', cmd, req.ip);
  res.json(result);
});

// 获取已安装插件列表
app.get('/api/plugins', (req, res) => {
  const pluginsDir = path.join(GC_DIR, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    return res.json({ success: true, plugins: [] });
  }
  try {
    const items = fs.readdirSync(pluginsDir, { withFileTypes: true });
    const plugins = items
      .filter(f => f.isDirectory() || f.name.endsWith('.jar'))
      .map(f => {
        const pluginPath = path.join(pluginsDir, f.name);
        const isDir = f.isDirectory();
        const configPath = isDir ? path.join(pluginPath, 'config.json') : null;
        const hasConfig = configPath && fs.existsSync(configPath);
        return {
          name: f.name,
          path: pluginPath,
          isDir: isDir,
          hasConfig: hasConfig,
          size: isDir ? null : fs.statSync(pluginPath).size
        };
      });
    res.json({ success: true, plugins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 切换插件启用/禁用（通过重命名 .jar 为 .jar.disabled）
app.post('/api/plugins/toggle', (req, res) => {
  const pluginName = req.body.name;
  if (!pluginName) {
    return res.status(400).json({ success: false, message: '插件名为空' });
  }
  const pluginsDir = path.join(GC_DIR, 'plugins');
  const jarPath = path.join(pluginsDir, pluginName);
  const disabledPath = path.join(pluginsDir, pluginName + '.disabled');

  try {
    if (fs.existsSync(jarPath)) {
      fs.renameSync(jarPath, disabledPath);
      return res.json({ success: true, message: '插件已禁用', enabled: false });
    } else if (fs.existsSync(disabledPath)) {
      fs.renameSync(disabledPath, jarPath);
      return res.json({ success: true, message: '插件已启用', enabled: true });
    } else {
      return res.status(404).json({ success: false, message: '插件不存在' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 物品 ID 查询 (带缓存)
let itemsCache = null;
let itemsCacheTime = 0;
const ITEMS_CACHE_TTL = 300000; // 5 分钟

app.get('/api/items', (req, res) => {
  try {
    const now = Date.now();
    if (!itemsCache || now - itemsCacheTime > ITEMS_CACHE_TTL) {
      const itemsFile = path.join(__dirname, 'data', 'items.json');
      itemsCache = JSON.parse(fs.readFileSync(itemsFile, 'utf-8'));
      itemsCacheTime = now;
    }
    const q = (req.query.q || '').toLowerCase();
    const cat = req.query.category;
    let items = itemsCache.items;
    if (cat) items = items.filter(i => i.category === cat);
    if (q) {
      const lowerQ = q;
      items = items.filter(i => i.name.toLowerCase().includes(lowerQ) || String(i.id).includes(lowerQ));
    }
    // 限制返回数量
    const limited = items.slice(0, 500);
    res.json({ success: true, categories: itemsCache.categories, items: limited, total: items.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 当前用户权限
app.get('/api/auth/me', authService.middleware, (req, res) => {
  res.json({ success: true, user: req.user, permissions: authService.getPermissions(req.user.role) });
});

// 异常检测告警
app.get('/api/anomaly/alerts', authService.middleware, (req, res) => {
  const unhandledOnly = req.query.unhandled === 'true';
  const limit = parseInt(req.query.limit) || 50;
  res.json({ success: true, alerts: anomalyDetector.getAlerts(limit, unhandledOnly), stats: anomalyDetector.getStats() });
});

app.post('/api/anomaly/alerts/:id/handle', authService.middleware, (req, res) => {
  const success = anomalyDetector.markHandled(req.params.id, req.user.username);
  res.json({ success, message: success ? '告警已处理' : '告警不存在' });
});

app.get('/api/anomaly/rules', authService.middleware, (req, res) => {
  res.json({ success: true, rules: anomalyDetector.RULES.map(r => ({ id: r.id, name: r.name, desc: r.desc })) });
});

// 审计日志查询
app.get('/api/audit', authService.middleware, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({ success: true, records: auditService.getRecords(limit) });
});

// 代理统计信息
app.get('/api/proxy/stats', (req, res) => {
  res.json({ success: true, stats: proxyService.getStats() });
});

// ===== Activity System =====
const DATA_DIR = path.join(GC_DIR, 'data');

function readJsonFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {}
  return null;
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 活动配置
app.get('/api/activities', (req, res) => {
  const data = readJsonFile(path.join(DATA_DIR, 'ActivityConfig.json'));
  res.json({ success: true, activities: data || [] });
});

app.post('/api/activities', authService.middleware, (req, res) => {
  try {
    writeJsonFile(path.join(DATA_DIR, 'ActivityConfig.json'), req.body.activities || []);
    res.json({ success: true, message: '活动配置已保存' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 公告
app.get('/api/announcements', (req, res) => {
  const data = readJsonFile(path.join(DATA_DIR, 'Announcement.json'));
  res.json({ success: true, announcements: data || [] });
});

app.post('/api/announcements', authService.middleware, (req, res) => {
  try {
    writeJsonFile(path.join(DATA_DIR, 'Announcement.json'), req.body.announcements || []);
    res.json({ success: true, message: '公告已保存' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 游戏公告
app.get('/api/game-announcements', (req, res) => {
  const data = readJsonFile(path.join(DATA_DIR, 'GameAnnouncement.json'));
  res.json({ success: true, data: data || { t: '{{SYSTEM_TIME}}', list: [], total: 0 } });
});

app.post('/api/game-announcements', authService.middleware, (req, res) => {
  try {
    writeJsonFile(path.join(DATA_DIR, 'GameAnnouncement.json'), req.body.data || { t: '{{SYSTEM_TIME}}', list: [], total: 0 });
    res.json({ success: true, message: '游戏公告已保存' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 受保护的状态检查（需要登录）
app.get('/api/status', authService.middleware, async (req, res) => {
  const launcherStatus = await launcher.getStatus();
  const proxyRunning = await proxyService.checkProxy();
  const status = {
    ...launcherStatus,
    proxy: { running: proxyRunning, port: proxyService.getProxyPort() },
    user: req.user,
    timestamp: new Date().toISOString()
  };
  res.json(status);
});

// 自动恢复开关
app.post('/api/proxy/autorecover', (req, res) => {
  const enabled = req.body.enabled !== false;
  proxyService.setAutoRecover(enabled);
  res.json({ success: true, message: '自动恢复已' + (enabled ? '开启' : '关闭'), enabled });
});

// 游戏数据文件列表
app.get('/api/game-data', (req, res) => {
  const dataDir = path.join(GC_DIR, 'data');
  const files = [
    'Drop.json', 'ChestDrop.json', 'MonsterDrop.json',
    'Shop.json', 'ShopChest.v2.json', 'TowerSchedule.json',
    'BlossomConfig.json', 'Spawns.json', 'GadgetSpawns.json'
  ];
  const result = files.map(f => {
    const p = path.join(dataDir, f);
    return { name: f, exists: fs.existsSync(p), size: fs.existsSync(p) ? fs.statSync(p).size : 0 };
  });
  res.json({ success: true, files: result });
});

// 读取游戏数据文件
app.get('/api/game-data/:file', (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(GC_DIR, 'data', fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: '文件不存在' });
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 保存游戏数据文件
app.post('/api/game-data/:file', authService.middleware, (req, res) => {
  const fileName = req.params.file;
  const filePath = path.join(GC_DIR, 'data', fileName);
  try {
    // 备份
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, filePath + '.backup.' + Date.now());
    }
    fs.writeFileSync(filePath, req.body.content, 'utf-8');
    auditService.logAction(req.user.username, req.user.role, '编辑数据', fileName, '', req.ip);
    res.json({ success: true, message: '已保存 ' + fileName });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 性能监控
app.get('/api/perf', (req, res) => {
  res.json({ success: true, history: perfmon.getHistory() });
});

// ===== 数据库工具 (真实 MongoDB 查询) =====
app.get('/api/database/collections', authService.middleware, async (req, res) => {
  try {
    const { connect, getDb } = require('./services/db');
    await connect();
    const db = getDb();
    const collections = await db.listCollections().toArray();
    const result = await Promise.all(collections.map(async (c) => {
      const count = await db.collection(c.name).estimatedDocumentCount();
      return { name: c.name, count };
    }));
    res.json({ success: true, collections: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/database/query', authService.middleware, async (req, res) => {
  try {
    const { collection, query, limit } = req.body;
    if (!collection) return res.status(400).json({ success: false, message: '集合名为空' });

    // 安全：禁止危险操作
    const dangerous = /drop|remove|deleteMany|deleteOne|updateMany|updateOne|insert|create|rename|aggregate/i;
    if (dangerous.test(query || '')) {
      return res.status(403).json({ success: false, message: '仅允许只读查询 (find)' });
    }

    const { connect, getDb } = require('./services/db');
    await connect();
    const db = getDb();

    // 解析 MongoDB 查询语法: db.collection.find({...})
    const findMatch = (query || '').match(/db\.(\w+)\.find\(([\s\S]*?)\)(?:\.limit\((\d+)\))?(?:\.sort\(([\s\S]*?)\))?/);
    let filter = {}, opts = { limit: Math.min(limit || 50, 200) };

    if (findMatch) {
      try { filter = JSON.parse(findMatch[2] || '{}'); } catch (e) { filter = {}; }
      if (findMatch[3]) opts.limit = Math.min(parseInt(findMatch[3]), 200);
      if (findMatch[4]) try { opts.sort = JSON.parse(findMatch[4]); } catch (e) {}
    }

    const docs = await db.collection(collection).find(filter, opts).toArray();
    res.json({ success: true, count: docs.length, data: docs.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/database/stats', authService.middleware, async (req, res) => {
  try {
    const { connect, getDb } = require('./services/db');
    await connect();
    const db = getDb();
    const stats = await db.stats();
    res.json({
      success: true,
      stats: {
        dbSize: (stats.dataSize / 1024 / 1024).toFixed(1) + ' MB',
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== 多人联机管理 (KCN 联机功能) =====
app.get('/api/multiplayer/players', authService.middleware, async (req, res) => {
  const players = await multiplayer.getPlayerData();
  res.json({ success: true, players, estimatedOnline: multiplayer.getEstimatedOnlineCount() });
});

app.get('/api/multiplayer/stats', authService.middleware, async (req, res) => {
  const stats = await multiplayer.getServerStats();
  res.json({ success: true, stats });
});

app.get('/api/multiplayer/rooms', authService.middleware, (req, res) => {
  res.json({ success: true, rooms: multiplayer.getCoOpRooms() });
});

app.post('/api/multiplayer/kick', authService.middleware, (req, res) => {
  const { uid } = req.body;
  const result = multiplayer.kickFromWorld(uid);
  auditService.logAction(req.user.username, req.user.role, '踢出世界', 'UID ' + uid, '', req.ip);
  res.json({ success: result.success, message: result.success ? '已踢出' : result.message });
});

app.post('/api/multiplayer/invite', authService.middleware, (req, res) => {
  const { fromUid, toUid } = req.body;
  const result = multiplayer.inviteToWorld(fromUid, toUid);
  auditService.logAction(req.user.username, req.user.role, '邀请玩家', `UID ${toUid} → ${fromUid}`, '', req.ip);
  res.json({ success: result.success, message: result.success ? '已邀请' : result.message });
});

app.get('/api/multiplayer/chat', authService.middleware, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ success: true, messages: multiplayer.getChatMessages(limit) });
});

app.post('/api/multiplayer/chat', authService.middleware, (req, res) => {
  const { message, type } = req.body;
  if (type === 'server') {
    const result = multiplayer.sendChatMessage(message);
    multiplayer.addChatMessage({ user: '[服务器]', message, type: 'server' });
    res.json({ success: result.success, message: result.success ? '已发送' : result.message });
  } else if (type === 'private') {
    const result = multiplayer.sendPrivateMessage(req.body.uid, message);
    res.json({ success: result.success, message: result.success ? '已发送' : result.message });
  }
});

app.get('/api/multiplayer/kcp-status', async (req, res) => {
  const portUp = await multiplayer.checkKcpPort();
  const config = multiplayer.getKcpConfig();
  res.json({ success: true, kcpPortOpen: portUp, port: 22102, config });
});

app.get('/api/multiplayer/diagnostic', authService.middleware, async (req, res) => {
  const result = await multiplayer.runNetworkDiagnostic();
  res.json({ success: true, diagnostic: result });
});

// ===== 服务器增强功能 (Cultivation + KCN 优势整合) =====

// --- 场景传送预设 ---
app.get('/api/teleport/presets', (req, res) => {
  res.json({ success: true, presets: srvFeatures.TELEPORT_PRESETS, scenes: srvFeatures.SCENE_NAMES });
});

app.post('/api/teleport/player', authService.middleware, (req, res) => {
  const { uid, preset } = req.body;
  const loc = srvFeatures.TELEPORT_PRESETS[preset];
  if (!loc) return res.status(400).json({ success: false, message: '未知预设' });
  const result = gcService.sendCommand(`/teleport @${uid} ${loc.scene} ${loc.x} ${loc.y} ${loc.z}`);
  auditService.logAction(req.user.username, req.user.role, '场景传送', 'UID ' + uid, `${loc.name} (${loc.scene},${loc.x},${loc.y},${loc.z})`, req.ip);
  res.json({ success: result.success, message: result.success ? `已传送至 ${loc.name}` : result.message });
});

// --- 服务器广播 ---
app.post('/api/server/broadcast', authService.middleware, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, message: '广播内容为空' });
  const result = srvFeatures.broadcastToServer(message);
  auditService.logAction(req.user.username, req.user.role, '服务器广播', '全服', message, req.ip);
  res.json({ success: result.success, message: result.success ? '广播已发送' : result.message });
});

app.post('/api/server/mail', authService.middleware, (req, res) => {
  const { title, content, items } = req.body;
  const result = srvFeatures.sendMailToAll(title || '系统通知', content || '', items);
  auditService.logAction(req.user.username, req.user.role, '全服邮件', '', title, req.ip);
  res.json({ success: result.success, message: result.success ? '邮件已发送' : result.message });
});

// --- 连接池 ---
app.get('/api/connections', authService.middleware, (req, res) => {
  res.json({ success: true, stats: srvFeatures.getConnectionStats() });
});

app.post('/api/connections/max', authService.middleware, (req, res) => {
  srvFeatures.setMaxConnections(req.body.max || 50);
  res.json({ success: true, max: req.body.max });
});

// --- 系统信息 ---
app.get('/api/system/info', authService.middleware, (req, res) => {
  res.json({ success: true, info: srvFeatures.getSystemInfo() });
});

// --- 备份管理 ---
app.get('/api/backups', authService.middleware, (req, res) => {
  res.json(srvFeatures.listBackups());
});

app.post('/api/backups/create', authService.middleware, (req, res) => {
  const result = srvFeatures.createBackup();
  auditService.logAction(req.user.username, req.user.role, '创建备份', '', '', req.ip);
  res.json(result);
});

app.post('/api/backups/auto', authService.middleware, (req, res) => {
  const hours = req.body.interval || 6;
  srvFeatures.startAutoBackup(hours);
  res.json({ success: true, message: `自动备份已启动 (间隔 ${hours} 小时)` });
});

// --- 插件上传 (KCN MOD注入管理) ---
app.post('/api/plugins/upload', authService.middleware, (req, res) => {
  try {
    const { name, content, type } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '插件名为空' });
    const pluginsDir = path.join(GC_DIR, 'plugins');
    if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

    const dest = path.join(pluginsDir, name + (type === 'jar' ? '.jar' : ''));
    if (content) {
      fs.writeFileSync(dest, Buffer.from(content, 'base64'));
    } else {
      // Create as directory-based plugin
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    }
    auditService.logAction(req.user.username, req.user.role, '安装插件', name, '', req.ip);
    res.json({ success: true, message: '插件已安装: ' + name });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- GM 指令模板 ---
app.get('/api/commands/templates', (req, res) => {
  const templates = [
    { id: 'give_all', name: '全角色+满命', cmd: '/giveall' },
    { id: 'give_primogem', name: '原石 x99999', cmd: '/give 201 x99999' },
    { id: 'give_mora', name: '摩拉 x99999', cmd: '/give 202 x99999' },
    { id: 'give_fate', name: '纠缠之缘 x999', cmd: '/give 223 x999' },
    { id: 'unlock_all', name: '解锁全部', cmd: '/unlockall' },
    { id: 'god_mode', name: '无敌模式', cmd: '/godmode' },
    { id: 'heal', name: '治疗全部', cmd: '/heal' },
    { id: 'set_wl8', name: '世界等级8', cmd: '/setworldlevel 8' },
    { id: 'set_ar60', name: '冒险等级60', cmd: '/setlevel 60' },
    { id: 'spawn', name: '生成怪物', cmd: '/spawn ' },
    { id: 'weather', name: '晴天', cmd: '/weather sunny' },
    { id: 'talent', name: '满天赋', cmd: '/talent unlock all' },
    { id: 'clear_mobs', name: '清除怪物', cmd: '/killall' },
  ];
  res.json({ success: true, templates });
});

// HTTP 服务器
http.createServer(app).listen(PORT, () => {
  console.log(`[提瓦特管理台] HTTP:  http://localhost:${PORT}`);
});

// HTTPS 服务器 (P3-2)
const SSL_DIR = path.join(__dirname, '.proxy-ssl');
const caCertPath = path.join(SSL_DIR, 'certs', 'ca.pem');
const caKeyPath = path.join(SSL_DIR, 'certs', 'ca.key');
// http-mitm-proxy 可能将 key 也放在 certs 目录
const keyPath = fs.existsSync(caKeyPath) ? caKeyPath : caCertPath;
let httpsServer = null;
if (fs.existsSync(caCertPath)) {
  try {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(caCertPath),
    };
    const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 8443;
    httpsServer = https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
      console.log(`[提瓦特管理台] HTTPS: https://localhost:${HTTPS_PORT}`);
    });
  } catch (e) {
    console.log(`[提瓦特管理台] HTTPS 启动失败: ${e.message}，仅使用 HTTP`);
  }
} else {
  console.log('[提瓦特管理台] CA 证书不存在，跳过 HTTPS');
}
if (!httpsServer) {
  console.log(`[提瓦特管理台] 静态文件目录: ${path.join(__dirname, 'public')}`);
  // 初始化默认管理员
  authService.initDefaultAdmin();
  // 自动启动代理（无需用户手动操作）
  proxyService.startProxy().then(r => {
    console.log('[Server] 代理已自动启动:', r.message || 'ok');
    // 尝试自动安装证书
    proxyService.installCaCert().then(() => console.log('[Server] CA 证书已安装')).catch(() => {});
  }).catch(e => console.log('[Server] 代理自动启动失败:', e.message));
  // 启动代理心跳检测
  proxyService.startHeartbeat(10000);
  // 启动性能监控
  perfmon.start(5000);
  // 启动 Lua 脚本文件监听（自动热重载）
  if (questRoutes.startWatcher) questRoutes.startWatcher();
  // 启动自动备份（每 6 小时）
  srvFeatures.startAutoBackup(6);
  } // end if (!httpsServer)

// ===== WebSocket 实时推送 =====
const wss = new WebSocketServer({ port: 8082 });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', time: new Date().toISOString() }));

  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

// 广播函数（供其他模块调用）
function wsBroadcast(data) {
  const msg = JSON.stringify(data);
  wsClients.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

// 定期广播状态（替代前端轮询）
setInterval(async () => {
  if (wsClients.size === 0) return;
  try {
    const launcher = require('./services/launcher');
    const proxyService = require('./services/proxy');
    const perfmon = require('./services/perfmon');
    const status = {
      type: 'status',
      mongodb: { running: await launcher.isMongoRunning() },
      grasscutter: { running: require('./services/grasscutter').isRunning() },
      proxy: { running: await proxyService.checkProxy(), port: proxyService.getProxyPort() },
      perf: perfmon.getHistory().slice(-1)[0] || null,
      timestamp: new Date().toISOString(),
    };
    wsBroadcast(status);
  } catch (e) { /* silent */ }
}, 3000);

// ===== P3-4: 版本兼容性面板 =====
app.get('/api/version', (req, res) => {
  const info = {
    server: 'Plan-B 提瓦特管理台',
    version: '0.2.0',
    node: process.version,
    platform: process.platform,
    grasscutter: {
      version: '1.7.4-bec1b3a4d',
      gameVersion: '4.0.0',
      resources: 'GC-Resources-4.0',
      java: 'JDK 17+',
    },
    compatibility: {
      client: 'Genshin Impact 4.0.0 (PC)',
      protocol: 'KCP/UDP 22102',
      dispatch: 'HTTP 443 → Proxy 8081',
      status: 'supported',
    },
    services: {
      web: PORT,
      proxy: 8081,
      websocket: 8082,
      kcp: 22102,
      mongo: 27017,
    },
    endpoints: 72,
    uptime: Math.floor(process.uptime()),
  };
  res.json({ success: true, info });
});

// 导出广播函数供其他模块使用
app.locals.wsBroadcast = wsBroadcast;

// ===== P1-3: 抽卡历史浏览器 =====
app.get('/api/gacha/history/:uid', authService.middleware, async (req, res) => {
  try {
    const { connect, getDb } = require('./services/db');
    await connect();
    const db = getDb();
    const uid = parseInt(req.params.uid);
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);

    const records = await db.collection('gachas')
      .find({ ownerId: uid })
      .sort({ transactionDate: -1 })
      .limit(limit)
      .toArray();

    // 加载物品名称映射
    const gachaService = require('./services/gachaService');
    const names = gachaService.NAMES;

    // 统计
    let count5 = 0, count4 = 0, count3 = 0;
    let pity5 = 0, maxPity5 = 0;
    let last5Date = null;
    const byType = {};
    const timeline = [];

    records.forEach((r, i) => {
      const itemName = names[String(r.itemID)] || ('物品#' + r.itemID);
      const rarity = r.itemID >= 11000 && r.itemID % 100 < 10 ? 5 :
                     r.itemID < 10000 && [1002,1003,1016,1022,1026,1029,1030,1033,1035,1037,1038,1041,1042,1046,1047,1049].includes(r.itemID) ? 5 :
                     r.itemID >= 1000 && r.itemID < 1100 ? 4 : 3;

      pity5++;
      if (rarity === 5) {
        count5++; maxPity5 = Math.max(maxPity5, pity5); pity5 = 0;
        if (!last5Date) last5Date = r.transactionDate;
      }
      if (rarity === 4) count4++;
      if (rarity === 3) count3++;

      const typeName = { 301: '限定角色', 400: '限定角色II', 302: '限定武器', 200: '常驻', 100: '新手' };
      const typeKey = typeName[r.gachaType] || ('类型' + r.gachaType);
      byType[typeKey] = (byType[typeKey] || 0) + 1;

      timeline.push({
        time: r.transactionDate,
        itemId: r.itemID,
        itemName,
        rarity,
        gachaType: r.gachaType,
        pityCount: rarity === 5 ? maxPity5 : pity5,
      });
    });

    res.json({
      success: true,
      uid,
      total: records.length,
      stats: {
        count5, count4, count3,
        avgPity5: count5 > 0 ? (records.length / count5).toFixed(1) : 'N/A',
        maxPity5,
        currentPity: pity5,
        last5Date,
        byType,
      },
      timeline: timeline.slice(0, 100),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== P1-4: 局域网服务发现 (mDNS) =====
try {
  const bonjour = require('bonjour');
  const mdns = bonjour();
  mdns.publish({
    name: 'Plan-B 提瓦特管理台',
    type: 'http',
    port: PORT,
    txt: { path: '/', desc: 'Grasscutter Management Console' },
  });
  console.log('[mDNS] 局域网服务已广播: Plan-B 提瓦特管理台');
} catch (e) {
  console.log('[mDNS] Bonjour 广播跳过:', e.message);
}

// ===== P2-4: JSON Schema 校验 =====
const BANNER_SCHEMA = {
  type: 'object',
  required: ['gachaType', 'scheduleId', 'costItemId', 'rateUpItems5', 'rateUpItems4'],
  properties: {
    gachaType: { type: 'number', enum: [100, 200, 301, 302, 400] },
    scheduleId: { type: 'number' },
    costItemId: { type: 'number', enum: [223, 224] },
    rateUpItems5: { type: 'array' },
    rateUpItems4: { type: 'array' },
    prefabPath: { type: 'string' },
    weights5: { type: 'array' },
    weights4: { type: 'array' },
  },
};

function validateSchema(data, schema) {
  const errors = [];
  if (!schema) return errors;
  for (const [key, rule] of Object.entries(schema.properties || {})) {
    if (schema.required?.includes(key) && (data[key] === undefined || data[key] === null)) {
      errors.push(`缺少必填字段: ${key}`);
    }
    if (rule.enum && data[key] !== undefined && !rule.enum.includes(data[key])) {
      errors.push(`${key}: ${data[key]} 不在允许值 [${rule.enum.join(',')}] 中`);
    }
    if (rule.type === 'array' && data[key] !== undefined && !Array.isArray(data[key])) {
      errors.push(`${key}: 应为数组`);
    }
    if (rule.type === 'number' && data[key] !== undefined && typeof data[key] !== 'number') {
      errors.push(`${key}: 应为数字`);
    }
  }
  return errors;
}

// ===== P2-3: 指令宏系统 =====
const MACROS_FILE = path.join(__dirname, 'data', 'macros.json');
function loadMacros() {
  try { return fs.existsSync(MACROS_FILE) ? JSON.parse(fs.readFileSync(MACROS_FILE, 'utf-8')) : []; }
  catch { return []; }
}
function saveMacros(macros) {
  const dir = path.dirname(MACROS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MACROS_FILE, JSON.stringify(macros, null, 2), 'utf-8');
}

app.get('/api/macros', authService.middleware, (req, res) => {
  res.json({ success: true, macros: loadMacros() });
});

app.post('/api/macros', authService.middleware, (req, res) => {
  const { name, commands, description } = req.body;
  if (!name || !commands) return res.status(400).json({ success: false, message: '名称和指令不能为空' });
  const macros = loadMacros();
  if (macros.find(m => m.name === name)) return res.json({ success: false, message: '宏名称已存在' });
  macros.push({ name, commands: Array.isArray(commands) ? commands : [commands], description: description || '', createdBy: req.user.username, createdAt: new Date().toISOString() });
  saveMacros(macros);
  res.json({ success: true, message: '宏已创建' });
});

app.delete('/api/macros/:name', authService.middleware, (req, res) => {
  let macros = loadMacros();
  macros = macros.filter(m => m.name !== req.params.name);
  saveMacros(macros);
  res.json({ success: true, message: '宏已删除' });
});

app.post('/api/macros/:name/execute', authService.middleware, (req, res) => {
  const macros = loadMacros();
  const macro = macros.find(m => m.name === req.params.name);
  if (!macro) return res.status(404).json({ success: false, message: '宏不存在' });
  const results = macro.commands.map(cmd => gcService.sendCommand(cmd));
  auditService.logAction(req.user.username, req.user.role, '执行宏', macro.name, macro.commands.join('; '), req.ip);
  res.json({ success: true, message: `已执行宏 "${macro.name}" (${macro.commands.length} 条指令)`, results });
});

// 全局错误防护，防止进程崩溃
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});

// PM2 优雅关闭
let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] 收到 ${signal}，优雅关闭中...`);

  // 1. 停止代理
  try { await proxyService.stopProxy(); } catch (e) {}
  // 2. 停止 Grasscutter
  try { await gcService.stop(); } catch (e) {}
  // 3. 停止 MongoDB
  try { await launcher.stopAll(); } catch (e) {}
  // 4. 停止文件监听
  try { if (questRoutes.stopWatcher) questRoutes.stopWatcher(); } catch (e) {}
  // 5. 停止自动备份
  try { srvFeatures.stopAutoBackup(); } catch (e) {}

  console.log('[Server] 所有服务已停止，退出。');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('message', (msg) => {
  if (msg === 'shutdown') gracefulShutdown('PM2 shutdown');
});
