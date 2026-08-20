import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ROOT, GENERATED_DIR, loadConfig, keyStatus } from './store.js';
import { safePath, searchFiles } from './packs.js';
import { prepRefs, generateGemini, generateOpenAI, generateFal } from './providers.js';
import { removeBackground } from './removebg.js';
import { alignPart, makeGhostPreview, partTypeOf, rebuildManifest } from './align.js';
import { analyzeNine, renderNineStretch } from './ninepatch.js';
import { makeMetalVariant } from './recolor.js';

export const OUTPUT_PACK = 'Football Pack';

/* ---------------- programmatic parts ---------------- */

/** Baked drop shadow from a cut-out sprite, like the packs' *_Shadow.png. */
export async function makeShadow(cutBuf, { squash = 0.32, blurSigma = 9, opacity = 0.38 } = {}) {
  const { data, info } = await sharp(cutBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const black = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) black[i * 4 + 3] = data[i * 4 + 3];
  const squashed = await sharp(black, { raw: { width: w, height: h, channels: 4 } })
    .resize(w, Math.max(8, Math.round(h * squash)), { fit: 'fill' })
    .blur(blurSigma)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sd = squashed.data;
  for (let i = 3; i < sd.length; i += 4) sd[i] = Math.round(sd[i] * opacity);
  return sharp(sd, { raw: { width: squashed.info.width, height: squashed.info.height, channels: 4 } })
    .png()
    .toBuffer();
}

/** Greyscale "tintable" version of a part (hair/beard style), dark outline preserved. */
export async function makeTintable(cutBuf) {
  const { data, info } = await sharp(cutBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const v = lum < 80 ? Math.round(lum * 0.45) : Math.round(Math.min(255, 198 + (lum - 80) * 0.3));
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Center-fit a cut-out onto a fixed square transparent canvas（icon 族統一畫布，HUD 排排企先齊整）. */
export async function fitCanvas(buf, size, margin = 0.06) {
  const inner = Math.max(8, Math.round(size * (1 - margin * 2)));
  const resized = await sharp(buf).resize(inner, inner, { fit: 'inside' }).png().toBuffer();
  const m = await sharp(resized).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left: Math.round((size - m.width) / 2), top: Math.round((size - m.height) / 2) }])
    .png()
    .toBuffer();
}

/* ---------------- recipes ---------------- */

const STYLE_REMINDER = 'Match the exact art style, line weight, color palette and glossy rendering of the reference images.';

/** Expand a blueprint item into concrete generation steps. */
export function buildSteps(item) {
  const s = item.prompt;
  switch (item.kind) {
    case 'building': {
      const lv = item.levels ?? 3;
      const steps = [];
      for (let i = 1; i <= lv; i++) {
        steps.push({
          key: `L${i}`,
          name: `等級 ${i}`,
          file: `${item.file}_0${i}.png`,
          shadowFile: `${item.file}_0${i}_Shadow.png`,
          refMode: i === 1 ? 'auto' : 'prev',
          prompt:
            i === 1
              ? `${s}, small starter version (level 1 of ${lv}), modest and simple`
              : `The exact same building upgraded to level ${i} of ${lv}: same viewing angle and same art style, ${i === lv ? 'grand fully-upgraded flagship version with flags, lights and rich decorations' : 'larger with more details and extra decorations'}`,
          shadow: true
        });
      }
      return steps;
    }
    case 'chest':
      return [
        { key: 'down', name: '閂埋', file: `box_${item.file}_down.png`, refMode: 'auto', prompt: `${s}, closed, front three-quarter view` },
        { key: 'up', name: '打開（空）', file: `box_${item.file}_up.png`, refMode: 'prev', prompt: 'The exact same chest now wide open with the lid raised, empty inside, same angle, same art style' },
        { key: 'open', name: '爆獎', file: `${item.file}_open.png`, refMode: 'prev', prompt: `The exact same open chest bursting with ${item.contents || 'golden footballs and coins'} flying out, sparkles and light rays, same angle and style` },
        { key: 'item', name: '獎品本身', file: `${item.file}.png`, refMode: 'auto', prompt: `${item.contents || 'a pile of golden footballs and coins'}, as a single centered game asset` }
      ];
    case 'part': {
      const steps = [
        {
          key: 'onhead', name: 'AI 定位稿（檢查用）', file: `${item.file}_ai.png`, refMode: 'auto', internal: true,
          prompt: `The exact same plain cartoon head template as in the reference images, unchanged, with ONLY one addition: ${s}. Draw the addition in the same position, scale and line weight as the reference examples. Keep the head plain light grey with no other features`
        },
        {
          key: 'part', name: '對齊零件（釘落 128 座標）', file: `${item.file}.png`, refMode: 'prev', align: partTypeOf(item.file),
          prompt: `ONLY the ${item.partNoun || 'new facial feature'} from the reference image, by itself with nothing else, same angle, same scale, same art style`
        }
      ];
      if (item.tint) steps.push({ key: 'tint', name: '灰階染色版', file: `${item.file}_tint.png`, local: 'tint' });
      return steps;
    }
    case 'series':
      return (item.series || []).map((st, i) => ({
        key: st.key || `s${i + 1}`,
        name: st.name || st.file,
        file: `${st.file}.png`,
        refMode: st.refMode || (i === 0 ? 'auto' : 'prev+auto'),
        prompt: st.prompt,
        canvas: st.canvas,
        local: st.local,
        tier: st.tier,
        nine: st.nine ?? item.nine ?? false,
        shadow: st.shadow ?? false,
        shadowFile: `${st.file}_Shadow.png`
      }));
    case 'ninepatch':
      return [{ key: 'main', name: '主圖（九宮格）', file: `${item.file}.png`, refMode: 'auto', prompt: s, nine: true }];
    default:
      return [{ key: 'main', name: '主圖', file: `${item.file}.png`, refMode: 'auto', prompt: s, shadow: item.shadow ?? false, shadowFile: `${item.file}_Shadow.png` }];
  }
}

