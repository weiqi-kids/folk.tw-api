// 收到電子籤索取單 → 在 service@yao.care 的 Gmail 草稿匣建一封回覆草稿（2026-09-13）。
//
// 🔴 為什麼要有這支：收單原本只寫 temple-leads.jsonl ＋ 發一則 Slack，而 Slack 那則
//    2026-08-28~09-13 之間沒有被看見，六筆真實的宮廟聯絡資料在檔案裡躺了兩週沒人回。
//    **通知不等於工作項目**——草稿匣是站主本來就會打開的地方，把單子變成一封等著按寄出
//    的信，才不會再漏。folk-outreach 那條線（每日五間）早就這樣做了，本條線是補上同一套。
//
// 🔴 只建草稿、永遠不寄：沿用 folk.tw-outreach/gmail_draft.py，它的 scope 只有
//    gmail.compose，這支程式沒有寄信能力。⛔ 不要為了自動化換成 gmail.send——
//    寄出前的人工確認是唯一擋得住「用站主的網域寄一封錯信」的東西。
//
// 🔴 個資不落 repo：本 repo 為 public，而信稿含姓名電話。信稿檔寫到
//    /root/.config/folk-tw/lead-outbox/（repo 外，同 temple-leads.jsonl 的落點慣例）。
//
// 🔴 收件人怎麼決定（一條規則，不做關鍵字猜測）：
//    ① 對方沒填「想說的話」→ To ＝ 對方 email；沒有 email 就 To ＝ service@yao.care 自己，
//       主旨標「[需用 LINE 聯絡]／[需電話聯絡]」，正文附可直接複製到 LINE 的訊息。
//    ② 對方有填「想說的話」→ **一律 To ＝ service@yao.care**，主旨標「[要先讀留言]」，
//       留言逐字放在正文最上面。理由是實際踩過：六筆裡兩筆有留言，一筆是投訴我們資料寫錯、
//       一筆是香客把索取表單當問事窗口用——**兩筆都不能收到罐頭索取回覆**。
//       ⛔ 不要改成用關鍵字判斷是不是投訴：猜錯的代價是對著抱怨的人推銷。
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUTBOX = process.env.LEAD_OUTBOX_DIR || '/root/.config/folk-tw/lead-outbox';
const DRAFT_PY = process.env.GMAIL_DRAFT_PY || '/mnt/folk-tw/folk.tw-outreach/gmail_draft.py';
const DRAFT_VENV = process.env.GMAIL_DRAFT_VENV || '/mnt/folk-tw/folk.tw-outreach/.venv/bin/python';
const SELF = 'service@yao.care';

// 🔴 對方沒填宮廟名時，用 ref（他從哪一間廟的頁面點進來）補回廟名。
//    2026-09-13 踩到：六筆有兩筆沒填 temple，草稿就整封只寫「貴宮」，而 ref 明明指得出
//    聖善堂與南聖宮——**站上已經知道的事不要讓人再問一次**。
//    ⚠️ 但那是**推測不是事實**：從某頁點進來不代表他就是那間廟的人（家玲那筆就是香客）。
//    所以推測來的廟名一律另存 templeGuess，措辭上只能寫「您是從○○的頁面點進來的，
//    想確認是不是這一間」，⛔ 不可以當成他的宮廟直接稱呼。
const TEMPLES_JSON = process.env.FOLK_TEMPLES_JSON || '/mnt/folk-tw/folk.tw/src/data/temples.json';
let templeIndex = null;
function templeNameOf(id) {
  if (!id) return '';
  if (templeIndex === null) {
    // 讀不到就退成空字串，**不要讓草稿因為讀不到別的 repo 的檔案而整個建不出來**。
    try {
      templeIndex = new Map(JSON.parse(readFileSync(TEMPLES_JSON, 'utf8')).map((t) => [t.id, t.name]));
    } catch { templeIndex = new Map(); }
  }
  return templeIndex.get(id) ?? '';
}

const ownerName = (row) => {
  const t = row.temple || templeNameOf(row.ref);
  return t ? `${t} ${row.name}` : row.name;
};

/** 這一筆要寄給誰、主旨怎麼寫。純函式，好測。 */
export function routeLead(row) {
  if (row.note) {
    return { to: SELF, tag: '[要先讀留言]', reason: 'note' };
  }
  if (row.email) return { to: row.email, tag: '', reason: 'email' };
  if (row.line) return { to: SELF, tag: '[需用 LINE 聯絡]', reason: 'line' };
  if (row.phone) return { to: SELF, tag: '[需電話聯絡]', reason: 'phone' };
  return { to: SELF, tag: '[只留了地址]', reason: 'address' };
}

/** 給對方看的正文（不含任何內部備註）。 */
function replyBody(row) {
  const guess = row.temple ? '' : templeNameOf(row.ref);
  const who = row.temple ? `貴宮（${row.temple}）` : guess ? `貴宮` : '貴宮';
  const confirmLine = !row.temple && guess
    ? `您是從「${guess}」的頁面點進來的，想先確認貴宮是不是這一間（如果不是，跟我說正確的宮廟名就好）。`
    : '';
  return [
    `${row.name} 您好，`,
    '',
    '我是神酷（folk.tw）的負責人。您在我們網站留了資料，索取免費的電子籤貼紙，謝謝您。',
    ...(confirmLine ? ['', confirmLine] : []),
    '',
    `電子籤是一張小貼紙，貼在籤詩或籤筒上，香客求完籤拿手機一碰，就會打開那支籤的白話解說`,
    '（不用裝 App、不用另外設定）。解說頁有籤詩原文、白話解說與典故，可以聽語音朗讀，也有多語版本。',
    '貼紙由我們印好寄過去，沒有費用、沒有綁約，廟裡原本的籤與儀式完全照舊。',
    '',
    `為了把貼紙印對，想跟您確認三件事：`,
    '',
    `一、${who}供的是哪一套籤？（例如六十甲子籤、關聖帝君靈籤、觀音靈籤…）`,
    '二、籤筒有幾支？我們照數量印。',
    '三、寄送地址與收件人。',
    '',
    '回信告訴我就可以，我這邊安排寄出。',
    '',
    '神酷 folk.tw',
    'LINE 官方帳號：@616yhksm',
  ].join('\n');
}

