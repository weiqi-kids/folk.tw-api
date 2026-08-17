#!/usr/bin/env node
// 產生比較用縮圖，不改動任何原始背景或疊字成品。
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { STYLE_PRESETS } from './style-presets.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PREVIEW_ROOT = join(ROOT, 'style-previews');
const IDS = ['guandi_lingqian-1', 'guandi_lingqian-25', 'guandi_lingqian-50', 'guandi_lingqian-75', 'guandi_lingqian-100'];
const THUMB_W = 256;
const THUMB_H = 384;

for (const style of STYLE_PRESETS) {
  const dir = join(PREVIEW_ROOT, style.key, 'cards');
  if (!existsSync(dir)) continue;
  const files = IDS.map((id) => join(dir, `${id}.png`)).filter((file) => existsSync(file));
  if (!files.length) continue;
  const inputs = await Promise.all(files.map((file) => sharp(file).resize(THUMB_W, THUMB_H, { fit: 'cover' }).png().toBuffer()));
  const sheet = await sharp({
    create: { width: THUMB_W * inputs.length, height: THUMB_H, channels: 4, background: '#111111' },
  }).composite(inputs.map((input, index) => ({ input, left: index * THUMB_W, top: 0 }))).png().toBuffer();
  writeFileSync(join(PREVIEW_ROOT, style.key, 'comparison.png'), sheet);
}

const rows = [];
for (const style of STYLE_PRESETS) {
  const file = join(PREVIEW_ROOT, style.key, 'comparison.png');
  if (existsSync(file)) rows.push(await sharp(file).resize(THUMB_W * 5, THUMB_H, { fit: 'cover' }).png().toBuffer());
}
if (rows.length) {
  const all = await sharp({
    create: { width: THUMB_W * 5, height: THUMB_H * rows.length, channels: 4, background: '#111111' },
  }).composite(rows.map((input, index) => ({ input, left: 0, top: index * THUMB_H }))).png().toBuffer();
  writeFileSync(join(PREVIEW_ROOT, 'all-styles-comparison.png'), all);
}
console.log(`[style-contact-sheets] 產生 ${rows.length} 組風格縮圖`);