/* ---------------- job runner ---------------- */

const jobs = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function getJob(id) {
  return jobs.get(id) || null;
}

/* ---------------- star-parts batch queue（一次過做晒未生成嘅） ---------------- */

let starBatch = null;

export function getStarBatch() {
  return starBatch;
}

export function stopStarBatch() {
  if (starBatch && !starBatch.done) starBatch.stopped = true;
  return starBatch;
}

export function startStarBatch({ items, provider, tier }) {
  if (starBatch && !starBatch.done) throw new Error('已經有批量生成行緊');
  if (!items.length) throw new Error('冇未生成嘅零件');
  const keys = keyStatus();
  if (provider === 'fal' && !keys.fal) throw new Error('未設定 fal.ai API key');
  if (provider === 'gemini' && !keys.gemini) throw new Error('未設定 Gemini API key');
  if (provider === 'openai' && !keys.openai) throw new Error('未設定 OpenAI API key');
  if (provider === 'mock' && process.env.ARTPACK_MOCK !== '1') throw new Error('mock provider 未啟用');

  starBatch = {
    id: 'batch_' + Date.now().toString(36),
    ts: Date.now(), provider, tier,
    total: items.length, itemIds: items.map((i) => i.id),
    jobs: {}, done: false, stopped: false
  };
  const batch = starBatch;

  (async () => {
    const queue = [...items];
    const worker = async () => {
      while (queue.length && !batch.stopped) {
        const item = queue.shift();
        try {
          const job = await startSetJob({ item, provider, tier });
          batch.jobs[item.id] = job;
          while (!job.done) await sleep(1200);
        } catch (e) {
          batch.jobs[item.id] = {
            itemId: item.id, itemName: item.name, done: true,
            error: String(e?.message || e), steps: []
          };
        }
      }
    };
    await Promise.all([worker(), worker()]); // 兩條線並行
    batch.done = true;
  })();

  return batch;
}

export function listJobs() {
  return [...jobs.values()].sort((a, b) => b.ts - a.ts).slice(0, 20);
}

async function resolveAutoRefs(item, userRefs) {
  if (userRefs?.length) return userRefs.map((r) => safePath(r));
  const abs = [];
  for (const pat of item.refPatterns || []) {
    // 同名檔案可能有 128/256/512 幾個版本 — 揀最大嗰個做參考，風格訊號最強
    let best = null, bestSize = -1;
    for (const h of searchFiles(pat, 8)) {
      const a = safePath(h);
      let sz = 0;
      try { sz = fs.statSync(a).size; } catch {}
      if (sz > bestSize) { bestSize = sz; best = a; }
    }
    if (best) abs.push(best);
  }
  return abs;
}

