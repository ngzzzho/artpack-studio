import sharp from 'sharp';
import path from 'node:path';
import { ROOT } from './store.js';
import { searchFiles, safePath } from './packs.js';

/**
 * 自動對齊：將 AI 生成嘅淨件，釘落 Character Pack 嘅 128×128 頭型座標系。
 * 錨點係 2026-08-17 由 pack 現有部件實測（alpha≥250 = 實件、1–249 = 鬼影頭）：
 *   HEAD skin_1 bbox: x18–117, y20–106 (w100 h87, centre 67.5, 63)
 */
export const CANVAS = 128;
export const HD_SCALE = 4; // 512×512 高清版，同一座標 ×4

const ANCHORS = {
  // contain: 件必須裝入 box 入面（消費部件位置極穩定）
  eye:   { mode: 'contain', cx: 52.8, cy: 73.8, w: 58, h: 22 },
  brow:  { mode: 'contain', cx: 51.1, cy: 57.6, w: 45, h: 13 },
  mouth: { mode: 'contain', cx: 50.5, cy: 90.5, w: 20, h: 13 },
  // width-top: 闊度鎖定、由頂部向下生長（髮/鬚長短不一）
  hair:  { mode: 'width-top', cx: 63, top: 5, w: 113, maxH: 122 },
  beard: { mode: 'width-top', cx: 51.7, top: 80, w: 53, maxH: 46 }
};

export function partTypeOf(fileBase) {
  return fileBase.startsWith('hair') ? 'hair'
    : fileBase.startsWith('eye') ? 'eye'
    : fileBase.startsWith('brow') ? 'brow'
    : fileBase.startsWith('mouth') ? 'mouth'
    : 'beard';
}

async function placeOnCanvas(cutBuf, type, scale) {
  const a = ANCHORS[type];
  const meta = await sharp(cutBuf).metadata();
  const S = (n) => Math.round(n * scale);
  let w, h;
  if (a.mode === 'contain') {
    const r = Math.min((a.w * scale) / meta.width, (a.h * scale) / meta.height);
    w = Math.max(1, Math.round(meta.width * r));
    h = Math.max(1, Math.round(meta.height * r));
  } else {
    w = S(a.w);
    h = Math.max(1, Math.round(meta.height * (w / meta.width)));
    if (h > S(a.maxH)) {
      h = S(a.maxH);
      w = Math.max(1, Math.round(meta.width * (h / meta.height)));
    }
  }
  const left = Math.max(0, Math.round(a.cx * scale - w / 2));
  const top = a.mode === 'contain'
    ? Math.max(0, Math.round(a.cy * scale - h / 2))
    : S(a.top);
  const size = CANVAS * scale;
  const part = await sharp(cutBuf).resize(w, h, { fit: 'fill' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: part, left: Math.min(left, size - w), top: Math.min(top, size - h) }])
    .png()
    .toBuffer();
}

/** 淨件 → { c128（pack 座標 drop-in）, hd（512 同座標）} */
export async function alignPart(cutBuf, type) {
  const [c128, hd] = await Promise.all([
    placeOnCanvas(cutBuf, type, 1),
    placeOnCanvas(cutBuf, type, HD_SCALE)
  ]);
  return { c128, hd };
}

/** 128 對齊件 + 半透明鬼影頭 → pack 風格預覽（同 eye_1.png 一樣格式） */
export async function makeGhostPreview(aligned128Buf) {
  const skinRel = searchFiles('skin_1.png', 1)[0];
  if (!skinRel) return aligned128Buf;
  const { data, info } = await sharp(safePath(skinRel)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * 0.42);
  const ghost = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  return sharp(ghost).composite([{ input: aligned128Buf }]).png().toBuffer();
}

/** 重建 Football Pack/球星部件/manifest.json（Godot 讀呢個嚟載入部件）。 */
export async function rebuildManifest(fs, partsDirAbs) {
  const entries = [];
  let dirs = [];
  try {
    dirs = fs.readdirSync(partsDirAbs, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return null;
  }
  for (const d of dirs) {
    const base = d.name;
    const has = (suffix) => fs.existsSync(path.join(partsDirAbs, base, base + suffix));
    if (!has('.png')) continue;
    entries.push({
      id: base,
      slot: partTypeOf(base),
      texture: `${base}/${base}.png`,
      texture_hd: has('_hd.png') ? `${base}/${base}_hd.png` : null,
      tintable: has('_tint.png') ? `${base}/${base}_tint.png` : null,
      raw: has('_1.png') ? `${base}/${base}_1.png` : null
    });
  }
  const manifest = { canvas: CANVAS, hd_scale: HD_SCALE, generated_by: 'ArtPack Studio', parts: entries };
  fs.writeFileSync(path.join(partsDirAbs, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}
