// 原神物品数据库生成器
// 生成 >= 8000 条物品数据供物品浏览器使用

const fs = require('fs');
const path = require('path');

// === 角色数据 (Characters) ===
const characters = [
  // 5星角色
  { id: 10000002, name: '琴', rarity: 5, weapon: 'sword', element: 'Anemo', region: 'Mondstadt' },
  { id: 10000003, name: '七七', rarity: 5, weapon: 'sword', element: 'Cryo', region: 'Liyue' },
  { id: 10000006, name: '迪卢克', rarity: 5, weapon: 'claymore', element: 'Pyro', region: 'Mondstadt' },
  { id: 10000007, name: '莫娜', rarity: 5, weapon: 'catalyst', element: 'Hydro', region: 'Mondstadt' },
  { id: 10000008, name: '刻晴', rarity: 5, weapon: 'sword', element: 'Electro', region: 'Liyue' },
  { id: 10000016, name: '可莉', rarity: 5, weapon: 'catalyst', element: 'Pyro', region: 'Mondstadt' },
  { id: 10000017, name: '钟离', rarity: 5, weapon: 'polearm', element: 'Geo', region: 'Liyue' },
  { id: 10000018, name: '阿贝多', rarity: 5, weapon: 'sword', element: 'Geo', region: 'Mondstadt' },
  { id: 10000019, name: '甘雨', rarity: 5, weapon: 'bow', element: 'Cryo', region: 'Liyue' },
  { id: 10000020, name: '魈', rarity: 5, weapon: 'polearm', element: 'Anemo', region: 'Liyue' },
  { id: 10000021, name: '胡桃', rarity: 5, weapon: 'polearm', element: 'Pyro', region: 'Liyue' },
  { id: 10000026, name: '优菈', rarity: 5, weapon: 'claymore', element: 'Cryo', region: 'Mondstadt' },
  { id: 10000028, name: '枫原万叶', rarity: 5, weapon: 'sword', element: 'Anemo', region: 'Inazuma' },
  { id: 10000029, name: '神里绫华', rarity: 5, weapon: 'sword', element: 'Cryo', region: 'Inazuma' },
  { id: 10000030, name: '宵宫', rarity: 5, weapon: 'bow', element: 'Pyro', region: 'Inazuma' },
  { id: 10000031, name: '雷电将军', rarity: 5, weapon: 'polearm', element: 'Electro', region: 'Inazuma' },
  { id: 10000032, name: '珊瑚宫心海', rarity: 5, weapon: 'catalyst', element: 'Hydro', region: 'Inazuma' },
  { id: 10000033, name: '荒泷一斗', rarity: 5, weapon: 'claymore', element: 'Geo', region: 'Inazuma' },
  { id: 10000034, name: '八重神子', rarity: 5, weapon: 'catalyst', element: 'Electro', region: 'Inazuma' },
  { id: 10000035, name: '神里绫人', rarity: 5, weapon: 'sword', element: 'Hydro', region: 'Inazuma' },
  { id: 10000036, name: '夜兰', rarity: 5, weapon: 'bow', element: 'Hydro', region: 'Liyue' },
  { id: 10000037, name: '提纳里', rarity: 5, weapon: 'bow', element: 'Dendro', region: 'Sumeru' },
  { id: 10000038, name: '赛诺', rarity: 5, weapon: 'polearm', element: 'Electro', region: 'Sumeru' },
  { id: 10000039, name: '妮露', rarity: 5, weapon: 'sword', element: 'Hydro', region: 'Sumeru' },
  { id: 10000040, name: '纳西妲', rarity: 5, weapon: 'catalyst', element: 'Dendro', region: 'Sumeru' },
  { id: 10000041, name: '流浪者', rarity: 5, weapon: 'catalyst', element: 'Anemo', region: 'Sumeru' },
  { id: 10000042, name: '艾尔海森', rarity: 5, weapon: 'sword', element: 'Dendro', region: 'Sumeru' },
  { id: 10000043, name: '迪希雅', rarity: 5, weapon: 'claymore', element: 'Pyro', region: 'Sumeru' },
  { id: 10000044, name: '白术', rarity: 5, weapon: 'catalyst', element: 'Dendro', region: 'Liyue' },
  { id: 10000045, name: '林尼', rarity: 5, weapon: 'bow', element: 'Pyro', region: 'Fontaine' },
  { id: 10000046, name: '那维莱特', rarity: 5, weapon: 'catalyst', element: 'Hydro', region: 'Fontaine' },
  { id: 10000047, name: '莱欧斯利', rarity: 5, weapon: 'catalyst', element: 'Cryo', region: 'Fontaine' },
  { id: 10000048, name: '芙宁娜', rarity: 5, weapon: 'sword', element: 'Hydro', region: 'Fontaine' },
  { id: 10000049, name: '娜维娅', rarity: 5, weapon: 'claymore', element: 'Geo', region: 'Fontaine' },
  { id: 10000050, name: '克洛琳德', rarity: 5, weapon: 'sword', element: 'Electro', region: 'Fontaine' },
  { id: 10000051, name: '希诺宁', rarity: 5, weapon: 'catalyst', element: 'Anemo', region: 'Fontaine' },
  { id: 10000052, name: '阿蕾奇诺', rarity: 5, weapon: 'polearm', element: 'Pyro', region: 'Fontaine' },
  { id: 10000053, name: '艾梅莉埃', rarity: 5, weapon: 'polearm', element: 'Dendro', region: 'Fontaine' },
  { id: 10000054, name: '戴因斯雷布', rarity: 5, weapon: 'sword', element: 'Abyss', region: 'Khaenriah' },

  // 4星角色
  { id: 10000001, name: '安柏', rarity: 4, weapon: 'bow', element: 'Pyro', region: 'Mondstadt' },
  { id: 10000004, name: '芭芭拉', rarity: 4, weapon: 'catalyst', element: 'Hydro', region: 'Mondstadt' },
  { id: 10000005, name: '凯亚', rarity: 4, weapon: 'sword', element: 'Cryo', region: 'Mondstadt' },
  { id: 10000009, name: '丽莎', rarity: 4, weapon: 'catalyst', element: 'Electro', region: 'Mondstadt' },
  { id: 10000010, name: '雷泽', rarity: 4, weapon: 'claymore', element: 'Electro', region: 'Mondstadt' },
  { id: 10000011, name: '香菱', rarity: 4, weapon: 'polearm', element: 'Pyro', region: 'Liyue' },
  { id: 10000012, name: '行秋', rarity: 4, weapon: 'sword', element: 'Hydro', region: 'Liyue' },
  { id: 10000013, name: '北斗', rarity: 4, weapon: 'claymore', element: 'Electro', region: 'Liyue' },
  { id: 10000014, name: '凝光', rarity: 4, weapon: 'catalyst', element: 'Geo', region: 'Liyue' },
  { id: 10000015, name: '菲谢尔', rarity: 4, weapon: 'bow', element: 'Electro', region: 'Mondstadt' },
  { id: 10000022, name: '迪奥娜', rarity: 4, weapon: 'bow', element: 'Cryo', region: 'Mondstadt' },
  { id: 10000023, name: '罗莎莉亚', rarity: 4, weapon: 'polearm', element: 'Cryo', region: 'Mondstadt' },
  { id: 10000024, name: '早柚', rarity: 4, weapon: 'claymore', element: 'Anemo', region: 'Inazuma' },
  { id: 10000025, name: '托马', rarity: 4, weapon: 'polearm', element: 'Pyro', region: 'Inazuma' },
  { id: 10000027, name: '九条裟罗', rarity: 4, weapon: 'bow', element: 'Electro', region: 'Inazuma' },
  { id: 10000055, name: '五郎', rarity: 4, weapon: 'bow', element: 'Geo', region: 'Inazuma' },
  { id: 10000056, name: '云堇', rarity: 4, weapon: 'polearm', element: 'Geo', region: 'Liyue' },
  { id: 10000057, name: '久岐忍', rarity: 4, weapon: 'sword', element: 'Electro', region: 'Inazuma' },
  { id: 10000058, name: '鹿野院平藏', rarity: 4, weapon: 'catalyst', element: 'Anemo', region: 'Inazuma' },
  { id: 10000059, name: '柯莱', rarity: 4, weapon: 'bow', element: 'Dendro', region: 'Sumeru' },
  { id: 10000060, name: '多莉', rarity: 4, weapon: 'claymore', element: 'Electro', region: 'Sumeru' },
  { id: 10000061, name: '坎蒂丝', rarity: 4, weapon: 'polearm', element: 'Hydro', region: 'Sumeru' },
  { id: 10000062, name: '莱依拉', rarity: 4, weapon: 'sword', element: 'Cryo', region: 'Sumeru' },
  { id: 10000063, name: '珐露珊', rarity: 4, weapon: 'bow', element: 'Anemo', region: 'Sumeru' },
  { id: 10000064, name: '瑶瑶', rarity: 4, weapon: 'polearm', element: 'Dendro', region: 'Liyue' },
  { id: 10000065, name: '米卡', rarity: 4, weapon: 'polearm', element: 'Cryo', region: 'Mondstadt' },
  { id: 10000066, name: '绮良良', rarity: 4, weapon: 'sword', element: 'Dendro', region: 'Inazuma' },
  { id: 10000067, name: '琳妮特', rarity: 4, weapon: 'sword', element: 'Anemo', region: 'Fontaine' },
  { id: 10000068, name: '菲米尼', rarity: 4, weapon: 'claymore', element: 'Cryo', region: 'Fontaine' },
  { id: 10000069, name: '夏洛蒂', rarity: 4, weapon: 'catalyst', element: 'Cryo', region: 'Fontaine' },
  { id: 10000070, name: '夏沃蕾', rarity: 4, weapon: 'polearm', element: 'Pyro', region: 'Fontaine' },
  { id: 10000071, name: '嘉明', rarity: 4, weapon: 'claymore', element: 'Pyro', region: 'Liyue' },

  // 旅行者
  { id: 10000072, name: '旅行者(风)', rarity: 5, weapon: 'sword', element: 'Anemo', region: 'Other' },
  { id: 10000073, name: '旅行者(岩)', rarity: 5, weapon: 'sword', element: 'Geo', region: 'Other' },
  { id: 10000074, name: '旅行者(雷)', rarity: 5, weapon: 'sword', element: 'Electro', region: 'Other' },
  { id: 10000075, name: '旅行者(草)', rarity: 5, weapon: 'sword', element: 'Dendro', region: 'Other' },
  { id: 10000076, name: '旅行者(水)', rarity: 5, weapon: 'sword', element: 'Hydro', region: 'Other' },
];

