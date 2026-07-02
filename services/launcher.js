const { spawn, exec } = require('child_process');
const path = require('path');
const net = require('net');
const gcService = require('./grasscutter');

const MONGOD_BIN = 'C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe';
const MONGO_DATA = 'C:\\Users\\24280\\mongo-data';
const MONGO_LOG = 'C:\\Users\\24280\\mongo-log\\mongod.log';

let mongoProcess = null;

// 防止 MongoDB 进程退出时触发 unhandled error
process.on('unhandledRejection', (reason) => {
  console.error('[Launcher] Unhandled rejection:', reason);
});

function checkPort(port, host = 'localhost') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

async function isMongoRunning() {
  return await checkPort(27017);
}

function startMongoDB() {
  return new Promise((resolve, reject) => {
    if (mongoProcess && !mongoProcess.killed) {
      return resolve({ pid: mongoProcess.pid, alreadyRunning: true });
    }

    mongoProcess = spawn(MONGOD_BIN, [
      '--dbpath', MONGO_DATA,
      '--bind_ip', 'localhost',
      '--port', '27017',
      '--logpath', MONGO_LOG,
      '--logappend'
    ], {
      detached: false,
      windowsHide: true
    });

    mongoProcess.stdout.on('data', (data) => {
      console.log(`[MongoDB] ${data.toString().trim()}`);
    });

    mongoProcess.stderr.on('data', (data) => {
      console.error(`[MongoDB-ERR] ${data.toString().trim()}`);
    });

    mongoProcess.on('close', (code) => {
      console.log(`[MongoDB] 进程退出，代码: ${code}`);
      mongoProcess = null;
    });

    // 等待 MongoDB 就绪（最多 15 秒）
    let attempts = 0;
    const waitForReady = setInterval(async () => {
      attempts++;
      const ready = await checkPort(27017);
      if (ready) {
        clearInterval(waitForReady);
        resolve({ pid: mongoProcess.pid, ready: true });
      } else if (attempts > 30) {
        clearInterval(waitForReady);
        reject(new Error('MongoDB 启动超时（15秒），请检查日志'));
      }
    }, 500);
  });
}

function stopMongoDB() {
  return new Promise((resolve) => {
    if (mongoProcess && !mongoProcess.killed) {
      mongoProcess.kill('SIGTERM');
      setTimeout(() => {
        if (mongoProcess && !mongoProcess.killed) {
          mongoProcess.kill('SIGKILL');
        }
        resolve();
      }, 3000);
    } else {
      resolve();
    }
  });
}

async function startAll() {
  const results = [];

  // 0. 清理可能残留的旧 Java/Grasscutter 进程（避免端口冲突）
  try {
    const { execSync } = require('child_process');
    execSync('taskkill /F /FI "IMAGENAME eq java.exe" /FI "WINDOWTITLE eq Grasscutter*" 2>nul', { timeout: 3000 });
  } catch {}
  // 等待端口释放
  await new Promise(r => setTimeout(r, 1500));

  // 1. 启动 MongoDB
  const mongoRunning = await isMongoRunning();
  if (!mongoRunning) {
    try {
      const mongoResult = await startMongoDB();
      results.push({ service: 'MongoDB', status: 'started', pid: mongoResult.pid });
    } catch (err) {
      results.push({ service: 'MongoDB', status: 'failed', error: err.message });
      return { success: false, results };
    }
  } else {
    results.push({ service: 'MongoDB', status: 'already-running' });
  }

  // 2. 启动 Grasscutter
  if (!gcService.isRunning()) {
    try {
      const gcResult = await gcService.start();
      results.push({ service: 'Grasscutter', status: 'started', pid: gcResult.pid });
    } catch (err) {
      results.push({ service: 'Grasscutter', status: 'failed', error: err.message });
      return { success: false, results };
    }
  } else {
    results.push({ service: 'Grasscutter', status: 'already-running' });
  }

  return { success: true, results };
}

async function stopAll() {
  const results = [];

  if (gcService.isRunning()) {
    await gcService.stop();
    results.push({ service: 'Grasscutter', status: 'stopped' });
  } else {
    results.push({ service: 'Grasscutter', status: 'not-running' });
  }

  await stopMongoDB();
  results.push({ service: 'MongoDB', status: 'stopped' });

  return { success: true, results };
}

async function getStatus() {
  return {
    mongodb: { running: await isMongoRunning() },
    grasscutter: {
      running: gcService.isRunning(),
      pid: gcService.getPid(),
      uptime: gcService.getUptime()
    }
  };
}

module.exports = { startAll, stopAll, getStatus, isMongoRunning };
