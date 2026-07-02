// 服务端增强功能：连接池、场景传送、广播、备份
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');

// ===== 连接池管理 =====
let connectionStats = {
  activeConnections: 0,
  totalConnections: 0,
  peakConnections: 0,
  rejectedConnections: 0,
  maxConnections: 50,
};

function getConnectionStats() { return { ...connectionStats }; }
function setMaxConnections(max) { connectionStats.maxConnections = Math.max(1, max); }
function trackConnection() {
  connectionStats.activeConnections++;
  connectionStats.totalConnections++;
  if (connectionStats.activeConnections > connectionStats.peakConnections) {
    connectionStats.peakConnections = connectionStats.activeConnections;
  }
}
function trackDisconnection() {
  connectionStats.activeConnections = Math.max(0, connectionStats.activeConnections - 1);
}
function isOverLimit() {
  return connectionStats.activeConnections >= connectionStats.maxConnections;
}

// ===== 场景传送预设 =====
const TELEPORT_PRESETS = {
  'mondstadt': { name: '蒙德城', scene: 3, x: 2848, y: 217, z: -1075 },
  'liyue': { name: '璃月港', scene: 3, x: -956, y: 226, z: 1364 },
  'inazuma': { name: '稻妻城', scene: 3, x: -3228, y: 210, z: -3411 },
  'sumeru': { name: '须弥城', scene: 3, x: 2874, y: 364, z: -1882 },
  'fontaine': { name: '枫丹廷', scene: 3, x: 4280, y: 456, z: -2134 },
  'stormterror': { name: '风龙废墟', scene: 3, x: -3, y: 260, z: 1910 },
  'guyun': { name: '孤云阁', scene: 3, x: -606, y: 210, z: 2042 },
  'dragonspine': { name: '龙脊雪山', scene: 3, x: 1721, y: 332, z: -659 },
  'chasm': { name: '层岩巨渊', scene: 3, x: -1223, y: 223, z: 2123 },
  'enkanomiya': { name: '渊下宫', scene: 3, x: -1794, y: 203, z: 956 },
  'serenitea': { name: '尘歌壶', scene: 3, x: 938, y: 294, z: -355 },
  'domain1': { name: '仲夏庭园', scene: 3, x: -260, y: 301, z: 2306 },
  'domain2': { name: '铭记之谷', scene: 3, x: -60, y: 240, z: -104 },
  'domain3': { name: '芬德尼尔之顶', scene: 3, x: 2025, y: 442, z: -1075 },
};
const SCENE_NAMES = { 3: '提瓦特大陆', 4: '地下矿洞', 5: '渊下宫', 6: '尘歌壶', 7: '金苹果群岛', 9: '须弥沙漠' };

// ===== 系统性能监控 v2 =====
function getSystemInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  const loadAvg = os.loadavg();

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptime: Math.floor(os.uptime()),
    memory: {
      total: (totalMem / 1024 / 1024 / 1024).toFixed(1) + ' GB',
      used: ((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(1) + ' GB',
      free: (freeMem / 1024 / 1024 / 1024).toFixed(1) + ' GB',
      percent: Math.round((totalMem - freeMem) / totalMem * 100),
    },
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || 'Unknown',
      loadAvg1m: loadAvg[0]?.toFixed(2),
      loadAvg5m: loadAvg[1]?.toFixed(2),
      loadAvg15m: loadAvg[2]?.toFixed(2),
    },
    node: {
      version: process.version,
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
    },
    connections: getConnectionStats(),
  };
}

// ===== 服务器广播 =====
function broadcastToServer(message) {
  const gcService = require('./grasscutter');
  // Grasscutter broadcast command: /broadcast <message>
  const cmd = '/broadcast ' + message;
  return gcService.sendCommand(cmd);
}

function sendMailToAll(title, content, items) {
  const gcService = require('./grasscutter');
  // /sendmail @all <title> <content>
  const cmd = '/sendmail @all ' + title + ' ' + (content || '');
  return gcService.sendCommand(cmd);
}

// ===== 自动备份 =====
let backupTimer = null;
const BACKUP_DIR = path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'cultivation', 'grasscutter', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function listBackups() {
  ensureBackupDir();
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json') || f.endsWith('.gz'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, time: stat.mtime.toISOString(), path: path.join(BACKUP_DIR, f) };
      })
      .sort((a, b) => b.time.localeCompare(a.time));
    return { success: true, backups: files, count: files.length };
  } catch (err) {
    return { success: false, message: err.message, backups: [] };
  }
}

function createBackup() {
  ensureBackupDir();
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const gcDir = path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'cultivation', 'grasscutter');

    // Backup config
    const configSrc = path.join(gcDir, 'config.json');
    if (fs.existsSync(configSrc)) {
      fs.copyFileSync(configSrc, path.join(BACKUP_DIR, 'config_' + timestamp + '.json'));
    }
    // Backup banners
    const bannersSrc = path.join(gcDir, 'data', 'Banners.json');
    if (fs.existsSync(bannersSrc)) {
      fs.copyFileSync(bannersSrc, path.join(BACKUP_DIR, 'Banners_' + timestamp + '.json'));
    }

    return { success: true, message: '备份已创建', time: timestamp };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function startAutoBackup(intervalHours = 6) {
  if (backupTimer) clearInterval(backupTimer);
  const ms = intervalHours * 3600000;
  console.log('[Backup] 自动备份已启动，间隔 ' + intervalHours + ' 小时');
  createBackup(); // 立即执行一�?
  backupTimer = setInterval(() => {
    console.log('[Backup] 执行定时备份...');
    createBackup();
  }, ms);
}

function stopAutoBackup() {
  if (backupTimer) { clearInterval(backupTimer); backupTimer = null; }
}

module.exports = {
  getConnectionStats, setMaxConnections, trackConnection, trackDisconnection, isOverLimit,
  TELEPORT_PRESETS, SCENE_NAMES,
  getSystemInfo,
  broadcastToServer, sendMailToAll,
  listBackups, createBackup, startAutoBackup, stopAutoBackup,
};
