const fs = require('fs');
const path = require('path');

// Try multiple possible KCN locations
const KCN_GACHA_DIR = (() => {
  const candidates = [
    path.join('d:', 'KCN-GenshinServer', 'KCN-GenshinServer_v0.1.7-Beta', 'Server', 'gacha'),
    path.join(process.env.USERPROFILE || '', 'Downloads', 'KCN-GenshinServer', 'Server', 'gacha'),
    path.join(process.env.USERPROFILE || '', 'Desktop', 'KCN-GenshinServer', 'Server', 'gacha'),
    path.join(__dirname, '..', 'gacha-backups'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]; // default (may not exist)
})();
const GC_BANNERS_PATH = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'cultivation', 'grasscutter', 'data', 'Banners.json');

function listVersions() {
  let files = [];

  // 1. Check KCN directory
  if (fs.existsSync(KCN_GACHA_DIR)) {
    const kcnFiles = fs.readdirSync(KCN_GACHA_DIR)
      .filter(f => f.startsWith('Banners') && f.endsWith('.json'))
      .map(f => ({
        name: f, path: path.join(KCN_GACHA_DIR, f),
        size: fs.statSync(path.join(KCN_GACHA_DIR, f)).size,
        modified: fs.statSync(path.join(KCN_GACHA_DIR, f)).mtime.toISOString()
      }));
    files.push(...kcnFiles);
  }

  // 2. Check local gacha-backups
  const localDir = path.join(__dirname, '..', 'gacha-backups');
  if (fs.existsSync(localDir)) {
    const localFiles = fs.readdirSync(localDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f, path: path.join(localDir, f),
        size: fs.statSync(path.join(localDir, f)).size,
        modified: fs.statSync(path.join(localDir, f)).mtime.toISOString()
      }));
    files.push(...localFiles);
  }

  if (!files.length) {
    return { success: false, message: '未找到卡池版本文件', versions: [] };
  }

  const versions = files.map(f => {
    const name = f.name.replace('.json', '');
    let displayName = name;
    const match = name.match(/Banners([\d.]+)/);
    if (match) displayName = '版本 ' + match[1];
    if (name.includes('Full')) displayName = '全角色卡池';
    if (name === 'Banners4.0.0') displayName = '当前版本 (4.0.0)';
    return { ...f, name: f.name, displayName };
  }).sort((a, b) => a.name.localeCompare(b.name));

  return { success: true, versions };
}

function applyVersion(versionName) {
  const srcPath = path.join(KCN_GACHA_DIR, versionName);
  if (!fs.existsSync(srcPath)) {
    return { success: false, message: '卡池版本文件不存在' };
  }

  // 备份当前 Banners.json
  if (fs.existsSync(GC_BANNERS_PATH)) {
    const backupPath = GC_BANNERS_PATH + '.backup.' + Date.now();
    fs.copyFileSync(GC_BANNERS_PATH, backupPath);
  }

  fs.copyFileSync(srcPath, GC_BANNERS_PATH);
  return { success: true, message: '已切换至 ' + versionName };
}

function getCurrentVersion() {
  if (!fs.existsSync(GC_BANNERS_PATH)) return null;
  // 尝试匹配当前 Banners.json 是否与某个版本一致
  const currentContent = fs.readFileSync(GC_BANNERS_PATH, 'utf-8');
  const versions = listVersions().versions;
  for (const v of versions) {
    const vContent = fs.readFileSync(v.path, 'utf-8');
    if (currentContent === vContent) {
      return v.name;
    }
  }
  return 'custom';
}

module.exports = { listVersions, applyVersion, getCurrentVersion };