export async function startSetJob({ item, provider, tier = 'std', customPrompt, userRefs }) {
  const cfg = loadConfig();
  const keys = keyStatus();
  if (provider === 'gemini' && !keys.gemini) throw new Error('未設定 Gemini API key');
  if (provider === 'openai' && !keys.openai) throw new Error('未設定 OpenAI API key');
  if (provider === 'fal' && !keys.fal) throw new Error('未設定 fal.ai API key');
  if (provider === 'mock' && process.env.ARTPACK_MOCK !== '1') throw new Error('mock provider 未啟用');

  const work = { ...item };
  if (customPrompt?.trim()) work.prompt = customPrompt.trim();
  const steps = buildSteps(work).map((st) => ({ ...st, status: 'pending', images: [], error: null }));

  const id = 'set_' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  const outDirRel = item.kind === 'single'
    ? path.join(OUTPUT_PACK, item.cat)
    : path.join(OUTPUT_PACK, item.cat, item.folder || item.file);
  const job = {
    id, ts: Date.now(), itemId: item.id, itemName: item.name, cat: item.cat,
    provider, tier, prompt: work.prompt, outDir: outDirRel, userRefs,
    steps, done: false, error: null
  };
  jobs.set(id, job);
  runJob(job, work, cfg).catch((e) => {
    job.error = String(e?.message || e);
    job.done = true;
  });
  return job;
}

