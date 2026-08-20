/**
 * 球星零件開發清單 v2（2026-08-17，Emma 要求擴充：淨係髮型/眼/眉/嘴/鬍鬚，唔要配飾）
 * 57 款待生成。檔名續返 pack 現有編號；refPatterns = skin_1 頭型模板 + 同類風格參考（精確檔名）。
 * COVERAGE = 真係夠似、直接沿用現有部件嘅款（其餘一律生成專業版）。
 */

const GREY = 'drawn as a separate hair piece in flat light-grey tones with soft grey shading, matching the reference hair pieces exactly in line weight and bold dark outline';
const P = (id, name, zhFor, file, prompt, refs, opts = {}) => ({
  id: 'sp-' + id, cat: '球星部件', kind: 'part', name, zhFor, file, prompt,
  refPatterns: ['skin_1.png', ...refs.map((r) => r + '.png')],
  tint: opts.tint ?? false,
  partNoun: opts.noun || 'facial feature'
});
const HAIR = (id, name, zhFor, file, prompt, refs) => P(id, name, zhFor, file, `${prompt}, ${GREY}`, refs, { tint: true, noun: 'hairstyle' });
const EYE = (id, name, zhFor, file, prompt, refs) => P(id, name, zhFor, file, prompt, refs, { noun: 'pair of eyes' });
const BROW = (id, name, zhFor, file, prompt, refs) => P(id, name, zhFor, file, prompt, refs, { tint: true, noun: 'pair of eyebrows' });
const MOUTH = (id, name, zhFor, file, prompt, refs) => P(id, name, zhFor, file, prompt, refs, { noun: 'mouth' });
const BEARD = (id, name, zhFor, file, prompt, refs) => P(id, name, zhFor, file, prompt, refs, { tint: true, noun: 'beard' });