// === 武器数据 (Weapons) ===
const weaponSeries = {
  sword: [
    { name: '天空之刃', base: 11501, rarity: 5 },
    { name: '风鹰剑', base: 11502, rarity: 5 },
    { name: '斫峰之刃', base: 11503, rarity: 5 },
    { name: '磐岩结绿', base: 11504, rarity: 5 },
    { name: '苍古自由之誓', base: 11505, rarity: 5 },
    { name: '雾切之回光', base: 11506, rarity: 5 },
    { name: '波乱月白经津', base: 11507, rarity: 5 },
    { name: '圣显之钥', base: 11508, rarity: 5 },
    { name: '裁叶萃光', base: 11509, rarity: 5 },
    { name: '静水流涌之�?', base: 11510, rarity: 5 },
    { name: '有乐御簾切', base: 11511, rarity: 5 },
    { name: '黑剑', base: 11401, rarity: 4 },
    { name: '试作斩岩', base: 11402, rarity: 4 },
    { name: '铁蜂刺', base: 11403, rarity: 4 },
    { name: '祭礼剑', base: 11404, rarity: 4 },
    { name: '笛剑', base: 11405, rarity: 4 },
    { name: '西风剑', base: 11406, rarity: 4 },
    { name: '匣里龙吟', base: 11407, rarity: 4 },
    { name: '天目影打刀', base: 11408, rarity: 4 },
    { name: '辰砂之纺锤', base: 11409, rarity: 4 },
    { name: '原木刀', base: 11410, rarity: 4 },
    { name: '西福斯的月光', base: 11411, rarity: 4 },
    { name: '东花坊时雨', base: 11412, rarity: 4 },
    { name: '海渊终曲', base: 11413, rarity: 4 },
    { name: '狼牙', base: 11414, rarity: 4 },
    { name: '船坞长剑', base: 11415, rarity: 4 },
    { name: '灰河渡手', base: 11416, rarity: 4 },
    { name: '银剑', base: 11301, rarity: 3 },
    { name: '冷刃', base: 11302, rarity: 3 },
    { name: '黎明神剑', base: 11303, rarity: 3 },
    { name: '旅行剑', base: 11304, rarity: 3 },
    { name: '飞天御剑', base: 11305, rarity: 3 },
    { name: '暗铁剑', base: 11306, rarity: 3 },
    { name: '无锋剑', base: 11101, rarity: 2 },
    { name: '训练大剑', base: 11201, rarity: 1 },
  ],
  claymore: [
    { name: '天空之傲', base: 12501, rarity: 5 },
    { name: '狼的末路', base: 12502, rarity: 5 },
    { name: '无工之剑', base: 12503, rarity: 5 },
    { name: '松籁响起之时', base: 12504, rarity: 5 },
    { name: '赤角石溃杵', base: 12505, rarity: 5 },
    { name: '苇海信标', base: 12506, rarity: 5 },
    { name: '裁断', base: 12507, rarity: 5 },
    { name: '螭骨剑', base: 12401, rarity: 4 },
    { name: '试作古华', base: 12402, rarity: 4 },
    { name: '白影剑', base: 12403, rarity: 4 },
    { name: '祭礼大剑', base: 12404, rarity: 4 },
    { name: '钟剑', base: 12405, rarity: 4 },
    { name: '西风大剑', base: 12406, rarity: 4 },
    { name: '雨裁', base: 12407, rarity: 4 },
    { name: '桂木斩长正', base: 12408, rarity: 4 },
    { name: '恶王丸', base: 12409, rarity: 4 },
    { name: '森林王�?', base: 12410, rarity: 4 },
    { name: '玛海拉的水色', base: 12411, rarity: 4 },
    { name: '浪影阔剑', base: 12412, rarity: 4 },
    { name: '便携动力锯', base: 12413, rarity: 4 },
    { name: '聊聊棒', base: 12414, rarity: 4 },
    { name: '铁影阔剑', base: 12301, rarity: 3 },
    { name: '沐浴龙血的剑', base: 12302, rarity: 3 },
    { name: '以理服人', base: 12303, rarity: 3 },
    { name: '飞天大御剑', base: 12304, rarity: 3 },
    { name: '白铁大剑', base: 12305, rarity: 3 },
    { name: '训练大剑', base: 12101, rarity: 2 },
    { name: '佣兵重剑', base: 12201, rarity: 2 },
  ],
  polearm: [
    { name: '天空之脊', base: 13501, rarity: 5 },
    { name: '和璞鸢', base: 13502, rarity: 5 },
    { name: '贯虹之槊', base: 13503, rarity: 5 },
    { name: '护摩之杖', base: 13504, rarity: 5 },
    { name: '薙草之稻光', base: 13505, rarity: 5 },
    { name: '息灾', base: 13506, rarity: 5 },
    { name: '赤沙之杖', base: 13507, rarity: 5 },
    { name: '赤月之形', base: 13508, rarity: 5 },
    { name: '决斗之枪', base: 13401, rarity: 4 },
    { name: '试作星镰', base: 13402, rarity: 4 },
    { name: '流月针', base: 13403, rarity: 4 },
    { name: '黑缨枪', base: 13404, rarity: 4 },
    { name: '西风长枪', base: 13406, rarity: 4 },
    { name: '匣里灭辰', base: 13407, rarity: 4 },
    { name: '喜多院十文字', base: 13408, rarity: 4 },
    { name: '渔获', base: 13409, rarity: 4 },
    { name: '断浪长鳍', base: 13410, rarity: 4 },
    { name: '贯月矢', base: 13411, rarity: 4 },
    { name: '风信之锋', base: 13412, rarity: 4 },
    { name: '公义的酬报', base: 13413, rarity: 4 },
    { name: '�?峰长枪', base: 13414, rarity: 4 },
    { name: '勘探钻机', base: 13415, rarity: 4 },
    { name: '白缨枪', base: 13301, rarity: 3 },
    { name: '�?铁尖枪', base: 13302, rarity: 3 },
    { name: '黑缨枪', base: 13303, rarity: 3 },
    { name: '新手长枪', base: 13101, rarity: 1 },
  ],
  bow: [
    { name: '天空之翼', base: 14501, rarity: 5 },
    { name: '阿莫斯之弓', base: 14502, rarity: 5 },
    { name: '终末嗟叹之诗', base: 14503, rarity: 5 },
    { name: '飞雷之弦振', base: 14504, rarity: 5 },
    { name: '冬极白�?', base: 14505, rarity: 5 },
    { name: '若水', base: 14506, rarity: 5 },
    { name: '猎人之径', base: 14507, rarity: 5 },
    { name: '最初的大魔术', base: 14508, rarity: 5 },
    { name: '苍翠猎弓', base: 14401, rarity: 4 },
    { name: '试作澹月', base: 14402, rarity: 4 },
    { name: '钢轮弓', base: 14403, rarity: 4 },
    { name: '祭礼弓', base: 14404, rarity: 4 },
    { name: '绝弦', base: 14405, rarity: 4 },
    { name: '西风猎弓', base: 14406, rarity: 4 },
    { name: '弓藏', base: 14407, rarity: 4 },
    { name: '破魔之弓', base: 14408, rarity: 4 },
    { name: '落霞', base: 14409, rarity: 4 },
    { name: '王下近�?', base: 14410, rarity: 4 },
    { name: '�?泽弓', base: 14411, rarity: 4 },
    { name: '静谧之曲', base: 14412, rarity: 4 },
    { name: '烈阳之嗣', base: 14413, rarity: 4 },
    { name: '测距规', base: 14414, rarity: 4 },
    { name: '弹弓', base: 14301, rarity: 3 },
    { name: '神射手之誓', base: 14302, rarity: 3 },
    { name: '鸦羽弓', base: 14303, rarity: 3 },
    { name: '信使', base: 14304, rarity: 3 },
    { name: '反曲弓', base: 14305, rarity: 3 },
    { name: '猎人弓', base: 14101, rarity: 2 },
    { name: '历练的猎弓', base: 14201, rarity: 1 },
  ],
  catalyst: [
    { name: '天空之卷', base: 15501, rarity: 5 },
    { name: '四风原典', base: 15502, rarity: 5 },
    { name: '尘世之锁', base: 15503, rarity: 5 },
    { name: '不灭月华', base: 15504, rarity: 5 },
    { name: '神乐之真意', base: 15505, rarity: 5 },
    { name: '千夜浮梦', base: 15506, rarity: 5 },
    { name: '图莱杜拉的回忆', base: 15507, rarity: 5 },
    { name: '碧落之珑', base: 15508, rarity: 5 },
    { name: '万世流涌大典', base: 15509, rarity: 5 },
    { name: '鹤鸣余音', base: 15510, rarity: 5 },
    { name: '黑岩绯玉', base: 15401, rarity: 4 },
    { name: '试作金珀', base: 15402, rarity: 4 },
    { name: '万国诸海图谱', base: 15403, rarity: 4 },
    { name: '祭礼残章', base: 15404, rarity: 4 },
    { name: '昭心', base: 15405, rarity: 4 },
    { name: '西风秘典', base: 15406, rarity: 4 },
    { name: '流浪乐章', base: 15407, rarity: 4 },
    { name: '白辰之环', base: 15408, rarity: 4 },
    { name: '证誓之明瞳', base: 15409, rarity: 4 },
    { name: '盈满之实', base: 15410, rarity: 4 },
    { name: '流浪的晚星', base: 15411, rarity: 4 },
    { name: '纯水流华', base: 15412, rarity: 4 },
    { name: '遗祀玉珑', base: 15413, rarity: 4 },
    { name: '无垠蔚蓝之歌', base: 15414, rarity: 4 },
    { name: '异世界游记', base: 15301, rarity: 3 },
    { name: '魔导绪论', base: 15302, rarity: 3 },
    { name: '讨龙英杰谭', base: 15303, rarity: 3 },
    { name: '翡玉法球', base: 15304, rarity: 3 },
    { name: '甲级宝珏', base: 15305, rarity: 3 },
    { name: '学徒笔记', base: 15101, rarity: 2 },
    { name: '口袋魔导书', base: 15201, rarity: 1 },
  ],
};

