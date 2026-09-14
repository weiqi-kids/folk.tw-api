// 宮廟服務時段收單（2026-09-14）：/for-temples/ 表單送出**之後**的追問區後端。
//
// 🔴 為什麼是獨立端點＋獨立檔，而不是往 /v1/temple-lead 加欄位：
//   ① 這批資料的去向是 folk.tw 的 src/data/temples.json＝公開站台的建置來源，本身**不含個資**。
//      混進 temple-leads.jsonl 等於把「要上站的內容」和「絕不可上站的個資」放同一個檔，
//      遲早有人整檔拿去用（folk.tw 紅線 5 踩過的坑）。
//   ② 追問是第二次送出：不可再建一封 Gmail 回覆草稿、不可再算一件電子籤索取，
//      否則 letter:stats 的件數與草稿匣都會被灌水。
//
// 🔴 收進來的東西**不會自動上站**。這裡只落檔＋發 Slack；要寫進 temples.json 得人工確認，
//    且措辭固定是「廟方提供（日期）」——廟方的說法不等於本站的事實（紅線 1）。
//
// 🔴 廟方身分沒有驗證，所以這條路只能是「收單 → 人工確認 → 寫入」，
//    永遠不可以做成線上自助編輯（任何人都能宣稱自己是某廟主委）。
import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SERVICES_FILE = process.env.TEMPLE_SERVICES_FILE || '/root/.config/folk-tw/temple-services.jsonl';
const SLACK_TOKEN_FILE = process.env.FOLK_SLACK_TOKEN_FILE || '/root/.config/folk-tw/slack-bot-token';
const SLACK_CHANNEL = process.env.FOLK_SLACK_CHANNEL || 'C0BCPHBF1ML';

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// 複選項目：前端送多個同名欄位，express urlencoded 會給陣列或字串，兩種都要吃。
const cleanItems = (v, max) =>
  (Array.isArray(v) ? v : [v])
    .map((x) => clean(x, 20))
    .filter(Boolean)
    .slice(0, 8)
    .join('、')
    .slice(0, max);

export function submitTempleServices(input) {
  if (clean(input.website, 10)) return { ok: true }; // honeypot：吞掉不落檔（同 leads.mjs）
  const rec = {
    temple: clean(input.temple, 80),
    ref: clean(input.ref, 90),      // 從哪間廟的頁面點進來（temples.json 的 id，非個資）
    items: cleanItems(input.items, 120),
    hours: clean(input.hours, 200),
    open_time: clean(input.open_time, 60),
  };
  // 認不出是哪一間廟就沒有寫入對象，收了也沒用。
  if (!rec.ref && !rec.temple) return { error: 'need_temple' };
  // 沒有任何時段＝這一次追問等於沒回答，不落檔（避免製造一堆要人工看卻空白的列）。
  if (!rec.hours && !rec.open_time) return { error: 'need_hours' };
  const row = { ts: new Date().toISOString(), ...rec };
  mkdirSync(dirname(SERVICES_FILE), { recursive: true });
  appendFileSync(SERVICES_FILE, JSON.stringify(row) + '\n');
  notifySlack(row).catch((e) => console.error('[services] Slack 通知失敗（已落檔）:', e.message));
  return { ok: true };
}

async function notifySlack(row) {
  let token = process.env.SLACK_BOT_TOKEN || '';
  if (!token) { try { token = readFileSync(SLACK_TOKEN_FILE, 'utf8').trim(); } catch {} }
  if (!token) return;
  const lines = [
    ['宮廟', row.temple],
    ['服務項目', row.items],
    ['服務時間', row.hours],
    ['開放時間', row.open_time],
    ['來源頁', row.ref && `https://folk.tw/temples/${encodeURIComponent(row.ref)}/`],
  ].filter(([, v]) => v).map(([k, v]) => `• ${k}：${v}`).join('\n');
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: `🕰 宮廟服務時段（folk.tw /for-temples/ 追問區）\n${lines}\n\n_人工確認後才寫進 temples.json，措辭用「廟方提供」_`,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'slack_unknown');
}
