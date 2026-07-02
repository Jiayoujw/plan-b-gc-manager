<template>
  <div class="security">
    <div class="row2">
      <!-- RBAC Roles -->
      <div class="panel">
        <h3>角色与权限</h3>
        <div v-for="r in roles" :key="r.name" class="role-card">
          <div>
            <span :class="['tag', r.color]">{{ r.name }}</span>
            <strong>{{ r.label }}</strong>
            <div class="perms">{{ r.perms.join(', ') }}</div>
          </div>
        </div>
      </div>
      <!-- Anomaly Rules -->
      <div class="panel">
        <h3>异常检测规则</h3>
        <div v-for="rule in rules" :key="rule.id" class="rule-item">
          <strong>{{ rule.id }}</strong> {{ rule.name }}
          <div class="desc">{{ rule.desc }}</div>
        </div>
      </div>
    </div>

    <!-- Anomaly Alerts -->
    <div class="panel">
      <div class="hdr"><h3>异常告警</h3><button class="btn" @click="loadAlerts">刷新</button></div>
      <table v-if="alerts.length" class="tbl">
        <thead><tr><th>时间</th><th>规则</th><th>名称</th><th>用户</th><th>详情</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="a in alerts" :key="a.id">
            <td class="time">{{ fmtTime(a.time) }}</td>
            <td><span class="tag red">{{ a.ruleId }}</span></td>
            <td>{{ a.ruleName }}</td>
            <td>{{ a.user }}</td>
            <td>{{ a.detail }}</td>
            <td>{{ a.handled ? '已处理' : '待处理' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无告警 🎉</div>
    </div>

    <!-- Audit Log -->
    <div class="panel">
      <div class="hdr"><h3>审计日志</h3><button class="btn" @click="loadAudit">刷新</button></div>
      <table v-if="audit.length" class="tbl">
        <thead><tr><th>时间</th><th>用户</th><th>操作</th><th>目标</th><th>IP</th></tr></thead>
        <tbody>
          <tr v-for="a in audit" :key="a.time">
            <td class="time">{{ fmtTime(a.time) }}</td>
            <td>{{ a.user }}</td>
            <td>{{ a.action }}</td>
            <td>{{ a.target }}</td>
            <td>{{ a.ip }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">加载中...</div>
    </div>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<script>
import axios from 'axios'
const API = 'http://localhost:8080/api'

export default {
  name: 'Security',
  data() {
    return {
      roles: [
        { name:'SuperAdmin', label:'超级管理员', color:'red', perms:['全部权限 (14项)','唯一账户'] },
        { name:'Admin', label:'管理员', color:'yellow', perms:['12项','玩家/卡池/物品/日志/数据库'] },
        { name:'Moderator', label:'协管员', color:'blue', perms:['7项','玩家查看/发放/踢出/传送'] },
        { name:'Viewer', label:'观察者', color:'green', perms:['4项','只读：玩家/卡池/日志/数据库'] },
      ],
      rules: [], alerts: [], audit: [], token: '', msg: '',
    }
  },
  async mounted() {
    const r = await axios.post(API+'/auth/login',{username:'admin',password:'admin123'}); this.token=r.data.token
    this.loadAll()
  },
  methods: {
    auth(){return {Authorization:'Bearer '+this.token}},
    async loadAll() { this.loadRules(); this.loadAlerts(); this.loadAudit() },
    async loadRules() { try{const r=await axios.get(API+'/anomaly/rules',{headers:this.auth()});this.rules=r.data.rules||[]}catch(e){} },
    async loadAlerts() { try{const r=await axios.get(API+'/anomaly/alerts?limit=20',{headers:this.auth()});this.alerts=r.data.alerts||[]}catch(e){} },
    async loadAudit() { try{const r=await axios.get(API+'/audit?limit=30',{headers:this.auth()});this.audit=r.data.records||[]}catch(e){} },
    fmtTime(t){ return t?t.replace('T',' ').substring(0,19):'' },
  },
}
</script>

<style scoped>
.security { padding: 1rem; max-width: 900px; margin: 0 auto; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 0.8rem; }
.panel { background: #1e293b; border-radius: 8px; padding: 1rem; margin-bottom: 0.8rem; }
.panel h3 { font-size: 0.8rem; color: #94a3b8; margin: 0 0 0.8rem; }
.hdr { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; }
.hdr h3 { margin: 0; flex: 1; }
.role-card { padding: 0.5rem 0; border-bottom: 1px solid #334155; }
.role-card:last-child { border: none; }
.perms { font-size: 0.7rem; color: #94a3b8; margin-top: 0.2rem; }
.rule-item { padding: 0.4rem 0; border-bottom: 1px solid #334155; font-size: 0.8rem; }
.rule-item:last-child { border: none; }
.desc { font-size: 0.7rem; color: #94a3b8; margin-top: 0.1rem; }
.tag { padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.65rem; }
.tag.red { background: #fee2e2; color: #991b1b; }
.tag.yellow { background: #fef3c7; color: #92400e; }
.tag.blue { background: #dbeafe; color: #1e3a8a; }
.tag.green { background: #d1fae5; color: #065f46; }
.tbl { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.tbl th, .tbl td { padding: 0.3rem; border-bottom: 1px solid #334155; text-align: left; }
.tbl th { color: #94a3b8; font-size: 0.65rem; }
.time { font-size: 0.7rem; color: #94a3b8; white-space: nowrap; }
.empty { text-align: center; padding: 1rem; color: #94a3b8; font-size: 0.8rem; }
.msg { color: #10b981; font-size: 0.8rem; text-align: center; }
@media (max-width:600px){.row2{grid-template-columns:1fr}}
</style>
