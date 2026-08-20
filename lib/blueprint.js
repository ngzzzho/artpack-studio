/**
 * 小朋友足球遊戲素材藍圖。
 * kind: single = 一張(可帶陰影) | building = 3級+陰影 | chest = 4狀態 | part = 角色部件(定位版+淨件版[+灰階])
 *       series = 一套多件：第一件用 auto 參考，之後預設鏈上一件；refMode 'first'/'first+auto' 錨住第一件（防漂移）
 * chroma: 'magenta' = 用洋紅幕代替綠幕（主體本身有綠色嗰陣必用，例如綠色按鈕/球場草地）
 * canvas: N = 去背後居中 fit 落 N×N 透明畫布（icon 族統一視覺大細）
 * ninepatch kind / nine:true = 可拉伸 UI：prompt 鎖「裝飾淨係落四角」，生成後自動分析可拉伸帶，
 *   輸出 X_slices.json（Godot NinePatchRect margins）+ X_stretchtest.png（2× 拉伸驗收圖）
 * refPatterns: 自動由現有 pack 搵參考圖（filename search，取第一個命中）
 */

const BALL_REF = ['Icon_Resources_Star01_Gold', 'Icon_Resources_Coin01_Gold'];
const ICON_REF = ['Icon_Resources_Coin01_Gold', 'Icon_Collectibles_Trophy01_Gold'];
const BUILDING_REF = ['Market_03.png', 'Observatory_03.png'];
const CHEST_REF = ['box_gold_down', 'gold_open'];
const HEAD_REF = ['skin_1.png'];

