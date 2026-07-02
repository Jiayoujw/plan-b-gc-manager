<template>
  <div class="quests-page">
    <div class="panel">
      <div class="hdr">
        <h3>剧情任务 ({{ total }} 个脚本)</h3>
        <button class="btn" @click="initSamples">初始化示例</button>
        <button class="btn" @click="reloadAll">热重载</button>
        <button class="btn primary" @click="createNew">新建脚本</button>
      </div>
      <div class="search-row">
        <input v-model="search" @input="filterList" placeholder="搜索..." class="inp" style="flex:1">
        <select v-model="catFilter" @change="filterList" class="inp" style="width:140px">
          <option value="">全部分类</option>
          <option v-for="(cnt, cat) in catStats" :key="cat" :value="cat">{{ cat }} ({{ cnt }})</option>
        </select>
        <span class="stat">启用 {{ enabled }} / 禁用 {{ disabled }}</span>
      </div>
      <table v-if="filtered.length" class="tbl">
        <thead><tr><th>名称</th><th>分类</th><th>大小</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="q in filtered" :key="q.relativePath">
            <td><strong>{{ q.name }}</strong></td>
            <td><span class="tag blue">{{ q.category }}</span></td>
            <td>{{ (q.size/1024).toFixed(1) }}KB</td>
            <td><span :class="['tag', q.disabled?'red':'green']">{{ q.disabled?'禁用':'启用' }}</span></td>
            <td>
              <button class="btn sm" @click="editQuest(q)">编辑</button>
              <button class="btn sm" :class="{primary:q.disabled}" @click="toggleQuest(q)">{{ q.disabled?'启用':'禁用' }}</button>
              <button class="btn sm" @click="deleteQuest(q)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无脚本</div>
    </div>

    <!-- Editor Modal -->
    <div v-if="editorOpen" class="modal-overlay" @click.self="editorOpen=false">
      <div class="modal">
        <div class="modal-h"><h3>{{ editPath ? '编辑' : '新建' }} Lua 脚本</h3><span @click="editorOpen=false" class="close">&times;</span></div>
        <input v-model="editName" placeholder="文件名 (如 quest_30008.lua)" class="inp" style="width:100%">
        <select v-model="editCategory" class="inp" style="width:100%;margin-top:0.3rem">
          <option value="main">主线 (main)</option><option value="world">世界 (world)</option>
          <option value="story">传说 (story)</option><option value="event">活动 (event)</option>
          <option value="daily">日常 (daily)</option>
        </select>
        <textarea v-model="editContent" class="code" rows="15" placeholder="-- Lua script..."></textarea>
        <div class="modal-f"><button class="btn" @click="editorOpen=false">取消</button><button class="btn primary" @click="saveQuest">保存</button></div>
      </div>
    </div>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<script>
import axios from 'axios'
const API = 'http://localhost:8080/api'

