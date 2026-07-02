const express = require('express');
const { connect, getDb } = require('../services/db');
const auditService = require('../services/audit');
const router = express.Router();

// 获取玩家列表
router.get('/', async (req, res) => {
  try {
    await connect();
    const db = getDb();
    const players = await db.collection('players')
      .find({}, {
        projection: {
          uid: 1, nickname: 1, adventureRank: 1, worldLevel: 1,
          avatars: 1, lastActiveTime: 1, online: 1, banned: 1
        }
      })
      .limit(100)
      .toArray();

    const list = players.map(p => ({
      uid: p.uid || 0,
      nickname: p.nickname || '未知',
      adventureRank: p.adventureRank || 1,
      worldLevel: p.worldLevel || 0,
      avatarCount: Array.isArray(p.avatars) ? p.avatars.length : 0,
      lastLogin: p.lastActiveTime ? new Date(p.lastActiveTime).toISOString().slice(0,16).replace('T',' ') : '未知',
      online: !!p.online,
      banned: !!p.banned
    }));
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单个玩家详情
router.get('/:uid', async (req, res) => {
  try {
    await connect();
    const db = getDb();
    const uid = parseInt(req.params.uid);
    const player = await db.collection('players').findOne({ uid });
    if (!player) {
      return res.status(404).json({ success: false, message: '玩家不存在' });
    }
    res.json({ success: true, data: player });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 发放物品（真实 GM 指令）
router.post('/:uid/give', async (req, res) => {
  try {
    const { itemId, amount } = req.body;
    const uid = parseInt(req.params.uid) || 0;
    const qty = parseInt(amount) || 1;
    const user = req.user || { username: 'unknown', role: 'unknown' };
    const gcService = require('../services/grasscutter');
    const cmd = `give @${uid} ${itemId} x${qty}`;  // 不带 / 前缀
    const result = await gcService.sendCommand(cmd);
    auditService.logAction(user.username, user.role, '物品发放', 'UID ' + uid, `物品 ${itemId} x${qty}`, req.ip);
    res.json({ success: result.success, message: result.success ? `已执行: ${cmd}` : result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 踢出玩家
router.post('/:uid/kick', async (req, res) => {
  try {
    const uid = req.params.uid;
    const user = req.user || { username: 'unknown', role: 'unknown' };
    const gcService = require('../services/grasscutter');
    const result = gcService.sendCommand(`/kick @${uid}`);
    auditService.logAction(user.username, user.role, '踢出玩家', 'UID ' + uid, '', req.ip);
    res.json({ success: result.success, message: result.success ? `已踢出 UID ${uid}` : result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 传送玩家到指定坐标
router.post('/:uid/teleport', async (req, res) => {
  try {
    const uid = req.params.uid;
    const { scene, x, y, z } = req.body;
    const user = req.user || { username: 'unknown', role: 'unknown' };
    const gcService = require('../services/grasscutter');
    const cmd = `/teleport @${uid} ${scene || 3} ${x || 0} ${y || 300} ${z || 0}`;
    const result = gcService.sendCommand(cmd);
    auditService.logAction(user.username, user.role, '传送玩家', 'UID ' + uid, `场景${scene} (${x},${y},${z})`, req.ip);
    res.json({ success: result.success, message: result.success ? `已传送 UID ${uid}` : result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 设置玩家等级
router.post('/:uid/setlevel', async (req, res) => {
  try {
    const uid = req.params.uid;
    const { level } = req.body;
    const user = req.user || { username: 'unknown', role: 'unknown' };
    const gcService = require('../services/grasscutter');
    const result = gcService.sendCommand(`/setlevel @${uid} ${level || 60}`);
    auditService.logAction(user.username, user.role, '设置等级', 'UID ' + uid, `等级 ${level}`, req.ip);
    res.json({ success: result.success, message: result.success ? `已设置 UID ${uid} 等级为 ${level}` : result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 设置世界等级
router.post('/:uid/setworldlevel', async (req, res) => {
  try {
    const uid = req.params.uid;
    const { worldLevel } = req.body;
    const user = req.user || { username: 'unknown', role: 'unknown' };
    const gcService = require('../services/grasscutter');
    const result = gcService.sendCommand(`/setworldlevel @${uid} ${worldLevel || 8}`);
    auditService.logAction(user.username, user.role, '设置世界等级', 'UID ' + uid, `世界等级 ${worldLevel}`, req.ip);
    res.json({ success: result.success, message: result.success ? `已设置 UID ${uid} 世界等级为 ${worldLevel}` : result.message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 在线玩家数
router.get('/stats/online', async (req, res) => {
  try {
    await connect();
    const db = getDb();
    const count = await db.collection('players').countDocuments({ online: true });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 封禁玩家
router.post('/:uid/ban', async (req, res) => {
  try {
    await connect();
    const db = getDb();
    const uid = parseInt(req.params.uid);
    const reason = req.body.reason || '管理员封禁';
    const user = req.user || { username: 'unknown', role: 'unknown' };
    await db.collection('players').updateOne({ uid }, { $set: { banned: true, banReason: reason, banTime: new Date().toISOString() } });
    auditService.logAction(user.username, user.role, '封禁玩家', 'UID ' + uid, reason, req.ip);
    res.json({ success: true, message: '玩家 UID ' + uid + ' 已封禁' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 解封玩家
router.post('/:uid/unban', async (req, res) => {
  try {
    await connect();
    const db = getDb();
    const uid = parseInt(req.params.uid);
    const user = req.user || { username: 'unknown', role: 'unknown' };
    await db.collection('players').updateOne({ uid }, { $set: { banned: false, unbanTime: new Date().toISOString() } });
    auditService.logAction(user.username, user.role, '解封玩家', 'UID ' + uid, '', req.ip);
    res.json({ success: true, message: '玩家 UID ' + uid + ' 已解封' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
