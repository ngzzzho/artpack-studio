import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT } from './store.js';

const run = promisify(execFile);

/** 遞歸收集資料夾入面所有檔案（相對路徑）。 */
function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) walk(abs, base, out);
    else out.push(path.relative(base, abs));
  }
  return out;
}

/**
 * 出品：將 Football Pack 生成品 copy 入 game repo 嘅 assets/skin/generated/，
 * 重建 skin_manifest.json（連 ninepatch margins），然後 git commit + push。
 * 需要 .env 設 PUBLISH_REPO=<wordfootball_ui 本機 clone 路徑>
 */
export async function publishToRepo() {
  const repo = process.env.PUBLISH_REPO;
  if (!repo) throw new Error('未設定 PUBLISH_REPO — 喺 studio/.env 加 PUBLISH_REPO=/path/to/wordfootball_ui');
  if (!fs.existsSync(path.join(repo, '.git'))) throw new Error(`PUBLISH_REPO 唔係 git repo：${repo}`);

  const src = path.join(ROOT, 'Football Pack');
  const files = walk(src);
  if (!files.length) throw new Error('Football Pack 係空嘅 — 未有嘢可以出品');

  await run('git', ['-C', repo, 'pull', '--ff-only']);

  const dst = path.join(repo, 'assets', 'skin', 'generated');
  fs.rmSync(dst, { recursive: true, force: true });
  const manifest = {};
  for (const rel of files) {
    const to = path.join(dst, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(src, rel), to);
    if (rel.endsWith('.png')) {
      const key = path.basename(rel, '.png');
      const entry = { file: 'assets/skin/generated/' + rel.split(path.sep).join('/') };
      const slices = path.join(src, path.dirname(rel), key + '_slices.json');
      if (fs.existsSync(slices)) {
        try { entry.ninepatch = JSON.parse(fs.readFileSync(slices, 'utf8')).margins; } catch {}
      }
      manifest[key] = entry;
    }
  }
  fs.mkdirSync(path.join(repo, 'assets', 'skin'), { recursive: true });
  fs.writeFileSync(
    path.join(repo, 'assets', 'skin', 'skin_manifest.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), source: 'artpack-studio', entries: manifest }, null, 2)
  );

  await run('git', ['-C', repo, 'add', 'assets/skin']);
  const st = await run('git', ['-C', repo, 'status', '--porcelain', 'assets/skin']);
  if (!st.stdout.trim()) return { files: files.length, pushed: false, msg: '同上次一樣，冇新嘢要 push' };
  await run('git', ['-C', repo, 'commit', '-m', `[skin] studio 出品 ${new Date().toISOString().slice(0, 10)}（${files.length} 檔）`]);
  await run('git', ['-C', repo, 'push']);
  return { files: files.length, pushed: true };
}
