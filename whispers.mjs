// 同籤留言（2026-08-15，「同籤同行」最小誠實版）：
// 抽到同一支籤的人留給後來者的一句話。🔴 定位（顧問＋廟方承辦共識）：
// 分享的是個人經驗，不代表神明指示、不提供解籤——這句話由前端頁面明示。
//
// 設計約束：
//   - 匿名：不收姓名；IP 只存 sha256 前 16 碼（防濫用追查用，無法還原）
//   - 全部留言送審後才刊出：pending.jsonl（追加）→ 站方 CLI 審核 → approved.json
//   - 審核指令：node review-whispers.mjs list|approve <id>|reject <id>
//   - 內容硬擋：2–80 字、去換行、含網址/email/電話樣式直接拒收
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIR = join(ROOT, 'whispers');
const PENDING = join(DIR, 'pending.jsonl');
const APPROVED = join(DIR, 'approved.json');

export const STAGES = ['deciding', 'waiting', 'decided', 'acting', 'passed'];

export function loadApproved() {
  try { return JSON.parse(readFileSync(APPROVED, 'utf8')); } catch { return {}; }
}

const BAD = /https?:\/\/|www\.|@[\w.-]+\.\w|\d{8,}|[0-9]{2,4}-[0-9]{6,8}/i;

export function submitWhisper({ poem, stage, text, ip }) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!STAGES.includes(stage)) return { error: 'bad_stage' };
  if ([...t].length < 2 || [...t].length > 80) return { error: 'bad_length' };
  if (BAD.test(t)) return { error: 'bad_content' };
  mkdirSync(DIR, { recursive: true });
  const row = {
    id: randomUUID().slice(0, 8),
    ts: new Date().toISOString(),
    ip: createHash('sha256').update(String(ip)).digest('hex').slice(0, 16),
    poem,
    stage,
    text: t,
  };
  appendFileSync(PENDING, JSON.stringify(row) + '\n');
  return { ok: true, id: row.id };
}

export function approvedFor(poemId) {
  const all = loadApproved();
  return (all[poemId] ?? []).map(({ id, stage, text }) => ({ id, stage, text }));
}
