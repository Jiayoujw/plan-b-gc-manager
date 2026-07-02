// ===== Gacha Editor v2 — Full Featured =====
let gachaAllPools = [];
let gachaActivePoolType = 301;
let gachaPickerCallback = null;
let gachaPickerSelected = [];

const GACHA_POOL_META = {
  301: { name: '限定角色祈愿', icon: '🌟', costItem: 223, maxUP5: 2, maxUP4: 3 },
  400: { name: '限定角色祈愿II', icon: '🌟', costItem: 223, maxUP5: 2, maxUP4: 3 },
  302: { name: '限定武器祈愿', icon: '⚔️', costItem: 223, maxUP5: 2, maxUP4: 5 },
  200: { name: '常驻祈愿', icon: '🌌', costItem: 224, maxUP5: 0, maxUP4: 0 },
  100: { name: '新手祈愿', icon: '🎀', costItem: 224, maxUP5: 0, maxUP4: 1 },
};

// ===== Load / Tabs =====
async function loadGachaVersions() {
  var list = document.getElementById('gachaVersionList');
  var current = document.getElementById('currentGachaVersion');
  if (list) list.innerHTML = '<div class="loading-msg">加载中...</div>';
  try {
    var res = await fetch(API_BASE + '/gacha/versions');
    var data = await res.json();
    if (data.success) {
      if (current) current.textContent = '当前: ' + (data.current || '自定义');
      if (!data.versions.length) { if (list) list.innerHTML = '<div class="empty-row">无版本快照</div>'; return; }
      var html = '';
      data.versions.forEach(function(v) {
        var isCurrent = data.current === v.name;
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.35rem 0.5rem;border-bottom:1px solid var(--rule);">' +
          '<span style="font-size:0.85rem;">' + v.displayName + '</span>' +
          '<span style="display:flex;gap:0.3rem;">' +
          '<button class="btn btn-sm ' + (isCurrent ? 'primary' : '') + '" onclick="applyGachaVersion(\'' + v.name + '\')" ' + (isCurrent ? 'disabled' : '') + '>' + (isCurrent ? '当前' : '切换') + '</button>' +
          '</span></div>';
      });
      if (list) list.innerHTML = html;
    }
  } catch (err) { if (list) list.innerHTML = '<div class="empty-row">加载失败</div>'; }
}

async function applyGachaVersion(version) {
  try {
    var res = await fetch(API_BASE + '/gacha/versions/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: version })
    });
    var data = await res.json();
    showToast(data.message, data.success ? 'success' : 'error');
    if (data.success) { loadGachaVersions(); loadGacha(); }
  } catch (err) { showToast('切换失败', 'error'); }
}

async function loadGacha() {
  loadGachaVersions();
  try {
    var res = await fetch(API_BASE + '/gacha');
    var data = await res.json();
    if (data.success) {
      gachaAllPools = data.pools || [];
      // Normalize: ensure rateUp items have both id and name
      gachaAllPools.forEach(function(p) {
        p.rateUpItems5 = (p.rateUpItems5 || []).map(function(i) { return typeof i === 'object' ? i : { id: i, name: i }; });
        p.rateUpItems4 = (p.rateUpItems4 || []).map(function(i) { return typeof i === 'object' ? i : { id: i, name: i }; });
      });
    }
  } catch (err) { showToast('加载卡池失败', 'error'); }
  renderGachaPoolTabs();
}

function getActivePool() {
  var pool = gachaAllPools.find(function(p) { return p.gachaType === gachaActivePoolType; });
  if (!pool) {
    var meta = GACHA_POOL_META[gachaActivePoolType] || {};
    pool = {
      gachaType: gachaActivePoolType, name: meta.name || '',
      rateUpItems5: [], rateUpItems4: [],
      weights5: [[1,80],[73,80],[90,10000]], weights4: [[1,510],[8,510],[10,10000]],
      costItemId: meta.costItem || 223, enabled: true, endTime: 1924992000,
      eventChance5: 50, eventChance4: 50
    };
    gachaAllPools.push(pool);
  }
  return pool;
}

function renderGachaPoolTabs() {
  var tabs = document.querySelectorAll('#gachaPoolTabs .tab');
  var typeKeys = [301, 400, 302, 200, 100];
  tabs.forEach(function(tab, i) {
    if (typeKeys[i]) {
      var pool = gachaAllPools.find(function(p) { return p.gachaType === typeKeys[i]; });
      var name = (pool ? pool.name : '') || (GACHA_POOL_META[typeKeys[i]] || {}).name || '';
      tab.innerHTML = name + (pool && !pool.enabled ? ' ⏸' : '');
    }
  });
  renderGachaEditor();
}