export default {
  name: 'Quests',
  data() {
    return {
      scripts: [], search: '', catFilter: '', total: 0, enabled: 0, disabled: 0, catStats: {}, token: '', msg: '',
      editorOpen: false, editPath: '', editName: '', editCategory: 'main', editContent: '',
    }
  },
  computed: {
    filtered() {
      let s = this.scripts
      if(this.catFilter) s = s.filter(q=>q.category===this.catFilter)
      if(this.search) { const q=this.search.toLowerCase(); s=s.filter(x=>x.name.toLowerCase().includes(q)) }
      return s
    },
  },
  async mounted() {
    const r = await axios.post(API+'/auth/login',{username:'admin',password:'admin123'}); this.token=r.data.token; this.loadQuests()
  },
  methods: {
    auth(){return {Authorization:'Bearer '+this.token}},
    async loadQuests() {
      try {
        const r = await axios.get(API+'/quests',{headers:this.auth()})
        this.scripts = r.data.scripts||[]; this.total = r.data.total
        this.enabled = r.data.enabled; this.disabled = r.data.disabled
        this.catStats = r.data.categories||{}
      } catch(e) { this.msg='加载失败' }
    },
    filterList(){},
    createNew() { this.editPath=''; this.editName=''; this.editCategory='main'; this.editContent='-- New quest script\nfunction OnQuestStart(player)\n  player:SendMessage("Quest started!")\n  player:AddQuestStep("Step 1")\nend\nfunction OnQuestStepComplete(player, stepId)\n  if stepId==1 then player:CompleteQuest(0) end\nend'; this.editorOpen=true },
    async editQuest(q) {
      try { const r=await axios.get(API+'/quests/'+encodeURIComponent(q.relativePath),{headers:this.auth()}); this.editPath=q.relativePath; this.editName=q.name; this.editCategory=q.category; this.editContent=r.data.content; this.editorOpen=true } catch(e) { this.msg='加载失败' }
    },
    async saveQuest() {
      const relPath = this.editPath || (this.editCategory+'/'+this.editName)
      try { await axios.put(API+'/quests/'+encodeURIComponent(relPath),{content:this.editContent},{headers:this.auth()}); this.editorOpen=false; this.loadQuests(); this.msg='已保存' } catch(e) { this.msg='保存失败' }
    },
    async toggleQuest(q) {
      try { await axios.post(API+'/quests/'+encodeURIComponent(q.relativePath)+'/toggle',{},{headers:this.auth()}); this.loadQuests() } catch(e) {}
    },
    async deleteQuest(q) { if(!confirm('删除 '+q.name+' ?')) return; try { await axios.delete(API+'/quests/'+encodeURIComponent(q.relativePath),{headers:this.auth()}); this.loadQuests() } catch(e) {} },
    async reloadAll() { try { await axios.post(API+'/quests/reload',{},{headers:this.auth()}); this.msg='已重载' } catch(e) {} },
    async initSamples() { if(!confirm('创建示例脚本？')) return; try { await axios.post(API+'/quests/init-samples',{},{headers:this.auth()}); this.loadQuests(); this.msg='已创建' } catch(e) {} },
  },
}
</script>

<style scoped>
.quests-page { padding: 1rem; max-width: 900px; margin: 0 auto; }
.panel { background: #1e293b; border-radius: 8px; padding: 1rem; }
.hdr { display: flex; gap: 0.3rem; align-items: center; margin-bottom: 0.8rem; flex-wrap: wrap; }
.hdr h3 { margin: 0; font-size: 0.9rem; color: #94a3b8; flex: 1; }
.search-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; }
.stat { font-size: 0.7rem; color: #94a3b8; white-space: nowrap; }
.inp { padding: 0.4rem 0.6rem; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 0.8rem; }
.btn { padding: 0.35rem 0.7rem; border: none; border-radius: 6px; background: #334155; color: #f8fafc; cursor: pointer; font-size: 0.75rem; }
.btn.primary { background: #3b82f6; }
.btn.sm { padding: 0.2rem 0.5rem; font-size: 0.7rem; }
.tbl { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.tbl th, .tbl td { padding: 0.35rem 0.4rem; border-bottom: 1px solid #334155; text-align: left; }
.tbl th { color: #94a3b8; font-size: 0.7rem; }
.tag { padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.65rem; }
.tag.green { background: #d1fae5; color: #065f46; }
.tag.red { background: #fee2e2; color: #991b1b; }
.tag.blue { background: #dbeafe; color: #1e3a8a; }
.empty { text-align: center; padding: 2rem; color: #94a3b8; }
.code { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; padding: 0.6rem; font-family: monospace; font-size: 0.8rem; margin-top: 0.5rem; resize: vertical; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #1e293b; border-radius: 10px; padding: 1rem; width: 90%; max-width: 600px; max-height: 85vh; overflow-y: auto; }
.modal-h { display: flex; justify-content: space-between; margin-bottom: 0.8rem; }
.close { cursor: pointer; font-size: 1.2rem; color: #94a3b8; }
.modal-f { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
.msg { color: #10b981; font-size: 0.8rem; text-align: center; }
</style>