export const STAR_PART_ITEMS = [
  /* ================= 髮型（23） ================= */
  HAIR('buzz', '剷青短髮', '麥巴比/杜林/賓斯馬/科登', 'hair_short_31',
    'an extremely short shaved buzz cut hugging the scalp tightly like a thin skull cap, only a few millimetres of hair following the exact curve of the skull, absolutely no volume, no sweep, no fringe, just a tight speckled cap of stubble-length hair', ['hair_short_20', 'hair_short_13']),
  HAIR('microbuzz', '極短貼頭', '簡迪/米倫/沙耶艾馬利', 'hair_short_32',
    'a nearly-shaved micro buzz, just a thin close shadow of hair following the scalp line', ['hair_short_13', 'hair_short_20']),
  HAIR('slickfade', '側梳油頭漸變', 'C朗拿度', 'hair_short_33',
    "a footballer's slick fade haircut: glossy top hair combed neatly to one side, sharply faded shaved sides, clean straight front hairline", ['hair_short_22', 'hair_short_20']),
  HAIR('sidepart', '紳士側分', '哈利卡尼/利雲度夫斯基/奧迪加特', 'hair_short_34',
    "a tidy gentleman's side-parted haircut with a visible parting line and short neatly combed sides", ['hair_short_22', 'hair_short_17']),
  HAIR('waves', '波浪貼頭', '雲尼修斯/哈基米/拉舒福特', 'hair_short_35',
    'short brushed 360 waves lying flat on the head in a neat swirling wave pattern with low faded edges', ['hair_short_15', 'hair_short_21']),
  HAIR('curlytop', '捲頂剷邊', '耶馬/尼馬/恩迪克/伊斯迪華奧', 'hair_short_36',
    'a curly-top fade: a proud mound of tight springy coils on top with clean shaved sides', ['hair_5', 'hair_short_21']),
  HAIR('highfore', '高額短髮', '迪布尼/賓費南迪斯', 'hair_short_37',
    'short slightly-wavy hair sitting back on the head with a high forehead hairline', ['hair_short_13', 'hair_short_24']),
  HAIR('mullet', '狐尾 Mullet', '華維迪/加拿祖', 'hair_short_38',
    'a modern footballer mullet: short choppy top and sides with a longer flowing tail at the back of the neck', ['hair_short_28', 'hair_11']),
  HAIR('crop', '短碎髮（質感）', '美斯/龐馬/艾華利斯/恩素', 'hair_short_39',
    'a short textured crop with choppy uneven strands and a subtle messy micro-fringe', ['hair_short_24', 'hair_short_20']),
  HAIR('twists', '短捲繩 Twists', '貝寧咸/沙卡/慕西亞拉/緬奴/杜爾', 'hair_short_40',
    'short sponge twists: small distinct twisted coils standing on top with a clean tapered fade', ['hair_short_21', 'hair_5']),
  HAIR('afro', '圓爆炸頭', '沙拿', 'hair_short_41',
    'a proud rounded afro of dense tight curls framing the whole top of the head', ['hair_7', 'hair_short_21']),
  HAIR('twoblock', '韓式 Two-block', '孫興慜/李剛仁', 'hair_short_42',
    'a soft Korean two-block haircut: fuller layered top with a natural straight fringe over the forehead, trimmed short at the sides', ['hair_short_17', 'hair_short_20']),
  HAIR('curtains', '中分窗簾', '坎巴斯/馬斯坦禾奴/古拿', 'hair_short_43',
    'middle-parted curtain bangs: two soft waves of hair falling to each side of the forehead', ['hair_short_16', 'hair_short_22']),
  HAIR('slickback', '全後梳 Undercut', '大馬天尼斯/佐克利斯/唐拿隆馬', 'hair_short_44',
    'medium hair slicked straight back from the forehead over shaved undercut sides', ['hair_6', 'hair_short_22']),
  HAIR('boxbraids', '粗辮 Box braids', '甘馬雲加/昆迪', 'hair_short_45',
    'neat chunky box braids of medium length hanging evenly around the head', ['hair_short_15', 'hair_short_21']),
  HAIR('cornrows', '貼頭辮 Cornrows', '雲尼修斯（編髮look）/度古', 'hair_short_46',
    'tight cornrow braids running straight back along the scalp in parallel ridged rows', ['hair_short_15', 'hair_short_20']),
  HAIR('shortdreads', '短髒辮', '巴高拿/里奧/奧利斯', 'hair_short_47',
    'short loose dreadlocks sprouting playfully in all directions with a faded side', ['hair_short_21', 'hair_short_15']),
  HAIR('flattop', '平頂 Flat-top', '奧斯文（捲平頂）/復古款', 'hair_short_48',
    'a bold flat-top fade: dense curly hair sculpted into a level flat block on top', ['hair_short_21', 'hair_short_26']),
  HAIR('designfade', '剃紋剷青', '尼高威廉斯/新生代通用', 'hair_short_49',
    'a short buzz fade with two thin shaved zigzag design lines etched above the ear', ['hair_short_20', 'hair_short_13']),
  HAIR('longband', '長髮髮帶', '夏蘭特', 'hair_13',
    'long straight hair flowing loose to the shoulders, held off the face by a thin sports headband across the forehead', ['hair_11', 'hair_9']),
  HAIR('headbandslick', '髮箍後梳', '基利殊', 'hair_14',
    'medium-length hair slicked straight back from the forehead, held by a visible thin headband, ends curling slightly at the neck', ['hair_6', 'hair_short_25']),
  HAIR('messymid', '中長亂捲', '卡華拉斯基利亞/加維（長版）', 'hair_15',
    'shoulder-length dark messy waves tumbling loosely around the face, carefree and wild', ['hair_2', 'hair_short_18']),
  HAIR('ponytail', '束馬尾', '夏蘭特（另一造型）/通用', 'hair_16',
    'seen from the front: hair combed back smooth and tight over the whole scalp, with a small round sporty ponytail bun peeking out at the upper back of the head', ['hair_9', 'hair_11']),

  /* ================= 眼（10） ================= */
  EYE('smiley-eyes', '瞇瞇笑月牙眼', '孫興慜/沙拿/沙卡/文尼', 'eye_21',
    'a pair of happy closed smiling eyes: two thick upward-curving arcs like crescent moons, warm and friendly', ['eye_2', 'eye_18']),
  EYE('ice-eyes', '冰冷直視眼', '夏蘭特/雲戴克/佐克利斯', 'eye_22',
    'a pair of wide piercing icy eyes with small intense pupils and a cold unblinking stare', ['eye_16', 'eye_15']),
  EYE('sharp-eyes', '銳利殺手眼', 'C朗拿度/勞塔羅/華維迪', 'eye_23',
    'a pair of sharp narrow determined eyes angled slightly down toward the nose, with confident focused pupils', ['eye_15', 'eye_5']),
  EYE('calm-eyes', '微垂溫柔眼', '美斯/摩迪/比德利', 'eye_24',
    'a pair of gentle calm eyes with softly drooping outer corners and large relaxed dark pupils', ['eye_2', 'eye_20']),
  EYE('sparkle-eyes', '大眼靈動', '尼馬/雲尼修斯/耶馬', 'eye_25',
    'a pair of large lively expressive round eyes with big shiny pupils and a playful white sparkle highlight', ['eye_3', 'eye_4']),
  EYE('focus-eyes', '皺眉專注眼', '洛迪/卡斯米路/凱塞多', 'eye_26',
    'a pair of focused eyes slightly narrowed in concentration with small creases pressing from above', ['eye_6', 'eye_5']),
  EYE('hooded-eyes', '內斂單瞼眼', '金玟哉/久保建英/李剛仁', 'eye_27',
    'a pair of calm single-lid hooded eyes, smooth upper lids with narrow composed dark pupils', ['eye_20', 'eye_10']),
  EYE('wink-eyes', '眨眼 Wink', '慶祝/官宣表情通用', 'eye_28',
    'a cheeky winking pair of eyes: one eye open and bright, the other squeezed shut in a playful wink', ['eye_18', 'eye_2']),
  EYE('burning-eyes', '燃燒鬥志眼', '入球爆發/比賽通用', 'eye_29',
    'a pair of fired-up determined eyes with tiny flame-shaped highlights burning in the pupils', ['eye_16', 'eye_5']),
  EYE('teary-eyes', '淚眼', '落敗/感動場面通用', 'eye_30',
    'a pair of big glossy teary eyes welling up with a large trembling teardrop at one corner', ['eye_3', 'eye_18']),

  /* ================= 眉（8） ================= */
  BROW('bushy-brows', '粗亂濃眉', '美斯/蘇亞雷斯/卡斯米路', 'brow_11',
    'a pair of thick bushy untamed eyebrows with rough sketchy edges, heavy and expressive', ['brow_3', 'brow_7']),
  BROW('slit-brows', '界眉（剃線）', '耶馬/尼高威廉斯/里奧', 'brow_12',
    'a pair of bold straight eyebrows, each with one clean shaved slit gap near the outer end', ['brow_3', 'brow_2']),
  BROW('bold-brows', '濃一字眉', '哈利卡尼/貝寧咸/洛迪', 'brow_13',
    'a pair of thick bold straight bar-shaped eyebrows sitting level above the eyes', ['brow_3', 'brow_2']),
  BROW('arch-brows', '精修挑眉', 'C朗拿度/哈基米/基利殊', 'brow_14',
    'a pair of well-groomed arched eyebrows with a confident peak, cleanly shaped edges', ['brow_8', 'brow_7']),
  BROW('thin-brows', '幼淡眉', '夏蘭特/科登/迪布尼', 'brow_15',
    'a pair of thin light subtle eyebrows, delicate short strokes', ['brow_1', 'brow_6']),
  BROW('fierce-brows', '倒豎怒眉', '勞塔羅/紐尼斯/洛迪加', 'brow_16',
    'a pair of sharply angled fierce eyebrows slanting steeply down toward the nose', ['brow_4', 'brow_3']),
  BROW('worried-brows', '憂愁八字眉', '落敗情緒通用', 'brow_17',
    'a pair of worried eyebrows tilted upward at the inner ends in a soft sad slope', ['brow_7', 'brow_1']),
  BROW('raised-brow', '高低質疑眉', '俏皮/質疑表情通用', 'brow_18',
    'a quizzical pair of eyebrows with one raised high in an arch and the other flat', ['brow_8', 'brow_1']),

  /* ================= 嘴（10） ================= */
  MOUTH('grin-mouth', '露齒大笑嘴', '尼馬/雲尼修斯/孫興慜', 'mouth_11',
    'a wide joyful beaming grin showing a row of bright teeth, corners raised high, radiating confidence', ['mouth_5', 'mouth_4']),
  MOUTH('pout-mouth', '嘟嘴笑', '麥巴比', 'mouth_12',
    'a playful confident pout: full lips pressed together in a small proud smile', ['mouth_7', 'mouth_3']),
  MOUTH('braces-mouth', '箍牙露齒笑', '耶馬（紅藍星形箍牙）', 'mouth_13',
    'a beaming youthful grin showing a row of teeth fitted with tiny colorful red and blue braces brackets connected by a thin wire, radiating teenage confidence', ['mouth_4', 'mouth_5']),
  MOUTH('subtle-mouth', '淺笑', '美斯/哈利卡尼/比德利', 'mouth_14',
    'a small soft closed smile, gently curved, humble and calm', ['mouth_3', 'mouth_2']),
  MOUTH('smirk-mouth', '自信奸笑', 'C朗拿度/加拿祖/大馬天尼斯', 'mouth_15',
    'a confident one-sided smirk with one corner pulled up, cocky and charming', ['mouth_2', 'mouth_8']),
  MOUTH('gritted-mouth', '咬緊牙關', '比賽拼搏通用', 'mouth_16',
    'a determined gritted-teeth mouth: clenched jaw showing a tight row of pressed teeth', ['mouth_4', 'mouth_1']),
  MOUTH('sulky-mouth', '唔忿嘟嘴', '落敗/扁嘴情緒通用', 'mouth_17',
    'a sulky pouting mouth pushed to one side, unimpressed and grumpy', ['mouth_8', 'mouth_7']),
  MOUTH('roar-mouth', '怒吼咆哮', '勞塔羅/加維/紐尼斯', 'mouth_18',
    'a fierce roaring open mouth mid-shout, upper teeth showing, full passion celebration', ['mouth_5', 'mouth_4']),
  MOUTH('whistle-mouth', '吹哨嘴', '球證/教練 NPC 用', 'mouth_19',
    'small puckered lips blowing a whistle, cheeks slightly puffed, with two tiny motion lines', ['mouth_7', 'mouth_3']),
  MOUTH('medal-mouth', '咬獎牌嘴', '冠軍領獎名場面通用', 'mouth_20',
    'a champion mouth biting down on the edge of a shiny gold medal, teeth gripping the metal disc, joyful winner pose', ['mouth_4', 'mouth_5']),

  /* ================= 鬍鬚（6） ================= */
  BEARD('line-beard', '精修界線鬚', '尼馬/雲尼修斯/哈基米/阿諾特', 'beard_11',
    'a precisely trimmed pencil-thin beard tracing the jawline and chin with sharp clean edges', ['beard_7', 'beard_1']),
  BEARD('neat-beard', '短絡腮鬍', '美斯/麥亞里士打/卡華哈爾', 'beard_12',
    'a neat short full beard hugging the jawline and chin evenly, tidy and well-kept', ['beard_3', 'beard_7']),
  BEARD('dense-beard', '濃密大鬍', '沙拿/賓斯馬/阿利臣', 'beard_13',
    'a dense full rounded beard covering the jaw, chin and upper lip with rich curly volume', ['beard_4', 'beard_10']),
  BEARD('stubble-beard', '鬚根', 'C朗拿度/洛迪/摩迪', 'beard_14',
    'five-oclock-shadow stubble: a scattering of many tiny short dots and dashes along the jawline and chin only, sparse speckled texture with ragged uneven edges — NOT a solid band, NOT a smooth shape, just gritty stubble dots hugging the jaw edge', ['beard_5', 'beard_7']),
  BEARD('goatee-beard', '山羊鬚', '普巴', 'beard_15',
    'a trimmed goatee: a tidy patch of beard on the chin with a clean bare jawline', ['beard_9', 'beard_1']),
  BEARD('circle-beard', '口環鬚', '艾達臣/通用', 'beard_16',
    'a connected circle beard: moustache joined to a chin beard forming a neat ring around the mouth', ['beard_1', 'beard_9'])
];

