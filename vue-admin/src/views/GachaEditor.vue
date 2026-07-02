<template>
  <div class="gacha">
    <div class="panel">
      <div class="hdr"><h3>卡池编辑器</h3>
        <button class="btn" @click="loadPools">刷新</button>
        <button class="btn primary" @click="saveAll">保存全部</button>
      </div>
      <div class="tabs">
        <button v-for="(meta, gt) in POOL_META" :key="gt"
          :class="['tab', { active: activeType === Number(gt) }]"
          @click="switchPool(Number(gt))">{{ activePool?.name || meta.name }}</button>
      </div>

      <div v-if="activePool" class="editor">
        <div class="row">
          <div class="col">
            <label>名称</label>
            <input v-model="activePool.name" class="inp" @change="dirty=true">

            <label>UP 5星 (最多2个)</label>
            <div class="tags">
              <span v-for="(item,i) in activePool.rateUpItems5" :key="'5-'+i"
                class="tag y" @click="removeItem(5,i)">★5 {{ item.name||item.id }} ✕</span>
            </div>
            <button class="btn sm" @click="openPicker(5)" v-if="(activePool.rateUpItems5||[]).length<2">+ 添加5星</button>

            <label>UP 4星 (最多3个)</label>
            <div class="tags">
              <span v-for="(item,i) in activePool.rateUpItems4" :key="'4-'+i"
                class="tag p" @click="removeItem(4,i)">★4 {{ item.name||item.id }} ✕</span>
            </div>
            <button class="btn sm" @click="openPicker(4)" v-if="(activePool.rateUpItems4||[]).length<3">+ 添加4星</button>

            <label>UP权重%</label>
            <div class="row2">
              <input v-model.number="activePool.eventChance5" type="number" class="inp" @change="dirty=true" style="width:80px"><span>5星UP</span>
              <input v-model.number="activePool.eventChance4" type="number" class="inp" @change="dirty=true" style="width:80px"><span>4星UP</span>
            </div>

            <label>消耗道具</label>
            <select v-model.number="activePool.costItemId" class="inp" @change="dirty=true">
              <option :value="223">纠缠之缘 (223)</option>
              <option :value="224">相遇之缘 (224)</option>
            </select>
          </div>
          <div class="col">
            <div class="preview">
              <div class="picon">{{ POOL_META[activeType]?.icon||'🌟' }}</div>
              <div class="pname">{{ activePool.name }}</div>
              <div v-if="activePool.rateUpItems5?.length" class="pup">
                <span v-for="i in activePool.rateUpItems5" :key="i.id" class="tag y">★5 {{ i.name||i.id }}</span>
              </div>
              <div v-if="activePool.rateUpItems4?.length" class="pup">
                <span v-for="i in activePool.rateUpItems4" :key="i.id" class="tag p">★4 {{ i.name||i.id }}</span>
              </div>
              <div class="pmeta">消耗: {{ activePool.costItemId===223?'纠缠':'相遇' }} | 保底: 90抽</div>
            </div>
            <button class="btn" @click="simulate" style="width:100%;margin-top:0.5rem">模拟100抽</button>
            <div v-if="simResult" class="sim">{{ simResult }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Picker Modal -->
    <div v-if="pickerOpen" class="modal-overlay" @click.self="pickerOpen=false">
      <div class="modal">
        <div class="modal-h"><h3>选择UP ★{{ pickerRarity }} 物品</h3><span @click="pickerOpen=false" class="close">&times;</span></div>
        <input v-model="pickerSearch" class="inp" placeholder="搜索名称或ID..." @input="searchItems" style="width:100%">
        <div class="picker-list">
          <div v-for="item in pickerItems" :key="item.id"
            :class="['pitem', { sel: pickerSelected.some(s=>s.id===item.id) }]"
            @click="togglePickerItem(item)">
            <code>{{ item.id }}</code>
            <span :class="['tag', item.rarity===5?'y':'p']">{{ '★'.repeat(item.rarity) }}</span>
            {{ item.name }}
          </div>
        </div>
        <p>已选: {{ pickerSelected.length }}</p>
        <div class="modal-f"><button class="btn" @click="pickerOpen=false">取消</button><button class="btn primary" @click="confirmPicker">确认</button></div>
      </div>
    </div>
    <p v-if="msg" class="msg">{{ msg }}</p>
  </div>
</template>

<script>
import axios from 'axios'
const API = 'http://localhost:8080/api'
const POOL_META = { 301:{name:'限定角色',icon:'🌟',cost:223}, 400:{name:'限定角色II',icon:'🌟',cost:223}, 302:{name:'限定武器',icon:'⚔️',cost:223}, 200:{name:'常驻',icon:'🌌',cost:224}, 100:{name:'新手',icon:'🎀',cost:224} }

export default {
  name: 'GachaEditor',
  data() {
    return {
      POOL_META, activeType: 301, pools: [], dirty: false, msg: '', simResult: '', token: '',
      pickerOpen: false, pickerRarity: 5, pickerSearch: '', pickerItems: [], pickerSelected: [], allItems: [],
    }
  },
  computed: { activePool() { return this.pools.find(p=>p.gachaType===this.activeType) } },
  async mounted() {
    const r = await axios.post(API+'/auth/login',{username:'admin',password:'admin123'}); this.token=r.data.token; this.loadPools()
  },
  methods: {
    auth(){return {Authorization:'Bearer '+this.token}},
    async loadPools(){ try{const r=await axios.get(API+'/gacha',{headers:this.auth()});this.pools=r.data.pools||[]}catch(e){this.msg='加载失败'} },
    switchPool(gt){ this.activeType=gt },
    async saveAll(){
      try{const r=await axios.post(API+'/gacha',{pools:this.pools.map(p=>({...p,rateUpItems5:(p.rateUpItems5||[]).map(i=>i.id),rateUpItems4:(p.rateUpItems4||[]).map(i=>i.id)}))},{headers:this.auth()});this.msg=r.data.message;this.dirty=false}catch(e){this.msg='保存失败'}
    },
    removeItem(rarity,i){ const k=rarity===5?'rateUpItems5':'rateUpItems4'; this.activePool[k].splice(i,1); this.dirty=true },
    async openPicker(rarity){
      this.pickerOpen=true; this.pickerRarity=rarity; this.pickerSelected=[]; this.pickerSearch='';
      try{const r=await axios.get(API+'/gacha/items/search?rarity='+rarity);this.allItems=r.data.items||[];this.pickerItems=this.allItems}catch(e){}
    },
    searchItems(){ const q=this.pickerSearch.toLowerCase(); this.pickerItems=this.allItems.filter(i=>i.name.toLowerCase().includes(q)||String(i.id).includes(q)).slice(0,100) },
    togglePickerItem(item){
      const idx=this.pickerSelected.findIndex(s=>s.id===item.id);
      if(idx>=0) this.pickerSelected.splice(idx,1);
      else if(this.pickerSelected.length<(this.pickerRarity===5?2:3)) this.pickerSelected.push(item);
    },
    confirmPicker(){
      const k=this.pickerRarity===5?'rateUpItems5':'rateUpItems4';
      if(!this.activePool[k]) this.activePool[k]=[];
      this.pickerSelected.forEach(s=>{if(!this.activePool[k].find(e=>e.id===s.id))this.activePool[k].push({id:s.id,name:s.name})});
      this.pickerOpen=false; this.dirty=true;
    },
    simulate(){
      const p=this.activePool; if(!p) return;
      let c5=0,c4=0,c3=0,up5=0,p5=0; const res=[];
      for(let i=0;i<100;i++){p5++;const r=Math.random();const w5=0.006+(p5>=73?(p5-72)*0.06:0);
        if(r<(p5>=90?1:w5)){c5++;p5=0;if(Math.random()<((p.eventChance5||50)/100))up5++;res.push({r:5,pull:i+1})}
        else if(r<w5+0.051){c4++;res.push({r:4})}else{c3++;res.push({r:3})}}
      this.simResult='100抽: 5星'+c5+' (UP'+up5+') | 4星'+c4+' | 3星'+c3+' | 均5星:'+(c5?(100/c5).toFixed(1):'N/A')+'抽'
    },
  },
}
</script>

<style scoped>
.gacha { padding: 1rem; max-width: 900px; margin: 0 auto; }
.panel { background: #1e293b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
.hdr { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.8rem; }
.hdr h3 { margin: 0; font-size: 0.9rem; color: #94a3b8; flex: 1; }
.tabs { display: flex; gap: 0.3rem; margin-bottom: 1rem; flex-wrap: wrap; }
.tab { padding: 0.4rem 0.8rem; border: 1px solid #334155; border-radius: 6px; background: #0f172a; color: #94a3b8; cursor: pointer; font-size: 0.75rem; }
.tab.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.editor { }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.col { display: flex; flex-direction: column; gap: 0.5rem; }
label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; }
.inp { padding: 0.4rem 0.6rem; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-size: 0.8rem; }
.btn { padding: 0.35rem 0.7rem; border: none; border-radius: 6px; background: #334155; color: #f8fafc; cursor: pointer; font-size: 0.8rem; }
.btn.primary { background: #3b82f6; }
.btn.sm { padding: 0.2rem 0.5rem; font-size: 0.7rem; }
.tags { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.tag { padding: 0.15em 0.5em; border-radius: 4px; font-size: 0.7rem; cursor: pointer; }
.tag.y { background: #fef3c7; color: #92400e; }
.tag.p { background: #ede9fe; color: #5b21b6; }
.row2 { display: flex; gap: 0.3rem; align-items: center; }
.preview { background: linear-gradient(135deg,#0f172a,#1e293b); border: 1px solid #334155; border-radius: 8px; padding: 1.5rem; text-align: center; min-height: 180px; }
.picon { font-size: 2.5rem; }
.pname { font-weight: 700; margin: 0.3rem 0; }
.pup { display: flex; gap: 0.3rem; justify-content: center; margin: 0.3rem 0; flex-wrap: wrap; }
.pmeta { font-size: 0.7rem; color: #94a3b8; margin-top: 0.5rem; border-top: 1px solid #334155; padding-top: 0.5rem; }
.sim { font-size: 0.75rem; color: #10b981; margin-top: 0.3rem; }
.msg { color: #10b981; font-size: 0.8rem; text-align: center; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #1e293b; border-radius: 10px; padding: 1rem; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
.modal-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
.close { cursor: pointer; font-size: 1.2rem; color: #94a3b8; }
.picker-list { max-height: 300px; overflow-y: auto; margin: 0.5rem 0; }
.pitem { padding: 0.4rem; cursor: pointer; border-bottom: 1px solid #334155; display: flex; gap: 0.5rem; align-items: center; font-size: 0.8rem; }
.pitem:hover { background: rgba(59,130,246,0.1); }
.pitem.sel { background: rgba(59,130,246,0.2); }
.pitem code { min-width: 50px; }
.modal-f { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
</style>
