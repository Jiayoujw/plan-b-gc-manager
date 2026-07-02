// 卡池服务 - 处理 Grasscutter Banners.json 格式
const fs = require('fs');
const path = require('path');

const GC_DIR = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'cultivation', 'grasscutter');
const BANNERS_PATH = path.join(GC_DIR, 'data', 'Banners.json');
const MAPPINGS_PATH = path.join(GC_DIR, 'data', 'gacha', 'mappings.js');

// 解析 mappings 获取中英文名�?
function loadMappings() {
  try {
    const content = fs.readFileSync(MAPPINGS_PATH, 'utf-8');
    // 提取 en-us 映射
    const enMatch = content.match(/"en-us"\s*:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    const mapping = {};
    if (enMatch) {
      const lines = enMatch[1].split('\n');
      for (const line of lines) {
        const m = line.match(/"(\d+)"\s*:\s*\["([^"]+)"/);
        if (m) {
          mapping[m[1]] = m[2].replace(/\s*\([^)]*\)/, '');
        }
      }
    }
    return mapping;
  } catch (e) { return {}; }
}

const NAMES = loadMappings();
function getName(id) { return NAMES[String(id)] || `物品#${id}`; }

// Banner 类型定义
const BANNER_TYPES = {
  301: { name: '限定角色祈愿', key: 'limit-char', costItem: 223 },
  400: { name: '限定角色祈愿II', key: 'limit-char2', costItem: 223 },
  302: { name: '限定武器祈愿', key: 'limit-weapon', costItem: 223 },
  200: { name: '常驻祈愿', key: 'standard', costItem: 224 },
  100: { name: '新手祈愿', key: 'beginner', costItem: 224 },
};

function getPoolName(gt) { return BANNER_TYPES[gt]?.name || `卡池 ${gt}`; }

// 默认 fallback 池
const DEFAULT_FALLBACK_3 = [11301,11302,11306,12301,12302,12305,13303,14301,14302,14304,15301,15302,15304];
const DEFAULT_FALLBACK_4P1 = [1014,1020,1023,1024,1025,1027,1031,1032,1034,1036,1039,1043,1044,1045,1048,1053,1055,1056,1064];
const DEFAULT_FALLBACK_4P2 = [11401,11402,11403,11405,12401,12402,12403,12405,13401,13407,14401,14402,14403,14409,15401,15402,15403,15405];
const DEFAULT_FALLBACK_5P1 = [1003,1016,1042,1035,1041];
const DEFAULT_FALLBACK_5P2 = [11501,11502,12501,12502,13502,13505,14501,14502,15501,15502];

// ===== 加载/保存 =====
function loadBanners() {
  try {
    if (fs.existsSync(BANNERS_PATH)) {
      return JSON.parse(fs.readFileSync(BANNERS_PATH, 'utf-8'));
    }
  } catch (e) { console.error('[Gacha] Load error:', e.message); }
  return [];
}

