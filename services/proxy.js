const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const TARGET_DOMAINS = [
  'api-os-takumi.mihoyo.com', 'hk4e-api-os-static.mihoyo.com', 'hk4e-sdk-os.mihoyo.com',
  'dispatchosglobal.yuanshen.com', 'osusadispatch.yuanshen.com', 'account.mihoyo.com',
  'log-upload-os.mihoyo.com', 'dispatchcntest.yuanshen.com', 'devlog-upload.mihoyo.com',
  'webstatic.mihoyo.com', 'log-upload.mihoyo.com', 'hk4e-sdk.mihoyo.com',
  'api-beta-sdk.mihoyo.com', 'api-beta-sdk-os.mihoyo.com', 'cnbeta01dispatch.yuanshen.com',
  'dispatchcnglobal.yuanshen.com', 'cnbeta02dispatch.yuanshen.com', 'sdk-os-static.mihoyo.com',
  'webstatic-sea.mihoyo.com', 'webstatic-sea.hoyoverse.com', 'hk4e-sdk-os-static.hoyoverse.com',
  'sdk-os-static.hoyoverse.com', 'api-account-os.hoyoverse.com', 'hk4e-sdk-os.hoyoverse.com',
  'overseauspider.yuanshen.com', 'gameapi-account.mihoyo.com', 'minor-api.mihoyo.com',
  'public-data-api.mihoyo.com', 'uspider.yuanshen.com', 'sdk-static.mihoyo.com',
  'abtest-api-data-sg.hoyoverse.com', 'log-upload-os.hoyoverse.com'
];

const PROXY_PORT = 8081;
const REMOTE_HOST = 'localhost';
const REMOTE_PORT = 443;
let proxyServer = null;
let isRunning = false;
let heartbeatTimer = null;
let interceptCount = 0;
let errorCount = 0;
let lastError = null;
let autoRecover = true;

const SSL_DIR = path.join(__dirname, '..', '.proxy-ssl');
const CA_CERT_PATH = path.join(SSL_DIR, 'certs', 'ca.pem');

function checkPort(port) {
  return new Promise((resolve) => {
    const tryHost = (host) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => {
        if (host === '127.0.0.1') tryHost('::1');
        else resolve(false);
      });
      socket.once('timeout', () => { socket.destroy(); if (host === '127.0.0.1') tryHost('::1'); else resolve(false); });
      socket.connect(port, host);
    };
    tryHost('127.0.0.1');
  });
}

// 强制释放端口（杀掉占用 8081 的进程）
function killPortOccupier(port) {
  return new Promise((resolve) => {
    exec(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F 2>nul`, () => {
      setTimeout(resolve, 500);
    });
  });
}

// 检查 CA 证书是否已安装
function checkCertExpiry() {
  try {
    const { execSync } = require('child_process');
    const result = execSync('certutil -store -user Root | findstr /C:"NodeMITMProxyCA"', { encoding: 'utf-8', timeout: 5000 });
    // 解析证书有效期
    const notAfterMatch = result.match(/NotAfter:\s*(\d+\/\d+\/\d+\s+\d+:\d+)/);
    if (notAfterMatch) {
      const expiry = new Date(notAfterMatch[1]);
      const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
      return { installed: true, expiry: expiry.toISOString(), daysLeft };
    }
    return { installed: false, expiry: null, daysLeft: 0 };
  } catch {
    return { installed: false, expiry: null, daysLeft: 0 };
  }
}

function isCaInstalled() {
  return new Promise((resolve) => {
    exec('certutil -store -user Root | findstr /C:"NodeMITMProxyCA"', (err, stdout) => {
      resolve(!err && stdout && stdout.includes('NodeMITMProxyCA'));
    });
  });
}

// 安装 CA 证书
function installCaCert() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CA_CERT_PATH)) {
      return reject(new Error('CA 证书不存在，请先启动代理'));
    }
    exec(`certutil -addstore -user Root "${CA_CERT_PATH}"`, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error('证书安装失败: ' + (stderr || err.message)));
      }
      resolve();
    });
  });
}

// 检查代理端口是否监听
async function checkProxy() {
  return await checkPort(PROXY_PORT);
}

// 设置/取消 Windows 系统代理
function setSystemProxy(enable) {
  return new Promise((resolve) => {
    const proxyAddr = `127.0.0.1:${PROXY_PORT}`;
    if (enable) {
      exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f && reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${proxyAddr}" /f`, (err) => {
        if (err) console.warn('[Proxy] 注册表设置失败:', err.message);
        resolve();
      });
    } else {
      exec('reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f', (err) => {
        if (err) console.warn('[Proxy] 注册表清除失败:', err.message);
        resolve();
      });
    }
  });
}

