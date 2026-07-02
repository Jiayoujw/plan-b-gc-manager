import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Players from '../views/Players.vue'
import GachaEditor from '../views/GachaEditor.vue'
import Multiplayer from '../views/Multiplayer.vue'
import Items from '../views/Items.vue'
import Quests from '../views/Quests.vue'
import Security from '../views/Security.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/players', name: 'Players', component: Players },
  { path: '/gacha', name: 'Gacha', component: GachaEditor },
  { path: '/multiplayer', name: 'Multiplayer', component: Multiplayer },
  { path: '/items', name: 'Items', component: Items },
  { path: '/quests', name: 'Quests', component: Quests },
  { path: '/security', name: 'Security', component: Security },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