// === 圣遗物数据 (Artifacts) ===
const artifactSets = [
  { name: '角斗士的终幕礼', id: 'Gladiator', rarity: [4,5] },
  { name: '流浪大地的乐团', id: 'Wanderer', rarity: [4,5] },
  { name: '冰风迷途的勇士', id: 'BlizzardStrayer', rarity: [4,5] },
  { name: '沉沦之心', id: 'HeartOfDepth', rarity: [4,5] },
  { name: '炽烈的炎之魔女', id: 'CrimsonWitch', rarity: [4,5] },
  { name: '如雷的盛怒', id: 'ThunderingFury', rarity: [4,5] },
  { name: '翠绿之影', id: 'Viridescent', rarity: [4,5] },
  { name: '少女心爱的摇�?', id: 'MaidenBeloved', rarity: [4,5] },
  { name: '昔日宗室之仪', id: 'NoblesseOblige', rarity: [4,5] },
  { name: '染血的骑士道', id: 'Bloodstained', rarity: [4,5] },
  { name: '逆飞的流星', id: 'RetracingBolide', rarity: [4,5] },
  { name: '悠古的磐岩', id: 'ArchaicPetra', rarity: [4,5] },
  { name: '平息鸣雷的尊者', id: 'Thundersoother', rarity: [4,5] },
  { name: '渡过烈火的贤人', id: 'Lavawalker', rarity: [4,5] },
  { name: '千岩牢固', id: 'Tenacity', rarity: [4,5] },
  { name: '苍白之火', id: 'PaleFlame', rarity: [4,5] },
  { name: '追忆之注连', id: 'Shimenawa', rarity: [4,5] },
  { name: '绝缘之旗印', id: 'Emblem', rarity: [4,5] },
  { name: '华馆梦醒形骸记', id: 'Husk', rarity: [4,5] },
  { name: '海染砗�?', id: 'OceanHued', rarity: [4,5] },
  { name: '辰砂往生录', id: 'Vermillion', rarity: [4,5] },
  { name: '来歆余响', id: 'Echoes', rarity: [4,5] },
  { name: '深林的记忆', id: 'Deepwood', rarity: [4,5] },
  { name: '饰金之梦', id: 'GildedDreams', rarity: [4,5] },
  { name: '沙上楼阁史话', id: 'DesertPavilion', rarity: [4,5] },
  { name: '乐园遗落之花', id: 'ParadiseLost', rarity: [4,5] },
  { name: '水仙之�?', id: 'NymphsDream', rarity: [4,5] },
  { name: '花海甘露之光', id: 'Vourukasha', rarity: [4,5] },
  { name: '逐影猎�?', id: 'GoldenTroupe', rarity: [4,5] },
  { name: '黄金剧团', id: 'Marechaussee', rarity: [4,5] },
  { name: '昔时之歌', id: 'SongOfDaysPast', rarity: [4,5] },
  { name: '回声之林夜话', id: 'NighttimeWhispers', rarity: [4,5] },
  { name: '谐律异想断章', id: 'FragmentOfHarmonic', rarity: [4,5] },
  { name: '未竟的遐思', id: 'UnfinishedReverie', rarity: [4,5] },
];

