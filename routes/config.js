const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// 配置文件路径（方案A 的 Cultivation 目录）
const CONFIG_DIR = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'cultivation', 'grasscutter');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const BACKUP_DIR = path.join(CONFIG_DIR, 'backups');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 读取配置
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return res.status(404).json({ success: false, message: 'config.json 不存在' });
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content);
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: '读取配置失败: ' + err.message });
  }
});

// 保存配置（带自动备份）
router.post('/', (req, res) => {
  try {
    const newConfig = req.body;

    // 备份旧配置
    if (fs.existsSync(CONFIG_PATH)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `config_${timestamp}.json`);
      fs.copyFileSync(CONFIG_PATH, backupPath);
    }

    // 写入新配置
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    res.json({ success: true, message: '配置已保存' });
  } catch (err) {
    res.status(500).json({ success: false, message: '保存配置失败: ' + err.message });
  }
});

// 获取备份列表
router.get('/backups', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, data: [] });
    }
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size: stat.size, time: stat.mtime };
      })
      .sort((a, b) => b.time - a.time);
    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 恢复备份
router.post('/restore', (req, res) => {
  try {
    const { backupName } = req.body;
    const backupPath = path.join(BACKUP_DIR, backupName);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ success: false, message: '备份文件不存在' });
    }
    fs.copyFileSync(backupPath, CONFIG_PATH);
    res.json({ success: true, message: '配置已恢复' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
