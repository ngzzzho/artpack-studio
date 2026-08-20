import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import sharp from 'sharp';

import {
  STUDIO_DIR, ROOT, GENERATED_DIR, CACHE_DIR,
  ensureDirs, loadConfig, saveConfig, keyStatus, saveKeys, saveBatchMeta, listHistory
} from './lib/store.js';
import { listDirs, listFiles, searchFiles, safePath, isImage } from './lib/packs.js';
import { prepRefs, generateGemini, generateOpenAI, generateFal } from './lib/providers.js';
import { removeBackground } from './lib/removebg.js';
import { BLUEPRINT, CATEGORIES } from './lib/blueprint.js';
import { STAR_PART_ITEMS, COVERAGE } from './lib/starparts.js';
import { startSetJob, getJob, listJobs, buildSteps, OUTPUT_PACK, startStarBatch, getStarBatch, stopStarBatch } from './lib/sets.js';

process.chdir(STUDIO_DIR);
ensureDirs();

const app = new Hono();
const PORT = Number(process.env.PORT) || 4747;

// 雲端部署：設定 ARTPACK_PASSWORD 就全站鎖密碼（瀏覽器原生登入框，iPad 都用到）
if (process.env.ARTPACK_PASSWORD) {
  app.use('*', basicAuth({ username: process.env.ARTPACK_USER || 'emma', password: process.env.ARTPACK_PASSWORD }));
}