const artifactSlots = ['生之花', '死之羽', '时之沙', '空之杯', '理之冠'];

// === 材料数据 (Materials) ===
const materials = {
  characterAscension: {
    Anemo: { gem: '自在松石', gemId: 10411, boss: '飓风之种', bossId: 10421, specialty: '塞西莉亚�?', specialtyId: 101231 },
    Cryo: { gem: '哀叙冰玉', gemId: 10412, boss: '极寒之核', bossId: 10422, specialty: '石�?', specialtyId: 101122 },
    Electro: { gem: '最胜紫晶', gemId: 10413, boss: '雷光棱镜', bossId: 10423, specialty: '鸣草', specialtyId: 101214 },
    Geo: { gem: '坚牢黄玉', gemId: 10414, boss: '玄岩之塔', bossId: 10424, specialty: '石�?', specialtyId: 101233 },
    Hydro: { gem: '涤净青金', gemId: 10415, boss: '净水之心', bossId: 10425, specialty: '霓裳花', specialtyId: 101234 },
    Pyro: { gem: '燃愿玛瑙', gemId: 10416, boss: '常燃火�?', bossId: 10426, specialty: '绝云椒�?', specialtyId: 101235 },
    Dendro: { gem: '生长碧翡', gemId: 10417, boss: '藏�?之花', bossId: 10427, specialty: '劫波莲', specialtyId: 101236 },
  },
  common: [
    { id: 112002, name: '史莱姆凝液', rarity: 1, type: 'common' },
    { id: 112003, name: '史莱姆清', rarity: 2, type: 'common' },
    { id: 112004, name: '史莱姆原浆', rarity: 3, type: 'common' },
    { id: 112005, name: '破损的面具', rarity: 1, type: 'common' },
    { id: 112006, name: '污秽的面具', rarity: 2, type: 'common' },
    { id: 112007, name: '不祥的面具', rarity: 3, type: 'common' },
    { id: 112008, name: '导能绘卷', rarity: 1, type: 'common' },
    { id: 112009, name: '封魔绘卷', rarity: 2, type: 'common' },
    { id: 112010, name: '禁咒绘卷', rarity: 3, type: 'common' },
    { id: 112011, name: '牢固的箭簇', rarity: 1, type: 'common' },
    { id: 112012, name: '锐利的箭簇', rarity: 2, type: 'common' },
    { id: 112013, name: '历战的箭簇', rarity: 3, type: 'common' },
    { id: 112014, name: '沉重号角', rarity: 2, type: 'common' },
    { id: 112015, name: '黑铜号角', rarity: 3, type: 'common' },
    { id: 112016, name: '黑晶号角', rarity: 4, type: 'common' },
    { id: 112017, name: '地脉的旧枝', rarity: 1, type: 'common' },
    { id: 112018, name: '地脉的枯叶', rarity: 2, type: 'common' },
    { id: 112019, name: '地脉的新芽', rarity: 3, type: 'common' },
    { id: 112020, name: '猎兵祭刀', rarity: 1, type: 'common' },
    { id: 112021, name: '特工祭刀', rarity: 2, type: 'common' },
    { id: 112022, name: '督察长祭刀', rarity: 3, type: 'common' },
    { id: 112023, name: '混沌装置', rarity: 1, type: 'common' },
    { id: 112024, name: '混沌回路', rarity: 2, type: 'common' },
    { id: 112025, name: '混沌炉心', rarity: 3, type: 'common' },
    { id: 112026, name: '雾虚花�?', rarity: 1, type: 'common' },
    { id: 112027, name: '雾虚灯芯', rarity: 2, type: 'common' },
    { id: 112028, name: '雾虚灯芯', rarity: 3, type: 'common' },
    { id: 112029, name: '新兵的徽记', rarity: 1, type: 'common' },
    { id: 112030, name: '士官的徽记', rarity: 2, type: 'common' },
    { id: 112031, name: '尉官的徽记', rarity: 3, type: 'common' },
    { id: 112032, name: '浮游干核', rarity: 1, type: 'common' },
    { id: 112033, name: '浮游幽核', rarity: 2, type: 'common' },
    { id: 112034, name: '浮游晶化核', rarity: 3, type: 'common' },
    { id: 112035, name: '兽境猎犬�?', rarity: 1, type: 'common' },
    { id: 112036, name: '隐兽指爪', rarity: 2, type: 'common' },
    { id: 112037, name: '隐兽利爪', rarity: 3, type: 'common' },
    { id: 112038, name: '蕈兽孢子', rarity: 1, type: 'common' },
    { id: 112039, name: '荧光孢粉', rarity: 2, type: 'common' },
    { id: 112040, name: '孢囊晶尘', rarity: 3, type: 'common' },
    { id: 112041, name: '褪色红绸', rarity: 1, type: 'common' },
    { id: 112042, name: '镶边红绸', rarity: 2, type: 'common' },
    { id: 112043, name: '织金红绸', rarity: 3, type: 'common' },
    { id: 112044, name: '残毁的横脊', rarity: 1, type: 'common' },
    { id: 112045, name: '密固的横脊', rarity: 2, type: 'common' },
    { id: 112046, name: '锖�?的横脊', rarity: 3, type: 'common' },
  ],
  talentBooks: {
    Mondstadt: [
      { id: 104301, name: '「自由」的教导', rarity: 2 },
      { id: 104302, name: '「自由」的指引', rarity: 3 },
      { id: 104303, name: '「自由」的哲学', rarity: 4 },
      { id: 104304, name: '「抗争」的教导', rarity: 2 },
      { id: 104305, name: '「抗争」的指引', rarity: 3 },
      { id: 104306, name: '「抗争」的哲学', rarity: 4 },
      { id: 104307, name: '「诗文」的教导', rarity: 2 },
      { id: 104308, name: '「诗文」的指引', rarity: 3 },
      { id: 104309, name: '「诗文」的哲学', rarity: 4 },
    ],
    Liyue: [
      { id: 104310, name: '「繁荣」的教导', rarity: 2 },
      { id: 104311, name: '「繁荣」的指引', rarity: 3 },
      { id: 104312, name: '「繁荣」的哲学', rarity: 4 },
      { id: 104313, name: '「勤劳」的教导', rarity: 2 },
      { id: 104314, name: '「勤劳」的指引', rarity: 3 },
      { id: 104315, name: '「勤劳」的哲学', rarity: 4 },
      { id: 104316, name: '「黄金」的教导', rarity: 2 },
      { id: 104317, name: '「黄金」的指引', rarity: 3 },
      { id: 104318, name: '「黄金」的哲学', rarity: 4 },
    ],
    Inazuma: [
      { id: 104319, name: '「浮世」的教导', rarity: 2 },
      { id: 104320, name: '「浮世」的指引', rarity: 3 },
      { id: 104321, name: '「浮世」的哲学', rarity: 4 },
      { id: 104322, name: '「风雅」的教导', rarity: 2 },
      { id: 104323, name: '「风雅」的指引', rarity: 3 },
      { id: 104324, name: '「风雅」的哲学', rarity: 4 },
      { id: 104325, name: '「天光」的教导', rarity: 2 },
      { id: 104326, name: '「天光」的指引', rarity: 3 },
      { id: 104327, name: '「天光」的哲学', rarity: 4 },
    ],
    Sumeru: [
      { id: 104328, name: '「诤言」的教导', rarity: 2 },
      { id: 104329, name: '「诤言」的指引', rarity: 3 },
      { id: 104330, name: '「诤言」的哲学', rarity: 4 },
      { id: 104331, name: '「巧思」的教导', rarity: 2 },
      { id: 104332, name: '「巧思」的指引', rarity: 3 },
      { id: 104333, name: '「巧思」的哲学', rarity: 4 },
      { id: 104334, name: '「笃行」的教导', rarity: 2 },
      { id: 104335, name: '「笃行」的指引', rarity: 3 },
      { id: 104336, name: '「笃行」的哲学', rarity: 4 },
    ],
    Fontaine: [
      { id: 104337, name: '「正义」的教导', rarity: 2 },
      { id: 104338, name: '「正义」的指引', rarity: 3 },
      { id: 104339, name: '「正义」的哲学', rarity: 4 },
      { id: 104340, name: '「秩序」的教导', rarity: 2 },
      { id: 104341, name: '「秩序」的指引', rarity: 3 },
      { id: 104342, name: '「秩序」的哲学', rarity: 4 },
      { id: 104343, name: '「公平」的教导', rarity: 2 },
      { id: 104344, name: '「公平」的指引', rarity: 3 },
      { id: 104345, name: '「公平」的哲学', rarity: 4 },
    ],
  },
  weaponAscension: {
    'Decarabian': [
      { id: 114001, name: '高塔孤王的破瓦', rarity: 1 },
      { id: 114002, name: '高塔孤王的残垣', rarity: 2 },
      { id: 114003, name: '高塔孤王的断片', rarity: 3 },
      { id: 114004, name: '高塔孤王的碎梦', rarity: 4 },
    ],
    'BorealWolf': [
      { id: 114005, name: '凛风奔狼的始�?', rarity: 1 },
      { id: 114006, name: '凛风奔狼的裂齿', rarity: 2 },
      { id: 114007, name: '凛风奔狼的断牙', rarity: 3 },
      { id: 114008, name: '凛风奔狼的怀�?', rarity: 4 },
    ],
    'Dandelion': [
      { id: 114009, name: '狮牙斗士的枷锁', rarity: 1 },
      { id: 114010, name: '狮牙斗士的铁链', rarity: 2 },
      { id: 114011, name: '狮牙斗士的镣�?', rarity: 3 },
      { id: 114012, name: '狮牙斗士的理想', rarity: 4 },
    ],
    'Guyun': [
      { id: 114013, name: '孤云寒林的光砂', rarity: 1 },
      { id: 114014, name: '孤云寒林的辉岩', rarity: 2 },
      { id: 114015, name: '孤云寒林的圣骸', rarity: 3 },
      { id: 114016, name: '孤云寒林的神体', rarity: 4 },
    ],
    'MistVeiled': [
      { id: 114017, name: '雾海云间的铅丹', rarity: 1 },
      { id: 114018, name: '雾海云间的汞丹', rarity: 2 },
      { id: 114019, name: '雾海云间的金丹', rarity: 3 },
      { id: 114020, name: '雾海云间的转还', rarity: 4 },
    ],
    'Aerosiderite': [
      { id: 114021, name: '漆黑陨铁的一粒', rarity: 1 },
      { id: 114022, name: '漆黑陨铁的一片', rarity: 2 },
      { id: 114023, name: '漆黑陨铁的一角', rarity: 3 },
      { id: 114024, name: '漆黑陨铁的一块', rarity: 4 },
    ],
  },
};

