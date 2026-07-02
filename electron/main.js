// Plan-B 桌面应用 - Electron 主进程
const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const SERVER_DIR = path.join(__dirname, '..');
let mainWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;

// 启动 Node.js 后端服务
function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      cwd: SERVER_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
    });

    let started = false;
    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      if (!started && text.includes('HTTP:')) {
        started = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      if (!started && data.toString().includes('HTTP:')) {
        started = true;
        resolve();
      }
    });

    serverProcess.on('error', reject);
    serverProcess.on('close', (code) => {
      if (!started) reject(new Error('Server exited with code ' + code));
    });

    // 超时回退
    setTimeout(() => { if (!started) { started = true; resolve(); } }, 8000);
  });
}

// 等待服务就绪
function waitForServer(url, maxRetries = 30) {
  return new Promise((resolve) => {
    let retries = 0;
    const check = () => {
      http.get(url, (res) => { resolve(true); }).on('error', () => {
        retries++;
        if (retries < maxRetries) setTimeout(check, 1000);
        else resolve(false);
      });
    };
    check();
  });
}

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Plan-B 提瓦特管理台',
    icon: path.join(SERVER_DIR, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL('http://localhost:8080');

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// 系统托盘
function createTray() {
  // 创建简单的托盘图标
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: '打开管理台', click: () => { if (mainWindow) mainWindow.show(); else createWindow(); } },
    { type: 'separator' },
    { label: '启动 MongoDB + Grasscutter', click: () => {
      http.get('http://localhost:8080/api/server/start-all', (res) => {
        dialog.showMessageBox({ type: 'info', title: 'Plan-B', message: '服务启动指令已发送' });
      }).on('error', () => {
        dialog.showErrorBox('错误', '后端服务未就绪');
      });
    }},
    { label: '停止全部服务', click: () => {
      http.get('http://localhost:8080/api/server/stop-all', (res) => {}).on('error', () => {});
    }},
    { type: 'separator' },
    { label: '在浏览器打开', click: () => {
      require('shell').openExternal('http://localhost:8080');
    }},
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip('Plan-B 提瓦特管理台');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
    else createWindow();
  });
}

// 应用生命周期
app.whenReady().then(async () => {
  console.log('[Desktop] 启动后端服务...');
  try {
    await startServer();
    console.log('[Desktop] 等待服务就绪...');
    await waitForServer('http://localhost:8080/login.html');
    console.log('[Desktop] 服务就绪！');
  } catch (e) {
    console.error('[Desktop] 服务启动失败:', e.message);
  }

  createWindow();
  createTray();

  // 自动启动 GC + Mongo
  setTimeout(() => {
    http.get('http://localhost:8080/api/server/start-all', () => {}).on('error', () => {});
  }, 3000);
});

app.on('window-all-closed', () => {
  if (!isQuitting) return;
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (serverProcess) {
    serverProcess.stdin.write('stop\n');
    setTimeout(() => serverProcess.kill(), 3000);
  }
});