// ---------- export zip（雲端用：一掣攞晒生成品返本地）----------
app.get('/api/export.zip', async (c) => {
  const { ZipArchive } = await import('archiver');
  const what = c.req.query('what') || 'football';
  const dirs = [];
  if (what === 'football' || what === 'all') dirs.push('Football Pack');
  if (what === 'generated' || what === 'all') dirs.push('Generated');
  if (what === 'starparts' || what === 'all') dirs.push('StarParts-Godot');
  const archive = new ZipArchive({ zlib: { level: 6 } });
  for (const d of dirs) {
    const abs = path.join(ROOT, d);
    if (fs.existsSync(abs)) archive.directory(abs, d);
  }
  archive.finalize();
  const { Readable } = await import('node:stream');
  return new Response(Readable.toWeb(archive), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="artpack-${what}-${new Date().toISOString().slice(0, 10)}.zip"`
    }
  });
});

// ---------- library ----------
app.get('/api/packs', (c) => c.json({ root: path.basename(ROOT), dirs: listDirs() }));

app.get('/api/files', (c) => {
  try {
    return c.json({ files: listFiles(c.req.query('dir') || '') });
  } catch (e) {
    return c.json({ error: String(e.message) }, 400);
  }
});

app.get('/api/search', (c) => {
  const q = (c.req.query('q') || '').trim();
  if (q.length < 2) return c.json({ files: [] });
  return c.json({ files: searchFiles(q) });
});

// ---------- config & keys ----------
const VERSION = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
app.get('/api/config', (c) => c.json({ ...loadConfig(), keys: keyStatus(), version: VERSION }));

app.post('/api/config', async (c) => {
  const body = await c.req.json();
  const allowed = {};
  for (const k of ['geminiModel', 'openaiModel', 'falModel', 'falEditModel', 'styles', 'categories']) {
    if (body[k] !== undefined) allowed[k] = body[k];
  }
  return c.json({ ...saveConfig(allowed), keys: keyStatus() });
});

app.post('/api/keys', async (c) => {
  const { gemini, openai, fal } = await c.req.json();
  return c.json({ keys: saveKeys({ gemini, openai, fal }) });
});

// ---------- history ----------
app.get('/api/history', (c) => c.json({ batches: listHistory() }));

// ---------- generation ----------
const TIER = {
  low:   { geminiSize: '1K', openaiQuality: 'low' },
  std:   { geminiSize: '1K', openaiQuality: 'medium' },
  high:  { geminiSize: '2K', openaiQuality: 'high' },
  ultra: { geminiSize: '4K', openaiQuality: 'high' }
};
const OPENAI_SIZE = (aspect) =>
  ['16:9', '4:3', '3:2'].includes(aspect) ? '1536x1024'
  : ['9:16', '3:4', '2:3'].includes(aspect) ? '1024x1536'
  : '1024x1024';

function composePrompt({ prompt, category, style, hasRefs, transparent }) {
  let fp = '';
  if (category?.text) fp += category.text + '. ';
  fp += prompt.trim();
  if (style?.text) fp += '. Art style: ' + style.text;
  if (hasRefs) fp += '. Match the exact art style, line weight, color palette and rendering of the reference images';
  if (transparent) fp += '. The subject must be isolated on a single flat solid uniform bright green #00FF00 chroma-key background that fills the whole frame — no shadows, no gradients, no floor, no other elements';
  return fp;
}

app.post('/api/generate', async (c) => {
  const body = await c.req.json();
  const {
    providers = [], prompt = '', styleId, categoryId,
    refs = [], count = 1, aspect = '1:1', tier = 'std', transparent = true
  } = body;

  if (!prompt.trim()) return c.json({ error: '寫低你想生成乜先。' }, 400);
  if (!providers.length) return c.json({ error: '至少揀一個模型。' }, 400);

  const cfg = loadConfig();
  const keys = keyStatus();
  const style = cfg.styles.find((s) => s.id === styleId);
  const category = cfg.categories.find((s) => s.id === categoryId);
  const finalPrompt = composePrompt({ prompt, category, style, hasRefs: refs.length > 0, transparent });

  const refAbs = refs.slice(0, 8).map((r) => safePath(r));
  const prepped = refAbs.length ? await prepRefs(refAbs) : [];

  const id = Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  const day = new Date().toISOString().slice(0, 10);
  const stamp = new Date().toTimeString().slice(0, 8).replaceAll(':', '');
  const outDir = path.join(GENERATED_DIR, day);
  fs.mkdirSync(outDir, { recursive: true });

  const runProvider = async (provider) => {
    const t0 = Date.now();
    try {
      let buffers;
      const n = Math.max(1, Math.min(4, count));
      if (provider === 'gemini') {
        if (!keys.gemini) throw new Error('未設定 Gemini API key（右上角「設定」入面加）');
        buffers = await generateGemini({
          apiKey: process.env.GEMINI_API_KEY,
          model: cfg.geminiModel,
          prompt: finalPrompt,
          refs: prepped,
          aspectRatio: aspect,
          imageSize: TIER[tier]?.geminiSize ?? '1K',
          count: n
        });
      } else if (provider === 'openai') {
        if (!keys.openai) throw new Error('未設定 OpenAI API key（右上角「設定」入面加）');
        buffers = await generateOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          model: cfg.openaiModel,
          prompt: finalPrompt,
          refs: prepped,
          size: OPENAI_SIZE(aspect),
          quality: TIER[tier]?.openaiQuality ?? 'medium',
          count: n,
          transparent: false // green-screen + local chroma key is the reliable path
        });
      } else if (provider === 'fal') {
        if (!keys.fal) throw new Error('未設定 fal.ai API key（右上角「設定」入面加）');
        buffers = await generateFal({
          apiKey: process.env.FAL_KEY,
          model: cfg.falModel,
          editModel: cfg.falEditModel,
          prompt: finalPrompt,
          refs: prepped,
          aspect,
          quality: TIER[tier]?.openaiQuality ?? 'medium',
          count: n
        });
      } else {
        throw new Error(`未知 provider: ${provider}`);
      }

      const images = [];
      for (let i = 0; i < buffers.length; i++) {
        const base = `${stamp}_${provider}_${i + 1}`;
        let finalBuf = buffers[i];
        let rawPath = null;
        if (transparent) {
          const { buffer: cut, changed } = await removeBackground(buffers[i]);
          if (changed) {
            rawPath = `Generated/${day}/${base}_raw.png`;
            fs.writeFileSync(path.join(ROOT, rawPath), buffers[i]);
            finalBuf = cut;
          }
        }
        const rel = `Generated/${day}/${base}.png`;
        fs.writeFileSync(path.join(ROOT, rel), finalBuf);
        images.push({ path: rel, rawPath });
      }
      return { provider, ok: true, images, ms: Date.now() - t0 };
    } catch (err) {
      return { provider, ok: false, images: [], error: String(err?.message || err), ms: Date.now() - t0 };
    }
  };

  const results = await Promise.all(providers.map(runProvider));

  const meta = {
    id, ts: Date.now(), day,
    userPrompt: prompt, finalPrompt,
    styleId, categoryId, refs, count, aspect, tier, transparent,
    results
  };
  saveBatchMeta(meta);
  return c.json(meta);
});

// ---------- football blueprint & set jobs ----------
app.get('/api/blueprint', (c) => {
  const items = BLUEPRINT.map((it) => {
    const outDir = it.kind === 'single'
      ? path.join(ROOT, OUTPUT_PACK, it.cat)
      : path.join(ROOT, OUTPUT_PACK, it.cat, it.folder || it.file);
    let done = false;
    try {
      done = it.kind === 'single'
        ? fs.existsSync(path.join(outDir, `${it.file}.png`))
        : fs.existsSync(outDir) && fs.readdirSync(outDir).some((f) => f.endsWith('.png'));
    } catch {}
    const steps = buildSteps(it).map((s) => ({ key: s.key, name: s.name, file: s.file, local: Boolean(s.local) }));
    return { ...it, steps, done };
  });
  return c.json({ categories: CATEGORIES, items, mock: process.env.ARTPACK_MOCK === '1' });
});

// 球星零件：待開發清單（預綁 refs + 詳細 prompt）+ 已有 coverage
const starItemDone = (it) => {
  const outDir = path.join(ROOT, OUTPUT_PACK, it.cat, it.folder || it.file);
  try {
    return fs.existsSync(outDir) && fs.readdirSync(outDir).some((f) => f.endsWith('.png'));
  } catch {
    return false;
  }
};

app.get('/api/starparts', (c) => {
  const items = STAR_PART_ITEMS.map((it) => {
    const refs = (it.refPatterns || []).map((p) => searchFiles(p, 1)[0]).filter(Boolean);
    const steps = buildSteps(it).map((s) => ({ key: s.key, name: s.name, file: s.file, local: Boolean(s.local) }));
    return { ...it, refs, steps, done: starItemDone(it) };
  });
  const coverage = COVERAGE.map((cv) => ({ ...cv, path: searchFiles(cv.file, 1)[0] || null }));
  return c.json({ items, coverage });
});

// 批量：一次過生成晒未做嘅
app.post('/api/star-batch', async (c) => {
  const { provider, tier } = await c.req.json();
  const pending = STAR_PART_ITEMS.filter((it) => !starItemDone(it));
  try {
    return c.json(startStarBatch({ items: pending, provider, tier: tier || 'std' }));
  } catch (e) {
    return c.json({ error: String(e?.message || e) }, 400);
  }
});

app.get('/api/star-batch', (c) => {
  const b = getStarBatch();
  return c.json(b || { none: true });
});

app.post('/api/star-batch/stop', (c) => c.json(stopStarBatch() || { none: true }));

app.post('/api/set-jobs', async (c) => {
  const { itemId, provider, tier, customPrompt, refs } = await c.req.json();
  const item = BLUEPRINT.find((i) => i.id === itemId) || STAR_PART_ITEMS.find((i) => i.id === itemId);
  if (!item) return c.json({ error: '搵唔到呢個藍圖項目' }, 400);
  try {
    const job = await startSetJob({ item, provider, tier, customPrompt, userRefs: refs });
    return c.json(job);
  } catch (e) {
    return c.json({ error: String(e?.message || e) }, 400);
  }
});

app.get('/api/set-jobs/:id', (c) => {
  const job = getJob(c.req.param('id'));
  return job ? c.json(job) : c.json({ error: 'job 唔存在' }, 404);
});

app.get('/api/set-jobs', (c) => c.json({ jobs: listJobs() }));

// ---------- background removal on demand ----------
app.post('/api/removebg', async (c) => {
  try {
    const { path: rel } = await c.req.json();
    const abs = safePath(rel);
    const { buffer, changed } = await removeBackground(fs.readFileSync(abs));
    if (!changed) return c.json({ path: rel, changed: false });
    const name = path.basename(rel).replace(/\.(png|jpe?g|webp)$/i, '') + '_cut.png';
    const outRel = `Generated/edits/${Date.now().toString(36)}_${name}`;
    fs.writeFileSync(path.join(ROOT, outRel), buffer);
    return c.json({ path: outRel, changed: true });
  } catch (e) {
    return c.json({ error: String(e.message) }, 400);
  }
});

// ---------- images: thumbnails + originals ----------
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

app.get('/thumb/:size/*', async (c) => {
  try {
    const size = Math.min(512, Math.max(48, parseInt(c.req.param('size'), 10) || 128));
    const rel = decodeURIComponent(c.req.path.replace(/^\/thumb\/\d+\//, ''));
    const abs = safePath(rel);
    if (!isImage(abs)) return c.text('not an image', 400);
    const mtime = fs.statSync(abs).mtimeMs;
    const key = crypto.createHash('sha1').update(`${rel}|${size}|${mtime}`).digest('hex');
    const cached = path.join(CACHE_DIR, key + '.png');
    let buf;
    if (fs.existsSync(cached)) {
      buf = fs.readFileSync(cached);
    } else {
      buf = await sharp(abs).resize(size, size, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      fs.writeFileSync(cached, buf);
    }
    return c.body(buf, 200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
  } catch (e) {
    return c.text(String(e.message), 404);
  }
});

app.get('/file/*', (c) => {
  try {
    const rel = decodeURIComponent(c.req.path.replace(/^\/file\//, ''));
    const abs = safePath(rel);
    const mime = MIME[path.extname(abs).toLowerCase()];
    if (!mime) return c.text('unsupported', 400);
    return c.body(fs.readFileSync(abs), 200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
  } catch (e) {
    return c.text(String(e.message), 404);
  }
});

// ---------- static frontend ----------
app.use('/*', serveStatic({ root: './dist' }));
app.get('*', (c) => {
  try {
    return c.html(fs.readFileSync(path.join(STUDIO_DIR, 'dist', 'index.html'), 'utf8'));
  } catch {
    return c.text('前端未 build：請先行 npm start', 500);
  }
});

// 自動閃避被霸佔嘅 port：4747 帶住就試 4748…4757
function tryListen(port) {
  const srv = serve({ fetch: app.fetch, port }, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n🎨 ArtPack Studio v${VERSION} 開咗 → ${url}\n   素材庫：${ROOT}\n`);
    if (port !== PORT) console.log(`   （原本嘅 ${PORT} 使緊，自動換咗 ${port}）`);
    if (process.env.ARTPACK_OPEN === '1') {
      import('node:child_process').then(({ exec }) => exec(`start ${url}`, { shell: 'cmd.exe' }));
    }
  });
  srv.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && port < PORT + 10) {
      console.log(`port ${port} 使緊，試 ${port + 1}…`);
      tryListen(port + 1);
    } else {
      throw e;
    }
  });
}
tryListen(PORT);