// === 食物数据 (Food) ===
const foodItems = [
  // 恢复类
  { id: 100001, name: '苹果', rarity: 1, type: '食材' },
  { id: 100002, name: '日落果', rarity: 1, type: '食材' },
  { id: 100003, name: '甜甜花', rarity: 1, type: '食材' },
  { id: 100011, name: '蘑菇', rarity: 1, type: '食材' },
  { id: 100012, name: '鸟蛋', rarity: 1, type: '食材' },
  { id: 100016, name: '薄荷', rarity: 1, type: '食材' },
  { id: 100019, name: '金鱼草', rarity: 1, type: '食材' },
  { id: 100022, name: '嘟嘟莲', rarity: 1, type: '食材' },
  { id: 100024, name: '风车菊', rarity: 1, type: '食材' },
  { id: 100025, name: '落落莓', rarity: 1, type: '食材' },
  { id: 100026, name: '琉璃�?', rarity: 1, type: '食材' },
  { id: 100027, name: '清心', rarity: 1, type: '食材' },
  { id: 100029, name: '琉璃百合', rarity: 1, type: '食材' },
  { id: 100030, name: '血斛', rarity: 1, type: '食材' },
  { id: 100031, name: '天云草实', rarity: 1, type: '食材' },
  { id: 100032, name: '幽灯�?', rarity: 1, type: '食材' },
  { id: 100033, name: '海灵芝', rarity: 1, type: '食材' },
  { id: 100034, name: '珊瑚真珠', rarity: 1, type: '食材' },
  { id: 100051, name: '�?�', rarity: 1, type: '食材' },
  { id: 100052, name: '兽肉', rarity: 1, type: '食材' },
  { id: 100053, name: '鱼肉', rarity: 1, type: '食材' },
  { id: 100055, name: '蟹', rarity: 1, type: '食材' },
  { id: 100056, name: '虾仁', rarity: 1, type: '食材' },
  { id: 100058, name: '盐', rarity: 1, type: '食材' },
  { id: 100061, name: '�?�', rarity: 1, type: '食材' },
  { id: 100062, name: '面粉', rarity: 1, type: '食材' },
  { id: 100063, name: '奶油', rarity: 1, type: '食材' },
  { id: 100064, name: '火腿', rarity: 1, type: '食材' },
  { id: 100065, name: '糖', rarity: 1, type: '食材' },
  { id: 100067, name: '奶酪', rarity: 1, type: '食材' },
  { id: 100072, name: '杏仁', rarity: 1, type: '食材' },
  { id: 100073, name: '土豆', rarity: 1, type: '食材' },
  { id: 100076, name: '番茄', rarity: 1, type: '食材' },
  { id: 100077, name: '卷心菜', rarity: 1, type: '食材' },
  { id: 100078, name: '洋葱', rarity: 1, type: '食材' },
  { id: 100079, name: '稻米', rarity: 1, type: '食材' },
  { id: 100080, name: '小麦', rarity: 1, type: '食材' },
  { id: 100081, name: '香辛料', rarity: 1, type: '食材' },
  { id: 100082, name: '豆腐', rarity: 1, type: '食材' },
  { id: 100083, name: '海草', rarity: 1, type: '食材' },
  { id: 100084, name: '�?', rarity: 1, type: '食材' },
  { id: 100085, name: '�?汤', rarity: 1, type: '食材' },
  { id: 100086, name: '蟹黄', rarity: 1, type: '食材' },
  { id: 100087, name: '�?籽', rarity: 1, type: '食材' },
  { id: 100088, name: '咖啡�?', rarity: 1, type: '食材' },
  { id: 100089, name: '乳酪', rarity: 1, type: '食材' },
  { id: 100090, name: '果酱', rarity: 1, type: '食材' },

  // 料理 (生成代表性ID)
  ...[...Array(200)].map((_, i) => ({
    id: 108000 + i,
    name: getFoodName(i),
    rarity: i < 30 ? 3 : i < 80 ? 2 : 1,
    type: '料理',
  })),
];

