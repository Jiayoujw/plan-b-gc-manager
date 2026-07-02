const os = require('os');
const { connect, getDb } = require('./db');

let history = [];
const MAX_HISTORY = 60; // 保留最近 60 个点（5分钟，每5秒一个点）

function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length
  };
}

let lastCpu = getCpuUsage();

function getStats() {
  // CPU 使用率
  const currentCpu = getCpuUsage();
  const idleDiff = currentCpu.idle - lastCpu.idle;
  const totalDiff = currentCpu.total - lastCpu.total;
  const cpuPercent = totalDiff > 0 ? Math.round(100 - (100 * idleDiff / totalDiff)) : 0;
  lastCpu = currentCpu;

  // 内存使用率
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memPercent = Math.round(100 * (totalMem - freeMem) / totalMem);
  const memUsedGB = ((totalMem - freeMem) / 1024 / 1024 / 1024).toFixed(1);
  const memTotalGB = (totalMem / 1024 / 1024 / 1024).toFixed(1);

  return {
    cpu: cpuPercent,
    memory: memPercent,
    memoryUsed: memUsedGB,
    memoryTotal: memTotalGB,
    timestamp: Date.now()
  };
}

async function getOnlineCount() {
  try {
    if (!require('./db').isConnected()) return -1;
    const { connect, getDb } = require('./db');
    await connect();
    const db = getDb();
    const count = await db.collection('players').countDocuments({ online: true });
    return count;
  } catch {
    return -1;
  }
}

async function record() {
  const stats = getStats();
  const online = await getOnlineCount();
  const point = { ...stats, online };
  history.push(point);
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  return point;
}

function getHistory() {
  return history;
}

function start(intervalMs = 5000) {
  record();
  setInterval(record, intervalMs);
}

module.exports = { getStats, getOnlineCount, record, getHistory, start };
