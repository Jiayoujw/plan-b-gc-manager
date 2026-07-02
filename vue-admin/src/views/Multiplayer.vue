<template>
  <div class="mp">
    <div class="stats">
      <div class="card"><div class="lbl">在线</div><div class="val">{{ stats.estimatedOnline }}</div></div>
      <div class="card"><div class="lbl">房间</div><div class="val">{{ stats.coOpRooms }}</div></div>
      <div class="card"><div class="lbl">KCP</div><div class="val">{{ kcpOpen ? '~12ms' : '--' }}</div></div>
      <div class="card"><div class="lbl">玩家</div><div class="val">{{ stats.totalPlayers }}</div></div>
    </div>

    <div class="row2">
      <div class="panel">
        <h3>玩家位置</h3>
        <canvas ref="mapCanvas" width="400" height="300" class="map"></canvas>
      </div>
      <div class="panel">
        <h3>联机房间</h3>
        <div v-if="!rooms.length" class="empty">暂无房间</div>
        <div v-for="r in rooms" :key="r.hostUid" class="room">
          <strong>主机 UID: {{ r.hostUid }}</strong> ({{ r.count }}人)
          <button class="btn sm" @click="kickPlayer(r.hostUid)">解散</button>
        </div>
        <div class="actions">
          <input v-model="inviteTo" placeholder="目标UID" class="inp" style="width:80px">
          <input v-model="inviteHost" placeholder="主机UID" class="inp" style="width:80px">
          <button class="btn sm primary" @click="invite">邀请</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>玩家列表</h3>
      <table class="tbl"><thead><tr><th>UID</th><th>昵称</th><th>坐标(x,y,z)</th><th>操作</th></tr></thead>
        <tbody><tr v-for="p in players" :key="p.uid">
          <td><code>{{ p.uid }}</code></td><td>{{ p.nickname||'旅行者' }}</td>
          <td class="pos">({{ (p.position?.x||0).toFixed(0) }}, {{ (p.position?.y||0).toFixed(0) }}, {{ (p.position?.z||0).toFixed(0) }})</td>
          <td><button class="btn sm" @click="kickPlayer(p.uid)">踢出</button> <button class="btn sm" @click="teleport(p.uid)">传送</button></td>
        </tr></tbody></table>
    </div>

    <div class="panel">
      <h3>服务器聊天</h3>
      <div class="chat-box"><div v-for="m in chatMsgs" :key="m.time" class="cmsg"><span class="ctime">{{ fmtTime(m.time) }}</span> <strong>{{ m.user||'[服务器]' }}</strong> {{ m.message }}</div></div>
      <div class="chat-send"><input v-model="chatMsg" @keyup.enter="sendChat" placeholder="发送公告..." class="inp" style="flex:1"><button class="btn primary" @click="sendChat">发送</button></div>
    </div>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<script>
import axios from 'axios'
const API = 'http://localhost:8080/api'