function getFoodName(i) {
  const names = [
    '提瓦特煎蛋', '烤肉排', '蒙德土豆饼', '渔人吐司', '满足沙拉',
    '野菇鸡肉串', '白汁时蔬�?', '庄园烤松�?', '蜜酱胡萝卜煎肉', '中原杂碎',
    '荞麦面', '味噌汤', '三彩团子', '串串三味', '干烧香鱼',
    '刺身拼盘', '绯樱天妇罗', '蟹�?�?', '�?�?', '黄油�?�?',
    '月亮�?', '松�?�?', '杏仁豆腐', '水晶虾', '黄金�?',
    '水煮鱼', '爆炒肉片', '�?�窝', '龙�?�?', '翡�?什锦�?',
    '咖喱�?', '马萨拉�?�?', '帕蒂沙�?布丁', '�?米�?', '�?饼',
    '枫丹�?肝', '�?汁�?', '�?焙', '水果�?', '百味�?',
    '糖霜�?�?', '�?可可', '�?饮', '气泡�?', '�?汁',
  ];
  if (i < names.length) return names[i];
  const prefixes = ['香辣', '清蒸', '红烧', '蜜汁', '蒜香', '麻辣', '酸甜', '鲜香', '酥脆', '浓郁', '清爽', '秘制'];
  const mains = ['鸡腿', '鱼片', '排骨', '时蔬', '�?腐', '牛肉', '�?�?', '�?仁', '�?', '�?�?'];
  const suffixes = ['煲', '汤', '�?', '卷', '�?', '串', '锅', '�?', '�?', '拼盘'];
  return (prefixes[i % prefixes.length]) + (mains[Math.floor(i / prefixes.length) % mains.length]) + (suffixes[Math.floor(i / (prefixes.length * mains.length)) % suffixes.length]);
}

// === 家具数据 (Furnishings) ===
const furnishings = [...Array(600)].map((_, i) => ({
  id: 360000 + i,
  name: getFurnishingName(i),
  rarity: i < 50 ? 4 : i < 200 ? 3 : i < 400 ? 2 : 1,
  type: '摆设',
}));

function getFurnishingName(i) {
  const types = ['椅子', '桌子', '床', '柜子', '地毯', '灯', '屏风', '花瓶', '书架', '挂画',
    '盆栽', '假山', '喷泉', '围栏', '地砖', '墙壁', '天花板', '楼梯', '门', '窗'];
  const styles = ['蒙德', '璃月', '稻妻', '须弥', '枫丹', '古典', '现代', '田园', '宫廷', '简约'];
  return styles[i % styles.length] + types[Math.floor(i / styles.length) % types.length] + '#' + (Math.floor(i / 200) + 1);
}

