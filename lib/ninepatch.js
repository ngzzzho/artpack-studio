import sharp from 'sharp';

const PIXEL_TOL = 14;   // 單 channel 差幾多先算「唔同」
const BAD_RATIO = 0.02; // 一對行/列入面「唔同」pixel 佔比上限

/** 搵可拉伸帶：相鄰行/列幾乎一樣嘅最長連續段（長 + 貼近中線優先）。 */
function findBand(diffBad, size) {
  const runs = [];
  let s = -1;
  for (let i = 0; i < diffBad.length; i++) {
    if (diffBad[i]) { if (s >= 0) { runs.push([s, i]); s = -1; } }
    else if (s < 0) s = i;
  }
  if (s >= 0) runs.push([s, diffBad.length]);
  const mid = size / 2;
  let best = null, bestScore = -1;
  for (const [a, b] of runs) {
    const len = b - a;
    if (len < Math.max(8, size * 0.04)) continue;
    const score = len - Math.abs((a + b) / 2 - mid);
    if (score > bestScore) { bestScore = score; best = [a, b]; }
  }
  return best;
}

/** 分析一張圖嘅九宮格 margins。ok=false 即係搵唔到均勻邊帶（fallback 三等分）。 */
export async function analyzeNine(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x, y, c) => data[(y * w + x) * 4 + c];
  const colBad = new Array(w - 1);
  for (let x = 0; x < w - 1; x++) {
    let bad = 0;
    for (let y = 0; y < h; y++)
      for (let c = 0; c < 4; c++)
        if (Math.abs(px(x, y, c) - px(x + 1, y, c)) > PIXEL_TOL) { bad++; break; }
    colBad[x] = bad / h > BAD_RATIO;
  }
  const rowBad = new Array(h - 1);
  for (let y = 0; y < h - 1; y++) {
    let bad = 0;
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 4; c++)
        if (Math.abs(px(x, y, c) - px(x, y + 1, c)) > PIXEL_TOL) { bad++; break; }
    rowBad[y] = bad / w > BAD_RATIO;
  }
  const bx = findBand(colBad, w);
  const by = findBand(rowBad, h);
  const shrink = ([a, b]) => (b - a > 8 ? [a + 2, b - 1] : [a, b]);
  const [xl, xr] = bx ? shrink(bx) : [Math.round(w / 3), Math.round((w * 2) / 3)];
  const [yt, yb] = by ? shrink(by) : [Math.round(h / 3), Math.round((h * 2) / 3)];
  return {
    ok: Boolean(bx && by),
    width: w, height: h,
    margins: { left: xl, top: yt, right: w - xr, bottom: h - yb }
  };
}

/** 用九宮格方式拉伸渲染一張測試圖，俾人眼驗收條邊真係拉得。 */
export async function renderNineStretch(buf, nine, scaleX = 2, scaleY = 1.4) {
  const { width: w, height: h, margins: m } = nine;
  const W = Math.round(w * scaleX), H = Math.round(h * scaleY);
  const cx = [0, m.left, w - m.right, w];
  const cy = [0, m.top, h - m.bottom, h];
  const tx = [0, m.left, W - m.right, W];
  const ty = [0, m.top, H - m.bottom, H];
  const comps = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const sw = cx[i + 1] - cx[i], sh = cy[j + 1] - cy[j];
      const dw = tx[i + 1] - tx[i], dh = ty[j + 1] - ty[j];
      if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) continue;
      const piece = await sharp(buf)
        .extract({ left: cx[i], top: cy[j], width: sw, height: sh })
        .resize(dw, dh, { fit: 'fill' })
        .png().toBuffer();
      comps.push({ input: piece, left: tx[i], top: ty[j] });
    }
  }
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps).png().toBuffer();
}
