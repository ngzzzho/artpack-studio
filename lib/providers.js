import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Downscale a reference image so we don't burn input tokens on 2K PNGs. */
async function prepRef(absPath, maxSide = 768) {
  const buf = await sharp(absPath)
    .resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  return { mimeType: 'image/png', data: buf.toString('base64'), absPath };
}

export async function prepRefs(absPaths) {
  return Promise.all(absPaths.map((p) => prepRef(p)));
}

// ---------------- Gemini (Nano Banana) ----------------

export async function generateGemini({ apiKey, model, prompt, refs, aspectRatio, imageSize, count }) {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  const parts = [
    ...refs.map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } })),
    { text: prompt }
  ];
  const config = { responseModalities: ['TEXT', 'IMAGE'] };
  const imageConfig = {};
  if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
  // imageSize (1K/2K/4K) is a Gemini 3 image knob; older flash models reject it.
  if (imageSize && /gemini-3/i.test(model)) imageConfig.imageSize = imageSize;
  if (Object.keys(imageConfig).length) config.imageConfig = imageConfig;

  const one = async () => {
    let res;
    try {
      res = await ai.models.generateContent({ model, contents: [{ role: 'user', parts }], config });
    } catch (err) {
      // Strip imageConfig if this model version doesn't accept it, then retry once.
      if (config.imageConfig && /imageConfig|image_config|INVALID_ARGUMENT/i.test(String(err?.message))) {
        const { imageConfig: _drop, ...rest } = config;
        res = await ai.models.generateContent({ model, contents: [{ role: 'user', parts }], config: rest });
      } else {
        throw err;
      }
    }
    const images = [];
    let text = '';
    for (const c of res.candidates ?? []) {
      for (const p of c.content?.parts ?? []) {
        if (p.inlineData?.data) images.push(Buffer.from(p.inlineData.data, 'base64'));
        else if (p.text) text += p.text;
      }
    }
    if (!images.length) {
      throw new Error('Gemini 冇回傳圖像' + (text ? `：${text.slice(0, 400)}` : `（finishReason: ${res.candidates?.[0]?.finishReason ?? '未知'}）`));
    }
    return images;
  };

  const batches = await Promise.all(Array.from({ length: count }, one));
  return batches.flat();
}

// ---------------- OpenAI (GPT Image) ----------------

/** Call fn(params); on 400 "unknown/invalid parameter" errors strip the offender and retry. */
async function withParamRetry(params, fn, attempts = 3) {
  let p = { ...params };
  for (let i = 0; ; i++) {
    try {
      return await fn(p);
    } catch (err) {
      const msg = String(err?.message || '');
      const status = err?.status ?? err?.response?.status;
      if (i >= attempts - 1 || status !== 400) throw err;
      const m = msg.match(/[Uu]nknown parameter:?\s*'?([\w.]+)'?/) || msg.match(/'([\w.]+)' is not (?:supported|a valid)/);
      const key = m?.[1]?.split('.').pop();
      if (key && key in p) {
        delete p[key];
        continue;
      }
      if (/background/i.test(msg) && 'background' in p) {
        delete p.background;
        continue;
      }
      if (/size/i.test(msg) && p.size !== 'auto') {
        p.size = 'auto';
        continue;
      }
      throw err;
    }
  }
}

export async function generateOpenAI({ apiKey, model, prompt, refs, size, quality, count, transparent }) {
  const { default: OpenAI, toFile } = await import('openai');
  const client = new OpenAI({ apiKey, timeout: 300_000 });

  const params = { model, prompt, n: count, size: size || 'auto' };
  if (quality && quality !== 'auto') params.quality = quality;
  if (transparent) params.background = 'transparent';

  let res;
  if (refs.length) {
    const images = await Promise.all(
      refs.map((r) =>
        toFile(Buffer.from(r.data, 'base64'), path.basename(r.absPath || 'ref.png'), { type: 'image/png' })
      )
    );
    res = await withParamRetry(params, (p) =>
      client.images.edit({ ...p, image: images.length === 1 ? images[0] : images })
    );
  } else {
    res = await withParamRetry(params, (p) => client.images.generate(p));
  }
  const out = (res.data ?? [])
    .filter((d) => d.b64_json)
    .map((d) => Buffer.from(d.b64_json, 'base64'));
  if (!out.length) {
    // Some gateways return URLs instead of b64.
    for (const d of res.data ?? []) {
      if (d.url) {
        const r = await fetch(d.url);
        out.push(Buffer.from(await r.arrayBuffer()));
      }
    }
  }
  if (!out.length) throw new Error('OpenAI 冇回傳圖像');
  return out;
}

