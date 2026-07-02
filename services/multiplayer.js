// 多人联机管理服务
const { connect, getDb } = require('./db');
const net = require('net');
const dgram = require('dgram');

// 在线玩家追踪
let onlinePlayers = new Map(); // uid -> { uid, nickname, position, sceneId, lastSeen, ip }
let coOpGroups = new Map();   // hostUid -> [guestUids]
let kcpConnections = [];      // KCP connection stats
let chatMessages = [];        // 最近聊天记录
const MAX_CHAT = 200;

// 通过 MongoDB 获取玩家数据
async function getPlayerData() {
  try {
    await connect();
    const db = getDb();
    const players = await db.collection('players').find({}, {
      projection: {
        _id: 0, uid: 1, nickname: 1, signature: 1,
        position: 1, sceneId: 1, headImage: 1, nameCardId: 1,
        playerGameTime: 1, mainCharacterId: 1
      }
    }).limit(100).toArray();

    // Also get account UIDs
    const accounts = await db.collection('accounts').find({}, {
      projection: { _id: 0, reservedPlayerId: 1, username: 1, isBanned: 1 }
    }).toArray();

    // Map accounts to players
    const accountMap = {};
    accounts.forEach(a => {
      if (a.reservedPlayerId) accountMap[a.reservedPlayerId] = a;
    });

    return players.map(p => ({
      ...p,
      account: accountMap[p.uid] || null,
      position: p.position || { x: 0, y: 0, z: 0 },
    }));
  } catch (err) {
    return [];
  }
}

// 通过 GM 指令获取在线玩家列表
function getOnlinePlayersViaCommand() {
  const gcService = require('./grasscutter');
  return gcService.sendCommand('/list');
}

// 刷新在线玩家状态（通过 proxy 连接追踪）
function refreshOnlineStatus(proxyConnections) {
  // proxyConnections: array of { host, port, connectedAt }
  // Each game client connection = 1 online player
  onlinePlayers.clear();
  // This is approximate — exact tracking needs Grasscutter API
}

// 获取在线玩家数（基于 proxy 活跃连接估计）
function getEstimatedOnlineCount() {
  // 通过检查代理是否在处理游戏流量来估计
  try {
    const proxyService = require('./proxy');
    const stats = proxyService.getStats();
    // 每个游戏客户端通常会建立多个连接
    return Math.max(0, Math.floor(stats.interceptCount / 3));
  } catch {
    return 0;
  }
}

// ===== 多人房间管理 =====
function getCoOpRooms() {
  const rooms = [];
  coOpGroups.forEach((guests, hostUid) => {
    rooms.push({
      hostUid,
      guests: [...guests],
      count: guests.length + 1,
    });
  });
  return rooms;
}

function kickFromWorld(uid) {
  const gcService = require('./grasscutter');
  return gcService.sendCommand('/kick @' + uid);
}

function inviteToWorld(fromUid, toUid) {
  const gcService = require('./grasscutter');
  // Grasscutter: /join @hostUid for the guest
  return gcService.sendCommand('/teleport @' + toUid + ' @' + fromUid);
}

// ===== KCP 连接监控 =====
function checkKcpPort() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    socket.on('error', () => resolve(false));
    socket.on('listening', () => { socket.close(); resolve(true); });
    socket.bind(22102, '127.0.0.1');
  });
}

// ===== 聊天系统 =====
function addChatMessage(msg) {
  chatMessages.unshift({
    time: new Date().toISOString(),
    ...msg,
  });
  if (chatMessages.length > MAX_CHAT) chatMessages.length = MAX_CHAT;
}

function getChatMessages(limit = 50) {
  return chatMessages.slice(0, limit);
}

function sendChatMessage(message) {
  const gcService = require('./grasscutter');
  return gcService.sendCommand('/say ' + message);
}

function sendPrivateMessage(uid, message) {
  const gcService = require('./grasscutter');
  return gcService.sendCommand('/msg @' + uid + ' ' + message);
}

// ===== 全服统计 =====
async function getServerStats() {
  const players = await getPlayerData();
  const online = getEstimatedOnlineCount();

  return {
    totalPlayers: players.length,
    estimatedOnline: online,
    coOpRooms: getCoOpRooms().length,
    kcpPort: 22102,
    chatCount: chatMessages.length,
  };
}

function getSceneName(sceneId) {
  const scenes = {
    3: '提瓦特大陆', 4: '地下矿洞', 5: '渊下宫',
    6: '尘歌壶', 7: '金苹果群岛', 9: '须弥沙漠',
    1000: '风龙废墟', 1001: '蒙德城',
  };
  return scenes[sceneId] || '场景 ' + sceneId;
}

// ===== KCP 网络诊断 =====
function measureKcpLatency() {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = dgram.createSocket('udp4');
    const kcpConnReq = Buffer.from([0xff, 0xff, 0xff, 0xff, 0x00]); // KCP probe
    socket.on('error', () => resolve({ reachable: false, latency: -1 }));
    socket.on('message', () => {
      const latency = Date.now() - start;
      socket.close();
      resolve({ reachable: true, latency });
    });
    socket.send(kcpConnReq, 22102, '127.0.0.1', (err) => {
      if (err) { socket.close(); resolve({ reachable: false, latency: -1 }); }
    });
    setTimeout(() => { socket.close(); resolve({ reachable: true, latency: Date.now() - start, note: 'no response (normal for KCP)' }); }, 2000);
  });
}

const path = require('path');
const fs = require('fs');

function getKcpConfig() {
  try {
    const configPath = path.join(process.env.USERPROFILE || process.env.HOME, 'AppData', 'Roaming', 'cultivation', 'grasscutter', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return {
      interval: config.server.game.kcpInterval,
      port: config.server.game.bindPort,
      address: config.server.game.accessAddress,
      loadRange: config.server.game.loadEntitiesForPlayerRange,
      uniqueKey: config.server.game.useUniquePacketKey,
    };
  } catch (e) { console.error('[KCP] Config read error:', e.message); return null; }
}

function runNetworkDiagnostic() {
  return new Promise(async (resolve) => {
    const kcp = await measureKcpLatency();
    const kcpConfig = getKcpConfig();
    resolve({
      kcp: {
        ...kcp,
        port: 22102,
        config: kcpConfig,
        expectedLatency: kcpConfig ? (kcpConfig.interval + 2) + 'ms' : 'unknown',
        optimization: kcpConfig && kcpConfig.interval <= 10 ? 'optimized' : 'standard',
      },
      recommendations: kcpConfig && kcpConfig.interval > 10
        ? ['kcpInterval 建议降至 10ms 以获得更低延迟'] : [],
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = {
  getPlayerData, getOnlinePlayersViaCommand,
  refreshOnlineStatus, getEstimatedOnlineCount,
  getCoOpRooms, kickFromWorld, inviteToWorld,
  checkKcpPort, measureKcpLatency, getKcpConfig, runNetworkDiagnostic,
  getChatMessages, addChatMessage, sendChatMessage, sendPrivateMessage,
  getServerStats, getSceneName,
};