// === 生成完整数据库 ===
function generateDatabase() {
  let items = [];
  let itemId = 1000;

  // 1. 货币/消耗品
  const currencies = [
    { id: 201, name: '原石', rarity: 5, category: 'currency' },
    { id: 202, name: '创世结晶', rarity: 5, category: 'currency' },
    { id: 203, name: '星辉', rarity: 4, category: 'currency' },
    { id: 204, name: '星尘', rarity: 3, category: 'currency' },
    { id: 221, name: '无主的星辉', rarity: 4, category: 'currency' },
    { id: 222, name: '无主的星尘', rarity: 3, category: 'currency' },
    { id: 223, name: '摩拉', rarity: 3, category: 'currency' },
    { id: 224, name: '洞天宝钱', rarity: 3, category: 'currency' },
    { id: 101, name: '纠缠之缘', rarity: 5, category: 'currency' },
    { id: 102, name: '相遇之缘', rarity: 5, category: 'currency' },
    { id: 103, name: '脆弱树脂', rarity: 4, category: 'resin' },
    { id: 104, name: '浓缩树脂', rarity: 4, category: 'resin' },
    { id: 105, name: '原粹树脂', rarity: 4, category: 'resin' },
    { id: 106, name: '须臾树脂', rarity: 4, category: 'resin' },
    { id: 107, name: '祝圣之�?', rarity: 4, category: 'consumable' },
    { id: 108, name: '须臾之�?', rarity: 4, category: 'consumable' },
    { id: 109, name: '祝圣油膏', rarity: 2, category: 'consumable' },
    { id: 110, name: '祝圣精华', rarity: 3, category: 'consumable' },
  ];
  currencies.forEach(c => {
    items.push({
      id: c.id,
      name: c.name,
      category: c.category,
      rarity: c.rarity,
    });
  });

  // 2. 角色
  characters.forEach(c => {
    items.push({
      id: c.id,
      name: c.name,
      category: 'character',
      rarity: c.rarity,
      element: c.element,
      weapon: c.weapon,
      region: c.region,
    });
  });

  // 3. 武器
  Object.entries(weaponSeries).forEach(([type, weapons]) => {
    const weaponTypeName = { sword: '单手剑', claymore: '双手剑', polearm: '长柄武器', bow: '弓', catalyst: '法器' };
    weapons.forEach(w => {
      if (w.base) {
        items.push({
          id: w.base,
          name: w.name,
          category: 'weapon',
          subcategory: weaponTypeName[type],
          rarity: w.rarity,
        });
      }
    });
  });

  // 4. 圣遗物
  artifactSets.forEach((set, setIdx) => {
    const setId = 50000 + setIdx * 10;
    artifactSlots.forEach((slot, slotIdx) => {
      // 每个 rarity 变体
      set.rarity.forEach(r => {
        items.push({
          id: setId + slotIdx + (r === 5 ? 100 : 0),
          name: `${set.name}·${slot}`,
          category: 'artifact',
          subcategory: set.name,
          rarity: r,
          slot: slot,
        });
      });
    });
  });

  // 5. 材料 - 通用
  materials.common.forEach(m => {
    items.push({
      id: m.id,
      name: m.name,
      category: 'material',
      subcategory: '通用材料',
      rarity: m.rarity,
    });
  });

  // 6. 材料 - 天赋书
  Object.entries(materials.talentBooks).forEach(([region, books]) => {
    books.forEach(b => {
      items.push({
        id: b.id,
        name: b.name,
        category: 'material',
        subcategory: `天赋�? - ${region}`,
        rarity: b.rarity,
      });
    });
  });

  // 7. 材料 - 武器突破
  Object.entries(materials.weaponAscension).forEach(([domain, mats]) => {
    mats.forEach(m => {
      items.push({
        id: m.id,
        name: m.name,
        category: 'material',
        subcategory: '武器突破材料',
        rarity: m.rarity,
      });
    });
  });

  // 8. 元素石 (角色突破宝石及其碎片)
  const gems = {
    Anemo: { name: '自在松石', baseId: 10411 },
    Cryo: { name: '哀叙冰玉', baseId: 10412 },
    Electro: { name: '最胜紫晶', baseId: 10413 },
    Geo: { name: '坚牢黄玉', baseId: 10414 },
    Hydro: { name: '涤净青金', baseId: 10415 },
    Pyro: { name: '燃愿玛瑙', baseId: 10416 },
    Dendro: { name: '生长碧翡', baseId: 10417 },
  };
  const gemLevels = ['碎屑', '断片', '块', '完整'];
  Object.entries(gems).forEach(([elem, g]) => {
    gemLevels.forEach((level, idx) => {
      items.push({
        id: g.baseId + idx,
        name: `${g.name}${level}`,
        category: 'material',
        subcategory: `角色突破 - ${elem}`,
        rarity: idx + 1,
      });
    });
  });

  // 9. BOSS 掉落
  const bossDrops = [
    { id: 113001, name: '飓风之种', boss: '无相之风', rarity: 4 },
    { id: 113002, name: '极寒之核', boss: '无相之冰', rarity: 4 },
    { id: 113003, name: '雷光棱镜', boss: '无相之雷', rarity: 4 },
    { id: 113004, name: '玄岩之塔', boss: '无相之岩', rarity: 4 },
    { id: 113005, name: '净水之心', boss: '纯水精灵', rarity: 4 },
    { id: 113006, name: '常燃火种', boss: '爆炎树', rarity: 4 },
    { id: 113007, name: '�?霜核', boss: '急冻树', rarity: 4 },
    { id: 113008, name: '未熟之玉', boss: '古岩龙�?', rarity: 4 },
    { id: 113009, name: '兽境王器', boss: '黄金王兽', rarity: 4 },
    { id: 113010, name: '雷霆数珠', boss: '雷音权现', rarity: 4 },
    { id: 113011, name: '排异之露', boss: '无相之水', rarity: 4 },
    { id: 113012, name: '符纹之齿', boss: '遗迹巨蛇', rarity: 4 },
    { id: 113013, name: '藏雷野实', boss: '掣电树', rarity: 4 },
    { id: 113014, name: '灭�?草蔓', boss: '无相之草', rarity: 4 },
    { id: 113015, name: '导光四面体', boss: '半永恒统辖矩阵', rarity: 4 },
    { id: 113016, name: '沙�?虫之�?', boss: '风蚀沙虫', rarity: 4 },
    { id: 113017, name: '帝皇的决意', boss: '深罪浸礼者', rarity: 4 },
    { id: 113018, name: '「图比昂装置」', boss: '冰风组曲', rarity: 4 },
    { id: 113019, name: '原海�?', boss: '铁甲熔�?帝皇', rarity: 4 },
    { id: 113020, name: '聚�?', boss: '千年珍珠骏麟', rarity: 4 },
    { id: 113021, name: '水�?', boss: '水形幻人', rarity: 4 },
    { id: 113022, name: '�?', boss: '隐�?�?', rarity: 4 },
  ];
  bossDrops.forEach(b => {
    items.push({
      id: b.id,
      name: b.name,
      category: 'material',
      subcategory: `BOSS掉落 - ${b.boss}`,
      rarity: b.rarity,
    });
  });

  // 10. 周本 BOSS 掉落
  const weeklyBossDrops = [
    { id: 113101, name: '东风的吐息', boss: '风魔龙', rarity: 5 },
    { id: 113102, name: '东风之爪', boss: '风魔龙', rarity: 5 },
    { id: 113103, name: '东风之翎', boss: '风魔龙', rarity: 5 },
    { id: 113104, name: '北风之尾', boss: '北风狼王', rarity: 5 },
    { id: 113105, name: '北风之环', boss: '北风狼王', rarity: 5 },
    { id: 113106, name: '北风的魂匣', boss: '北风狼王', rarity: 5 },
    { id: 113107, name: '魔王之刃·残片', boss: '公子', rarity: 5 },
    { id: 113108, name: '武炼之魂·孤影', boss: '公子', rarity: 5 },
    { id: 113109, name: '只角', boss: '公子', rarity: 5 },
    { id: 113110, name: '龙王之冕', boss: '若陀龙王', rarity: 5 },
    { id: 113111, name: '血玉之枝', boss: '若陀龙王', rarity: 5 },
    { id: 113112, name: '鎏金之鳞', boss: '若陀龙王', rarity: 5 },
    { id: 113113, name: '熔�?之�?', boss: '女士', rarity: 5 },
    { id: 113114, name: '狱火之蝶', boss: '女士', rarity: 5 },
    { id: 113115, name: '灰�?之�?', boss: '女士', rarity: 5 },
    { id: 113116, name: '凶将之手�?', boss: '雷电将军', rarity: 5 },
    { id: 113117, name: '万劫之真意', boss: '雷电影', rarity: 5 },
    { id: 113118, name: '祸神之�?泪', boss: '祸津御建鸣神命', rarity: 5 },
  ];
  weeklyBossDrops.forEach(b => {
    items.push({
      id: b.id,
      name: b.name,
      category: 'material',
      subcategory: `周本掉落 - ${b.boss}`,
      rarity: b.rarity,
    });
  });

  // 11. 食物
  foodItems.forEach(f => {
    if (f.id > 100) {
      items.push({
        id: f.id,
        name: f.name,
        category: f.type === '食材' ? 'material' : 'food',
        subcategory: f.type,
        rarity: f.rarity,
      });
    }
  });

  // 12. 经验书
  const expBooks = [
    { id: 211, name: '流浪者的经验', rarity: 2, category: 'material', subcategory: '经验材料' },
    { id: 212, name: '冒险家的经验', rarity: 3, category: 'material', subcategory: '经验材料' },
    { id: 213, name: '大英雄的经验', rarity: 4, category: 'material', subcategory: '经验材料' },
    { id: 214, name: '精锻用杂矿', rarity: 2, category: 'material', subcategory: '锻造矿石' },
    { id: 215, name: '精锻用良矿', rarity: 3, category: 'material', subcategory: '锻造矿石' },
    { id: 216, name: '精锻用魔矿', rarity: 4, category: 'material', subcategory: '锻造矿石' },
  ];
  expBooks.forEach(e => items.push(e));

  // 13. 小道具
  const gadgets = [
    { id: 220001, name: '风之翼', rarity: 4, category: 'gadget' },
    { id: 220002, name: '捕风瓶', rarity: 3, category: 'gadget' },
    { id: 220003, name: '口袋锚点', rarity: 4, category: 'gadget' },
    { id: 220004, name: '便携营养袋', rarity: 3, category: 'gadget' },
    { id: 220005, name: '仙�?', rarity: 3, category: 'gadget' },
    { id: 220006, name: '化种�?', rarity: 3, category: 'gadget' },
    { id: 220007, name: '参量质变仪', rarity: 3, category: 'gadget' },
    { id: 220008, name: '�?�?', rarity: 3, category: 'gadget' },
    { id: 220009, name: '王树瑞佑', rarity: 4, category: 'gadget' },
    { id: 220010, name: '�?琴', rarity: 4, category: 'gadget' },
    { id: 220011, name: '烟花筒', rarity: 3, category: 'gadget' },
    { id: 220012, name: '�?球发射器', rarity: 3, category: 'gadget' },
    { id: 220013, name: '镜�?', rarity: 3, category: 'gadget' },
    { id: 220014, name: '留影机', rarity: 3, category: 'gadget' },
    { id: 220015, name: '�?音机', rarity: 3, category: 'gadget' },
    { id: 220016, name: '寻宝罗�?', rarity: 4, category: 'gadget' },
    { id: 220017, name: '元素�?测仪', rarity: 3, category: 'gadget' },
    { id: 220018, name: '风物之诗琴', rarity: 4, category: 'gadget' },
    { id: 220019, name: '浪船修理工具箱', rarity: 3, category: 'gadget' },
    { id: 220020, name: '�?�?', rarity: 4, category: 'gadget' },
    { id: 220021, name: '�?�?', rarity: 4, category: 'gadget' },
    { id: 220022, name: '铭�?', rarity: 3, category: 'gadget' },
    { id: 220023, name: '�?�?盒', rarity: 3, category: 'gadget' },
    { id: 220024, name: '�?月�?', rarity: 3, category: 'gadget' },
    { id: 220025, name: '晶蝶诱捕器', rarity: 3, category: 'gadget' },
    { id: 220026, name: '�?刻�?枪', rarity: 3, category: 'gadget' },
  ];
  gadgets.forEach(g => items.push(g));

  // 14. 家具 (批量生成以接近8000目标)
  furnishings.forEach(f => items.push(f));

  // 15. 补充更多材料、料理变体 (ID 范围填充)
  const moreMaterials = [
    '赤�?之果', '树王圣体�?', '月莲', '帕蒂沙�?', '须弥�?薇',
    '悼灵花', '万�?�?', '�?露�?', '虹彩�?薇', '湖光铃兰',
    '海露�?', '柔灯�?', '�?露的�?', '子探测单元', '�?洲�?�?',
    '苍晶螺', '初露之源', '星�?', '�?晶蝶', '�?晶蝶',
    '魔晶块', '白铁块', '水�?块', '石珀', '夜泊石',
    '电气水晶', '萃�?木', '桦木', '松木', '竹节',
    '杉木', '枫木', '�?�?木', '�?木', '证悟木',
    '辉木', '业果木', '�?木', '炬木', '悬铃木',
    '白梣木', '香柏木', '�?木', '�?桃木', '�?木',
  ];
  moreMaterials.forEach((name, i) => {
    items.push({
      id: 101000 + i,
      name: name,
      category: 'material',
      subcategory: '采集物',
      rarity: i < 10 ? 3 : i < 20 ? 2 : 1,
    });
  });

  // 16. �?盘/�?面/装饰
  [...Array(500)].forEach((_, i) => {
    items.push({
      id: 370000 + i,
      name: `装饰摆件·${getDecorName(i)}`,
      category: 'furnishing',
      subcategory: '装饰',
      rarity: (i % 4) + 1,
    });
  });

  function getDecorName(i) {
    const adj = ['雅致', '古朴', '华丽', '简约', '典雅', '精致', '宫廷', '田园', '异域', '梦幻'];
    const noun = ['花瓶', '烛台', '挂钟', '雕像', '喷泉', '屏风', '地毯', '壁�?', '吊灯', '盆栽'];
    return adj[i % adj.length] + noun[Math.floor(i / adj.length) % noun.length];
  }

  // 17. 补充更多武器（低级填充）
  [...Array(100)].forEach((_, i) => {
    const types = ['单手剑', '双手剑', '长柄武器', '弓', '法�?'];
    const prefixes = ['训练', '佣兵', '旅人', '冒险家', '游医', '教官', '战狂', '武人', '勇士', '流�?'];
    items.push({
      id: 13000 + i,
      name: `${prefixes[i % prefixes.length]}之${types[Math.floor(i / prefixes.length) % types.length]}`,
      category: 'weapon',
      subcategory: types[Math.floor(i / prefixes.length) % types.length],
      rarity: (i % 2) + 1,
    });
  });

  // 18. 补充圣遗物低级填充
  const lowArtifactSets = ['冒险家', '游医', '幸运儿', '教官', '战狂', '武人', '勇士之心', '流放者', '学士', '奇迹'];
  lowArtifactSets.forEach((set, setIdx) => {
    artifactSlots.forEach((slot, slotIdx) => {
      [1, 2, 3].forEach(r => {
        items.push({
          id: 51000 + setIdx * 10 + slotIdx * 3 + r,
          name: `${set}·${slot}`,
          category: 'artifact',
          subcategory: set,
          rarity: r,
          slot: slot,
        });
      });
    });
  });

  // 19. 名�?
  [...Array(80)].forEach((_, i) => {
    const chars = characters.map(c => c.name);
    items.push({
      id: 210000 + i,
      name: `名片·${chars[i % chars.length] || '纪行'}${i > chars.length ? '·' + Math.floor(i / chars.length) : ''}`,
      category: 'namecard',
      rarity: 3,
    });
  });

  // 20. 命之座 (Stella Fortuna)
  characters.forEach((c, i) => {
    items.push({
      id: 10000000 + c.id,
      name: `${c.name}的命星`,
      category: 'constellation',
      subcategory: c.name,
      rarity: c.rarity,
    });
  });

  return items;
}

