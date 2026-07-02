const express = require('express');
const router = express.Router();
const gachaService = require('../services/gachaService');
const auditService = require('../services/audit');

// 获取所有卡池（编辑器视图）
router.get('/', (req, res) => {
  try {
    const banners = gachaService.loadBanners();
    const pools = banners.map(b => gachaService.toEditorView(b)).filter(Boolean);
    res.json({
      success: true,
      pools,
      total: pools.length,
      enabled: pools.filter(p => p.enabled).length,
      bannerTypes: Object.entries(gachaService.BANNER_TYPES).map(([k, v]) => ({
        gachaType: parseInt(k), name: v.name, key: v.key
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 获取单个卡池（编辑器视图）
router.get('/:gachaType', (req, res) => {
  try {
    const banners = gachaService.loadBanners();
    const banner = gachaService.findBanner(banners, parseInt(req.params.gachaType));
    if (!banner) return res.status(404).json({ success: false, message: '卡池不存在' });
    res.json({ success: true, pool: gachaService.toEditorView(banner) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 保存全部卡池
router.post('/', (req, res) => {
  try {
    const { pools } = req.body;
    if (!pools || !Array.isArray(pools)) {
      return res.status(400).json({ success: false, message: '数据格式错误' });
    }

    const banners = gachaService.loadBanners();

    pools.forEach(pool => {
      const gachaType = pool.gachaType;
      let banner = gachaService.findBanner(banners, gachaType);
      if (!banner) {
        banner = gachaService.createBanner(gachaType);
        banners.push(banner);
      }
      gachaService.updateBannerFromView(banner, pool);
    });

    gachaService.saveBanners(banners);
    res.json({ success: true, message: `已保存 ${pools.length} 个卡池`, count: pools.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新单个卡池
router.put('/:gachaType', (req, res) => {
  try {
    const gachaType = parseInt(req.params.gachaType);
    const banners = gachaService.loadBanners();
    let banner = gachaService.findBanner(banners, gachaType);
    if (!banner) {
      banner = gachaService.createBanner(gachaType);
      banners.push(banner);
    }
    gachaService.updateBannerFromView(banner, req.body);
    gachaService.saveBanners(banners);
    res.json({ success: true, message: '卡池已保存' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 添加 UP 物品到卡池
router.post('/:gachaType/items', (req, res) => {
  try {
    const gachaType = parseInt(req.params.gachaType);
    const { itemId, rarity } = req.body;
    const banners = gachaService.loadBanners();
    let banner = gachaService.findBanner(banners, gachaType);
    if (!banner) {
      banner = gachaService.createBanner(gachaType);
      banners.push(banner);
    }

    if (rarity === 5) {
      if (!banner.rateUpItems5) banner.rateUpItems5 = [];
      if (banner.rateUpItems5.length >= 2) return res.json({ success: false, message: '5星UP最多2个' });
      if (!banner.rateUpItems5.includes(itemId)) banner.rateUpItems5.push(itemId);
    } else {
      if (!banner.rateUpItems4) banner.rateUpItems4 = [];
      if (banner.rateUpItems4.length >= 3) return res.json({ success: false, message: '4星UP最多3个' });
      if (!banner.rateUpItems4.includes(itemId)) banner.rateUpItems4.push(itemId);
    }

    gachaService.saveBanners(banners);
    res.json({ success: true, message: '已添加' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 从卡池移除 UP 物品
router.delete('/:gachaType/items/:itemId', (req, res) => {
  try {
    const gachaType = parseInt(req.params.gachaType);
    const itemId = parseInt(req.params.itemId);
    const banners = gachaService.loadBanners();
    const banner = gachaService.findBanner(banners, gachaType);
    if (!banner) return res.status(404).json({ success: false, message: '卡池不存在' });

    banner.rateUpItems5 = (banner.rateUpItems5 || []).filter(id => id !== itemId);
    banner.rateUpItems4 = (banner.rateUpItems4 || []).filter(id => id !== itemId);

    gachaService.saveBanners(banners);
    res.json({ success: true, message: '已移除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除卡池（设为过期）
router.delete('/:gachaType', (req, res) => {
  try {
    const gachaType = parseInt(req.params.gachaType);
    const banners = gachaService.loadBanners();
    const banner = gachaService.findBanner(banners, gachaType);
    if (!banner) return res.status(404).json({ success: false, message: '卡池不存在' });

    // 设置为过期而不是真正删除
    banner.endTime = Math.floor(Date.now() / 1000) - 86400;
    gachaService.saveBanners(banners);
    res.json({ success: true, message: '卡池已禁用' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 搜索可用物品（用于卡池编辑器的物品选择器）
router.get('/items/search', (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase();
    const rarity = parseInt(req.query.rarity) || 0;

    // 从 gacha mappings 中搜索
    let results = [];
    const names = gachaService.NAMES;
    for (const [id, name] of Object.entries(names)) {
      const numId = parseInt(id);
      // 判断稀有度（简化：1000-1099 多为5星角色, 1100+ 多为4星, 11000+ 武器）
      let estRarity = 4;
      if (numId >= 1001 && numId <= 1099) estRarity = name.includes('yellow') || [1002,1003,1016,1022,1026,1029,1030,1033,1035,1037,1038,1041,1042,1046,1047,1049].includes(numId) ? 5 : 4;
      if (numId >= 11000 && numId <= 16000) estRarity = numId % 100 < 10 ? 5 : 4;

      if (rarity && estRarity !== rarity) continue;
      if (q && !name.toLowerCase().includes(q) && !id.includes(q)) continue;

      results.push({ id: numId, name, rarity: estRarity, type: numId < 10000 ? 'character' : 'weapon' });
    }
    results = results.slice(0, 100);
    res.json({ success: true, items: results, total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