async function generateOne({ provider, cfg, prompt, refsAbs, tier, aspect }) {
  if (provider === 'mock') {
    const hue = Math.floor(Math.random() * 360);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='768' height='768'><rect width='768' height='768' fill='#00FF00'/><rect x='184' y='184' width='400' height='400' rx='60' fill='hsl(${hue},90%,55%)' stroke='#1a1a1a' stroke-width='18'/></svg>`;
    await new Promise((r) => setTimeout(r, 300));
    return [await sharp(Buffer.from(svg)).png().toBuffer()];
  }
  const prepped = refsAbs.length ? await prepRefs(refsAbs) : [];
  const TIER = { low: ['1K', 'low'], std: ['1K', 'medium'], high: ['2K', 'high'], ultra: ['4K', 'high'] }[tier] || ['1K', 'medium'];
  if (provider === 'gemini') {
    return generateGemini({
      apiKey: process.env.GEMINI_API_KEY, model: cfg.geminiModel, prompt,
      refs: prepped, aspectRatio: aspect || '1:1', imageSize: TIER[0], count: 1
    });
  }
  if (provider === 'fal') {
    return generateFal({
      apiKey: process.env.FAL_KEY, model: cfg.falModel, editModel: cfg.falEditModel, prompt,
      refs: prepped, aspect: aspect || '1:1', quality: TIER[1], count: 1
    });
  }
  return generateOpenAI({
    apiKey: process.env.OPENAI_API_KEY, model: cfg.openaiModel, prompt,
    refs: prepped, size: aspect === '16:9' || aspect === '4:3' ? '1536x1024' : aspect === '3:4' || aspect === '9:16' ? '1024x1536' : '1024x1024', quality: TIER[1], count: 1, transparent: false
  });
}

async function runJob(job, item, cfg) {
  const style = cfg.styles.find((x) => x.id === (item.styleId || 'casual-glossy'));
  const outAbs = path.join(ROOT, job.outDir);
  fs.mkdirSync(outAbs, { recursive: true });
  const rawDir = path.join(GENERATED_DIR, 'raw', job.id);
  fs.mkdirSync(rawDir, { recursive: true });

  let prevCut = null; // Buffer of previous step's cut-out, for chaining
  let prevPath = null;
  let masterCut = null; // 第一件生成品嘅 cut-out — local 'metal' 變體用佢做 master
  let firstPath = null; // first non-internal step's raw — 'first' refMode 錨住第一件，避免鏈式漂移

  for (const step of job.steps) {
    step.status = 'running';
    try {
      if (step.local === 'tint') {
        if (!prevCut) throw new Error('冇上一步輸出可以做灰階');
        const tint = await makeTintable(prevCut);
        fs.writeFileSync(path.join(outAbs, step.file), tint);
        step.images.push(path.join(job.outDir, step.file));
        step.status = 'done';
        continue;
      }
      if (step.local === 'metal') {
        if (!masterCut) throw new Error('冇 master 框可以染色（第一步要成功先）');
        const variant = await makeMetalVariant(masterCut, step.tier);
        fs.writeFileSync(path.join(outAbs, step.file), variant);
        step.images.push(path.join(job.outDir, step.file));
        step.status = 'done';
        continue;
      }

      let refsAbs = [];
      if (step.refMode === 'auto') refsAbs = await resolveAutoRefs(item, job.userRefs);
      else if (step.refMode === 'prev' && prevPath) refsAbs = [prevPath];
      else if (step.refMode === 'first' && firstPath) refsAbs = [firstPath];
      if (step.refMode === 'prev+auto') refsAbs = [...(prevPath ? [prevPath] : []), ...(await resolveAutoRefs(item, job.userRefs))];
      if (step.refMode === 'first+auto') refsAbs = [...(firstPath ? [firstPath] : []), ...(await resolveAutoRefs(item, job.userRefs))];

      const fullPrompt =
        step.prompt +
        (step.nine
          ? '. NINE-SLICE CONSTRAINT: decorative details ONLY in the four corners; all four edges must be perfectly straight and uniform along their whole length; the center area completely flat and plain with no ornaments; shape axis-aligned and symmetrical'
          : '') +
        (style?.text ? `. Art style: ${style.text}` : '') +
        (refsAbs.length ? `. ${STYLE_REMINDER}` : '') +
        (item.noCut
          ? ''
          : `. The subject must be isolated on a single flat solid uniform bright ${item.chroma === 'magenta' ? 'magenta #FF00FF' : 'green #00FF00'} chroma-key background that fills the whole frame — no shadows on the background, no gradients, no other elements`);

      const buffers = await generateOne({
        provider: job.provider, cfg, prompt: fullPrompt, refsAbs, tier: job.tier, aspect: item.aspect
      });

      fs.writeFileSync(path.join(rawDir, step.file), buffers[0]);
      const cut = item.noCut ? buffers[0] : (await removeBackground(buffers[0])).buffer;

      if (step.internal) {
        // AI 定位稿：淨係留喺 raw 資料夾俾人 check，唔入 pack
        const rel = path.join('Generated', 'raw', job.id, step.file);
        step.images.push(rel);
      } else if (step.align) {
        // 對齊零件：釘落 128 座標系 → 4 個檔案
        const base = step.file.replace(/\.png$/, '');
        const { c128, hd } = await alignPart(cut, step.align);
        const preview = await makeGhostPreview(c128);
        fs.writeFileSync(path.join(outAbs, `${base}.png`), c128);
        fs.writeFileSync(path.join(outAbs, `${base}_hd.png`), hd);
        fs.writeFileSync(path.join(outAbs, `${base}_1.png`), cut);
        fs.writeFileSync(path.join(outAbs, `${base}_preview.png`), preview);
        step.images.push(path.join(job.outDir, `${base}_preview.png`), path.join(job.outDir, `${base}.png`));
        prevCut = hd; // 灰階步驟用高清對齊版
      } else {
        const canvasSize = step.canvas || item.canvas;
        const outBuf = canvasSize && !item.noCut ? await fitCanvas(cut, canvasSize) : cut;
        fs.writeFileSync(path.join(outAbs, step.file), outBuf);
        step.images.push(path.join(job.outDir, step.file));
        if (step.nine) {
          const base = step.file.replace(/\.png$/, '');
          const nine = await analyzeNine(outBuf);
          fs.writeFileSync(path.join(outAbs, `${base}_slices.json`), JSON.stringify(nine, null, 2));
          const test = await renderNineStretch(outBuf, nine);
          fs.writeFileSync(path.join(outAbs, `${base}_stretchtest.png`), test);
          step.images.push(path.join(job.outDir, `${base}_stretchtest.png`));
          if (!nine.ok) step.name += '（⚠️ 邊唔夠均勻，margins 用咗三等分 fallback）';
        }
      }

      if (step.shadow) {
        const sh = await makeShadow(cut);
        fs.writeFileSync(path.join(outAbs, step.shadowFile), sh);
        step.images.push(path.join(job.outDir, step.shadowFile));
      }

      if (!step.align) prevCut = cut;
      if (!masterCut && !step.internal) masterCut = cut;
      prevPath = path.join(rawDir, step.file); // chain the raw (with bg) — model keeps framing better
      if (!firstPath && !step.internal) firstPath = prevPath;
      step.status = 'done';
    } catch (e) {
      step.status = 'error';
      step.error = String(e?.message || e);
      // keep going: later steps that depend on prev will reuse the last good one
    }
  }
  if (item.cat === '球星部件') {
    try {
      await rebuildManifest(fs, path.join(ROOT, OUTPUT_PACK, '球星部件'));
    } catch {}
  }
  job.done = true;
}
