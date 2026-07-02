const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { WebSocket } = require('ws');

// 方案A 的 Grasscutter 路径
const GC_DIR = process.env.GC_DIR
  ? process.env.GC_DIR.replace('%USERPROFILE%', process.env.USERPROFILE || '')
  : path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'cultivation', 'grasscutter');
const GC_JAR = path.join(GC_DIR, 'grasscutter.jar');

// OpenCommand plugin 配置
const OPENCMD_CONFIG_PATH = path.join(GC_DIR, 'plugins', 'opencommand-plugin', 'config.json');
function getOpenCmdConfig() {
  try {
    if (fs.existsSync(OPENCMD_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(OPENCMD_CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

let gcProcess = null;
let startTime = null;

// ===== 进程状态检查 =====
function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

function isRunning() {
  // 检查 gcProcess 是否存活且 stdin 可写
  if (gcProcess && !gcProcess.killed) {
    try { gcProcess.stdin.write(''); return true; } catch (e) { /* stdin closed */ }
  }
  // 检查端口（GC 可能由之前的进程启动，stdin 不可用但服务仍在运行）
  return false;
}

async function isGcReachable() {
  return await checkPort(443);
}

function getPid() {
  return gcProcess ? gcProcess.pid : null;
}

function getUptime() {
  return startTime ? Date.now() - startTime : 0;
}

// ===== 启动/停止 =====
function start() {
  return new Promise((resolve, reject) => {
    if (gcProcess && !gcProcess.killed) {
      return reject(new Error('服务端已在运行中'));
    }
    if (!fs.existsSync(GC_JAR)) {
      return reject(new Error('grasscutter.jar 不存在: ' + GC_JAR));
    }

    // 使用 shell: true 保持 stdin 管道打开（解决 java.exe 启动 javaw.exe 后父进程退出的问题）
    gcProcess = spawn('java', ['-jar', GC_JAR], {
      cwd: GC_DIR,
      shell: true,           // 通过 cmd.exe 启动，stdin 保持打开
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    startTime = Date.now();

    gcProcess.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => console.log(`[GC] ${line}`));
    });

    gcProcess.stderr.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => console.error(`[GC-ERR] ${line}`));
    });

    gcProcess.on('close', (code) => {
      console.log(`[GC] 进程退出，代码: ${code}`);
      // 不立即清除 gcProcess，stdin 可能仍可用一段时间
      startTime = null;
      setTimeout(() => { if (gcProcess && gcProcess.killed) gcProcess = null; }, 5000);
    });

    gcProcess.on('error', (err) => {
      console.error(`[GC] 进程错误: ${err.message}`);
    });

    // 等待 Dispatch 端口就绪
    let attempts = 0;
    const waitReady = setInterval(async () => {
      attempts++;
      const ready = await checkPort(443);
      if (ready) {
        clearInterval(waitReady);
        resolve({ pid: gcProcess.pid, ready: true });
      } else if (attempts > 60) {
        clearInterval(waitReady);
        resolve({ pid: gcProcess.pid, ready: false, warning: 'Dispatch 端口未就绪' });
      }
    }, 1000);
  });
}

function stop() {
  return new Promise(async (resolve) => {
    // 1. 通过子进程引用杀掉
    if (gcProcess && !gcProcess.killed) {
      try {
        gcProcess.stdin.write('stop\n');
        gcProcess.kill('SIGTERM');
      } catch (e) {}
      await new Promise(r => setTimeout(r, 3000));
      if (gcProcess && !gcProcess.killed) {
        try { gcProcess.kill('SIGKILL'); } catch (e) {}
      }
      gcProcess = null;
      startTime = null;
    }

    // 2. 也杀掉可能残留的 Java 进程
    try {
      const { execSync } = require('child_process');
      execSync('taskkill /F /FI "IMAGENAME eq java.exe" /FI "WINDOWTITLE eq Grasscutter*" 2>nul', { timeout: 3000, shell: 'cmd.exe' });
    } catch (e) {}

    resolve();
  });
}

// ===== 指令发送 (双通道: WebSocket + stdin) =====
function sendCommandViaOpenCmd(cmd, token) {
  return new Promise((resolve) => {
    const config = getOpenCmdConfig();
    const socketPort = config?.socketPort || 5746;
    const socketHost = config?.socketHost || '127.0.0.1';

    try {
      const ws = new WebSocket(`ws://${socketHost}:${socketPort}`);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ success: false, message: 'OpenCommand 连接超时' });
      }, 5000);

      ws.on('open', () => {
        // 去掉前导 / 并发送（GC 控制台不需要 / 前缀）
        const gcCmd = cmd.startsWith('/') ? cmd.slice(1) : cmd;
        ws.send(gcCmd);
        // 等待响应
        ws.on('message', (data) => {
          clearTimeout(timeout);
          ws.close();
          resolve({ success: true, message: '指令已执行', output: data.toString() });
        });
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        resolve({ success: false, message: 'OpenCommand 连接失败' });
      });
    } catch (e) {
      resolve({ success: false, message: 'OpenCommand 不可用: ' + e.message });
    }
  });
}

function sendCommandViaStdin(cmd) {
  if (!gcProcess || gcProcess.killed) {
    return { success: false, message: '服务端进程未运行 (stdin 不可用)' };
  }
  try {
    // 去掉前导 /
    const gcCmd = cmd.startsWith('/') ? cmd.slice(1) : cmd;
    gcProcess.stdin.write(gcCmd + '\n');
    return { success: true, message: '指令已发送: ' + gcCmd };
  } catch (err) {
    return { success: false, message: '发送失败: ' + err.message };
  }
}

async function sendCommand(cmd) {
  // 统一去掉前导 /
  const gcCmd = cmd.startsWith('/') ? cmd.slice(1) : cmd;

  // 1. 优先使用 OpenCommand WebSocket
  const wsResult = await sendCommandViaOpenCmd(gcCmd);
  if (wsResult.success) return wsResult;

  // 2. 回退到 stdin
  const stdinResult = sendCommandViaStdin(gcCmd);
  if (stdinResult.success) return stdinResult;

  // 3. 都失败：提示重启
  return { success: false, message: '无法连接到 Grasscutter。请通过管理台重启服务端。' };
}

// 同步版本（兼容旧代码）
function sendCommandSync(cmd) {
  if (gcProcess && !gcProcess.killed) {
    try { gcProcess.stdin.write(cmd + '\n'); return { success: true, message: '指令已发送' }; }
    catch (e) { return { success: false, message: e.message }; }
  }
  return { success: false, message: '服务端未运行' };
}

module.exports = {
  start, stop, isRunning, isGcReachable,
  getPid, getUptime,
  sendCommand, sendCommandSync,
};
