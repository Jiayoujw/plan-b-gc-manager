<template>
  <div class="dashboard">
    <header class="topbar">
      <h1>提瓦特管理台</h1>
      <nav class="nav-links">
        <router-link to="/">仪表盘</router-link>
        <router-link to="/players">玩家</router-link>
        <router-link to="/gacha">卡池</router-link>
        <router-link to="/items">物品</router-link>
        <router-link to="/multiplayer">联机</router-link>
        <router-link to="/quests">剧情</router-link>
        <router-link to="/security">安全</router-link>
      </nav>
      <div class="status">
        <span :class="['dot', status.gc ? 'on' : '']"></span> GC
        <span :class="['dot', status.mongo ? 'on' : '']"></span> Mongo
        <span :class="['dot', status.proxy ? 'on' : '']"></span> Proxy
      </div>
    </header>

    <div class="stats">
      <div class="card">
        <div class="label">CPU</div>
        <div class="value">{{ perf.cpu }}%</div>
      </div>
      <div class="card">
        <div class="label">内存</div>
        <div class="value">{{ perf.memory }}%</div>
      </div>
      <div class="card">
        <div class="label">在线</div>
        <div class="value">{{ perf.online }}</div>
      </div>
      <div class="card">
        <div class="label">运行时间</div>
        <div class="value">{{ uptime }}</div>
      </div>
    </div>

    <div class="panel">
      <h3>快速操作</h3>
      <div class="actions">
        <button @click="startAll" :disabled="loading">{{ loading ? '启动中...' : '一键启动全部' }}</button>
        <button @click="stopAll">一键停止</button>
        <button @click="launchGame">启动游戏</button>
        <button @click="refresh">刷新状态</button>
      </div>
      <p v-if="msg" class="msg">{{ msg }}</p>
    </div>

    <div class="panel">
      <h3>GM 指令</h3>
      <div class="gm-btns">
        <button v-for="cmd in gmCommands" :key="cmd.id" @click="sendCmd(cmd.cmd)">{{ cmd.name }}</button>
      </div>
      <div class="gm-input">
        <input v-model="customCmd" @keyup.enter="sendCmd(customCmd)" placeholder="自定义 GM 指令...">
        <button @click="sendCmd(customCmd)">发送</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
const API = 'http://localhost:8080/api'

