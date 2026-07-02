// PM2 进程管理配置
// 使用: pm2 start ecosystem.config.js
// 文档: https://pm2.keymetrics.io/

module.exports = {
  apps: [{
    name: 'plan-b',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
    },
    // 优雅关闭：先停 GC，再停 MongoDB，最后退出
    kill_timeout: 15000,
    listen_timeout: 10000,
    // 崩溃自动重启
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    // 日志
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // 进程清理钩子：退出时杀子进程
    shutdown_with_message: true,
  }],
};
