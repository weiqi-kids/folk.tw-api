#!/usr/bin/env node
// 列出 style-previews 尚缺的 guandi_lingqian 背景工作。
// 產圖工具可用 --limit 分批取工作；已存在的檔案會自動略過，可安全續跑。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE_PRESETS } from './style-presets.mjs';
import { buildBackgroundPrompt } from './style-prompts.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const FOLK = process.env.FOLK_DIR || '/root/folk.tw';
const PREVIEW_ROOT = join(ROOT, 'style-previews');
const poems = JSON.parse(readFileSync(`${FOLK}/src/data/poems.json`, 'utf8'))
  .filter((p) => !p.draft && p.system === 'guandi_lingqian')
  .sort((a, b) => Number(a.no) - Number(b.no));

const args = new Map(process.argv.slice(2).filter((x) => x.startsWith('--')).map((x) => {
  const i = x.indexOf('=');
  return i < 0 ? [x.slice(2), 'true'] : [x.slice(2, i), x.slice(i + 1)];
}));
const from = Math.max(1, Number(args.get('from') ?? 1));
const to = Math.min(100, Number(args.get('to') ?? 100));
const limit = Math.max(0, Number(args.get('limit') ?? 0));
const wantedStyle = args.get('style');
const styles = STYLE_PRESETS.filter((s) => !wantedStyle || s.key === wantedStyle);
const jobs = [];

for (const style of styles) {
  const bgDir = join(PREVIEW_ROOT, style.key, 'backgrounds');
  let existing = new Set();
  if (existsSync(bgDir)) existing = new Set(readdirSync(bgDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).map((f) => f.replace(/\.(png|jpe?g)$/i, '')));
  for (const poem of poems) {
    if (poem.no < from || poem.no > to) continue;
    const stem = poem.id;
    if (existing.has(stem)) continue;
    jobs.push({
      styleKey: style.key,
      poemId: poem.id,
      no: poem.no,
      fortune: poem.fortune,
      destination: join(bgDir, `${stem}.png`),
      prompt: buildBackgroundPrompt(style.key, poem),
    });
    if (limit > 0 && jobs.length >= limit) break;
  }
  if (limit > 0 && jobs.length >= limit) break;
}
process.stdout.write(JSON.stringify(jobs));