// 启动代理（内部函数，可被自动恢复调用）
async function _doStart() {
  return new Promise((resolve, reject) => {
    try {
      const httpMitmProxy = require('http-mitm-proxy');
      proxyServer = new httpMitmProxy.Proxy();

      if (!fs.existsSync(SSL_DIR)) {
        fs.mkdirSync(SSL_DIR, { recursive: true });
      }

      proxyServer.onError((ctx, err) => {
        if (err && err.code !== 'ECONNRESET' && err.code !== 'ENOTFOUND' && err.code !== 'ECONNREFUSED') {
          errorCount++;
          lastError = err.message;
        }
      });

      proxyServer.onRequest((ctx, callback) => {
        const host = ctx.clientToProxyRequest.headers.host;
        if (TARGET_DOMAINS.includes(host)) {
          interceptCount++;
          // Force HTTP forwarding to Grasscutter (which speaks plain HTTP)
          ctx.isSSL = false;
          ctx.proxyToServerRequestOptions.host = REMOTE_HOST;
          ctx.proxyToServerRequestOptions.port = REMOTE_PORT;
          ctx.proxyToServerRequestOptions.agent = false; // force plain HTTP agent
          ctx.proxyToServerRequestOptions.rejectUnauthorized = false;
          ctx.proxyToServerRequestOptions.headers = {
            ...ctx.proxyToServerRequestOptions.headers,
            host: host
          };
        }
        callback();
      });

      // 增加请求错误处理，避免代理因连接目标失败而崩溃
      proxyServer.onRequestEnd((ctx, callback) => {
        callback();
      });

      proxyServer.listen({ host: '0.0.0.0', port: PROXY_PORT, sslCaDir: SSL_DIR }, (err) => {
        if (err) {
          proxyServer = null;
          isRunning = false;
          return reject(new Error('代理启动失败: ' + err.message));
        }
        // 等一小段时间确保端口真正绑定
        setTimeout(() => {
          isRunning = true;
          console.log(`[Proxy] HTTPS 代理已启动: 127.0.0.1:${PROXY_PORT}`);
          setSystemProxy(true).then(() => {
            resolve({ success: true, message: '代理已启动' });
          }).catch(e => {
            console.warn('[Proxy] 系统代理设置失败:', e.message);
            resolve({ success: true, message: '代理已启动（系统代理设置失败）' });
          });
        }, 500);
      });
    } catch (err) {
      reject(new Error('代理初始化失败: ' + err.message));
    }
  });
}

// 启动代理（外部调用，含端口清理）
async function startProxy() {
  if (await checkProxy()) {
    isRunning = true;
    return { success: true, message: '代理已在运行', alreadyRunning: true };
  }

  // 先尝试释放端口
  await killPortOccupier(PROXY_PORT);

  return _doStart();
}

// 停止代理
async function stopProxy() {
  await setSystemProxy(false);

  if (proxyServer) {
    try {
      if (typeof proxyServer.close === 'function') {
        proxyServer.close();
      }
    } catch (err) {
      console.error('[Proxy] 关闭出错:', err.message);
    }
    proxyServer = null;
  }

  isRunning = false;
  console.log('[Proxy] HTTPS 代理已停止');
  return { success: true, message: '代理已停止' };
}

// 心跳检测 + 自动恢复
async function heartbeat() {
  if (!autoRecover) return;

  // 用 proxyServer 对象是否存在来判断，而非端口检测
  // http-mitm-proxy 的 listen 回调触发后端口可能短暂不可检测
  const alive = proxyServer !== null;

  if (isRunning && !alive) {
    console.log('[Proxy] 检测到代理已停止，正在自动恢复...');
    isRunning = false;
    await killPortOccupier(PROXY_PORT);
    try {
      await _doStart();
      console.log('[Proxy] 自动恢复成功');
    } catch (err) {
      console.error('[Proxy] 自动恢复失败:', err.message);
    }
  }
}

function startHeartbeat(intervalMs = 10000) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(heartbeat, intervalMs);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function getStats() {
  return {
    interceptCount,
    errorCount,
    lastError,
    autoRecover
  };
}

function setAutoRecover(enabled) {
  autoRecover = enabled;
}

module.exports = {
  startProxy,
  stopProxy,
  checkProxy,
  getProxyPort: () => PROXY_PORT,
  isCaInstalled,
  installCaCert,
  checkCertExpiry,
  getCaCertPath: () => CA_CERT_PATH,
  startHeartbeat,
  stopHeartbeat,
  getStats,
  setAutoRecover
};