export default {
  name: 'Multiplayer',
  data() {
    return {
      stats: { estimatedOnline:0, coOpRooms:0, totalPlayers:0 },
      players: [], rooms: [], chatMsgs: [], kcpOpen: false, msg: '', token: '',
      inviteTo: '', inviteHost: '', chatMsg: '',
    }
  },
  async mounted() {
    const r = await axios.post(API+'/auth/login',{username:'admin',password:'admin123'}); this.token=r.data.token
    this.loadAll(); setInterval(()=>this.loadAll(),15000)
  },
  methods: {
    auth(){return {Authorization:'Bearer '+this.token}},
    async loadAll(){
      try{const s=await axios.get(API+'/multiplayer/stats',{headers:this.auth()});this.stats=s.data.stats||this.stats}catch(e){}
      try{const p=await axios.get(API+'/multiplayer/players',{headers:this.auth()});this.players=p.data.players||[]; this.$nextTick(()=>this.drawMap())}catch(e){}
      try{const r=await axios.get(API+'/multiplayer/rooms',{headers:this.auth()});this.rooms=r.data.rooms||[]}catch(e){}
      try{const c=await axios.get(API+'/multiplayer/chat?limit=30',{headers:this.auth()});this.chatMsgs=c.data.messages||[]}catch(e){}
      try{const k=await axios.get(API+'/multiplayer/kcp-status');this.kcpOpen=k.data.kcpPortOpen}catch(e){}
    },
    drawMap(){
      const c=this.$refs.mapCanvas; if(!c||!this.players.length) return;
      const ctx=c.getContext('2d'),w=c.width,h=c.height; ctx.clearRect(0,0,w,h);
      const cities=[{n:'蒙德',x:2848,z:-1075},{n:'璃月',x:-956,z:1364},{n:'稻妻',x:-3228,z:-3411},{n:'须弥',x:2874,z:-1882}];
      ctx.font='9px sans-serif';
      cities.forEach(c=>{const cx=(c.x+5000)/10000*w,cy=(c.z+5000)/10000*h;ctx.fillStyle='#64748b';ctx.fillText(c.n,cx-8,cy-3)});
      this.players.forEach(p=>{const px=((p.position?.x||0)+5000)/10000*w,py=((p.position?.z||0)+5000)/10000*h;if(px>0&&px<w&&py>0&&py<h){ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill()}});
    },
    async kickPlayer(uid){ try{const r=await axios.post(API+'/multiplayer/kick',{uid},{headers:this.auth()});this.msg=r.data.message;this.loadAll()}catch(e){this.msg='失败'} },
    async teleport(uid){ const preset=prompt('预设(mondstadt/liyue/inazuma/sumeru):','mondstadt'); if(!preset)return; try{const r=await axios.post(API+'/teleport/player',{uid,preset},{headers:this.auth()});this.msg=r.data.message}catch(e){this.msg='失败'} },
    async invite(){ if(!this.inviteTo||!this.inviteHost)return; try{const r=await axios.post(API+'/multiplayer/invite',{fromUid:parseInt(this.inviteHost),toUid:parseInt(this.inviteTo)},{headers:this.auth()});this.msg=r.data.message}catch(e){this.msg='失败'} },
    async sendChat(){ if(!this.chatMsg)return; try{await axios.post(API+'/multiplayer/chat',{message:this.chatMsg,type:'server'},{headers:this.auth()});this.chatMsg='';this.loadAll()}catch(e){this.msg='失败'} },
    fmtTime(t){ return t?t.replace('T',' ').substring(11,19):'' },
  },
}
</script>

<style scoped>
.mp { padding: 1rem; max-width: 900px; margin: 0 auto; }
.stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 0.8rem; margin-bottom: 1rem; }
.card { background: #1e293b; border-radius: 8px; padding: 0.8rem; text-align: center; }
.lbl { font-size: 0.7rem; color: #94a3b8; } .val { font-size: 1.3rem; font-weight: 700; }
.panel { background: #1e293b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
.panel h3 { font-size: 0.8rem; color: #94a3b8; margin: 0 0 0.8rem; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.map { width: 100%; height: 260px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; }
.room { display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; border-bottom: 1px solid #334155; font-size: 0.8rem; }
.empty { text-align: center; padding: 1rem; color: #94a3b8; font-size: 0.8rem; }
.actions { display: flex; gap: 0.3rem; margin-top: 0.5rem; }
.inp { padding: 0.3rem 0.5rem; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: #f8fafc; font-size: 0.75rem; }
.btn { padding: 0.3rem 0.6rem; border: none; border-radius: 4px; background: #334155; color: #f8fafc; cursor: pointer; font-size: 0.75rem; }
.btn.primary { background: #3b82f6; } .btn.sm { font-size: 0.7rem; }
.tbl { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
.tbl th, .tbl td { padding: 0.3rem; border-bottom: 1px solid #334155; text-align: left; }
.tbl th { color: #94a3b8; font-size: 0.65rem; } .pos { font-size: 0.65rem; color: #94a3b8; }
.chat-box { max-height: 150px; overflow-y: auto; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem; }
.cmsg { padding: 0.15rem 0; } .ctime { color: #94a3b8; font-size: 0.65rem; margin-right: 0.5rem; }
.chat-send { display: flex; gap: 0.3rem; }
.msg { color: #10b981; font-size: 0.8rem; text-align: center; }
@media (max-width:600px){.stats{grid-template-columns:repeat(2,1fr)}.row2{grid-template-columns:1fr}}
</style>
