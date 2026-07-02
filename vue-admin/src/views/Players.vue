<template>
  <div class="players">
    <div class="panel">
      <div class="panel-hdr">
        <h3>玩家管理</h3>
        <input v-model="searchUid" placeholder="搜索 UID..." class="inp" style="width:120px" @keyup.enter="loadPlayers">
        <button class="btn" @click="loadPlayers">刷新</button>
      </div>
      <table v-if="players.length" class="tbl">
        <thead><tr><th>UID</th><th>昵称</th><th>等级</th><th>世界</th><th>角色数</th><th>位置</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="p in players" :key="p.uid">
            <td><code>{{ p.uid }}</code></td>
            <td>{{ p.nickname || '旅行者' }}</td>
            <td>{{ p.adventureRank || 1 }}</td>
            <td>{{ p.worldLevel || 0 }}</td>
            <td>{{ p.avatarCount || 0 }}</td>
            <td class="pos">{{ fmtPos(p) }}</td>
            <td class="actions">
              <button class="btn sm" @click="openGive(p)">发物品</button>
              <button class="btn sm" @click="quickAction(p, 'setlevel', '60')">等级</button>
              <button class="btn sm" @click="quickAction(p, 'kick')">踢出</button>
              <button class="btn sm" :class="{primary: p.banned}" @click="p.banned ? quickAction(p, 'unban') : quickAction(p, 'ban')">{{ p.banned ? '解封' : '封禁' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">加载中...</div>
    </div>

    <!-- Give Item Modal -->
    <div v-if="giveTarget" class="modal-overlay show" @click.self="giveTarget=null">
      <div class="modal">
        <div class="modal-hdr"><h3>发放物品</h3><span @click="giveTarget=null" class="close">&times;</span></div>
        <div class="modal-body">
          <p>目标: UID {{ giveTarget.uid }} - {{ giveTarget.nickname }}</p>
          <input v-model="giveItemId" placeholder="物品ID (如201=原石)" class="inp" style="width:100%">
          <input v-model="giveAmount" type="number" min="1" value="1" class="inp" style="width:100%;margin-top:0.5rem">
        </div>
        <div class="modal-ft">
          <button class="btn" @click="giveTarget=null">取消</button>
          <button class="btn primary" @click="submitGive">确认发放</button>
        </div>
      </div>
    </div>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<script>
import axios from 'axios'
const API = 'http://localhost:8080/api'

export default {
  name: 'Players',
  data() {
    return {
      players: [], searchUid: '', msg: '', token: '',
      giveTarget: null, giveItemId: '', giveAmount: 1,
    }
  },
  async mounted() {
    const r = await axios.post(API + '/auth/login', { username: 'admin', password: 'admin123' })
    this.token = r.data.token
    this.loadPlayers()
  },
  methods: {
    auth() { return { Authorization: 'Bearer ' + this.token } },
    async loadPlayers() {
      try {
        const r = await axios.get(API + '/players', { headers: this.auth() })
        this.players = r.data.data || []
      } catch (e) { this.msg = '加载失败' }
    },
    fmtPos(p) {
      const pos = p.position || {}
      return `(${(pos.x||0).toFixed(0)}, ${(pos.y||0).toFixed(0)})`
    },
    openGive(p) { this.giveTarget = p; this.giveItemId = ''; this.giveAmount = 1 },
    async submitGive() {
      if (!this.giveItemId) return
      try {
        const r = await axios.post(API + '/players/' + this.giveTarget.uid + '/give',
          { itemId: parseInt(this.giveItemId), amount: this.giveAmount }, { headers: this.auth() })
        this.msg = r.data.message
        this.giveTarget = null
      } catch (e) { this.msg = '发放失败' }
    },
    async quickAction(p, action, value) {
      try {
        let url = API + '/players/' + p.uid + '/' + action
        let body = {}
        if (value) body = action === 'setlevel' ? { level: parseInt(value) } : {}
        const r = await axios.post(url, body, { headers: this.auth() })
        this.msg = r.data.message
        this.loadPlayers()
      } catch (e) { this.msg = '操作失败' }
    },
  },
}
</script>

<style scoped>
.players { padding: 1rem; }
.panel { background: #1e293b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
.panel-hdr { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; }
.panel-hdr h3 { margin: 0; font-size: 0.9rem; color: #94a3b8; flex: 1; }
.inp { padding: 0.4rem 0.6rem; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 0.8rem; }
.btn { padding: 0.35rem 0.7rem; border: none; border-radius: 6px; background: #334155; color: #f8fafc; cursor: pointer; font-size: 0.8rem; }
.btn.primary { background: #3b82f6; }
.btn.sm { padding: 0.2rem 0.5rem; font-size: 0.7rem; }
.tbl { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.tbl th, .tbl td { padding: 0.35rem 0.4rem; text-align: left; border-bottom: 1px solid #334155; }
.tbl th { color: #94a3b8; font-size: 0.7rem; }
.pos { font-size: 0.7rem; color: #94a3b8; }
.actions { display: flex; gap: 0.2rem; flex-wrap: wrap; }
.empty { text-align: center; padding: 2rem; color: #94a3b8; }
.msg { color: #10b981; font-size: 0.8rem; text-align: center; margin-top: 0.5rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #1e293b; border-radius: 10px; padding: 1.2rem; width: 90%; max-width: 400px; }
.modal-hdr { display: flex; justify-content: space-between; align-items: center; }
.close { cursor: pointer; font-size: 1.2rem; color: #94a3b8; }
.modal-body { margin: 1rem 0; }
.modal-ft { display: flex; gap: 0.5rem; justify-content: flex-end; }
</style>