/** 沒有 email 時，給站主直接複製到 LINE／電話上用的短版。 */
function shortScript(row) {
  return [
    `${row.name} 您好，我是神酷（folk.tw）的負責人。您在我們網站索取免費電子籤貼紙，`,
    '想跟您確認：貴宮供的是哪一套籤、籤筒幾支、寄送地址與收件人。',
    '貼紙我們印好寄過去，免費、不綁約，廟裡原本的籤與儀式完全照舊。',
  ].join('');
}

/** gmail_draft.py 吃的 markdown（格式契約見該檔 parse_letter）。 */
export function buildLeadLetter(row) {
  const r = routeLead(row);
  const tw = new Date(row.ts).toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' });
  const subject = `${r.tag ? r.tag + ' ' : ''}神酷電子籤・回覆 ${ownerName(row)}`.trim();
  const head = [
    `**Email**：${r.to}`,
    `**主旨**：${subject}`,
    '',
    '---',
    '',
  ];
  const lead = [];
  if (r.reason === 'note') {
    lead.push(
      '⚠️ 這一筆有留言，**先讀完再決定怎麼回**——罐頭索取回覆可能完全答非所問。',
      '（實際發生過：一筆是宮廟指我們資料寫錯，一筆是香客把索取表單當問事窗口用。）',
      '',
      '對方留言逐字：',
      '',
      `> ${row.note}`,
      '',
      `對方填的宮廟名：${row.temple || `（未填）——從來源頁推測是「${templeNameOf(row.ref) || '不明'}」，未經確認`}`,
      '',
      '聯絡方式：'
        + [row.phone && `電話 ${row.phone}`, row.line && `LINE ${row.line}`,
           row.email && `Email ${row.email}`, row.address && `地址 ${row.address}`]
          .filter(Boolean).join('｜'),
      '',
      '---',
      '',
      '下面是一般索取單的標準回覆，確認留言不是別的事情之後再用：',
      '',
    );
  } else if (r.reason !== 'email') {
    lead.push(
      `⚠️ 對方沒留 Email，要用${r.reason === 'line' ? ` LINE（${row.line}）` : r.reason === 'phone' ? `電話（${row.phone}）` : `地址（${row.address}）`}聯絡，這封信寄不出去。`,
      '',
      '可直接複製的短版：',
      '',
      `> ${shortScript(row)}`,
      '',
      '---',
      '',
    );
  }
  const tail = [
    '',
    '',
    '## 寄件紀錄（內部）',
    '',
    `- 送單時間：${tw}（台北）`,
    `- 來源頁：${row.ref ? `${templeNameOf(row.ref) || row.ref}　https://folk.tw/temples/${encodeURIComponent(row.ref)}/` : '直接進站'}`,
    `- 按鈕變體：${row.variant || '—'}`,
    `- 收件人判定：${r.reason}`,
  ];
  return [...head, ...lead, replyBody(row), ...tail].join('\n') + '\n';
}

const execFileP = promisify(execFile);

/**
 * 非同步版：收單當下用這支。
 * 🔴 收單的 HTTP 回應**不可以**等 Gmail API——建草稿要好幾秒，同步跑會讓填表的人
 *    盯著轉圈圈，甚至以為沒送出去而重送。檔案先落、草稿後建，與 Slack 通知同一個模式。
 */
export async function makeLeadDraftAsync(row) {
  mkdirSync(OUTBOX, { recursive: true });
  const file = `${row.ts.replace(/[:.]/g, '-')}.md`;
  writeFileSync(join(OUTBOX, file), buildLeadLetter(row), { mode: 0o600 });
  await execFileP(DRAFT_VENV, [DRAFT_PY, OUTBOX, '--letter', file, '--dry-run'], { timeout: 60000 });
  const { stdout } = await execFileP(DRAFT_VENV, [DRAFT_PY, OUTBOX, '--letter', file], { timeout: 120000 });
  return { draftId: String(stdout).match(/draft id：(\S+)/)?.[1] ?? '?', file };
}

/** 建草稿（同步版，回填腳本用）。回 { draftId, file }；失敗時丟錯。 */
export function makeLeadDraft(row, { dry = false } = {}) {
  mkdirSync(OUTBOX, { recursive: true });
  // 🔴 檔名用時間戳，不可用廟名：全台同名廟極多，同名同日會互相覆蓋而且不會報錯。
  const file = `${row.ts.replace(/[:.]/g, '-')}.md`;
  writeFileSync(join(OUTBOX, file), buildLeadLetter(row), { mode: 0o600 });
  if (dry) return { draftId: '(dry)', file };
  execFileSync(DRAFT_VENV, [DRAFT_PY, OUTBOX, '--letter', file, '--dry-run'],
    { encoding: 'utf8', timeout: 60000 });
  const out = execFileSync(DRAFT_VENV, [DRAFT_PY, OUTBOX, '--letter', file],
    { encoding: 'utf8', timeout: 120000 });
  return { draftId: out.match(/draft id：(\S+)/)?.[1] ?? '?', file };
}
