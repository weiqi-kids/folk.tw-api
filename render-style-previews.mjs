#!/usr/bin/env node
// 將 style-previews/<風格>/backgrounds/ 的純背景，套上指定第 1 層與既有第 2 層文字。
// 這是比較用工具，不會改寫正式的 cards-bg/ 或 cards/。
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { overlaySvg } from './overlay.mjs';
import { cardStyleSvg } from './style.mjs';
import { STYLE_PRESETS } from './style-presets.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const FOLK = process.env.FOLK_DIR || '/root/folk.tw';
const PREVIEW_ROOT = join(ROOT, 'style-previews');
const TEMPLE = 'moi_10478_碧雲宮';
const FORCE = process.argv.includes('--force');
const W = 1024, H = 1536;

const poems = JSON.parse(readFileSync(`${FOLK}/src/data/poems.json`, 'utf8'));
const partners = JSON.parse(readFileSync(`${FOLK}/src/data/temple-partners.json`, 'utf8'));
const systems = JSON.parse(readFileSync(`${FOLK}/src/data/divination-systems.json`, 'utf8'));
const sysName = new Map(systems.map((s) => [s.id, s.name]));
const poemById = new Map(poems.filter((p) => !p.draft).map((p) => [p.id, { ...p, sysLabel: sysName.get(p.system) ?? p.system }]));
const targetIds = new Set(poems.filter((p) => !p.draft && p.system === 'guandi_lingqian').map((p) => p.id));
const partner = partners.find((p) => p.active && p.temple === TEMPLE);
if (!partner) throw new Error(`找不到 active temple partner: ${TEMPLE}`);

let made = 0, skipped = 0, bad = 0;
for (const style of STYLE_PRESETS) {
  const bgDir = join(PREVIEW_ROOT, style.key, 'backgrounds');
  const outDir = join(PREVIEW_ROOT, style.key, 'cards');
  if (!existsSync(bgDir)) { bad++; console.warn(`[style-previews] 缺少 ${bgDir}`); continue; }
  mkdirSync(outDir, { recursive: true });
  for (const file of readdirSync(bgDir).sort()) {
    const match = file.match(/^(.+)\.(png|jpe?g)$/i);
    if (!match || !targetIds.has(match[1])) continue;
    const poem = poemById.get(match[1]);
    if (!poem) { bad++; console.warn(`[style-previews] 找不到 poem: ${match[1]}`); continue; }
    const src = join(bgDir, file);
    const out = join(outDir, `${match[1]}.png`);
    if (!FORCE && existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) { skipped++; continue; }
    const png = await sharp(src)
      .resize(W, H, { fit: 'cover' })
      .composite([
        { input: cardStyleSvg(poem, W, H, style) },
        { input: overlaySvg(poem, partner.name, W, H) },
      ])
      .png()
      .toBuffer();
    writeFileSync(out, png);
    made++;
  }
}
console.log(`[style-previews] 合成 ${made} 張、跳過 ${skipped} 張、問題 ${bad} 筆`);
