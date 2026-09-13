// 宮廟電子籤索取收單（2026-08-25，「給宮廟主持人的信」/for-temples/ 表單的後端）。
//
// 🔴 約束：
//   - 廟方聯絡資料是個資，本 repo 為 public——落點固定在 /root/.config/folk-tw/temple-leads.jsonl
//     （repo 外），log 也不得印出任何欄位內容。
//   - 驗證：聯絡人必填；電話／地址／LINE／Email 至少一項；全欄位長度硬上限、去換行。
//   - website 欄是 honeypot：真人看不到（前端 CSS 藏起），有值＝機器人，假裝成功但不落檔。
//   - Slack 通知失敗不影響收單（檔案先落、通知後發）。
//   - 🔴 同時在 service@yao.care 的 Gmail 草稿匣建一封回覆草稿（2026-09-13 加）：
//     Slack 那則 2026-08-28~09-13 沒有被看見，六筆真實宮廟聯絡資料躺了兩週沒人回。
//     **通知不等於工作項目**——草稿匣是站主本來就會打開的地方。細節見 lead-draft.mjs。
//     ⚠️ 建草稿失敗要發 Slack 出聲，不可以只寫 console.error 就算了（紅線 8：產出歸零不可無聲）。
import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { makeLeadDraftAsync } from './lead-draft.mjs';

const LEADS_FILE = process.env.TEMPLE_LEADS_FILE || '/root/.config/folk-tw/temple-leads.jsonl';
const SLACK_TOKEN_FILE = process.env.FOLK_SLACK_TOKEN_FILE || '/root/.config/folk-tw/slack-bot-token';
const SLACK_CHANNEL = process.env.FOLK_SLACK_CHANNEL || 'C0BCPHBF1ML';

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function submitLead(input) {
  if (clean(input.website, 10)) return { ok: true }; // honeypot：吞掉不落檔
  const lead = {
    name: clean(input.name, 40),
    temple: clean(input.temple, 80),
    phone: clean(input.phone, 30),
    address: clean(input.address, 120),
    line: clean(input.line, 60),
    email: clean(input.email, 80),
    note: clean(input.note, 300),
    ref: clean(input.ref, 90),        // 從哪間廟的頁面點進來（temples.json 的 id，非個資）
    variant: clean(input.variant, 10), // 點的是哪個按鈕文案版本
  };
  if (!lead.name) return { error: 'need_name' };
  if (!lead.phone && !lead.line && !lead.email && !lead.address) return { error: 'need_contact' };
  const row = { ts: new Date().toISOString(), ...lead };
  mkdirSync(dirname(LEADS_FILE), { recursive: true });
  appendFileSync(LEADS_FILE, JSON.stringify(row) + '\n');
  notifySlack(row).catch((e) => console.error('[lead] Slack 通知失敗（收單已落檔）:', e.message));
  // 🔴 失敗要出聲：草稿沒建成而沒人知道，就退回「單子躺在 jsonl 裡沒人回」的老問題。
  makeLeadDraftAsync(row).catch((e) => {
    console.error('[lead] Gmail 草稿建立失敗（收單已落檔）:', e.message);
    slackText(`⚠️ 電子籤收單已落檔，但 Gmail 草稿沒建成——這一筆要手動回覆\n• 送單時間：${row.ts}\n• 錯誤：${String(e.message).slice(0, 200)}`)
      .catch(() => {});
  });
  return { ok: true };
}

/** 發一則純文字到收單頻道。🔴 個資不進錯誤訊息——呼叫端只傳時間戳與錯誤字串。 */
async function slackText(text) {
  let token = process.env.SLACK_BOT_TOKEN || '';
  if (!token) { try { token = readFileSync(SLACK_TOKEN_FILE, 'utf8').trim(); } catch {} }
  if (!token) return;
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text, unfurl_links: false }),
  });
}

async function notifySlack(row) {
  let token = process.env.SLACK_BOT_TOKEN || '';
  if (!token) { try { token = readFileSync(SLACK_TOKEN_FILE, 'utf8').trim(); } catch {} }
  if (!token) return;
  const lines = [
    ['聯絡人', row.name], ['宮廟', row.temple], ['電話', row.phone], ['地址', row.address],
    ['LINE', row.line], ['Email', row.email], ['想說的話', row.note],
    ['來源頁', row.ref && `https://folk.tw/temples/${encodeURIComponent(row.ref)}/`],
    ['按鈕版本', row.variant],
  ].filter(([, v]) => v).map(([k, v]) => `• ${k}：${v}`).join('\n');
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text: `📮 電子籤索取（folk.tw 給宮廟主持人的信）\n${lines}`, unfurl_links: false, unfurl_media: false }),
  });
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'slack_unknown');
}
