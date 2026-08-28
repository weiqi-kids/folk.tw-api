#!/usr/bin/env node
// 預生成籤詩圖合成器：第 3 層 cards-bg/（無文字底圖）→
// 第 1 層 style.mjs（統一風格）→ 第 2 層 overlay.mjs（純文字）→ cards/（成品）
//
// 用法：node compose-cards.mjs           # 增量：背景比成品新（或成品不存在）才重合成
//       node compose-cards.mjs --force   # 全部重合成
//
// 目錄契約（給產圖方，例如 codex）：
//   cards-bg/<temple_id>/<poem_id>.png|.jpg    例：cards-bg/moi_10478_碧雲宮/guandi_lingqian-100.png
//   - 🔴 背景畫面**不得含任何文字、字母、數字**——籤詩文字由本腳本確定性疊上（錯字＝杜撰）
//   - 建議 1024×1536 直式；其他尺寸會被 cover 裁切到 1024×1536
//   - temple_id 必須在 folk.tw 的 temple-partners.json 且 active；poem_id 必須存在於 poems.json
//   - 不合契約的檔案會被列出並跳過，不會讓整批失敗
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { overlaySvg } from './overlay.mjs';
import { cardStyleSvg } from './style.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const FOLK = process.env.FOLK_DIR || '/mnt/folk-tw/folk.tw';
const FORCE = process.argv.includes('--force');
const W = 1024, H = 1536;

const poems = JSON.parse(readFileSync(`${FOLK}/src/data/poems.json`, 'utf8'));
const partners = JSON.parse(readFileSync(`${FOLK}/src/data/temple-partners.json`, 'utf8'));
const systems = JSON.parse(readFileSync(`${FOLK}/src/data/divination-systems.json`, 'utf8'));
const sysName = new Map(systems.map((s) => [s.id, s.name]));
const poemById = new Map(poems.filter((p) => !p.draft).map((p) => [p.id, { ...p, sysLabel: sysName.get(p.system) ?? p.system }]));
const partnerByTemple = new Map(partners.filter((p) => p.active).map((p) => [p.temple, p]));

const bgRoot = join(ROOT, 'cards-bg');
const outRoot = join(ROOT, 'cards');
if (!existsSync(bgRoot)) { console.error(`沒有 ${bgRoot}，無事可做。`); process.exit(0); }

let made = 0, skipped = 0; const bad = [];
for (const temple of readdirSync(bgRoot)) {
  const partner = partnerByTemple.get(temple);
  if (!partner) { bad.push(`${temple}/：不在 temple-partners.json（active）`); continue; }
  for (const f of readdirSync(join(bgRoot, temple))) {
    const m = f.match(/^(.+)\.(png|jpe?g)$/i);
    const poem = m ? poemById.get(m[1]) : null;
    if (!poem) { bad.push(`${temple}/${f}：檔名不是有效 poem_id`); continue; }
    const src = join(bgRoot, temple, f);
    const out = join(outRoot, temple, `${poem.id}.png`);
    if (!FORCE && existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) { skipped++; continue; }
    mkdirSync(dirname(out), { recursive: true });
    const png = await sharp(src)
      .resize(W, H, { fit: 'cover' })
      .composite([
        { input: cardStyleSvg(poem, W, H) },
        { input: overlaySvg(poem, partner.name, W, H) },
      ])
      .png()
      .toBuffer();
    writeFileSync(out, png);
    made++;
  }
}
console.log(`[compose-cards] 合成 ${made} 張、跳過（已最新）${skipped} 張${bad.length ? `、不合契約 ${bad.length} 筆：\n  ` + bad.join('\n  ') : ''}`);
