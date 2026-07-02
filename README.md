# Plan-B 提瓦特管理台

> 基于 Grasscutter 的原神私服综合 Web 管理平台  
> 版本 v0.2.0 | 2026-07

---

## 目录

1. [项目简介](#1-项目简介)
2. [环境要求](#2-环境要求)
3. [快速开始](#3-快速开始)
4. [目录结构](#4-目录结构)
5. [功能详解](#5-功能详解)
6. [API 参考](#6-api-参考)
7. [配置说明](#7-配置说明)
8. [Docker 部署](#8-docker-部署)
9. [常见问题](#9-常见问题)
10. [开发指南](#10-开发指南)

---

## 1. 项目简介

Plan-B 是一个为 Grasscutter（原神私服）提供完整管理功能的 Web 平台。包含：

- 🔒 **HTTPS 代理** — 拦截游戏流量并转发至 Grasscutter
- 🖥️ **Web 管理后台** — 浏览器远程管理，支持手机/平板
- 🎮 **游戏管理** — 物品发放、玩家管理、卡池编辑、剧情任务
- 🛡️ **安全系统** — RBAC 权限分级、操作审计、异常检测
- 🌐 **多人联机** — 联机房间管理、KCP 网络优化

### 与同类项目对比

| 功能 | Cultivation | KCN | **Plan-B** |
|------|:--:|:--:|:--:|
| 一键部署 | ✅ | ❌ | ✅ |
| Web 远程管理 | ❌ | ❌ | ✅ |
| 手机端操作 | ❌ | ❌ | ✅ |
| 卡池可视化编辑 | ❌ | 基础 | ✅ 完整 |
| 物品 ID 查询 | ❌ | 基础 | ✅ 8,420 条 |
| 权限分级 | 手动 JSON | ❌ | ✅ RBAC |
| 指令审计 | ❌ | ❌ | ✅ 6 规则 |
| 剧情系统 | ❌ | ❌ | ✅ Lua 热重载 |
| 联机优化 | ❌ | ❌ | ✅ KCP 10ms |

---

## 2. 环境要求

### 必需

| 组件 | 版本 | 说明 |
|------|------|------|
| **Windows** | 10/11 (64位) | 当前仅支持 Windows |
| **Node.js** | 18+ | [下载](https://nodejs.org/) |
| **Java** | JDK 17 | [下载](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) |
| **MongoDB** | 7.x+ | [下载](https://www.mongodb.com/try/download/community) |
| **Grasscutter** | 1.7.4 | 服务端 JAR + 资源包 |
| **原神客户端** | 4.0.0 (PC) | 国际服 |

### 可选

| 组件 | 用途 |
|------|------|
| **Docker Desktop** | 容器化部署 |
| **PM2** | 进程管理（推荐） |
| **Git** | 版本管理 |

### 硬件要求

| 资源 | 最低 | 推荐 |
|------|------|------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB | 8 GB |
| 磁盘 | 20 GB | 50 GB SSD |

---

## 3. 快速开始

### 3.1 准备工作

**1) 安装 Node.js**

```bash
# 下载安装 https://nodejs.org/ (LTS 版本)
node --version  # 应显示 v18+
```

**2) 安装 Java 17**

```bash
# 下载 JDK 17，安装后验证
java -version  # 应显示 "17.0.x"
```

**3) 安装 MongoDB**

```bash
# 下载 MongoDB Community Server 7.x
# 默认安装路径: C:\Program Files\MongoDB\Server\7.0\bin\
# 创建数据目录
mkdir C:\data\db
# 或使用默认路径: %USERPROFILE%\mongo-data
```

**4) 获取 Grasscutter**

```bash
# 将 grasscutter.jar 放入:
%APPDATA%\cultivation\grasscutter\grasscutter.jar

# 将资源包放入同目录:
%APPDATA%\cultivation\grasscutter\GC-Resources-4.0.zip
```

### 3.2 安装项目

```bash
# 克隆或解压项目到本地
cd plan-b-dev

# 安装依赖
npm install

# (可选) 安装 PM2 进程管理
npm install -g pm2
```

### 3.3 配置环境变量

```bash
# 复制 .env 并根据需要修改
copy .env .env.local

# 关键配置项:
# WEB_PORT=8080         管理台端口
# GC_DIR=...            Grasscutter 目录
# MONGO_URI=...         MongoDB 连接地址
# JWT_SECRET=...        JWT 签名密钥（生产环境务必修改）
```

### 3.4 启动服务

**方式一：直接启动（开发）**

```bash
npm start
# 访问 http://localhost:8080
```

**方式二：PM2 启动（推荐生产）**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.5 登录管理台

1. 浏览器打开 `http://localhost:8080`
2. 默认账号：**admin** / 密码：**admin123**
3. 在仪表盘点击「一键启动全部」启动 MongoDB + Grasscutter
4. 代理会自动启动，证书会自动安装
5. 在「代理状态」页面点击「启动游戏」

### 3.6 进入游戏

1. 游戏启动后，出现登录界面
2. 输入**任意用户名和密码**（Grasscutter 开启了自动注册）
3. 登录后即可正常游戏
4. 回到管理台可进行物品发放、卡池编辑等操作

---

## 4. 目录结构

```
plan-b-dev/
├── server.js                   # 主服务入口 (Express)
├── ecosystem.config.js         # PM2 配置
├── Dockerfile                  # Docker 镜像
├── docker-compose.yml          # Docker 一键部署
├── .env                        # 环境变量模板
├── package.json                # Node.js 依赖
├── plan-b-prd.html             # PRD 产品需求文档
│
├── services/                   # 业务逻辑层
│   ├── proxy.js                # HTTPS 代理引擎
│   ├── grasscutter.js          # GC 进程管理 + 指令发送
│   ├── launcher.js             # 一键启动/停止
│   ├── auth.js                 # JWT 认证 + RBAC
│   ├── audit.js                # 操作审计日志
│   ├── anomalyDetector.js      # 异常行为检测(6规则)
│   ├── gachaService.js         # 卡池管理
│   ├── gachaVersions.js        # 卡池版本库
│   ├── multiplayer.js          # 联机管理 + KCP 诊断
│   ├── serverFeatures.js       # 广播/传送/备份
│   ├── db.js                   # MongoDB 连接
│   ├── perfmon.js              # 性能监控
│   └── logger.js               # Pino 结构化日志
│
├── routes/                     # API 路由
│   ├── config.js               # 配置文件管理
│   ├── players.js              # 玩家管理(7项操作)
│   ├── gacha.js                 # 卡池 CRUD
│   ├── logs.js                 # 日志读取
│   └── quests.js               # 剧情脚本管理
│
├── public/                     # Web 前端 (Vanilla JS)
│   ├── index.html              # 管理台主页(10个子页面)
│   ├── login.html              # 登录页
│   ├── player.html             # 玩家自助门户
│   ├── css/style.css           # 样式 (含移动端适配)
│   ├── js/app.js               # 核心逻辑
│   └── js/gacha-editor.js      # 卡池编辑器
│
├── vue-admin/                  # Vue3 重构(骨架)
│   └── src/views/Dashboard.vue # 仪表盘组件
│
├── data/                       # 数据文件
│   ├── items.json              # 物品数据库(8,420条)
│   ├── auth.json               # 用户凭据
│   └── macros.json             # 指令宏
│
├── scripts/                    # 工具脚本
│   ├── smoke-test.js           # 冒烟测试(20端点)
│   └── generate-items.js       # 物品数据库生成器
│
└── .proxy-ssl/                 # 代理证书
    └── certs/ca.pem            # CA 根证书
```

---

## 5. 功能详解

### 5.1 仪表盘

- 实时状态卡片：CPU、内存、在线人数、运行时间
- 性能趋势图（Canvas 绘制）
- 一键启动/停止全部服务
- GM 指令面板（带目标 UID 选择）

### 5.2 代理状态

- 代理自动启动（无需手动操作）
- CA 证书自动安装
- 游戏客户端路径配置 + 文件浏览器
- 一键启动游戏
- 代理统计：拦截次数、错误次数

### 5.3 物品浏览器

- 8,420 条物品数据，12 个分类
- 模糊搜索（名称 / ID）
- 分类筛选（角色/武器/圣遗物/材料/食物…）
- 一键生成 `/give` 指令

### 5.4 卡池管理

- 5 种卡池类型：限定角色 / 限定角色II / 限定武器 / 常驻 / 新手
- **物品选择器**：从 2,073 条映射中搜索角色/武器
- **UP 权重配置**：5星/4星 UP 概率
- **抽卡模拟器**：10~1000 抽，含概率统计 + 柱状图
- **版本库**：切换历史卡池版本
- 保存后游戏内立即生效

### 5.5 抽卡历史

- 查询任意 UID 的完整抽卡记录
- 统计卡片：总抽数、5星数、平均间隔、当前保底
- 时间线柱状图（Canvas）
- 卡池分布统计

### 5.6 多人联机

- 玩家位置地图（提瓦特大陆俯视图）
- 联机房间管理（主机/访客/人数）
- 邀请传送 / 强制踢出
- 服务器聊天（全服公告）
- KCP 网络诊断（延迟/端口状态）

### 5.7 玩家管理

- 玩家列表（UID/昵称/等级/位置/账号）
- **7 项操作**：发物品、封禁、踢出、传送、设置等级、设置世界等级
- 所有操作通过 GM 指令实时生效，记入审计日志

### 5.8 活动系统

- 活动配置（activityId/type/scheduleId/时间范围）
- 游戏内公告编辑
- 一键保存 + 即时生效

### 5.9 剧情任务

- Lua 脚本在线编辑器
- 按分类管理：主线/世界任务/传说任务/活动任务
- 一键热重载
- 文件监听自动重载
- 内置 5 个示例脚本

### 5.10 权限与安全

- **RBAC 四角色**：SuperAdmin / Admin / Moderator / Viewer
- 14 项细粒度权限
- **异常检测 6 规则**：高频发放、批量封禁、越权、异地登录、危险指令、深夜操作
- 实时告警 + 自动响应（冻结权限/通知管理员）
- 操作审计日志（不可篡改）

### 5.11 其它功能

- **数据库工具**：MongoDB 集合浏览 + 只读查询
- **配置管理**：在线编辑 config.json（带备份恢复）
- **插件管理**：JAR/文件夹插件启用/禁用/上传
- **日志中心**：系统日志 + 操作日志 + 异常日志
- **指令宏**：新手礼包等组合指令一键执行
- **场景传送**：14 个预设地点
- **系统信息**：CPU/内存/Node.js 运行状态
- **备份管理**：自动备份（每 6 小时）
- **WebSocket 实时推送**：状态变更秒级更新
- **移动端适配**：600px 断点全功能可用
- **玩家自助门户**：`/player.html` 查看个人数据

---

## 6. API 参考

### 6.1 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录（返回 JWT） |
| POST | `/api/auth/register` | 注册 |
| GET | `/api/auth/me` | 当前用户信息 |

### 6.2 服务控制

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/server/start` | 启动 Grasscutter |
| POST | `/api/server/stop` | 停止 Grasscutter |
| POST | `/api/server/start-all` | 一键启动 MongoDB + GC |
| POST | `/api/server/stop-all` | 一键停止全部 |
| POST | `/api/server/command` | 发送 GM 指令 |
| POST | `/api/server/broadcast` | 全服广播 |
| POST | `/api/server/mail` | 全服邮件 |

### 6.3 代理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/proxy/status` | 代理状态 |
| POST | `/api/proxy/start` | 启动代理 |
| POST | `/api/proxy/stop` | 停止代理 |
| GET | `/api/proxy/cert` | 证书状态 + 有效期 |
| POST | `/api/proxy/cert/install` | 安装 CA 证书 |
| GET | `/api/proxy/stats` | 代理统计 |

### 6.4 玩家管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/players` | 玩家列表 |
| GET | `/api/players/:uid` | 玩家详情 |
| POST | `/api/players/:uid/give` | 发放物品 |
| POST | `/api/players/:uid/ban` | 封禁 |
| POST | `/api/players/:uid/unban` | 解封 |
| POST | `/api/players/:uid/kick` | 踢出 |
| POST | `/api/players/:uid/teleport` | 传送 |
| POST | `/api/players/:uid/setlevel` | 设置等级 |
| POST | `/api/players/:uid/setworldlevel` | 设置世界等级 |

### 6.5 卡池

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/gacha` | 所有卡池 |
| POST | `/api/gacha` | 保存卡池 |
| GET | `/api/gacha/versions` | 版本列表 |
| POST | `/api/gacha/versions/apply` | 切换版本 |
| GET | `/api/gacha/items/search` | 搜索卡池物品 |
| GET | `/api/gacha/history/:uid` | 抽卡历史 |

### 6.6 多人联机

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/multiplayer/players` | 玩家位置列表 |
| GET | `/api/multiplayer/stats` | 联机统计 |
| GET | `/api/multiplayer/rooms` | 联机房间 |
| POST | `/api/multiplayer/kick` | 踢出世界 |
| POST | `/api/multiplayer/invite` | 邀请传送 |
| GET | `/api/multiplayer/chat` | 聊天记录 |
| POST | `/api/multiplayer/chat` | 发送消息 |
| GET | `/api/multiplayer/kcp-status` | KCP 诊断 |
| GET | `/api/multiplayer/diagnostic` | 网络诊断 |

### 6.7 其它

详见 PRD 文档或 `node scripts/smoke-test.js` 查看全部 **72 个 API 端点**。

---

## 7. 配置说明

### 7.1 .env 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WEB_PORT` | 8080 | 管理台 HTTP 端口 |
| `PROXY_PORT` | 8081 | HTTPS 代理端口 |
| `HTTPS_PORT` | 8443 | 管理台 HTTPS 端口 |
| `GC_DIR` | `%APPDATA%/.../grasscutter` | Grasscutter 目录 |
| `MONGOD_BIN` | `C:/Program Files/.../mongod.exe` | MongoDB 路径 |
| `MONGO_DATA_DIR` | `%USERPROFILE%/mongo-data` | MongoDB 数据目录 |
| `JWT_SECRET` | (内置默认值) | JWT 签名密钥 |
| `JWT_EXPIRY` | 24h | Token 过期时间 |
| `BACKUP_INTERVAL_HOURS` | 6 | 自动备份间隔 |
| `KCP_INTERVAL_MS` | 10 | KCP 更新间隔 |
| `API_RATE_LIMIT` | 200 | API 限流 (次/分钟) |
| `LOGIN_RATE_LIMIT` | 20 | 登录限流 (次/15分钟) |

### 7.2 Grasscutter config.json 关键配置

```json
{
  "server": {
    "game": {
      "bindPort": 22102,
      "kcpInterval": 10
    },
    "http": {
      "bindPort": 443,
      "encryption": { "useEncryption": false }
    }
  },
  "account": { "autoCreate": true }
}
```

### 7.3 Banners.json 格式

```json
[{
  "gachaType": 301,
  "scheduleId": 130,
  "prefabPath": "GachaShowPanel_A145",
  "costItemId": 223,
  "rateUpItems5": [1084],
  "rateUpItems4": [1083, 1032, 1014],
  "weights5": [[1,80],[73,80],[90,10000]],
  "bannerType": "EVENT"
}]
```

---

## 8. Docker 部署

### 8.1 构建镜像

```bash
docker build -t plan-b .
```

### 8.2 一键启动

```bash
docker-compose up -d
```

### 8.3 查看状态

```bash
docker-compose ps
docker-compose logs -f app
```

### 8.4 Docker 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| app (HTTP) | 8080 | Web 管理台 |
| app (HTTPS) | 8443 | Web 管理台 (加密) |
| app (Proxy) | 8081 | HTTPS 代理 |
| mongodb | 27017 | 数据库 |

> **注意**：Docker 部署时 Grasscutter 需要在容器内运行或挂载外部目录。详见 `docker-compose.yml`。

---

## 9. 常见问题

### Q1: 启动后代理状态显示"未启动"

代理已设为**自动启动**，无需手动操作。刷新页面或等待 5 秒即可。

### Q2: "安装证书"按钮点击无效 / 启动代理按钮灰色

已修复：代理启动按钮不再因证书状态禁用。证书会在代理启动时自动安装。

### Q3: GM 指令发送成功但游戏里没有反应

**已修复**。确认：
- 指令格式正确：`give @10001 201 500`（需要 @UID）
- Grasscutter 由当前 Node.js 进程启动（非残留进程）
- 使用 `重启服务端` 确保 stdin 连接正常

### Q4: 卡池加载失败

**已修复**。问题原因：
- Banners.json 中 prefabPath 引用不匹配客户端版本（4.0.0）
- bannerType 字段缺失

如再次出现，检查 `Banners.json` 中 `bannerType` 是否为 `EVENT`/`WEAPON`/`STANDARD`/`BEGINNER`。

### Q5: 打怪后黑屏回档

**已修复**。设置 `forceLegacyDrops: false`、`cacheSceneEntitiesEveryRun: true`、禁用 MobWave 插件。

### Q6: 端口冲突 (EADDRINUSE)

```bash
# 查看占用端口的进程
netstat -ano | findstr :443
netstat -ano | findstr :8080

# 强制结束
taskkill /F /PID <进程ID>
```

### Q7: 如何重置管理员密码

编辑 `data/auth.json`，删除 `users` 数组中的内容，重启服务。系统会自动创建默认 admin/admin123。

### Q8: 手机能访问吗

能。同一局域网内，手机浏览器打开 `http://<电脑IP>:8080`。UI 已做移动端适配。

---

## 10. 开发指南

### 10.1 运行冒烟测试

```bash
npm run smoke
# 验证 20 个关键 API 端点
```

### 10.2 生成物品数据库

```bash
npm run generate-items
# 重新生成 data/items.json
```

### 10.3 启动 Vue3 前端（开发）

```bash
cd vue-admin
npm install
npm run dev
# 访问 http://localhost:5173
# API 自动代理到 :8080
```

### 10.4 添加新功能

1. 在 `services/` 创建业务逻辑模块
2. 在 `routes/` 或 `server.js` 添加 API 端点
3. 在 `public/index.html` 添加页面
4. 在 `public/js/app.js` 添加前端逻辑
5. 更新 `smoke-test.js` 添加测试用例

### 10.5 技术栈

| 层 | 技术 |
|----|------|
| 后端框架 | Express.js |
| 数据库 | MongoDB |
| 代理引擎 | http-mitm-proxy |
| 前端 (当前) | Vanilla JS + Canvas |
| 前端 (计划) | Vue 3 + Vite + Element Plus |
| 进程管理 | PM2 |
| 容器化 | Docker + Docker Compose |
| 日志 | Pino |

---

## 许可证

本项目基于 Grasscutter 构建，定位为**学习与研究用途**。请勿用于商业运营。

Grasscutter 声明：*Grasscutter is FREE software. If you have paid for this, you may have been scammed.*

---

> **技术支持**：查看 [plan-b-prd.html](plan-b-prd.html) 了解完整产品需求文档（含 Phase 1-5 全部功能规格）。
