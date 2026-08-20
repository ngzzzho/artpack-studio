import sharp from 'sharp';

/**
 * Chroma-key style background removal, tuned for game assets generated on a
 * solid uniform background (we ask the model for pure green). Flood-fills
 * from the borders so enclosed same-color regions (eyes, gems…) survive.
 */
export async function removeBackground(buf, { pad = 12, greenPassTol = 0.9 } = {}) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;

  // Already transparent around the border? Nothing to do.
  let borderAlpha = 0;
  let borderCount = 0;
  const borderIdx = [];
  for (let x = 0; x < w; x++) borderIdx.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) borderIdx.push(y * w, y * w + w - 1);
  for (const i of borderIdx) {
    borderAlpha += data[i * 4 + 3];
    borderCount++;
  }
  if (borderAlpha / borderCount < 40) return { buffer: buf, changed: false };

  // Dominant border color (quantised mode).
  const tally = new Map();
  for (const i of borderIdx) {
    const r = data[i * 4] >> 4, g = data[i * 4 + 1] >> 4, b = data[i * 4 + 2] >> 4;
    const key = (r << 8) | (g << 4) | b;
    tally.set(key, (tally.get(key) || 0) + 1);
  }
  let bgKey = 0, best = -1;
  for (const [k, c] of tally) if (c > best) { best = c; bgKey = k; }
  // Average the exact border pixels belonging to the dominant bucket.
  let br = 0, bg = 0, bb = 0, bc = 0;
  for (const i of borderIdx) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (((r >> 4) << 8 | (g >> 4) << 4 | b >> 4) === bgKey) { br += r; bg += g; bb += b; bc++; }
  }
  br /= bc; bg /= bc; bb /= bc;

  const dist = (i) => {
    const dr = data[i * 4] - br, dg = data[i * 4 + 1] - bg, db = data[i * 4 + 2] - bb;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const TOL = 72;          // flood tolerance
  const FEATHER = 118;     // soft edge zone beyond TOL
  const removed = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  for (const i of borderIdx) {
    if (!removed[i] && dist(i) < TOL) { removed[i] = 1; stack[sp++] = i; }
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w, y = (i / w) | 0;
    const neigh = [];
    if (x > 0) neigh.push(i - 1);
    if (x < w - 1) neigh.push(i + 1);
    if (y > 0) neigh.push(i - w);
    if (y < h - 1) neigh.push(i + w);
    for (const j of neigh) {
      if (!removed[j] && dist(j) < TOL) { removed[j] = 1; stack[sp++] = j; }
    }
  }

  const isBgGreen = bg > br + 40 && bg > bb + 40;
  // 綠幕先有嘅第二 pass：連封閉綠色區（辮罅、圈圈入面）都清埋。
  // 用較緊 tolerance，避免誤殺作品本身嘅綠色。
  if (isBgGreen) {
    const TOL2 = TOL * greenPassTol;
    for (let i = 0; i < n; i++) {
      if (!removed[i] && dist(i) < TOL2) removed[i] = 1;
    }
  }
  for (let i = 0; i < n; i++) {
    if (removed[i]) { data[i * 4 + 3] = 0; continue; }
    // Feather + despill only pixels touching the removed region.
    const x = i % w, y = (i / w) | 0;
    const touching =
      (x > 0 && removed[i - 1]) || (x < w - 1 && removed[i + 1]) ||
      (y > 0 && removed[i - w]) || (y < h - 1 && removed[i + w]);
    if (!touching) continue;
    const d = dist(i);
    if (d < FEATHER) {
      const t = Math.max(0, Math.min(1, (d - TOL * 0.6) / (FEATHER - TOL * 0.6)));
      data[i * 4 + 3] = Math.round(data[i * 4 + 3] * t);
    }
    if (isBgGreen) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const cap = Math.max(r, b) + 24;
      if (g > cap) data[i * 4 + 1] = cap;
    }
  }

  // Crop to content with padding.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  let img = sharp(data, { raw: { width: w, height: h, channels: 4 } });
  if (maxX >= minX && (maxX - minX + 1) * (maxY - minY + 1) < n * 0.98) {
    const left = Math.max(0, minX - pad);
    const top = Math.max(0, minY - pad);
    img = img.extract({
      left,
      top,
      width: Math.min(w, maxX + pad + 1) - left,
      height: Math.min(h, maxY + pad + 1) - top
    });
  }
  const out = await img.png().toBuffer();
  return { buffer: out, changed: true };
}
