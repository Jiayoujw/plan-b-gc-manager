const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const GC_DIR = path.join(process.env.USERPROFILE, 'AppData', 'Roaming', 'cultivation', 'grasscutter');
const SCRIPTS_DIR = path.join(GC_DIR, 'scripts');
const LUA_DIR = path.join(SCRIPTS_DIR, 'lua');

// 确保 scripts 目录存在
function ensureDirs() {
  [SCRIPTS_DIR, LUA_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

// 扫描所有 Lua 脚本
function scanScripts(baseDir = SCRIPTS_DIR, relativePath = '') {
  const results = [];
  const dir = path.join(baseDir, relativePath);
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...scanScripts(baseDir, relPath));
    } else if (entry.name.endsWith('.lua')) {
      const stat = fs.statSync(fullPath);
      // 检查是否被禁用 (.disabled 后缀)
      const disabled = entry.name.endsWith('.lua.disabled');
      const displayName = disabled ? entry.name.replace('.disabled', '') : entry.name;
      results.push({
        name: displayName,
        path: fullPath,
        relativePath: relPath,
        size: stat.size,
        modified: stat.mtime.toISOString(),
        disabled,
        category: relativePath.split('/')[0] || 'root'
      });
    }
  }
  return results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

// 获取脚本分组统计
function getCategoryStats(scripts) {
  const stats = {};
  scripts.forEach(s => {
    stats[s.category] = (stats[s.category] || 0) + 1;
  });
  return stats;
}