/** 真係夠似、直接沿用現有部件嘅款（其餘已改為生成專業版）。 */
export const COVERAGE = [
  { zh: '及肩順髮（摩迪/泰奧）', file: 'hair_11.png' },
  { zh: '束髻（雲戴克）', file: 'hair_9.png' },
  { zh: '碎立短髮（久保建英/三笘薰）', file: 'hair_short_26.png' },
  { zh: '軟性側掃（比德利/域斯/古拿）', file: 'hair_short_22.png' },
  { zh: '蓬鬆亂髮（洛迪/加維/祖奧尼維斯）', file: 'hair_short_18.png' },
  { zh: '圓大明亮眼（恩迪克/慕西亞拉）', file: 'eye_4.png' },
  { zh: '八字友善眼（卡尼/迪布尼）', file: 'eye_2.png' },
  { zh: '柔彎眉（孫興慜/慕西亞拉）', file: 'brow_7.png' },
  { zh: '壓眼濃眉（雲戴克）', file: 'brow_3.png' },
  { zh: '抿嘴一字（夏蘭特/雲戴克）', file: 'mouth_1.png' },
  { zh: '大板牙笑（蘇亞雷斯/奧斯文）', file: 'mouth_4.png' },
  { zh: '開口吶喊（費明）', file: 'mouth_5.png' },
  { zh: '吐脷慶祝', file: 'mouth_9.png' },
  { zh: '童顏甜笑（坎巴斯/緬奴）', file: 'mouth_3.png' },
  { zh: '落角嚴肅（卡斯米路/魯賓迪亞斯）', file: 'mouth_8.png' },
  { zh: '邋遢亂鬚（蘇亞雷斯/大馬天尼斯）', file: 'beard_5.png' },
  { zh: '兩撇雞（基沙文）', file: 'beard_8.png' },
  { zh: '下巴小撮', file: 'beard_2.png' }
];
