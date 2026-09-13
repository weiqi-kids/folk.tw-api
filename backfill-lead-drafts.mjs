// 一次性回填：把 temple-leads.jsonl 裡還沒建過草稿的單子補建草稿。
// 🔴 idempotent：已建過的記在 /root/.config/folk-tw/lead-drafts-done.json，重跑不會重建。
//    乾跑預設，要真的建草稿加 --write（同站上所有匯入器的慣例）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { makeLeadDraft, routeLead } from './lead-draft.mjs';

const LEADS = process.env.TEMPLE_LEADS_FILE || '/root/.config/folk-tw/temple-leads.jsonl';
const DONE = '/root/.config/folk-tw/lead-drafts-done.json';
const write = process.argv.includes('--write');

const rows = readFileSync(LEADS, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
let done = {};
try { if (existsSync(DONE)) done = JSON.parse(readFileSync(DONE, 'utf8')); } catch {}

let made = 0;
for (const row of rows) {
  if (done[row.ts]) { console.log(`↷ 已建過 ${row.ts}`); continue; }
  const r = routeLead(row);
  if (!write) { console.log(`（乾跑）${row.ts} → To ${r.to} ${r.tag}`); continue; }
  try {
    const { draftId, file } = makeLeadDraft(row);
    done[row.ts] = { draftId, file, at: new Date().toISOString() };
    made += 1;
    console.log(`✓ ${row.ts} → To ${r.to} ${r.tag}　draft ${draftId}`);
  } catch (e) {
    console.error(`✗ ${row.ts} 建草稿失敗：${String(e.stdout || '') + String(e.stderr || '') || e.message}`.slice(0, 300));
  }
}
if (write) writeFileSync(DONE, JSON.stringify(done, null, 2) + '\n', { mode: 0o600 });
console.log(write ? `\n建了 ${made} 封草稿 → https://mail.google.com/mail/u/service@yao.care/#drafts` : '\n乾跑，未建任何草稿（要建加 --write）');