function switchGachaPool(poolKey) {
  var map = { 'limit-char': 301, 'limit-char2': 400, 'limit-weapon': 302, 'standard': 200, 'beginner': 100 };
  gachaActivePoolType = map[poolKey] || 301;
  document.querySelectorAll('#gachaPoolTabs .tab').forEach(function(t) { t.classList.remove('active'); });
  var el = document.querySelector('#gachaPoolTabs .tab[onclick*="' + poolKey + '"]');
  if (el) el.classList.add('active');
  renderGachaEditor();
}

// ===== Editor Render =====
function renderGachaEditor() {
  var pool = getActivePool();
  var meta = GACHA_POOL_META[pool.gachaType] || {};
  var container = document.getElementById('gachaEditorContent');
  if (!container) return;
  var items5 = pool.rateUpItems5 || [];
  var items4 = pool.rateUpItems4 || [];
  var ec5 = pool.eventChance5 != null ? pool.eventChance5 : 50;
  var ec4 = pool.eventChance4 != null ? pool.eventChance4 : 50;
  var name = String(pool.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  var hardPity = (pool.weights5 && pool.weights5.length) ? pool.weights5[pool.weights5.length - 1][0] : 90;
  var gachaLimit = pool.gachaTimesLimit || 0;

  var h = '';
  // Left column
  h += '<div class="grid-2"><div>';
  h += '<div class="form-group"><label class="form-label">卡池名称 / 备注 (comment)</label>';
  h += '<input type="text" class="form-input" id="gachaBannerName" value="' + name + '" onchange="updatePoolField(\'name\',this.value)"></div>';

  // UP5
  if (meta.maxUP5 > 0) {
    h += '<div class="form-group"><label class="form-label">UP 5星 <span style="color:var(--muted);font-size:0.75rem;">(最多' + meta.maxUP5 + '个)</span></label>';
    h += '<div style="display:flex;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.3rem;">';
    items5.forEach(function(item, i) {
      h += '<span class="badge badge-yellow" style="cursor:pointer;" onclick="removePoolItem(5,' + i + ')" title="点击移除">★5 ' + (item.name || item.id) + ' ✕</span>';
    });
    h += '</div>';
    if (items5.length < meta.maxUP5) h += '<button class="btn btn-sm" onclick="openGachaItemPicker(5)">+ 添加5星UP</button>';
    h += '</div>';
  }

  // UP4
  if (meta.maxUP4 > 0) {
    h += '<div class="form-group"><label class="form-label">UP 4星 <span style="color:var(--muted);font-size:0.75rem;">(最多' + meta.maxUP4 + '个)</span></label>';
    h += '<div style="display:flex;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.3rem;">';
    items4.forEach(function(item, i) {
      h += '<span class="badge badge-purple" style="cursor:pointer;" onclick="removePoolItem(4,' + i + ')" title="点击移除">★4 ' + (item.name || item.id) + ' ✕</span>';
    });
    h += '</div>';
    if (items4.length < meta.maxUP4) h += '<button class="btn btn-sm" onclick="openGachaItemPicker(4)">+ 添加4星UP</button>';
    h += '</div>';
  }

  // Event chance
  if (meta.maxUP5 > 0 || meta.maxUP4 > 0) {
    h += '<div class="form-group"><label class="form-label">UP权重 (eventChance: 50=均等, 75=大保底)</label>';
    h += '<div style="display:flex;gap:0.5rem;">';
    if (meta.maxUP5 > 0) h += '<div style="flex:1;"><input type="number" class="form-input" value="' + ec5 + '" min="0" max="100" onchange="updatePoolField(\'eventChance5\',parseInt(this.value)||50)"><span style="font-size:0.7rem;color:var(--muted);">5星UP权重%</span></div>';
    if (meta.maxUP4 > 0) h += '<div style="flex:1;"><input type="number" class="form-input" value="' + ec4 + '" min="0" max="100" onchange="updatePoolField(\'eventChance4\',parseInt(this.value)||50)"><span style="font-size:0.7rem;color:var(--muted);">4星UP权重%</span></div>';
    h += '</div></div>';
  }

  // Cost item + limit
  h += '<div style="display:flex;gap:0.5rem;">';
  h += '<div class="form-group" style="flex:1;"><label class="form-label">消耗道具</label>';
  h += '<select class="form-input" onchange="updatePoolField(\'costItemId\',parseInt(this.value))">';
  h += '<option value="223"' + (pool.costItemId === 223 ? ' selected' : '') + '>纠缠之缘 (223)</option>';
  h += '<option value="224"' + (pool.costItemId === 224 ? ' selected' : '') + '>相遇之缘 (224)</option>';
  h += '</select></div>';
  if (pool.gachaType === 100) {
    h += '<div class="form-group" style="flex:1;"><label class="form-label">抽取次数限制 (0=无限)</label>';
    h += '<input type="number" class="form-input" value="' + gachaLimit + '" min="0" max="99" onchange="updatePoolField(\'gachaTimesLimit\',parseInt(this.value)||0)"></div>';
  }
  h += '</div>';

  // Enable toggle
  h += '<label style="display:flex;align-items:center;gap:0.3rem;margin-top:0.5rem;font-size:0.8rem;cursor:pointer;">';
  h += '<input type="checkbox"' + (pool.enabled !== false ? ' checked' : '') + ' onchange="updatePoolField(\'enabled\',this.checked)"> 启用该卡池</label>';

  // Right column — preview
  h += '</div><div>';
  h += '<div class="form-group"><label class="form-label">卡池预览</label>';
  h += '<div style="background:linear-gradient(135deg, var(--bg2), var(--accent-light));border:1px solid var(--rule);border-radius:8px;padding:1.2rem;text-align:center;min-height:200px;">';
  h += '<div style="font-size:2.5rem;">' + (meta.icon || '🌟') + '</div>';
  h += '<div style="font-weight:700;margin:0.3rem 0;font-size:1.1rem;">' + name + '</div>';
  if (items5.length > 0) {
    h += '<div style="margin:0.5rem 0;">' + items5.map(function(i) { return '<span class="badge badge-yellow" style="font-size:0.8rem;">★5 ' + (i.name || i.id) + '</span>'; }).join(' ') + '</div>';
  } else if (meta.maxUP5 > 0) {
    h += '<p style="font-size:0.75rem;color:var(--muted);">无UP 5星（全常驻五星随机）</p>';
  }
  if (items4.length > 0) {
    h += '<div style="margin:0.3rem 0;">' + items4.map(function(i) { return '<span class="badge badge-purple" style="font-size:0.75rem;">★4 ' + (i.name || i.id) + '</span>'; }).join(' ') + '</div>';
  } else if (meta.maxUP4 > 0) {
    h += '<p style="font-size:0.7rem;color:var(--muted);">无UP 4星</p>';
  }
  h += '<div style="margin-top:0.8rem;font-size:0.7rem;color:var(--muted);border-top:1px solid var(--rule);padding-top:0.5rem;">';
  h += '消耗: <strong>' + (pool.costItemId === 223 ? '纠缠之缘' : '相遇之缘') + '</strong> | 保底: <strong>' + hardPity + '抽</strong>';
  if (gachaLimit > 0) h += ' | 限' + gachaLimit + '抽';
  h += '</div></div></div>';
  h += '<div style="display:flex;gap:0.5rem;margin-top:0.8rem;">';
  h += '<button class="btn btn-sm" onclick="resetPoolToDefault()" style="flex:1;">🔄 重置此池</button>';
  h += '</div></div></div>';
  container.innerHTML = h;
}

function updatePoolField(field, value) {
  var pool = getActivePool();
  pool[field] = value;
}

function removePoolItem(rarity, index) {
  var pool = getActivePool();
  var key = rarity === 5 ? 'rateUpItems5' : 'rateUpItems4';
  pool[key].splice(index, 1);
  renderGachaEditor();
}

function resetPoolToDefault() {
  if (!confirm('重置为默认配置？这会清空所有UP物品。')) return;
  var pool = getActivePool();
  pool.rateUpItems5 = [];
  pool.rateUpItems4 = [];
  pool.eventChance5 = 50;
  pool.eventChance4 = 50;
  pool.enabled = true;
  pool.gachaTimesLimit = 0;
  renderGachaEditor();
}

// ===== Item Picker =====
function openGachaItemPicker(rarity) {
  gachaPickerCallback = { rarity: rarity };
  gachaPickerSelected = [];
  document.getElementById('gachaItemModalTitle').textContent = '选择UP ★' + rarity + ' 角色/武器';
  document.getElementById('gachaSelectedCount').textContent = '已选: 0';
  document.getElementById('gachaSelectedPreview').innerHTML = '';
  document.getElementById('gachaItemSearch').value = '';
  document.getElementById('gachaItemRarityFilter').value = String(rarity);
  showModal('gachaItemModal');
  loadGachaItemPickerItems();
}

async function loadGachaItemPickerItems() {
  var list = document.getElementById('gachaItemPickerList');
  list.innerHTML = '<div class="loading-msg">加载中...</div>';
  try {
    var q = document.getElementById('gachaItemSearch') ? document.getElementById('gachaItemSearch').value : '';
    var rarity = document.getElementById('gachaItemRarityFilter') ? document.getElementById('gachaItemRarityFilter').value : '';
    var url = API_BASE + '/gacha/items/search?q=' + encodeURIComponent(q) + (rarity ? '&rarity=' + rarity : '');
    var res = await fetch(url);
    var data = await res.json();
    window._gachaAllItems = data.items || [];
    renderGachaItemPickerList(window._gachaAllItems);
  } catch (err) { list.innerHTML = '<div class="empty-row">加载失败: ' + err.message + '</div>'; }
}

function filterGachaItems() { loadGachaItemPickerItems(); }

function renderGachaItemPickerList(items) {
  var list = document.getElementById('gachaItemPickerList');
  if (!items.length) { list.innerHTML = '<div class="empty-row">未找到匹配物�?. 尝试不同搜索词</div>'; return; }
  list.innerHTML = items.map(function(item) {
    var sel = gachaPickerSelected.some(function(s) { return s.id === item.id; });
    var stars = '';
    for (var i = 0; i < (item.rarity || 4); i++) stars += '★';
    var color = item.rarity === 5 ? 'badge-yellow' : 'badge-purple';
    var escName = item.name.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
    return '<div class="browse-item' + (sel ? ' selected' : '') + '" onclick="toggleGachaPickerItem(' + item.id + ',\'' + escName + '\',' + item.rarity + ')" style="cursor:pointer;">' +
      '<span style="min-width:50px;display:inline-block;"><code>' + item.id + '</code></span>' +
      '<span class="badge ' + color + '" style="font-size:0.7rem;">' + stars + '</span> ' +
      '<strong>' + item.name + '</strong></div>';
  }).join('');
}

function toggleGachaPickerItem(id, name, rarity) {
  var idx = gachaPickerSelected.findIndex(function(s) { return s.id === id; });
  if (idx >= 0) { gachaPickerSelected.splice(idx, 1); }
  else {
    var max = gachaPickerCallback.rarity === 5 ? 2 : 3;
    if (gachaPickerSelected.length >= max) { showToast('最多选' + max + '个', 'error'); return; }
    gachaPickerSelected.push({ id: id, name: name, rarity: rarity });
  }
  document.getElementById('gachaSelectedCount').textContent = '已选: ' + gachaPickerSelected.length;
  document.getElementById('gachaSelectedPreview').innerHTML = gachaPickerSelected.map(function(s) {
    return '<span class="badge badge-blue">★' + s.rarity + ' ' + s.name + '</span>';
  }).join('');
  renderGachaItemPickerList(window._gachaAllItems || []);
}

function confirmGachaItems() {
  if (!gachaPickerSelected.length) { showToast('请先选择物品', 'error'); return; }
  var pool = getActivePool();
  var key = gachaPickerCallback.rarity === 5 ? 'rateUpItems5' : 'rateUpItems4';
  gachaPickerSelected.forEach(function(s) {
    if (!pool[key].find(function(e) { return e.id === s.id; })) {
      pool[key].push({ id: s.id, name: s.name });
    }
  });
  hideModal('gachaItemModal');
  renderGachaEditor();
}

// ===== Save =====
async function saveGachaConfig() {
  getActivePool();
  // Convert to save format: rateUpItems5/4 are plain int arrays
  var savePools = gachaAllPools.map(function(p) {
    var copy = JSON.parse(JSON.stringify(p));
    copy.rateUpItems5 = (copy.rateUpItems5 || []).map(function(i) { return typeof i === 'object' ? i.id : i; });
    copy.rateUpItems4 = (copy.rateUpItems4 || []).map(function(i) { return typeof i === 'object' ? i.id : i; });
    return copy;
  });

  try {
    var res = await fetch(API_BASE + '/gacha', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pools: savePools })
    });
    var data = await res.json();
    showToast(data.message || '已保存', data.success ? 'success' : 'error');
    if (data.success) { showToast('卡池已保存，游戏内重启祈愿页面即可看到更新', 'success'); }
  } catch (err) { showToast('保存失败: ' + err.message, 'error'); }
}