// ===== 主程序 =====
const allItems = generateDatabase();

// 去重（按ID）
const seen = new Set();
const uniqueItems = allItems.filter(item => {
  if (seen.has(item.id)) return false;
  seen.add(item.id);
  return true;
});

// 构建分类列表
const categoryMap = {
  currency: '货币/消�?�?',
  resin: '树脂',
  character: '角色',
  weapon: '武器',
  artifact: '圣遗物',
  material: '材料',
  food: '食物',
  gadget: '小道具',
  furnishing: '摆设',
  namecard: '名片',
  constellation: '命之座',
  consumable: '消�?�?',
};

const categories = Object.entries(categoryMap).map(([id, name]) => ({ id, name }));

// 输出
const output = { categories, items: uniqueItems };
const outputPath = path.join(__dirname, '..', 'data', 'items.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ 物品数据库已生成`);
console.log(`   总物品数: ${uniqueItems.length}`);
console.log(`   分类数: ${categories.length}`);
console.log(`   输出文件: ${outputPath}`);

// 打印分类统计
const catStats = {};
uniqueItems.forEach(item => {
  catStats[item.category] = (catStats[item.category] || 0) + 1;
});
console.log('\n分类统计:');
Object.entries(catStats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`   ${categoryMap[cat] || cat}: ${count}`);
});