export default {
  name: 'Dashboard',
  data() {
    return {
      status: { gc: false, mongo: false, proxy: false },
      perf: { cpu: 0, memory: 0, online: 0 },
      uptime: '0s',
      loading: false,
      msg: '',
      customCmd: '',
      token: '',
      gmCommands: [
        { id: 1, name: '原石 x99999', cmd: '/give 201 x99999' },
        { id: 2, name: '摩拉 x99999', cmd: '/give 202 x99999' },
        { id: 3, name: '纠缠之缘 x999', cmd: '/give 223 x999' },
        { id: 4, name: '全角色', cmd: '/giveall' },
        { id: 5, name: '世界等级8', cmd: '/setworldlevel 8' },
        { id: 6, name: '无敌模式', cmd: '/godmode' },
      ],
    }
  },
  async mounted() {
    await this.login()
    this.refresh()
    this.timer = setInterval(() => this.refresh(), 10000)
    // WebSocket
    this.connectWS()
  },
  beforeUnmount() {
    clearInterval(this.timer)
    if (this.ws) this.ws.close()
  },
  methods: {
    async login() {
      try {
        const r = await axios.post(API + '/auth/login', { username: 'admin', password: 'admin123' })
        this.token = r.data.token
      } catch (e) { console.error('Login failed') }
    },
    authHeaders() {
      return this.token ? { Authorization: 'Bearer ' + this.token } : {}
    },
    async refresh() {
      try {
        const r = await axios.get(API + '/status', { headers: this.authHeaders() })
        this.status.gc = r.data.grasscutter?.running
        this.status.mongo = r.data.mongodb?.running
        this.status.proxy = r.data.proxy?.running
      } catch (e) {}
      try {
        const r = await axios.get(API + '/perf', { headers: this.authHeaders() })
        const h = r.data.history || []
        if (h.length) {
          const last = h[h.length - 1]
          this.perf.cpu = last.cpu || 0
          this.perf.memory = last.memory || 0
          this.perf.online = last.online || 0
        }
        try {
          const s = await axios.get(API + '/system/info', { headers: this.authHeaders() })
          this.uptime = s.data.info?.uptime ? Math.floor(s.data.info.uptime / 60) + 'min' : '--'
        } catch (e) {}
      } catch (e) {}
    },
    connectWS() {
      try {
        this.ws = new WebSocket('ws://localhost:8082')
        this.ws.onmessage = (e) => {
          try {
            const d = JSON.parse(e.data)
            if (d.type === 'status' && d.perf) {
              this.perf.cpu = d.perf.cpu || 0
              this.perf.memory = d.perf.memory || 0
              this.perf.online = d.perf.online || 0
            }
          } catch (ex) {}
        }
      } catch (e) {}
    },
    async startAll() {
      this.loading = true
      try {
        const r = await axios.post(API + '/server/start-all', {}, { headers: this.authHeaders() })
        this.msg = r.data.message
        setTimeout(() => this.refresh(), 5000)
      } catch (e) { this.msg = '启动失败' }
      this.loading = false
    },
    async stopAll() {
      try {
        const r = await axios.post(API + '/server/stop-all', {}, { headers: this.authHeaders() })
        this.msg = r.data.message
        this.refresh()
      } catch (e) { this.msg = '停止失败' }
    },
    async launchGame() {
      try {
        await axios.post(API + '/game/launch', {
          path: 'D:/EdgeDownload/GenshinImpact_4.0.0/GenshinImpact.exe'
        }, { headers: this.authHeaders() })
        this.msg = '游戏已启动'
      } catch (e) { this.msg = '启动失败' }
    },
    async sendCmd(cmd) {
      if (!cmd) return
      try {
        await axios.post(API + '/server/command', { command: cmd }, { headers: this.authHeaders() })
        this.msg = '已发送: ' + cmd
        this.customCmd = ''
      } catch (e) { this.msg = '发送失败' }
    },
  },
}
</script>

<style scoped>
.dashboard { max-width: 900px; margin: 0 auto; padding: 1rem; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0.8rem 1.2rem; background: #1e293b; border-radius: 8px; flex-wrap: wrap; gap: 0.5rem; }
.topbar h1 { font-size: 1.2rem; margin: 0; color: #f8fafc; }
.nav-links { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.nav-links a { padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; color: #94a3b8; text-decoration: none; background: #334155; }
.nav-links a:hover, .nav-links a.router-link-active { background: #3b82f6; color: #fff; }
.status { display: flex; align-items: center; gap: 0.8rem; font-size: 0.8rem; color: #94a3b8; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #475569; display: inline-block; }
.dot.on { background: #10b981; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; margin-bottom: 1rem; }
.card { background: #1e293b; border-radius: 8px; padding: 1rem; text-align: center; }
.card .label { font-size: 0.75rem; color: #94a3b8; }
.card .value { font-size: 1.5rem; font-weight: 700; color: #f8fafc; margin-top: 0.2rem; }
.panel { background: #1e293b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
.panel h3 { font-size: 0.8rem; color: #94a3b8; margin: 0 0 0.8rem; text-transform: uppercase; }
.actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
button { padding: 0.5rem 1rem; border: none; border-radius: 6px; background: #3b82f6; color: #fff; cursor: pointer; font-size: 0.85rem; }
button:hover { opacity: 0.9; }
button:disabled { opacity: 0.5; }
.gm-btns { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
.gm-btns button { font-size: 0.75rem; padding: 0.35rem 0.7rem; background: #334155; }
.gm-input { display: flex; gap: 0.5rem; }
.gm-input input { flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; }
.msg { color: #10b981; font-size: 0.8rem; margin-top: 0.5rem; }
@media (max-width: 600px) { .stats { grid-template-columns: repeat(2, 1fr); } }
</style>
