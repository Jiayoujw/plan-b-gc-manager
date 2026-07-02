// Pino 结构化日志服务 (P3-1)
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      // 控制台输出（开发友好）
      { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' }, level: 'info' },
      // 文件输出（结构化 JSON）
      { target: 'pino/file', options: { destination: path.join(LOG_DIR, 'server.log'), mkdir: true }, level: 'info' },
    ],
  },
});

// 包装 console 方法，迁移到 pino
const originalConsole = { log: console.log, error: console.error, warn: console.warn, info: console.info };
console.log = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));

module.exports = logger;
