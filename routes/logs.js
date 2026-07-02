const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const GC_DIR = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'cultivation', 'grasscutter');

// 读取最新的日志文件（按修改时间排序）
function findLatestLog() {
  const logDir = path.join(GC_DIR, 'logs');
  if (!fs.existsSync(logDir)) return null;
  const files = fs.readdirSync(logDir)
    .filter(f => f.endsWith('.log'))
    .map(f => ({ name: f, path: path.join(logDir, f), stat: fs.statSync(path.join(logDir, f)) }))
    .sort((a, b) => b.stat.mtime - a.stat.mtime);
  return files.length > 0 ? files[0].path : null;
}

// 解析日志行
function parseLogLine(line) {
  // 格式: 2026-06-30 14:23:15 <INFO:Grasscutter> message
  const match = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+<([^>]+)>\s+(.*)$/);
  if (match) {
    const levelStr = match[2].split(':')[0].toUpperCase();
    let level = 'info';
    if (levelStr.includes('ERROR') || levelStr.includes('ERR')) level = 'error';
    else if (levelStr.includes('WARN')) level = 'warn';
    return { time: match[1], level, source: match[2], message: match[3] };
  }
  // 尝试简单时间匹配
  const simpleMatch = line.match(/^(\d{2}:\d{2}:\d{2})\s+\[([^\]]+)\]\s+(.*)$/);
  if (simpleMatch) {
    return { time: simpleMatch[1], level: 'info', source: simpleMatch[2], message: simpleMatch[3] };
  }
  return { time: '', level: 'info', source: '', message: line };
}

// 获取系统日志（最近 200 行）
router.get('/system', (req, res) => {
  try {
    const logPath = findLatestLog();
    if (!logPath) {
      return res.json({ success: true, data: [], message: '未找到日志文件' });
    }
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim()).slice(-200);
    const logs = lines.map(parseLogLine);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取日志文件列表
router.get('/files', (req, res) => {
  try {
    const logDir = path.join(GC_DIR, 'logs');
    if (!fs.existsSync(logDir)) {
      return res.json({ success: true, data: [] });
    }
    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(f => {
        const stat = fs.statSync(path.join(logDir, f));
        return { name: f, size: stat.size, modified: stat.mtime };
      })
      .sort((a, b) => b.modified - a.modified);
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
