// 异常行为检测引擎
// PRD Section 6.4.4 — 6 条检测规则 + 实时告�?

const auditService = require('./audit');

// 内存存储检测状态（按 IP/用户聚合�?
const state = {
  giveCounts: {},     // { username: [{ time, count }] } — 物品发放频�?
  banCounts: {},      // { username: [{ time, count }] } — 封禁频�?
  loginAttempts: {},  // { username: { count, lastIp, lockUntil } } — 登录失败
  alerts: [],         // 活跃告警列表
};

const ALERT_MAX = 100;

// ===== 规则定义 =====
const RULES = [
  {
    id: 'RULE-01',
    name: '高频物品发�?',
    desc: '同一账户 1 分钟内发放物品超过 20 次',
    check(ctx) {
      const key = ctx.user;
      if (!state.giveCounts[key]) state.giveCounts[key] = [];
      const now = Date.now();
      state.giveCounts[key] = state.giveCounts[key].filter(e => now - e.time < 60000);
      const last = state.giveCounts[key][state.giveCounts[key].length - 1];
      if (last && now - last.time < 60000) {
        last.count++;
      } else {
        state.giveCounts[key].push({ time: now, count: 1 });
      }
      const total = state.giveCounts[key].reduce((s, e) => s + e.count, 0);
      if (total > 20) {
        return { triggered: true, detail: `1分钟内发放 ${total} 次物品`, action: 'freeze_give' };
      }
      return { triggered: false };
    }
  },
  {
    id: 'RULE-02',
    name: '批量封禁',
    desc: '同一账户 10 分钟内封禁超过 5 个玩家',
    check(ctx) {
      const key = ctx.user;
      if (!state.banCounts[key]) state.banCounts[key] = [];
      const now = Date.now();
      state.banCounts[key] = state.banCounts[key].filter(e => now - e.time < 600000);
      state.banCounts[key].push({ time: now, target: ctx.target });
      if (state.banCounts[key].length > 5) {
        return { triggered: true, detail: `10分钟内封禁 ${state.banCounts[key].length} 个玩家`, action: 'require_confirm' };
      }
      return { triggered: false };
    }
  },
  {
    id: 'RULE-03',
    name: '权限越界尝试',
    desc: '非 SuperAdmin 尝试访问 db:admin 或 system:admin 接口',
    check(ctx) {
      if (ctx.role !== 'SuperAdmin' && /db:admin|system:admin/i.test(ctx.action)) {
        return { triggered: true, detail: `${ctx.user}(${ctx.role}) 尝试越权操作: ${ctx.action}`, action: 'notify_admin' };
      }
      return { triggered: false };
    }
  },
  {
    id: 'RULE-04',
    name: '异地登录检测',
    desc: '同一账户在 30 分钟内从不同 IP 登录',
    check(ctx) {
      const key = ctx.user;
      if (!state.loginIpCache) state.loginIpCache = {};
      const now = Date.now();
      const prev = state.loginIpCache[key];
      state.loginIpCache[key] = { ip: ctx.ip, time: now };
      if (prev && prev.ip !== ctx.ip && now - prev.time < 1800000) {
        return { triggered: true, detail: `30分钟内从 ${prev.ip} 和 ${ctx.ip} 登录`, action: 'require_reauth' };
      }
      return { triggered: false };
    }
  },
  {
    id: 'RULE-05',
    name: '危险指令检测',
    desc: '执行包含危险关键词的 GM 指令',
    check(ctx) {
      const dangerous = /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|DROP\s+DATABASE|rm\s+-rf/i;
      if (dangerous.test(ctx.detail || '')) {
        return { triggered: true, detail: `危险指令: ${ctx.detail}`, action: 'block_and_confirm' };
      }
      return { triggered: false };
    }
  },
  {
    id: 'RULE-06',
    name: '非工作时间高权限操作',
    desc: '凌晨 0:00-6:00 执行高权限操作',
    check(ctx) {
      const hour = new Date().getHours();
      const highRiskActions = ['ban', 'config:write', '封禁玩家', '修改配置', '数据库操作'];
      const isHighRisk = highRiskActions.some(a => (ctx.action || '').includes(a));
      if (hour >= 0 && hour < 6 && isHighRisk) {
        return { triggered: true, detail: `凌晨 ${hour}:00 执行高权限操作: ${ctx.action}`, action: 'log_only' };
      }
      return { triggered: false };
    }
  },
];

// ===== 检测入�?=====
function analyze(ctx) {
  const results = [];
  for (const rule of RULES) {
    const result = rule.check(ctx);
    if (result.triggered) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ...result,
        time: new Date().toISOString(),
        user: ctx.user,
        action: ctx.action,
      });
    }
  }
  return results;
}

// ===== 处理检测结果 =====
function processResults(results) {
  for (const r of results) {
    const alert = {
      id: 'ALT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      ...r,
      handled: false,
      handledBy: null,
      handledTime: null,
    };
    state.alerts.unshift(alert);
    if (state.alerts.length > ALERT_MAX) state.alerts = state.alerts.slice(0, ALERT_MAX);

    // 自动响应
    switch (r.action) {
      case 'freeze_give':
        console.log(`[Anomaly] ⚠️ 冻结 ${r.user} 的 give 权限 (${r.detail})`);
        // 可扩展：调用 auth 模块临时冻结权�?
        break;
      case 'notify_admin':
        console.log(`[Anomaly] ⚠️ 通知管理员: ${r.detail}`);
        break;
      case 'require_confirm':
      case 'require_reauth':
      case 'block_and_confirm':
        console.log(`[Anomaly] 🚨 ${r.ruleName}: ${r.detail}`);
        break;
      case 'log_only':
        console.log(`[Anomaly] 📝 ${r.ruleName}: ${r.detail}`);
        break;
    }
  }
  return results;
}

// ===== Hook: 拦截审计事件并检�?=====
function hookAudit(user, role, action, target, detail, ip) {
  const ctx = { user, role, action, target, detail: detail || '', ip: ip || '127.0.0.1' };
  const results = analyze(ctx);
  if (results.length > 0) {
    processResults(results);
  }
  return results;
}

// ===== API =====
function getAlerts(limit = 50, unhandledOnly = false) {
  let alerts = state.alerts;
  if (unhandledOnly) alerts = alerts.filter(a => !a.handled);
  return alerts.slice(0, limit);
}

function markHandled(alertId, username) {
  const alert = state.alerts.find(a => a.id === alertId);
  if (alert) {
    alert.handled = true;
    alert.handledBy = username;
    alert.handledTime = new Date().toISOString();
    return true;
  }
  return false;
}

function getStats() {
  return {
    totalAlerts: state.alerts.length,
    unhandled: state.alerts.filter(a => !a.handled).length,
    byRule: RULES.reduce((acc, r) => {
      acc[r.id] = state.alerts.filter(a => a.ruleId === r.id).length;
      return acc;
    }, {}),
    lastAlert: state.alerts[0] || null,
  };
}

function reset() {
  state.giveCounts = {};
  state.banCounts = {};
  state.loginAttempts = {};
  state.alerts = [];
}

module.exports = { hookAudit, getAlerts, markHandled, getStats, RULES, reset };
