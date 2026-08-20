/**
 * 將球星零件成品打包成 Godot 交收包：~/ArtPack/StarParts-Godot
 * 用法：cd studio && npm run export
 * （重出咗任何零件之後，行呢個 command 更新交收包＋zip）
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import { alignPart, partTypeOf } from './lib/align.js';
import { STARS } from './lib/stars.js';

const ROOT = '/Users/emma/ArtPack';
const SRC = path.join(ROOT, 'Football Pack/球星部件');
const PACK = path.join(ROOT, 'Character Pack (PNG)');
const OUT = path.join(ROOT, 'StarParts-Godot');
const P = path.join(OUT, 'parts');

// stars.js archetype id → 零件檔名（新生成 or 歸一化現有）
const MAP = {
  hair: { buzz: 'hair_short_31', microbuzz: 'hair_short_32', slickfade: 'hair_short_33', sidepart: 'hair_short_34', waves: 'hair_short_35', curlytop: 'hair_short_36', highfore: 'hair_short_37', mullet: 'hair_short_38', crop: 'hair_short_39', twists: 'hair_short_40', afro: 'hair_short_41', twoblock: 'hair_short_42', curtains: 'hair_short_43', slickback: 'hair_short_44', braids: 'hair_short_45', cornrows: 'hair_short_46', shortdreads: 'hair_short_47', flattop: 'hair_short_48', designfade: 'hair_short_49', longband: 'hair_13', headbandslick: 'hair_14', midcurls: 'hair_15', ponytail: 'hair_16', flow: 'hair_11', bun: 'hair_9', mop: 'hair_short_18', softmid: 'hair_short_22', spiky: 'hair_short_26', mane: 'hair_short_41' },
  eye: { smiley_arc: 'eye_21', ice_stare: 'eye_22', sharp_narrow: 'eye_23', droopy_calm: 'eye_24', big_expressive: 'eye_25', frown_focus: 'eye_26', hooded: 'eye_27', round_bright: 'eye_4', gentle: 'eye_2', deepset: 'eye_10' },
  brow: { bushy: 'brow_11', slit: 'brow_12', thick_straight: 'brow_13', thick_arch: 'brow_14', thin_light: 'brow_15', fierce_angled: 'brow_16', soft_curve: 'brow_7', heavy_low: 'brow_3' },
  mouth: { big_grin: 'mouth_11', pout_smile: 'mouth_12', braces_grin: 'mouth_13', soft_smile: 'mouth_14', smirk: 'mouth_15', gritted: 'mouth_16', sulky: 'mouth_17', shout: 'mouth_18', whistle: 'mouth_19', medal: 'mouth_20', toothy: 'mouth_4', tight_line: 'mouth_1', baby_smile: 'mouth_3', serious_down: 'mouth_8', tongue: 'mouth_9' },
  beard: { line_trim: 'beard_11', chinstrap: 'beard_11', full_short: 'beard_12', full_dense: 'beard_13', stubble: 'beard_14', goatee: 'beard_15', circle: 'beard_16', moustache: 'beard_8', scruffy: 'beard_5', soul: 'beard_2', none: null }
};
const EXISTING = ['skin_1', 'hair_11', 'hair_9', 'hair_short_18', 'hair_short_22', 'hair_short_26', 'eye_2', 'eye_4', 'eye_10', 'brow_3', 'brow_7', 'mouth_1', 'mouth_3', 'mouth_4', 'mouth_8', 'mouth_9', 'beard_2', 'beard_5', 'beard_8'];
// pack 原有嘅白色/灰階件：本體就係染色格式（tint_file = 自己）
const EXISTING_TINTABLE = new Set(['hair_11', 'hair_9', 'hair_short_18', 'hair_short_22', 'hair_short_26', 'beard_2', 'beard_5']);
const HAIR_HEX = { 黑: '#2b2b2e', 深啡: '#4a3526', 啡: '#6b4a2f', 金: '#e8c04c', 漂金: '#f2e089', 薑黃: '#c96a2e', 灰白: '#d8d8d8' };
const SKIN_HEX = { 淺: '#ffdbb8', 中: '#d9a06b', 深: '#8a5a3b' };

fs.rmSync(P, { recursive: true, force: true });
fs.mkdirSync(P, { recursive: true });

// 1) 生成件 flat copy
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json')));
const entries = [];
for (const pt of manifest.parts) {
  for (const suf of ['', '_hd', '_tint', '_preview']) {
    const f = pt.id + suf + '.png';
    if (fs.existsSync(path.join(SRC, pt.id, f))) fs.copyFileSync(path.join(SRC, pt.id, f), path.join(P, f));
  }
  entries.push({ id: pt.id, slot: pt.slot, source: 'generated', texture: `parts/${pt.id}.png`, hd: `parts/${pt.id}_hd.png`, tint: pt.tintable ? `parts/${pt.id}_tint.png` : null });
}

// 2) 現有件歸一化（剝鬼影頭 / 錨點對齊）
for (const base of EXISTING) {
  const p = path.join(PACK, base + '.png');
  let out;
  if (base === 'skin_1') {
    out = fs.readFileSync(p);
  } else {
    const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let ghost = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0 && data[i] < 250) ghost++;
    if (info.width === 128 && ghost >= 2000) {
      for (let i = 3; i < data.length; i += 4) if (data[i] < 200) data[i] = 0;
      out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    } else {
      out = (await alignPart(fs.readFileSync(p), partTypeOf(base))).c128;
    }
    entries.push({ id: base, slot: partTypeOf(base), source: 'pack-normalized', texture: `parts/${base}.png`, hd: null, tint: EXISTING_TINTABLE.has(base) ? `parts/${base}.png` : null });
  }
  fs.writeFileSync(path.join(P, base + '.png'), out);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ canvas: 128, hd_scale: 4, generated_by: 'ArtPack Studio', skin: 'parts/skin_1.png', parts: entries }, null, 2));

// 3) stars.json
const hasTint = (f) => fs.existsSync(path.join(P, f + '_tint.png'));
const missing = [];
const stars = STARS.map((s) => {
  const mk = (slot, id) => {
    const f = MAP[slot][id];
    if (f === undefined) missing.push(`${s.n}:${slot}:${id}`);
    if (!f) return null;
    const tintable = hasTint(f) || EXISTING_TINTABLE.has(f);
    return { file: f, tintable, tint_file: tintable ? (hasTint(f) ? f + '_tint' : f) : null };
  };
  return {
    name: s.n, hair: mk('hair', s.hair), eye: mk('eye', s.eye), brow: mk('brow', s.brow),
    mouth: mk('mouth', s.mouth), beard: s.beard === 'none' ? null : mk('beard', s.beard),
    hair_color: HAIR_HEX[s.hairColor] || '#2b2b2e', skin_color: SKIN_HEX[s.skin] || '#ffdbb8',
    extra: s.extra || null
  };
});
for (const st of stars) {
  for (const k of ['hair', 'eye', 'brow', 'mouth', 'beard']) {
    if (st[k] && !fs.existsSync(path.join(P, st[k].file + '.png'))) missing.push(`${st.name}:${k}:${st[k].file} FILE MISSING`);
  }
}
fs.writeFileSync(path.join(OUT, 'stars.json'), JSON.stringify({ canvas: 128, skin: 'skin_1', hair_colors: HAIR_HEX, skin_colors: SKIN_HEX, stars }, null, 2));

// 4) zip
execSync(`cd "${ROOT}" && rm -f StarParts-Godot.zip && zip -qr StarParts-Godot.zip StarParts-Godot -x "*.DS_Store"`);
console.log(`✓ export 完成：${fs.readdirSync(P).length} 檔案 · ${entries.length} 零件 · ${stars.length} 球星 · unresolved: ${missing.length ? missing.join(', ') : '0'}`);
console.log(`  ${OUT}`);
console.log(`  ${path.join(ROOT, 'StarParts-Godot.zip')}`);
