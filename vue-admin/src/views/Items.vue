<template>
  <div class="items-page">
    <div class="panel">
      <div class="hdr">
        <h3>物品浏览器 ({{ total }} 条)</h3>
        <button class="btn" @click="loadItems">刷新</button>
      </div>
      <div class="search-row">
        <input v-model="search" @input="doSearch" placeholder="搜索名称或ID..." class="inp" style="flex:1">
        <select v-model="catFilter" @change="doSearch" class="inp" style="width:140px">
          <option value="">全部分类</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <table v-if="items.length" class="tbl">
        <thead><tr><th>ID</th><th>名称</th><th>分类</th><th>稀有度</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td><code>{{ item.id }}</code></td>
            <td>{{ item.name }}</td>
            <td>{{ catName(item.category) }}</td>
            <td><span :class="['tag', item.rarity>=5?'y':item.rarity>=4?'p':'']">{{ '★'.repeat(item.rarity||1) }}</span></td>
            <td><button class="btn sm" @click="sendGive(item)">发放</button></td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">加载中或未找到物品</div>
    </div>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<script>
import axios from 'axios'
const API = 'http://localhost:8080/api'

export default {
  name: 'Items',
  data() {
    return {
      items: [], categories: [], total: 0, search: '', catFilter: '', token: '', msg: '',
    }
  },
  async mounted() {
    const r = await axios.post(API+'/auth/login',{username:'admin',password:'admin123'}); this.token=r.data.token; this.loadItems()
  },
  methods: {
    auth(){return {Authorization:'Bearer '+this.token}},
    async loadItems() {
      try {
        const r = await axios.get(API+'/items',{headers:this.auth()})
        this.categories = r.data.categories || []
        this.items = (r.data.items||[]).slice(0, 200)
        this.total = r.data.total || r.data.items?.length || 0
      } catch(e) { this.msg='加载失败' }
    },
    async doSearch() {
      try {
        const params = {}
        if(this.search) params.q = this.search
        if(this.catFilter) params.category = this.catFilter
        const r = await axios.get(API+'/items',{params,headers:this.auth()})
        this.items = (r.data.items||[]).slice(0, 200)
        this.total = r.data.total || r.data.items?.length || 0
      } catch(e) {}
    },
    catName(id) { const c = this.categories.find(c=>c.id===id); return c?c.name:id },
    async sendGive(item) {
      const uid = prompt('目标玩家 UID:', '10001')
      if(!uid) return
      const qty = prompt('数量:', '1')
      if(!qty) return
      try {
        const r = await axios.post(API+'/players/'+uid+'/give',{itemId:item.id,amount:parseInt(qty)},{headers:this.auth()})
        this.msg = r.data.message
      } catch(e) { this.msg='发放失败' }
    },
  },
}
</script>

<style scoped>
.items-page { padding: 1rem; max-width: 900px; margin: 0 auto; }
.panel { background: #1e293b; border-radius: 8px; padding: 1rem; }
.hdr { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; }
.hdr h3 { margin: 0; font-size: 0.9rem; color: #94a3b8; flex: 1; }
.search-row { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
.inp { padding: 0.4rem 0.6rem; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 0.8rem; }
.btn { padding: 0.35rem 0.7rem; border: none; border-radius: 6px; background: #334155; color: #f8fafc; cursor: pointer; font-size: 0.8rem; }
.btn.sm { padding: 0.2rem 0.5rem; font-size: 0.7rem; }
.tbl { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 0.5rem; }
.tbl th, .tbl td { padding: 0.35rem 0.4rem; text-align: left; border-bottom: 1px solid #334155; }
.tbl th { color: #94a3b8; font-size: 0.7rem; }
.tag { padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.65rem; }
.tag.y { background: #fef3c7; color: #92400e; }
.tag.p { background: #ede9fe; color: #5b21b6; }
.empty { text-align: center; padding: 2rem; color: #94a3b8; }
.msg { color: #10b981; font-size: 0.8rem; text-align: center; margin-top: 0.5rem; }
</style>
