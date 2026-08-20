import sharp from 'sharp';

/** 金屬階目標（憲法四級）。h 色相 0-360 / s 飽和 0-1 / l 亮度增益 */
const METALS = {
  bronze: { h: 27, s: 0.62, gain: 1.0 },
  silver: { h: 215, s: 0.08, gain: 1.12 },
  gold: { h: 45, s: 0.85, gain: 1.08 },
  purplegold: { h: 276, s: 0.68, gain: 1.0, highlight: { h: 45, s: 0.9 } }
};

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * 由 master 框確定性衍生金屬變體：保留線稿（暗位）同光影結構（亮度），
 * 淨係將色相/飽和換做目標金屬。紫金 = 紫身 + 高光位轉金（雙色調）。
 */
export async function makeMetalVariant(masterBuf, tier) {
  const t = METALS[tier];
  if (!t) throw new Error(`未知金屬階：${tier}`);
  const { data, info } = await sharp(masterBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i++) {
    const a = data[i * 4 + 3];
    if (a === 0) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum < 0.16) continue; // 線稿黑邊保留
    let { h, s } = t;
    if (t.highlight && lum > 0.72) ({ h, s } = t.highlight); // 紫金：高光轉金
    const l = Math.min(1, lum * t.gain);
    const [nr, ng, nb] = hslToRgb(h, s, l);
    data[i * 4] = Math.round(nr);
    data[i * 4 + 1] = Math.round(ng);
    data[i * 4 + 2] = Math.round(nb);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
