import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STUDIO_DIR = path.resolve(__dirname, '..');
export const ROOT = process.env.ARTPACK_ROOT || path.resolve(STUDIO_DIR, '..'); // ArtPack library root
export const GENERATED_DIR = path.join(ROOT, 'Generated');
export const META_DIR = path.join(GENERATED_DIR, '.meta');
export const CACHE_DIR = path.join(STUDIO_DIR, '.cache', 'thumbs');
const CONFIG_PATH = path.join(STUDIO_DIR, 'config.json');
const ENV_PATH = path.join(STUDIO_DIR, '.env');

const DEFAULT_CONFIG = {
  geminiModel: 'gemini-3-pro-image-preview',
  openaiModel: 'gpt-image-2',
  falModel: 'openai/gpt-image-2',
  falEditModel: '', // 留空 = 自動用 <falModel>/edit
  styles: [
    {
      id: 'casual-glossy',
      name: '休閒光澤（跟現有素材風格）',
      text: '2D casual mobile game art style, bold thick dark outlines, vibrant saturated colors, glossy highlights, smooth vector-like cel shading, clean silhouette, high polish'
    },
    { id: 'pixel', name: '像素風', text: 'retro pixel art game asset, crisp pixels, limited color palette, no anti-aliasing' },
    { id: 'painterly', name: '手繪厚塗', text: 'hand-painted stylized game art, soft brush strokes, rich warm lighting' },
    { id: 'none', name: '無風格後綴', text: '' }
  ],
  categories: [
    { id: 'icon', name: '道具/Icon', text: 'a single game item icon, centered, front view' },
    { id: 'reward', name: '獎勵/寶箱', text: 'a game reward asset, centered' },
    { id: 'building', name: '建築', text: 'a cute stylized game building, three-quarter view' },
    { id: 'character', name: '角色', text: 'a full-body game character, standing pose, front view' },
    { id: 'ui', name: 'UI 元件', text: 'a mobile game UI element' },
    { id: 'free', name: '自由', text: '' }
  ]
};

export function ensureDirs() {
  for (const d of [GENERATED_DIR, META_DIR, CACHE_DIR, path.join(GENERATED_DIR, 'edits')]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

export function loadConfig() {
  try {
    const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(patch) {
  const next = { ...loadConfig(), ...patch };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2));
  return next;
}

// ---- API keys (.env) ----
export function keyStatus() {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    fal: Boolean(process.env.FAL_KEY)
  };
}

export function saveKeys({ gemini, openai, fal }) {
  let lines = [];
  try {
    lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n').filter(Boolean);
  } catch {}
  const set = (name, val) => {
    lines = lines.filter((l) => !l.startsWith(name + '='));
    if (val) lines.push(`${name}=${val}`);
    if (val) process.env[name] = val;
  };
  if (gemini !== undefined) set('GEMINI_API_KEY', gemini.trim());
  if (openai !== undefined) set('OPENAI_API_KEY', openai.trim());
  if (fal !== undefined) set('FAL_KEY', fal.trim());
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', { mode: 0o600 });
  return keyStatus();
}

// ---- generation history ----
export function saveBatchMeta(meta) {
  fs.writeFileSync(path.join(META_DIR, `${meta.id}.json`), JSON.stringify(meta, null, 2));
}

export function listHistory(limit = 60) {
  ensureDirs();
  const files = fs
    .readdirSync(META_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ f, m: fs.statSync(path.join(META_DIR, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)
    .slice(0, limit);
  const out = [];
  for (const { f } of files) {
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(META_DIR, f), 'utf8')));
    } catch {}
  }
  return out;
}