// ===== Pull Simulation =====
function simulatePulls() {
  var pool = getActivePool();
  var count = parseInt(document.getElementById('simPullCount') ? document.getElementById('simPullCount').value : 100) || 100;
  var resultDiv = document.getElementById('simResult');
  if (!resultDiv) return;
  resultDiv.innerHTML = '<div class="loading-msg">模拟中...</div>';

  // Read pity weights from pool
  var weights5 = pool.weights5 || [[1, 80], [73, 80], [90, 10000]];
  var weights4 = pool.weights4 || [[1, 510], [8, 510], [10, 10000]];
  var eventChance5 = (pool.eventChance5 != null ? pool.eventChance5 : 50) / 100;
  var eventChance4 = (pool.eventChance4 != null ? pool.eventChance4 : 50) / 100;
  var items5 = pool.rateUpItems5 || [];
  var items4 = pool.rateUpItems4 || [];

  // Build weight lookup
  function getWeight(pity, weightTable) {
    for (var i = weightTable.length - 1; i >= 0; i--) {
      if (pity >= weightTable[i][0]) return weightTable[i][1];
    }
    return weightTable[0][1];
  }

  var pity5 = 0, pity4 = 0, guarantee5 = false;
  var count5 = 0, count4 = 0, count3 = 0;
  var countUp5 = 0, countUp4 = 0;
  var results = [];

  for (var i = 0; i < count; i++) {
    pity5++; pity4++;
    var w5 = getWeight(pity5, weights5);
    var roll = Math.random() * 10000;

    if (roll < w5) {
      count5++; pity5 = 0;
      var isUp = Math.random() < eventChance5;
      if (isUp && items5.length > 0) { countUp5++; results.push({ r: 5, up: true, pull: i + 1 }); }
      else { results.push({ r: 5, up: false, pull: i + 1 }); }
    } else if (roll < w5 + getWeight(pity4, weights4)) {
      count4++; pity4 = 0;
      var isUp4 = Math.random() < eventChance4;
      if (isUp4 && items4.length > 0) { countUp4++; results.push({ r: 4, up: true, pull: i + 1 }); }
      else { results.push({ r: 4, up: false, pull: i + 1 }); }
    } else {
      count3++; results.push({ r: 3, pull: i + 1 });
    }
  }

  // Stats
  var avgPity5 = count5 > 0 ? (count / count5).toFixed(1) : 'N/A';
  var pity5Pulls = results.filter(function(r) { return r.r === 5; }).map(function(r) { return r.pull; });
  var maxGap = '-';
  if (pity5Pulls.length > 1) {
    var gaps = [];
    for (var j = 1; j < pity5Pulls.length; j++) gaps.push(pity5Pulls[j] - pity5Pulls[j - 1]);
    maxGap = Math.max.apply(null, gaps);
  }

  resultDiv.innerHTML =
    '<div style="font-weight:700;margin-bottom:0.5rem;">模拟 ' + count + ' 抽结果</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.3rem;font-size:0.8rem;">' +
    '<div>⭐ 5星: <strong>' + count5 + '</strong> (' + (count5 / count * 100).toFixed(1) + '%)</div>' +
    '<div style="padding-left:1em;">UP 5星: <strong style="color:var(--accent2);">' + countUp5 + '</strong></div>' +
    '<div>⭐ 4星: <strong>' + count4 + '</strong> (' + (count4 / count * 100).toFixed(1) + '%)</div>' +
    '<div style="padding-left:1em;">UP 4星: <strong style="color:var(--accent);">' + countUp4 + '</strong></div>' +
    '<div>⭐ 3星: ' + count3 + ' (' + (count3 / count * 100).toFixed(1) + '%)</div>' +
    '<div>均5星抽数: <strong>' + avgPity5 + '</strong></div>' +
    '<div>最�?5星间隔: <strong>' + maxGap + '抽</strong></div>' +
    '</div>';

  // Draw chart
  var canvas = document.getElementById('simChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  var maxBars = Math.min(count, 100);
  var barW = Math.max(1, Math.floor(w / maxBars));
  var displayResults = results.slice(0, maxBars);
  displayResults.forEach(function(r, i) {
    var x = i * barW;
    var barH = r.r === 5 ? h * 0.9 : r.r === 4 ? h * 0.55 : h * 0.2;
    var y = h - barH;
    var color = r.r === 5 ? (r.up ? '#f59e0b' : '#d97706') : r.r === 4 ? (r.up ? '#8b5cf6' : '#a78bfa') : '#94a3b8';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW - 1, barH);
  });
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#f59e0b'; ctx.fillText('● UP5', 5, 12);
  ctx.fillStyle = '#d97706'; ctx.fillText('● 常5', 50, 12);
  ctx.fillStyle = '#8b5cf6'; ctx.fillText('● 4星', 90, 12);
  ctx.fillStyle = '#94a3b8'; ctx.fillText('● 3星', 125, 12);
}