// 列出所有脚本
router.get('/', (req, res) => {
  try {
    ensureDirs();
    const scripts = scanScripts();
    const categories = getCategoryStats(scripts);
    res.json({
      success: true,
      scripts,
      categories,
      total: scripts.length,
      enabled: scripts.filter(s => !s.disabled).length,
      disabled: scripts.filter(s => s.disabled).length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 查看脚本内容
router.get('/:name(*)', (req, res) => {
  try {
    const scriptPath = path.join(SCRIPTS_DIR, req.params.name);
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ success: false, message: '脚本不存在' });
    }
    const content = fs.readFileSync(scriptPath, 'utf-8');
    res.json({ success: true, name: req.params.name, content });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建/更新脚本
router.put('/:name(*)', (req, res) => {
  try {
    ensureDirs();
    const scriptPath = path.join(SCRIPTS_DIR, req.params.name);
    const dir = path.dirname(scriptPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const { content } = req.body;
    if (!content && content !== '') {
      return res.status(400).json({ success: false, message: '缺少脚本内容' });
    }

    fs.writeFileSync(scriptPath, content, 'utf-8');
    res.json({ success: true, message: '脚本已保存', path: req.params.name });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 上传脚本（multipart/file content）
router.post('/upload', (req, res) => {
  try {
    ensureDirs();
    const { name, content, category } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, message: '缺少脚本名称或内容' });
    }

    const fileName = name.endsWith('.lua') ? name : `${name}.lua`;
    const targetDir = category ? path.join(SCRIPTS_DIR, category) : SCRIPTS_DIR;
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const scriptPath = path.join(targetDir, fileName);
    fs.writeFileSync(scriptPath, content, 'utf-8');
    res.json({ success: true, message: '脚本已上传', path: scriptPath });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 删除脚本
router.delete('/:name(*)', (req, res) => {
  try {
    const scriptPath = path.join(SCRIPTS_DIR, req.params.name);
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ success: false, message: '脚本不存在' });
    }
    fs.unlinkSync(scriptPath);
    res.json({ success: true, message: '脚本已删除' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 切换脚本启用/禁用
router.post('/:name(*)/toggle', (req, res) => {
  try {
    const scriptPath = path.join(SCRIPTS_DIR, req.params.name);
    const disabledPath = scriptPath + '.disabled';

    if (fs.existsSync(scriptPath)) {
      fs.renameSync(scriptPath, disabledPath);
      return res.json({ success: true, message: '脚本已禁用', enabled: false });
    } else if (fs.existsSync(disabledPath)) {
      fs.renameSync(disabledPath, scriptPath);
      return res.json({ success: true, message: '脚本已启用', enabled: true });
    }
    return res.status(404).json({ success: false, message: '脚本不存在' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 触发热重载
router.post('/reload', (req, res) => {
  try {
    // 向 Grasscutter 发送重载命令
    const gcService = require('../services/grasscutter');
    const result = gcService.sendCommand('reload');
    res.json({
      success: true,
      message: '已发送脚本重载指令',
      note: '脚本将在玩家下次进入场景时生效'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 批量导入示例脚本（初始化剧情系统）
router.post('/init-samples', (req, res) => {
  try {
    ensureDirs();
    const samples = {
      'main/quest_30001.lua': `-- 主线任务：序章 - 异乡人
-- Quest ID: 30001
-- 触发条件：进入蒙德城

function OnQuestStart(player)
    player:SendMessage("欢迎来到提瓦特大陆！")
    player:AddQuestStep("前往蒙德城")
    player:AddQuestStep("与凯亚对话")
    player:AddQuestStep("完成骑士团测试")
end

function OnQuestStepComplete(player, stepId)
    if stepId == 1 then
        player:SendMessage("目标：前往骑士团总部")
    elseif stepId == 2 then
        player:GiveItem(201, 100)  -- 奖励原石
        player:GiveItem(223, 5000) -- 奖励摩拉
        player:CompleteQuest(30001)
    end
end

function OnQuestComplete(player)
    player:SendMessage("序章完成！获得原石 x100")
    player:AddExp(100)
end
`,
      'main/quest_30002.lua': `-- 主线任务：风与自由之城
-- Quest ID: 30002
-- 前置任务：30001

function OnQuestStart(player)
    player:SendMessage("风魔龙正在袭击蒙德城！")
    player:AddQuestStep("调查风魔龙的踪迹")
    player:AddQuestStep("击败风魔龙")
    player:AddQuestStep("返回蒙德城")
end

function OnQuestStepComplete(player, stepId)
    if stepId == 1 then
        player:SendMessage("目标已锁定：风龙废墟")
        player:TeleportTo(1000, 200, 150, 300) -- 传送到风龙废墟
    elseif stepId == 2 then
        player:SendMessage("风魔龙被击败！")
        player:GiveItem(201, 200)
        player:GiveItem(223, 10000)
        player:UnlockTalent("Amber_Ultimate")
    elseif stepId == 3 then
        player:CompleteQuest(30002)
    end
end
`,
      'world/quest_40001.lua': `-- 世界任务：蒙德城的宝藏猎人
-- Quest ID: 40001
-- 触发条件：与蒙德城宝藏猎人对�?

function OnQuestStart(player)
    player:SendMessage("宝藏猎人给了你一张神秘的藏宝图...")
    player:AddQuestStep("前往风起地")
    player:AddQuestStep("挖掘宝藏")
    player:AddQuestStep("击退宝藏守护者")
end

function OnQuestStepComplete(player, stepId)
    if stepId == 2 then
        local items = {
            {id = 201, count = 50},   -- 原石
            {id = 223, count = 3000}, -- 摩拉
            {id = 104, count = 2},    -- 浓缩树脂
            {id = 313, count = 5},    -- 大英雄的经验
        }
        for _, item in ipairs(items) do
            player:GiveItem(item.id, item.count)
        end
        player:SendMessage("发现了一个宝箱！获得丰厚奖励")
    elseif stepId == 3 then
        player:CompleteQuest(40001)
    end
end
`,
      'story/quest_50001.lua': `-- 传说任务：安柏 - 火红的青春
-- Quest ID: 50001
-- 所需角色：安柏 (100001)

function OnQuestStart(player)
    if not player:HasCharacter(100001) then
        player:AddCharacter(100001) -- 赠送安柏
        player:SendMessage("获得了新角色：安柏！")
    end
    player:SendMessage("安柏邀请你参加骑士团的侦察训练")
    player:AddQuestStep("与安柏对话")
    player:AddQuestStep("完成射箭训练")
    player:AddQuestStep("击败训练目标")
end

function OnQuestStepComplete(player, stepId)
    if stepId == 1 then
        player:SendMessage("安柏：准备好了吗？跟随我去训练场！")
    elseif stepId == 2 then
        player:SendMessage("安柏：射得漂亮！")
    elseif stepId == 3 then
        player:GiveItem(201, 60)
        player:GiveItem(100001, 1) -- 安柏命座材料
        player:CompleteQuest(50001)
    end
end
`,
      'event/quest_60001.lua': `-- 限时活动：海灯节签到
-- Quest ID: 60001

function OnQuestStart(player)
    player:SendMessage("海灯节快乐！每日登录领取奖励")
    player:AddQuestStep("第1天签到")
end

function OnDailySignIn(player, day)
    local rewards = {
        {day = 1, items = {{201, 100}, {223, 5000}}},
        {day = 2, items = {{201, 50}, {104, 3}}},
        {day = 3, items = {{201, 50}, {101, 5}}},
        {day = 4, items = {{201, 100}, {223, 10000}}},
        {day = 5, items = {{201, 50}, {102, 5}}},
        {day = 6, items = {{201, 50}, {104, 5}}},
        {day = 7, items = {{201, 200}, {101, 10}, {100001, 1}}},
    }

    for _, r in ipairs(rewards) do
        if r.day == day then
            for _, item in ipairs(r.items) do
                player:GiveItem(item[1], item[2])
            end
            player:SendMessage("海灯节第" .. day .. "天签到奖励已发放！")
        end
    end

    if day >= 7 then
        player:CompleteQuest(60001)
    end
end
`
    };

    let created = 0;
    for (const [relPath, content] of Object.entries(samples)) {
      const fullPath = path.join(SCRIPTS_DIR, relPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        created++;
      }
    }

    res.json({
      success: true,
      message: `已创建 ${created} 个示例脚本`,
      created
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== 文件监听：自动热重载 =====
let watcher = null;

function startFileWatcher() {
  if (watcher) return;
  try {
    const fs = require('fs');
    if (!fs.existsSync(SCRIPTS_DIR)) return;

    watcher = fs.watch(SCRIPTS_DIR, { recursive: true }, (eventType, filename) => {
      if (!filename || !filename.endsWith('.lua')) return;
      const gcService = require('../services/grasscutter');
      console.log(`[QuestWatch] ${eventType}: ${filename} — 触发热重载`);
      gcService.sendCommand('reload');
    });

    watcher.on('error', (err) => {
      console.error('[QuestWatch] 文件监听错误:', err.message);
    });

    console.log('[QuestWatch] Lua 脚本文件监听已启动:', SCRIPTS_DIR);
  } catch (err) {
    console.error('[QuestWatch] 启动失败:', err.message);
  }
}

function stopFileWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('[QuestWatch] 文件监听已停止');
  }
}

// 导出供 server.js 调用
router.startWatcher = startFileWatcher;
router.stopWatcher = stopFileWatcher;

module.exports = router;