// ---------------- fal.ai (GPT Image 2 official partner API) ----------------

const FAL_SIZE = {
  '1:1': 'square_hd', '4:3': 'landscape_4_3', '3:4': 'portrait_4_3',
  '16:9': 'landscape_16_9', '9:16': 'portrait_16_9'
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * queue.fal.run 提交 → poll status_url → 攞 response_url。
 * refs > 0 行 <model>/edit（fal 嘅 image-to-image 一定要去 /edit，唔係 /image-to-image）。
 */
export async function generateFal({ apiKey, model, editModel, prompt, refs, aspect, quality, count }) {
  const headers = { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' };
  const endpoint = refs.length ? (editModel || `${model}/edit`) : model;

  let input = {
    prompt,
    num_images: Math.max(1, Math.min(4, count || 1)),
    image_size: FAL_SIZE[aspect] || 'square_hd',
    quality: quality || 'medium',
    output_format: 'png',
    sync_mode: true
  };
  if (refs.length) input.image_urls = refs.slice(0, 16).map((r) => `data:${r.mimeType};base64,${r.data}`);

  // submit（422 參數錯就剔走嗰個欄位重試）
  let submit;
  for (let i = 0; ; i++) {
    const res = await fetch(`https://queue.fal.run/${endpoint}`, { method: 'POST', headers, body: JSON.stringify(input) });
    if (res.ok) { submit = await res.json(); break; }
    const body = await res.text();
    if (res.status === 422 && i < 3) {
      let stripped = false;
      try {
        for (const d of JSON.parse(body).detail ?? []) {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
          if (field && field in input && field !== 'prompt' && field !== 'image_urls') {
            delete input[field];
            stripped = true;
          }
        }
      } catch {}
      if (stripped) continue;
    }
    throw new Error(`fal ${endpoint} ${res.status}：${body.slice(0, 300)}`);
  }

  const t0 = Date.now();
  while (true) {
    await sleep(2500);
    if (Date.now() - t0 > 300_000) throw new Error('fal 生成超時（5 分鐘）');
    const st = await (await fetch(submit.status_url, { headers })).json();
    if (st.status === 'COMPLETED') break;
    if (st.status === 'FAILED') {
      const detail = await (await fetch(submit.response_url, { headers })).text().catch(() => '');
      throw new Error(`fal 生成失敗：${detail.slice(0, 300)}`);
    }
  }

  const result = await (await fetch(submit.response_url, { headers })).json();
  const out = [];
  for (const im of result.images ?? []) {
    if (!im?.url) continue;
    if (im.url.startsWith('data:')) out.push(Buffer.from(im.url.split(',')[1], 'base64'));
    else out.push(Buffer.from(await (await fetch(im.url)).arrayBuffer()));
  }
  if (!out.length) throw new Error('fal 冇回傳圖像：' + JSON.stringify(result).slice(0, 300));
  return out;
}

export function providerLabel(id) {
  return id === 'gemini' ? 'Nano Banana' : id === 'openai' ? 'GPT Image' : id === 'fal' ? 'GPT Image 2 (fal)' : id;
}

/** Rough per-image USD estimate for the UI. */
export function estimateCost(provider, model, { imageSize, quality } = {}) {
  if (provider === 'gemini') {
    if (/flash/i.test(model)) return 0.03;
    return imageSize === '4K' ? 0.24 : 0.134;
  }
  if (provider === 'openai' || provider === 'fal') {
    if (quality === 'low') return 0.01;
    if (quality === 'high') return 0.17;
    return 0.05;
  }
  return 0;
}
