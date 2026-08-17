#!/usr/bin/env node
// 同籤留言審核 CLI（站方人工審閱，approve 後才對外刊出）
// 用法：node review-whispers.mjs list            # 列出待審
//       node review-whispers.mjs approve <id…>  # 核准（移入 approved.json）
//       node review-whispers.mjs reject <id…>   # 退件（從 pending 移除）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'whispers');
const PENDING = join(DIR, 'pending.jsonl');
const APPROVED = join(DIR, 'approved.json');

const pending = existsSync(PENDING)
  ? readFileSync(PENDING, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
  : [];
const approved = existsSync(APPROVED) ? JSON.parse(readFileSync(APPROVED, 'utf8')) : {};

const [cmd, ...ids] = process.argv.slice(2);
if (cmd === 'list' || !cmd) {
  if (!pending.length) console.log('待審 0 則。');
  for (const w of pending) console.log(`${w.id}  ${w.poem}  [${w.stage}]  ${w.text}`);
  process.exit(0);
}
if (!['approve', 'reject'].includes(cmd) || !ids.length) {
  console.error('用法：list | approve <id…> | reject <id…>');
  process.exit(1);
}
const keep = [];
let done = 0;
for (const w of pending) {
  if (!ids.includes(w.id)) { keep.push(w); continue; }
  done++;
  if (cmd === 'approve') (approved[w.poem] ??= []).push({ id: w.id, ts: w.ts, stage: w.stage, text: w.text });
}
writeFileSync(PENDING, keep.map((w) => JSON.stringify(w)).join('\n') + (keep.length ? '\n' : ''));
if (cmd === 'approve') writeFileSync(APPROVED, JSON.stringify(approved, null, 2) + '\n');
console.log(`${cmd} ${done} 則；待審剩 ${keep.length} 則。`);