export const BLUEPRINT = [
  /* ---------- 🧰 通用（美術簡報交付 ①② + 基礎 UI 套件，全 game 通用最高優先） ---------- */
  { id: 'res-icons', cat: '通用', name: '四資源 icon 套（⚡🏋️💎💰）', kind: 'series', folder: 'Resource_Icons', canvas: 512,
    prompt: '簡報交付①：四資源 HUD icon，四個要一眼分得開（黃閃電／橙紅啞鈴／紫寶石／金幣），成套同族',
    refPatterns: ['Icon_Resources_Lightning01_Blue', 'Icon_Resources_Coin01_Gold', 'Icon_Materials_Gem02_Purple'],
    series: [
      { key: 'energy', name: '⚡ 體力', file: 'Icon_Res_Energy',
        prompt: 'a game resource icon: a chunky glossy electric-yellow lightning bolt with a subtle blue outer glow, energy stamina symbol, bold silhouette readable at very small size' },
      { key: 'training', name: '🏋️ 訓練點', file: 'Icon_Res_Training', refMode: 'first+auto',
        prompt: 'a game resource icon in the exact same icon family and rendering as the reference: a chunky glossy orange-red dumbbell, training symbol, bold silhouette readable at very small size' },
      { key: 'gem', name: '💎 寶石', file: 'Icon_Res_Gem', refMode: 'first+auto',
        prompt: 'a game resource icon in the exact same icon family and rendering as the reference: a glossy faceted royal-purple diamond gem with sparkle highlights, bold silhouette readable at very small size' },
      { key: 'coin', name: '💰 金錢', file: 'Icon_Res_Coin', refMode: 'first+auto',
        prompt: 'a game resource icon in the exact same icon family and rendering as the reference: a shiny gold coin with a soccer ball embossed on its face, bold silhouette readable at very small size' }
    ] },
  { id: 'res-hud-bar', cat: '通用', name: 'HUD 資源條', kind: 'single', file: 'HUD_Resource_Bar', aspect: '4:3', chroma: 'magenta',
    prompt: 'a mobile game HUD resource counter bar: a rounded dark navy pill capsule with a thin golden border, an empty circular icon socket on the left end, a small glossy green plus button on the right end, blank middle area for a number',
    refPatterns: ['Slider_Basic_Rectangle_Bg', 'Button_Circle_01_Green'] },
  { id: 'card-frames', cat: '卡面套裝', outCat: '通用', name: '卡框 ×4 級（AI 出 master，銀/金/紫金程式染色 — 保證同形）', kind: 'series', folder: 'Card_Frames', aspect: '3:4',
    prompt: '只生成一個銅框 master，其餘三級確定性衍生：零 API 費、100% 同形、秒出',
    refPatterns: ['gold_open', 'Icon_Collectibles_Trophy01_Gold', 'Popup_01_Border'],
    series: [
      { key: 'bronze', name: '銅框 master（AI，九宮格）', file: 'Frame_Bronze', nine: true,
        prompt: 'a chunky portrait trading-card frame for a kids soccer game: THICK rounded bronze-copper metal border with a bold dark outline, glossy cartoon bevel highlights, sturdy riveted ornaments ONLY at the four corners, all four edges plain smooth metal, strong toy-like shine, the inner window completely empty' },
      { key: 'silver', name: '銀（程式染色）', file: 'Frame_Silver', local: 'metal', tier: 'silver' },
      { key: 'gold', name: '金（程式染色）', file: 'Frame_Gold', local: 'metal', tier: 'gold' },
      { key: 'purplegold', name: '紫金（程式染色，高光轉金）', file: 'Frame_PurpleGold', local: 'metal', tier: 'purplegold' },
      { key: 'emblem', name: '波徽（獨立零件，引擎貼底中）', file: 'Frame_Emblem', refMode: 'first', canvas: 256,
        prompt: 'a small round soccer ball crest badge in the exact same art style as the reference frame, glossy metal ring around a cartoon soccer ball, bold outline, standalone game asset' }
    ] },
  { id: 'btn-set', cat: '通用', name: '通用按鈕 ×4 色（九宮格）', kind: 'series', folder: 'Buttons', chroma: 'magenta', nine: true,
    prompt: '大粒 juicy 圓角按鈕（6 歲手指），綠＝主 CTA／藍＝次要／紅＝取消／灰＝停用，同形四色',
    refPatterns: ['Button_Rectangle_01_Convex_Green', 'Button_Rectangle_01_Convex_Blue'],
    series: [
      { key: 'green', name: '主按鈕（綠）', file: 'Button_Primary_Green',
        prompt: 'a big juicy rounded-rectangle mobile game button: glossy bright green with a soft top bevel highlight and a darker green bottom edge, blank label area, chunky kid-friendly proportions' },
      { key: 'blue', name: '次按鈕（藍）', file: 'Button_Secondary_Blue', refMode: 'first',
        prompt: 'The exact same button with identical shape and proportions, now glossy sky blue with matching darker blue bottom edge' },
      { key: 'red', name: '取消（紅）', file: 'Button_Cancel_Red', refMode: 'first',
        prompt: 'The exact same button with identical shape and proportions, now glossy warm red with matching darker red bottom edge' },
      { key: 'grey', name: '停用（灰）', file: 'Button_Disabled_Grey', refMode: 'first',
        prompt: 'The exact same button with identical shape and proportions, now matte desaturated grey, disabled state' }
    ] },
  { id: 'panel-popup', cat: '通用', name: '彈窗面板框（九宮格）', kind: 'ninepatch', file: 'Popup_Panel', aspect: '4:3',
    prompt: 'a rounded popup panel for a kids mobile game: flat cream-white inner area, thick warm golden-brown border with a soft bevel, gently rounded corners',
    refPatterns: ['Popup_02_Single'] },
  { id: 'title-banner', cat: '通用', name: '標題橫幅', kind: 'single', file: 'Title_Banner', aspect: '4:3',
    prompt: 'a wide ribbon banner for screen titles in a kids mobile game: bright red-orange ribbon with golden trim and folded swallow-tail ends, completely blank center for text',
    refPatterns: ['Label_Flag_01_Single_Red', 'Label_Bubble'] },

  /* ---------- ⚽ 核心道具 ---------- */
  { id: 'ball-classic', cat: '核心道具', name: '經典足球', kind: 'single', file: 'Ball_Classic',
    prompt: 'a classic black and white soccer ball', refPatterns: BALL_REF },
  { id: 'ball-gold', cat: '核心道具', name: '金足球', kind: 'single', file: 'Ball_Gold',
    prompt: 'a shiny golden soccer ball with sparkles', refPatterns: BALL_REF },
  { id: 'ball-rainbow', cat: '核心道具', name: '彩虹足球', kind: 'single', file: 'Ball_Rainbow', chroma: 'magenta',
    prompt: 'a colorful rainbow soccer ball for kids', refPatterns: BALL_REF },
  { id: 'boots-gold', cat: '核心道具', name: '金靴', kind: 'single', file: 'Boots_Gold',
    prompt: 'a pair of golden soccer cleats boots', refPatterns: ICON_REF },
  { id: 'gloves', cat: '核心道具', name: '龍門手套', kind: 'single', file: 'Gloves_Keeper',
    prompt: 'a pair of goalkeeper gloves', refPatterns: ICON_REF },
  { id: 'whistle', cat: '核心道具', name: '哨子', kind: 'single', file: 'Whistle',
    prompt: 'a referee whistle with a red cord', refPatterns: ICON_REF },
  { id: 'cards', cat: '核心道具', name: '紅黃牌', kind: 'single', file: 'Cards_RedYellow',
    prompt: 'a red card and a yellow card fanned together, referee penalty cards', refPatterns: ICON_REF },
  { id: 'corner-flag', cat: '核心道具', name: '角旗', kind: 'single', file: 'Corner_Flag',
    prompt: 'a corner flag with a checkered pennant', refPatterns: ICON_REF },
  { id: 'captain-band', cat: '核心道具', name: '隊長臂章', kind: 'single', file: 'Captain_Band',
    prompt: 'a captain armband with a star', refPatterns: ICON_REF },
  { id: 'tactics-board', cat: '核心道具', name: '戰術板', kind: 'single', file: 'Tactics_Board',
    prompt: 'a soccer tactics clipboard with X and O marks and arrows', refPatterns: ['Icon_Misc_Documents_Mission01'] },
  { id: 'energy-drink', cat: '核心道具', name: '能量飲品', kind: 'single', file: 'Energy_Drink',
    prompt: 'a sports energy drink bottle with a lightning bolt label', refPatterns: ['Icon_Resources_Lightning01_Blue'] },
  { id: 'goal', cat: '核心道具', name: '龍門', kind: 'single', file: 'Goal_Net',
    prompt: 'a soccer goal with white posts and net, front three-quarter view', refPatterns: ICON_REF },

  /* ---------- 🏟️ 建築（每座 3 級 + 陰影） ---------- */
  { id: 'stadium', cat: '建築', name: '主球場', kind: 'building', file: 'Stadium', folder: 'Stadium', chroma: 'magenta',
    prompt: 'a cute soccer stadium building with green pitch visible, floodlights and team flags', refPatterns: BUILDING_REF },
  { id: 'training', cat: '建築', name: '訓練場', kind: 'building', file: 'Training_Ground', folder: 'Training_Ground', chroma: 'magenta',
    prompt: 'a soccer training ground building with mini pitch, cones and agility ladders', refPatterns: BUILDING_REF },
  { id: 'academy', cat: '建築', name: '青訓學院', kind: 'building', file: 'Youth_Academy', folder: 'Youth_Academy',
    prompt: 'a youth soccer academy school building with a ball emblem on the roof', refPatterns: BUILDING_REF },
  { id: 'gym', cat: '建築', name: '健身室', kind: 'building', file: 'Gym', folder: 'Gym',
    prompt: 'a small gym building with dumbbell sign for soccer players', refPatterns: BUILDING_REF },
  { id: 'medical', cat: '建築', name: '醫療中心', kind: 'building', file: 'Medical_Center', folder: 'Medical_Center',
    prompt: 'a small sports medical clinic building with a red cross and a bandaged soccer ball sign', refPatterns: BUILDING_REF },
  { id: 'shop', cat: '建築', name: '球會商店', kind: 'building', file: 'Club_Shop', folder: 'Club_Shop',
    prompt: 'a club merchandise shop building with jerseys and soccer balls in the window', refPatterns: ['Icon_ETC_Buildings_Shop01', 'Market_03.png'] },
  { id: 'ticket', cat: '建築', name: '售票亭', kind: 'building', file: 'Ticket_Booth', folder: 'Ticket_Booth',
    prompt: 'a small ticket booth kiosk with a ticket sign', refPatterns: BUILDING_REF },
  { id: 'snack', cat: '建築', name: '小食亭', kind: 'building', file: 'Snack_Stand', folder: 'Snack_Stand',
    prompt: 'a snack stand kiosk selling popcorn and drinks', refPatterns: BUILDING_REF },
  { id: 'trophy-room', cat: '建築', name: '獎盃陳列室', kind: 'building', file: 'Trophy_Room', folder: 'Trophy_Room',
    prompt: 'a trophy hall building with a big golden cup on display through glass front', refPatterns: BUILDING_REF },
  { id: 'fan-club', cat: '建築', name: '球迷會', kind: 'building', file: 'Fan_Club', folder: 'Fan_Club',
    prompt: 'a fan clubhouse building with scarves, flags and a megaphone sign', refPatterns: BUILDING_REF },

  /* ---------- 🏆 獎項/獎勵 ---------- */
  { id: 'trophy-champion', cat: '獎項獎勵', name: '冠軍金盃', kind: 'single', file: 'Trophy_Champion', shadow: true,
    prompt: 'a grand golden championship trophy cup with big handles', refPatterns: ['Icon_Collectibles_Trophy01_Gold'] },
  { id: 'trophy-silver', cat: '獎項獎勵', name: '亞軍銀盃', kind: 'single', file: 'Trophy_Silver', shadow: true,
    prompt: 'a silver runner-up trophy cup', refPatterns: ['Icon_Collectibles_Trophy01_Gold'] },
  { id: 'golden-boot', cat: '獎項獎勵', name: '金靴獎', kind: 'single', file: 'Trophy_Golden_Boot', shadow: true,
    prompt: 'a golden boot award trophy on a pedestal', refPatterns: ['Icon_Collectibles_Trophy01_Gold'] },
  { id: 'golden-ball', cat: '獎項獎勵', name: '金球獎', kind: 'single', file: 'Trophy_Golden_Ball', shadow: true,
    prompt: 'a golden soccer ball award trophy on a marble pedestal', refPatterns: ['Icon_Collectibles_Trophy01_Gold'] },
  { id: 'medals', cat: '獎項獎勵', name: '獎牌（金）', kind: 'single', file: 'Medal_Gold',
    prompt: 'a gold medal with a soccer ball embossed, on a striped ribbon', refPatterns: ICON_REF },
  { id: 'chest-football-wood', cat: '獎項獎勵', name: '木足球寶箱（4 狀態）', kind: 'chest', file: 'football_wood', folder: 'Chest_Football_Wood', chroma: 'magenta',
    prompt: 'a wooden treasure chest decorated with soccer ball emblems and pitch-green trim',
    contents: 'soccer balls and bronze coins', refPatterns: ['box_wood_down', 'wood_open'] },
  { id: 'chest-football-gold', cat: '獎項獎勵', name: '金足球寶箱（4 狀態）', kind: 'chest', file: 'football_gold', folder: 'Chest_Football_Gold',
    prompt: 'a golden treasure chest decorated with a soccer ball crest and trophy handles',
    contents: 'golden footballs, coins and gems', refPatterns: CHEST_REF },
  { id: 'card-pack', cat: '獎項獎勵', name: '球員卡包', kind: 'single', file: 'Player_Card_Pack',
    prompt: 'a shiny player trading-card pack with a soccer star silhouette and lightning burst', refPatterns: ICON_REF },
  { id: 'signed-ball', cat: '獎項獎勵', name: '簽名足球', kind: 'single', file: 'Ball_Signed',
    prompt: 'a white soccer ball covered with marker autographs on a small gold stand', refPatterns: BALL_REF },

  /* ---------- 👤 球星部件（128 頭型系統） ---------- */
  { id: 'hair-argentine', cat: '球星部件', name: '髮型：阿根廷傳奇風', kind: 'part', file: 'hair_f1', tint: true, partNoun: 'hairstyle',
    prompt: 'a short scruffy brown hairstyle swept slightly to one side', refPatterns: [...HEAD_REF, 'hair_5.png', 'hair_9.png'] },
  { id: 'beard-argentine', cat: '球星部件', name: '鬍鬚：絡腮鬍', kind: 'part', file: 'beard_f1', tint: true, partNoun: 'beard',
    prompt: 'a neat full beard covering the jaw and chin', refPatterns: [...HEAD_REF, 'beard_2.png', 'beard_6.png'] },
  { id: 'hair-portuguese', cat: '球星部件', name: '髮型：葡萄牙7號風', kind: 'part', file: 'hair_f2', tint: true, partNoun: 'hairstyle',
    prompt: 'a sharp short dark hairstyle with a clean fade and a slick top', refPatterns: [...HEAD_REF, 'hair_5.png', 'hair_12.png'] },
  { id: 'hair-brazilian', cat: '球星部件', name: '髮型：巴西魔術師風', kind: 'part', file: 'hair_f3', tint: true, partNoun: 'hairstyle',
    prompt: 'a playful curly mohawk-style haircut with shaved sides', refPatterns: [...HEAD_REF, 'hair_7.png', 'hair_13.png'] },
  { id: 'hair-french', cat: '球星部件', name: '髮型：法國閃電風', kind: 'part', file: 'hair_f4', tint: true, partNoun: 'hairstyle',
    prompt: 'a short neat afro fade haircut', refPatterns: [...HEAD_REF, 'hair_3.png', 'hair_11.png'] },
  { id: 'hair-norwegian', cat: '球星部件', name: '髮型：北歐魔人風', kind: 'part', file: 'hair_f5', tint: true, partNoun: 'hairstyle',
    prompt: 'long straight blond hair tied back in a low bun with a headband', refPatterns: [...HEAD_REF, 'hair_10.png', 'hair_14.png'] },
  { id: 'hair-egyptian', cat: '球星部件', name: '髮型：埃及國王風', kind: 'part', file: 'hair_f6', tint: true, partNoun: 'hairstyle',
    prompt: 'a voluminous dark curly afro hairstyle', refPatterns: [...HEAD_REF, 'hair_7.png', 'hair_13.png'] },
  { id: 'hair-korean', cat: '球星部件', name: '髮型：亞洲一哥風', kind: 'part', file: 'hair_f7', tint: true, partNoun: 'hairstyle',
    prompt: 'a soft black two-block haircut with a straight fringe', refPatterns: [...HEAD_REF, 'hair_2.png', 'hair_12.png'] },
  { id: 'eyes-sharp', cat: '球星部件', name: '眼：銳利殺手眼', kind: 'part', file: 'eye_f1', partNoun: 'pair of eyes',
    prompt: 'a pair of sharp focused competitive eyes with slight frown', refPatterns: [...HEAD_REF, 'eye_1.png', 'eye_8.png'] },
  { id: 'eyes-smiley', cat: '球星部件', name: '眼：瞇瞇笑眼', kind: 'part', file: 'eye_f2', partNoun: 'pair of eyes',
    prompt: 'a pair of happy closed smiling arc eyes', refPatterns: [...HEAD_REF, 'eye_1.png', 'eye_8.png'] },
  { id: 'brows-thick', cat: '球星部件', name: '眉：濃眉', kind: 'part', file: 'brow_f1', tint: true, partNoun: 'pair of eyebrows',
    prompt: 'a pair of thick bold straight eyebrows', refPatterns: [...HEAD_REF, 'brow_1.png', 'brow_5.png'] },
  { id: 'mouth-grin', cat: '球星部件', name: '嘴：自信奸笑', kind: 'part', file: 'mouth_f1', partNoun: 'mouth',
    prompt: 'a confident smirk grin mouth showing a hint of teeth', refPatterns: [...HEAD_REF, 'mouth_1.png', 'mouth_6.png'] },
  { id: 'mouth-cheer', cat: '球星部件', name: '嘴：歡呼大笑', kind: 'part', file: 'mouth_f2', partNoun: 'mouth',
    prompt: 'a wide open cheering happy mouth', refPatterns: [...HEAD_REF, 'mouth_1.png', 'mouth_6.png'] },

  /* ---------- 🎮 UI ---------- */
  { id: 'ui-energy', cat: 'UI', name: '體力 icon', kind: 'single', file: 'Icon_Energy_Football',
    prompt: 'an energy stamina icon: a lightning bolt hitting a soccer ball', refPatterns: ['Icon_Resources_Lightning01_Blue'] },
  { id: 'ui-coin', cat: 'UI', name: '足球金幣', kind: 'single', file: 'Icon_Coin_Football',
    prompt: 'a gold coin with a soccer ball embossed on its face', refPatterns: ['Icon_Resources_Coin01_Gold'] },
  { id: 'ui-star', cat: 'UI', name: '評分星星', kind: 'single', file: 'Icon_Star_Rating',
    prompt: 'a glossy golden rating star with tiny soccer ball pattern in the center', refPatterns: ['Icon_Resources_Star01_Gold'] },
  { id: 'ui-badge-bronze', cat: 'UI', name: '聯賽徽章：青銅', kind: 'single', file: 'Badge_League_Bronze',
    prompt: 'a bronze league rank badge shield with a soccer ball and one star', refPatterns: ICON_REF },
  { id: 'ui-badge-gold', cat: 'UI', name: '聯賽徽章：黃金', kind: 'single', file: 'Badge_League_Gold',
    prompt: 'a golden league rank badge shield with a soccer ball, wings and three stars', refPatterns: ICON_REF },
  { id: 'ui-button', cat: 'UI', name: '主按鈕（踢波！）', kind: 'single', file: 'Button_Play_Football',
    prompt: 'a big juicy rounded green game button with a soccer ball icon, blank label area', refPatterns: ICON_REF },


  /* ---------- 🃏 WordFootball 卡面/圖鑑（ART-DIRECTION.md 零件清單；習慣組 icon 等 Q6 清單先加） ---------- */
  { id: 'wf-attr-icons', optional: true, cat: '卡面套裝', name: '六屬性 icon（速盤傳射防力）', kind: 'series', folder: 'WF_Attr_Icons', canvas: 512,
    prompt: '六屬性糖粒 icon，一套同族，細到 24px 都認到形',
    refPatterns: ['Icon_Resources_Lightning01_Blue', 'function_icon_achievement'],
    series: [
      { key: 'speed', name: '速', file: 'attr_speed', prompt: 'a tiny game stat icon: a cyan lightning speed bolt, bold silhouette readable at 24px' },
      { key: 'dribble', name: '盤', file: 'attr_dribble', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: a purple swirl around a small soccer ball, dribbling symbol' },
      { key: 'pass', name: '傳', file: 'attr_pass', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: a green curved arrow passing a small soccer ball' },
      { key: 'shoot', name: '射', file: 'attr_shoot', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: an orange soccer ball with motion flames, shooting symbol' },
      { key: 'defend', name: '防', file: 'attr_defend', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: a blue shield with a small soccer ball emblem' },
      { key: 'power', name: '力', file: 'attr_power', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: an amber flexed muscle arm, power symbol' }
    ] },
  { id: 'wf-attr-icons-gk', optional: true, cat: '卡面套裝', name: 'GK 六屬性 icon', kind: 'series', folder: 'WF_Attr_Icons_GK', canvas: 512,
    prompt: 'GK 六數 icon（Saving/Reflexes/Rushing/Handling/Kicking/Positioning），同六屬性同族',
    refPatterns: ['Icon_Resources_Lightning01_Blue', 'function_icon_achievement'],
    series: [
      { key: 'saving', name: 'SAV', file: 'attr_gk_saving', prompt: 'a tiny game stat icon: a goalkeeper glove catching a soccer ball, bold silhouette readable at 24px' },
      { key: 'reflexes', name: 'REF', file: 'attr_gk_reflexes', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: an eye with lightning sparks, reflexes symbol' },
      { key: 'rushing', name: 'RUS', file: 'attr_gk_rushing', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: a dashing goalkeeper figure with speed lines' },
      { key: 'handling', name: 'HAN', file: 'attr_gk_handling', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: two hands safely holding a soccer ball' },
      { key: 'kicking', name: 'KIC', file: 'attr_gk_kicking', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: a boot kicking a soccer ball high with an arc line' },
      { key: 'positioning', name: 'POS', file: 'attr_gk_positioning', refMode: 'first+auto', prompt: 'a tiny game stat icon in the exact same family: a target crosshair on a small goal, positioning symbol' }
    ] },
  { id: 'wf-line-badges', optional: true, cat: '卡面套裝', name: '位置角章 ×4（GK/DEF/MID/FWD，v6 方章）', kind: 'series', folder: 'WF_Line_Badges', canvas: 256,
    prompt: '貼頭像右上角嘅四色 icon 方章：上半 icon，下半留空帶給引擎壓文字',
    refPatterns: ['Button_Circle_01_Green', 'BasicFrame_Square_m'],
    series: [
      { key: 'gk', name: 'GK 方章', file: 'badge_line_gk',
        prompt: 'a small rounded-square game badge, glossy teal with darker teal border: a white goalkeeper glove icon in the upper half, plain blank band in the lower third for text' },
      { key: 'def', name: 'DEF 方章', file: 'badge_line_back', refMode: 'first',
        prompt: 'The exact same rounded-square badge with identical shape, now glossy navy blue with a white shield icon in the upper half, blank lower band' },
      { key: 'mid', name: 'MID 方章', file: 'badge_line_mid', refMode: 'first',
        prompt: 'The exact same rounded-square badge with identical shape, now glossy green with a white double-headed horizontal arrow icon in the upper half, blank lower band' },
      { key: 'fwd', name: 'FWD 方章', file: 'badge_line_front', refMode: 'first',
        prompt: 'The exact same rounded-square badge with identical shape, now glossy warm red with a white forward arrow icon in the upper half, blank lower band' }
    ] },
  { id: 'wf-chip-style', optional: true, cat: '卡面套裝', name: '風格 chip 底（藍系）', kind: 'ninepatch', file: 'chip_style',
    prompt: 'a rounded pill chip background for a kids game card, soft sky-blue fill with a deeper blue border, small circular icon socket on the left end, blank text area',
    refPatterns: ['Label_Bubble', 'Button_Rectangle_01_Convex_Blue'] },
  { id: 'wf-chip-habit', optional: true, cat: '卡面套裝', name: '習慣 chip 底（奶白系）', kind: 'ninepatch', file: 'chip_habit',
    prompt: 'a rounded pill chip background for a kids game card, warm cream fill with a soft tan border, small circular icon socket on the left end, blank text area',
    refPatterns: ['Label_Bubble', 'Popup_02_Single'] },
  { id: 'wf-slot-skill', optional: true, cat: '卡面套裝', name: '必殺技 slot 框', kind: 'ninepatch', file: 'slot_skill',
    prompt: 'a square item slot frame for a kids game card, glossy purple border, completely empty center, small star ornaments only at the four corners',
    refPatterns: ['BasicFrame_Square_m', 'Icon_Resources_Star01_Gold'] },
  { id: 'wf-slot-equip', optional: true, cat: '卡面套裝', name: '裝備 slot 框', kind: 'ninepatch', file: 'slot_equip',
    prompt: 'a square item slot frame for a kids game card, glossy warm gold border, completely empty center, small rivet ornaments only at the four corners',
    refPatterns: ['BasicFrame_Square_m', 'Icon_Collectibles_Trophy01_Gold'] },
  { id: 'wf-stamina-seg', optional: true, cat: '卡面套裝', name: '體力電池格（着/熄）', kind: 'series', folder: 'WF_Stamina', canvas: 256,
    prompt: '體力條一格，電池式，着同熄兩態',
    refPatterns: ['Slider_Batteary_Fill', 'Icon_Resources_Lightning01_Blue'],
    series: [
      { key: 'on', name: '着', file: 'stamina_seg_on', prompt: 'a single small rounded battery segment for a kids game energy bar, glossy teal green, lit state' },
      { key: 'off', name: '熄', file: 'stamina_seg_off', refMode: 'first', prompt: 'The exact same battery segment with identical shape, now pale grey, unlit empty state' }
    ] },
  { id: 'wf-max-badge', optional: true, cat: '卡面套裝', name: 'MAX 章', kind: 'single', file: 'badge_max', canvas: 256,
    prompt: 'a tiny gold ribbon badge with blank center for a kids game stat bar, marks a maxed-out stat, glossy gold with warm sparkle, bold at 20px',
    refPatterns: ['Icon_Resources_Star01_Gold'] },
  { id: 'wf-album-cover', cat: 'WF圖鑑', name: 'Panini 簿封面', kind: 'single', file: 'album_cover', aspect: '3:4',
    prompt: 'a kids sticker album book cover, warm leather-look with cloth texture, a soccer ball crest in the center and stitched border, playful and collectible feel',
    refPatterns: ['Popup_02_Single'] },
  { id: 'wf-album-page', cat: 'WF圖鑑', name: '簿頁底紋（4:3 全幅）', kind: 'single', file: 'album_page_bg', aspect: '4:3', noCut: true,
    prompt: 'a sticker album open page background texture, soft cream paper with faint soccer pitch watermark lines and stitched edges, gentle and flat so cards sit on top clearly' },
  { id: 'wf-counter-plate', cat: 'WF圖鑑', name: 'collected 計數牌', kind: 'ninepatch', file: 'counter_plate',
    prompt: 'a small rounded counter plate for a kids game header, dark navy fill with a golden border, completely blank center for numbers',
    refPatterns: ['Label_Tapered_Basic'] },

  { id: 'wf-card-foil', cat: '卡面套裝', name: '卡面金屬箔底 ×4 級（master + 染色）', kind: 'series', folder: 'WF_Card_Foil', aspect: '3:4',
    prompt: 'FUT 式全卡金屬箔材質：一張 bronze master，銀/金/紫金程式衍生',
    refPatterns: ['Icon_Collectibles_Trophy01_Gold'],
    series: [
      { key: 'bronze', name: '銅箔 master（AI）', file: 'Foil_Bronze', noCut: true,
        prompt: 'a full-bleed trading card background texture of polished bronze-copper metal foil with large low-poly geometric facets and soft diagonal light sweeps, subtle embossed depth, elegant and calm so text stays readable on top, no border, edge-to-edge' },
      { key: 'silver', name: '銀箔（染色）', file: 'Foil_Silver', local: 'metal', tier: 'silver' },
      { key: 'gold', name: '金箔（染色）', file: 'Foil_Gold', local: 'metal', tier: 'gold' },
      { key: 'purplegold', name: '紫金箔（染色，高光轉金）', file: 'Foil_PurpleGold', local: 'metal', tier: 'purplegold' }
    ] },
  { id: 'wf-card-rays', cat: '卡面套裝', name: '紫金卡底放射紋（稀有度演出）', kind: 'single', file: 'Card_BG_Rays', aspect: '3:4', noCut: true,
    prompt: 'a radiant sunburst rays background texture for a legendary trading card, warm gold and royal purple light rays radiating from center, soft dreamy glow, subtle sparkle dust, full-bleed seamless, gentle enough for text to sit on top' },

  /* ---------- 🖼️ 場景 ---------- */
  { id: 'bg-pitch', cat: '場景', name: '球場背景（16:9）', kind: 'single', file: 'BG_Pitch', aspect: '16:9', noCut: true,
    prompt: 'a bright cheerful soccer pitch background with green striped grass, goal and stadium stands, wide shot, kid-friendly' },
  { id: 'bg-locker', cat: '場景', name: '更衣室背景（16:9）', kind: 'single', file: 'BG_Locker_Room', aspect: '16:9', noCut: true,
    prompt: 'a cheerful soccer locker room background with jerseys hanging and boots on benches' },
  { id: 'bg-podium', cat: '場景', name: '頒獎台背景（16:9）', kind: 'single', file: 'BG_Podium', aspect: '16:9', noCut: true,
    prompt: 'a celebration podium stage background with confetti, spotlights and a big trophy stand' }
];

export const CATEGORIES = ['卡面套裝', '通用', 'WF圖鑑', '核心道具', '建築', '獎項獎勵', '球星部件', 'UI', '場景'];