function saveBanners(banners) {
  const dir = path.dirname(BANNERS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // 备份
  if (fs.existsSync(BANNERS_PATH)) {
    fs.copyFileSync(BANNERS_PATH, BANNERS_PATH + '.backup.' + Date.now());
  }
  fs.writeFileSync(BANNERS_PATH, JSON.stringify(banners, null, 2), 'utf-8');
}

// ===== Banner 操作 =====
function createBanner(gachaType, overrides = {}) {
  const typeInfo = BANNER_TYPES[gachaType] || {};
  const scheduleId = Date.now() % 100000;
  const base = {
    gachaType,
    scheduleId,
    prefabPath: gachaType === 200 ? 'GachaShowPanel_A022' : `GachaShowPanel_A${200 + Math.floor(Math.random()*10)}`,
    titlePath: `UI_GACHA_SHOW_PANEL_A${String(scheduleId).padStart(4,'0')}_TITLE`,
    costItemId: typeInfo.costItem || 223,
    endTime: 1924992000,
    sortId: gachaType === 100 ? 9999 : scheduleId,
    rateUpItems4: [],
    rateUpItems5: [],
    fallbackItems3: [...DEFAULT_FALLBACK_3],
    fallbackItems4Pool1: [...DEFAULT_FALLBACK_4P1],
    fallbackItems4Pool2: [...DEFAULT_FALLBACK_4P2],
    fallbackItems5Pool1: [...DEFAULT_FALLBACK_5P1],
    fallbackItems5Pool2: gachaType === 200 ? [...DEFAULT_FALLBACK_5P2] : [],
    weights4: [[1,510],[8,510],[10,10000]],
    weights5: [[1,80],[73,80],[90,10000]],
    poolBalanceWeights4: [[1,255],[17,255],[21,10455]],
    poolBalanceWeights5: [[1,30],[147,150],[181,10230]],
    bannerType: gachaType === 302 ? 'WEAPON' : 'EVENT',
  };
  Object.assign(base, overrides);
  return base;
}

function findBanner(banners, gachaType) {
  return banners.find(b => b.gachaType === gachaType);
}

// ===== 构建编辑器友好的视图 =====
function toEditorView(banner) {
  if (!banner) return null;
  return {
    gachaType: banner.gachaType,
    name: banner.comment || getPoolName(banner.gachaType),
    scheduleId: banner.scheduleId,
    costItemId: banner.costItemId,
    costItemName: banner.costItemId === 223 ? '纠缠之缘' : '相遇之缘',
    enabled: (banner.endTime || 0) > Math.floor(Date.now() / 1000),
    endTime: banner.endTime,
    sortId: banner.sortId,
    gachaTimesLimit: banner.gachaTimesLimit || 0,

    // UP items (display as named objects)
    rateUpItems5: (banner.rateUpItems5 || []).map(id => ({ id, name: getName(id) })),
    rateUpItems4: (banner.rateUpItems4 || []).map(id => ({ id, name: getName(id) })),

    // Fallback pools (display as named objects)
    fallbackItems3: (banner.fallbackItems3 || []),
    fallbackItems4Pool1: (banner.fallbackItems4Pool1 || []),
    fallbackItems4Pool2: (banner.fallbackItems4Pool2 || []),
    fallbackItems5Pool1: (banner.fallbackItems5Pool1 || []),
    fallbackItems5Pool2: (banner.fallbackItems5Pool2 || []),

    // Weights (display as human-readable)
    weights4: banner.weights4 || [[1,510],[8,510],[10,10000]],
    weights5: banner.weights5 || [[1,80],[73,80],[90,10000]],
    eventChance4: banner.eventChance4,
    eventChance5: banner.eventChance5,
    bannerType: banner.bannerType || 'EVENT',

    // Raw for save
    _raw: banner,
  };
}

// ===== 从编辑器视图更新 banner =====
function updateBannerFromView(banner, view) {
  banner.comment = view.name;
  banner.rateUpItems5 = (view.rateUpItems5 || []).map(i => typeof i === 'object' ? i.id : i);
  banner.rateUpItems4 = (view.rateUpItems4 || []).map(i => typeof i === 'object' ? i.id : i);
  if (view.enabled !== undefined) {
    banner.endTime = view.enabled ? 1924992000 : Math.floor(Date.now() / 1000) - 86400;
  }
  if (view.eventChance4 !== undefined) banner.eventChance4 = view.eventChance4;
  if (view.eventChance5 !== undefined) banner.eventChance5 = view.eventChance5;
  if (view.weights4) banner.weights4 = view.weights4;
  if (view.weights5) banner.weights5 = view.weights5;
  if (view.costItemId) banner.costItemId = view.costItemId;
  return banner;
}

module.exports = {
  loadBanners, saveBanners, createBanner, findBanner,
  toEditorView, updateBannerFromView,
  BANNER_TYPES, getPoolName, getName, NAMES,
  DEFAULT_FALLBACK_3, DEFAULT_FALLBACK_4P1, DEFAULT_FALLBACK_4P2,
  DEFAULT_FALLBACK_5P1, DEFAULT_FALLBACK_5P2,
};
