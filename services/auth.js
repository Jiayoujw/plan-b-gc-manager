const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const AUTH_FILE = path.join(__dirname, '..', 'data', 'auth.json');
const JWT_SECRET = process.env.JWT_SECRET || 'teyvat-manager-secret-key-2024';
const TOKEN_EXPIRY = '24h';

function loadUsers() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    }
  } catch {}
  return { users: [], sessions: [] };
}

function saveUsers(data) {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 初始化默认管理员账号
function initDefaultAdmin() {
  const data = loadUsers();
  if (!data.users.length) {
    const hash = bcrypt.hashSync('admin123', 10);
    data.users.push({
      username: 'admin',
      passwordHash: hash,
      role: 'SuperAdmin',
      createdAt: new Date().toISOString()
    });
    saveUsers(data);
    console.log('[Auth] 默认管理员已创建: admin / admin123');
  }
}

function register(username, password, role = 'Viewer') {
  const data = loadUsers();
  if (data.users.find(u => u.username === username)) {
    return { success: false, message: '用户名已存在' };
  }
  const hash = bcrypt.hashSync(password, 10);
  data.users.push({
    username,
    passwordHash: hash,
    role,
    createdAt: new Date().toISOString()
  });
  saveUsers(data);
  return { success: true, message: '注册成功' };
}

function login(username, password) {
  const data = loadUsers();
  const user = data.users.find(u => u.username === username);
  if (!user) {
    return { success: false, message: '用户名或密码错误' };
  }
  if (!bcrypt.compareSync(password, user.passwordHash)) {
    return { success: false, message: '用户名或密码错误' };
  }
  const token = jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
  return {
    success: true,
    message: '登录成功',
    token,
    user: { username: user.username, role: user.role }
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function middleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
  req.user = decoded;
  next();
}

function getUsers() {
  const data = loadUsers();
  return data.users.map(u => ({
    username: u.username,
    role: u.role,
    createdAt: u.createdAt
  }));
}

function changePassword(username, oldPassword, newPassword) {
  const data = loadUsers();
  const user = data.users.find(u => u.username === username);
  if (!user) return { success: false, message: '用户不存在' };
  if (!bcrypt.compareSync(oldPassword, user.passwordHash)) {
    return { success: false, message: '原密码错误' };
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveUsers(data);
  return { success: true, message: '密码修改成功' };
}

// ===== RBAC =====
const ROLE_PERMISSIONS = {
  SuperAdmin: ['*'],
  Admin: ['dashboard', 'players', 'gacha', 'items', 'activities', 'plugins', 'logs', 'database', 'config', 'proxy', 'gm_command', 'player_give', 'player_ban'],
  Moderator: ['dashboard', 'players', 'items', 'logs', 'gm_command', 'player_give'],
  Viewer: ['dashboard', 'players', 'items', 'logs']
};

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Viewer;
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

function requirePermission(permission) {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: '未登录' });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ success: false, message: '登录已过期' });
    if (!hasPermission(decoded.role, permission)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    req.user = decoded;
    next();
  };
}

function getPermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.Viewer;
}

module.exports = {
  initDefaultAdmin,
  register,
  login,
  verifyToken,
  middleware,
  getUsers,
  changePassword,
  hasPermission,
  requirePermission,
  getPermissions
};
