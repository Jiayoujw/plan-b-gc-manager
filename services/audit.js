const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.join(__dirname, '..', 'data', 'audit.json');
const MAX_RECORDS = 1000;

function loadAuditLog() {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
    }
  } catch {}
  return { records: [] };
}

function saveAuditLog(data) {
  const dir = path.dirname(AUDIT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function logAction(user, role, action, target, details, ip) {
  const data = loadAuditLog();
  data.records.unshift({
    time: new Date().toISOString(),
    user: user || 'unknown',
    role: role || 'unknown',
    action,
    target: target || '',
    details: details || '',
    ip: ip || '127.0.0.1'
  });
  if (data.records.length > MAX_RECORDS) {
    data.records = data.records.slice(0, MAX_RECORDS);
  }
  saveAuditLog(data);

  // ===== 异常检测 Hook =====
  try {
    const anomalyDetector = require('./anomalyDetector');
    anomalyDetector.hookAudit(user, role, action, target, details, ip);
  } catch (e) {
    // 静默失败，不影响审计记录
  }
}

function getRecords(limit = 100) {
  const data = loadAuditLog();
  return data.records.slice(0, limit);
}

module.exports = { logAction, getRecords };
