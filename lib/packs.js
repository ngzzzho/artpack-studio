import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './store.js';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const EXCLUDE_TOP = new Set(['studio', 'Generated']);
const EXCLUDE_ANY = new Set(['__MACOSX', 'node_modules']);

export function isImage(name) {
  return IMAGE_EXT.has(path.extname(name).toLowerCase());
}

/** Resolve a library-relative path safely inside ROOT. */
export function safePath(rel) {
  const abs = path.resolve(ROOT, rel);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
    throw new Error('path outside library');
  }
  return abs;
}

function walk(dir, rel, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  let imgCount = 0;
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) {
      if (EXCLUDE_ANY.has(e.name)) continue;
      if (rel === '' && EXCLUDE_TOP.has(e.name)) continue;
      walk(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name, out);
    } else if (isImage(e.name)) {
      imgCount++;
    }
  }
  if (imgCount > 0 && rel) out.push({ dir: rel, count: imgCount });
}

/** All directories under the library that directly contain images. */
export function listDirs() {
  const out = [];
  walk(ROOT, '', out);
  out.sort((a, b) => a.dir.localeCompare(b.dir));
  return out;
}

/** Image filenames inside one directory (non-recursive). */
export function listFiles(relDir) {
  const abs = safePath(relDir);
  return fs
    .readdirSync(abs)
    .filter((n) => !n.startsWith('.') && isImage(n))
    .sort()
    .map((n) => `${relDir}/${n}`);
}

/** Global filename search across the library. */
export function searchFiles(q, limit = 240) {
  const needle = q.toLowerCase();
  const results = [];
  const visit = (dir, rel) => {
    if (results.length >= limit) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (results.length >= limit) return;
      if (e.name.startsWith('.')) continue;
      if (e.isDirectory()) {
        if (EXCLUDE_ANY.has(e.name)) continue;
        if (rel === '' && EXCLUDE_TOP.has(e.name)) continue;
        visit(path.join(dir, e.name), rel ? `${rel}/${e.name}` : e.name);
      } else if (isImage(e.name) && e.name.toLowerCase().includes(needle)) {
        results.push(rel ? `${rel}/${e.name}` : e.name);
      }
    }
  };
  visit(ROOT, '');
  return results;
}
