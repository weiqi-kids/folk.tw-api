// folk-qian-api — folk.tw 合作宮廟「祈福籤詩圖」生成服務
//
// 端點：
//   GET  /healthz          200＝功能可用；503＝OPENAI_API_KEY 未設（前端據此整體隱藏 UI）
//   POST /v1/qian-card     multipart {photo, poem, temple} → image/png
//   POST /v1/temple-lead   form   電子籤索取收單（個資，leads.mjs）
//
// 設計約束（見 /mnt/folk-tw/folk.tw/docs/temple-partner-links.md §P2）：
//   🔴 籤詩文字絕不交給圖像模型寫（中文會寫錯字，錯字＝杜撰）：
//      OpenAI 只負責把照片轉成祈福風格畫面（prompt 明令不得出現文字），
//      籤詩四句、廟名、出處由本服務用 sharp+SVG 確定性疊字（系統 Noto CJK 字型）。
//   🔴 照片即生即毀：multer memoryStorage，整個流程不落地、不留檔；log 只記計數。
//   💰 濫用/成本閘門：每 IP 每日 IP_DAILY（預設 5）張、全站每日 DAILY_CAP（預設 80）張，
//      超限回 429（前端顯示「今日名額已滿」）。額度以台北時區日界線重置。
//
// 資料源：直接讀 /mnt/folk-tw/folk.tw 的 poems.json 與 temple-partners.json（10 分鐘快取），
//   只服務 active 合作廟＋真實存在的籤——兩者都不成立就 400。
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { overlaySvg } from './overlay.mjs';
import { cardStyleSvg } from './style.mjs';
import { STYLE_PRESETS, DEFAULT_STYLE } from './style-presets.mjs';
import { submitWhisper, approvedFor } from './whispers.mjs';
import { submitLead } from './leads.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 8495);
const FOLK = process.env.FOLK_DIR || '/mnt/folk-tw/folk.tw';
const IP_DAILY = Number(process.env.IP_DAILY || 5);
const DAILY_CAP = Number(process.env.DAILY_CAP || 80);
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const ORIGIN = 'https://folk.tw';

// ── 資料快取（10 分鐘重讀，改 partners/poems 不需重啟）───────────────────────
let cache = { at: 0, poems: new Map(), partners: new Map() };
function data() {
  if (Date.now() - cache.at > 10 * 60 * 1000) {
    const poems = JSON.parse(readFileSync(`${FOLK}/src/data/poems.json`, 'utf8'));
    const partners = JSON.parse(readFileSync(`${FOLK}/src/data/temple-partners.json`, 'utf8'));
    const systems = JSON.parse(readFileSync(`${FOLK}/src/data/divination-systems.json`, 'utf8'));
    const sysName = new Map(systems.map((s) => [s.id, s.name]));
    cache = {
      at: Date.now(),
      poems: new Map(poems.filter((p) => !p.draft).map((p) => [p.id, { ...p, sysLabel: sysName.get(p.system) ?? p.system }])),
      partners: new Map(partners.filter((p) => p.active).map((p) => [p.temple, p])),
    };
  }
  return cache;
}

// ── 每日額度（台北日界線；重啟歸零可接受——寧可多給不擋人）─────────────────────
const taipeiDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
let quota = { day: taipeiDay(), total: 0, byIp: new Map() };
function takeQuota(ip) {
  const day = taipeiDay();
  if (quota.day !== day) quota = { day, total: 0, byIp: new Map() };
  if (quota.total >= DAILY_CAP) return false;
  const n = quota.byIp.get(ip) ?? 0;
  if (n >= IP_DAILY) return false;
  quota.total += 1;
  quota.byIp.set(ip, n + 1);
  return true;
}

// ── 風格底圖池（2026-08-15）：style-previews/<NN-…>/backgrounds/*.png，
//    NN 對應 STYLE_PRESETS[NN-1]；無合作廟的「直接下載」從這池隨機抽底圖＋配對風格。
let poolCache = { at: 0, pool: [] };
function stylePool() {
  if (Date.now() - poolCache.at > 10 * 60 * 1000) {
    const previewRoot = join(ROOT, 'style-previews');
    const pool = [];
    if (existsSync(previewRoot)) {
      for (const dir of readdirSync(previewRoot)) {
        const m = dir.match(/^(\d{2})-/);
        const preset = m ? STYLE_PRESETS[Number(m[1]) - 1] : null;
        const bgDir = join(previewRoot, dir, 'backgrounds');
        if (!preset || !existsSync(bgDir)) continue;
        for (const f of readdirSync(bgDir)) {
          if (/\.(png|jpe?g)$/i.test(f)) pool.push({ preset, path: join(bgDir, f) });
        }
      }
    }
    poolCache = { at: Date.now(), pool };
  }
  return poolCache.pool;
}
const randomPreset = () => STYLE_PRESETS[Math.floor(Math.random() * STYLE_PRESETS.length)];
// style 參數（'01'…'10'）→ preset；空字串回 null（呼叫端自行決定預設/隨機），不合法回 undefined
const presetByKey = (v) => (v ? STYLE_PRESETS.find((s) => s.key.startsWith(v)) : null);

// 確定性底圖（2026-08-15，所選即所得）：同一（風格, 籤）永遠對到同一張底圖——
// 該籤在此風格有專屬底圖就用它，否則以籤 id 雜湊穩定映射一張。
// 預覽（/v1/card-preview）與下載（/v1/qian-card?style=）都走這裡，看到什麼拿到什麼。
function bgFor(preset, poemId) {
  const entries = stylePool().filter((e) => e.preset === preset);
  if (!entries.length) return null;
  const exact = entries.find((e) => /[/\\]([^/\\]+)\.(png|jpe?g)$/i.exec(e.path)?.[1] === poemId);
  if (exact) return exact;
  let h = 0;
  for (const c of poemId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return entries[h % entries.length];
}

// ── OpenAI 圖像生成（照片 → 祈福風格畫面；prompt 明令不得出現文字）──────────────
// 風格 01 保留原本的具體描述（等價於它的風格名）；其餘風格用 preset 名稱引導。
async function stylize(photo, mimetype, preset = DEFAULT_STYLE) {
  const styleClause = preset.key.startsWith('01')
    ? '融入台灣廟宇氛圍——金色祥雲、紅燈籠光暈、裊裊香煙、柔和金光，水彩與工筆混合畫風，'
    : `藝術風格：${preset.name}，`;
  const fd = new FormData();
  fd.append('model', MODEL);
  fd.append('image', new Blob([photo], { type: mimetype }), 'photo.png');
  fd.append('size', '1024x1536');
  fd.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium');
  fd.append(
    'prompt',
    '將這張照片轉為溫暖莊嚴的祈福畫面：保留原照片主體的樣貌與神韻，' +
      styleClause +
      '直式構圖。畫面中不得出現任何文字、字母或數字。',
  );
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: fd,
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message || `openai ${res.status}`;
    const refused = res.status === 400 && /safety|moderation|policy/i.test(msg);
    throw Object.assign(new Error(msg), { status: refused ? 422 : 502 });
  }
  return Buffer.from(body.data[0].b64_json, 'base64');
}

const app = express();
app.disable('x-powered-by');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', ORIGIN);
  next();
});

// 預生成籤詩圖（無照片版）：codex 產無文字背景到 cards-bg/，compose-cards.mjs 疊字後
// 落 cards/，這裡靜態對外。前端以 HEAD 探測某籤有無現成圖，有才顯示「直接下載」。
app.use('/cards', express.static(join(ROOT, 'cards'), { maxAge: '1h' }));

// 同籤留言（2026-08-15）：GET 只回已審核的；POST 用表單編碼（簡單請求、免 CORS preflight），
// 進 pending 佇列等站方 CLI 審核（review-whispers.mjs）。每 IP 每日 5 則。
let whisperQuota = { day: taipeiDay(), byIp: new Map() };
app.get('/v1/whispers/:poemId', (req, res) => {
  const { poems } = data();
  const poem = poems.get(String(req.params.poemId || ''));
  if (!poem) return res.status(404).json({ error: 'not_found' });
  res.set('Cache-Control', 'public, max-age=300').json({ items: approvedFor(poem.id) });
});
app.post('/v1/whispers', express.urlencoded({ extended: false, limit: '4kb' }), (req, res) => {
  const { poems } = data();
  const poem = poems.get(String(req.body.poem || ''));
  if (!poem) return res.status(400).json({ error: 'bad_request' });
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '?';
  const day = taipeiDay();
  if (whisperQuota.day !== day) whisperQuota = { day, byIp: new Map() };
  const n = whisperQuota.byIp.get(ip) ?? 0;
  if (n >= 5) return res.status(429).json({ error: 'quota' });
  const r = submitWhisper({ poem: poem.id, stage: String(req.body.stage || ''), text: req.body.text, ip });
  if (r.error) return res.status(400).json(r);
  whisperQuota.byIp.set(ip, n + 1);
  console.log(`[whisper] pending poem=${poem.id} id=${r.id}`);
  res.json({ ok: true });
});

// 宮廟電子籤索取（2026-08-25，folk.tw /for-temples/ 表單）。表單編碼＝簡單請求免 CORS
// preflight（同 whispers）。個資落點與 Slack 通知在 leads.mjs；每 IP 每日 3 件防灌。
// ⚠️ 與 OPENAI_API_KEY 無關——healthz 503 時本端點照常收單，前端別拿 healthz 閘這個表單。
let leadQuota = { day: taipeiDay(), byIp: new Map() };
app.post('/v1/temple-lead', express.urlencoded({ extended: false, limit: '8kb' }), (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '?';
  const day = taipeiDay();
  if (leadQuota.day !== day) leadQuota = { day, byIp: new Map() };
  const n = leadQuota.byIp.get(ip) ?? 0;
  if (n >= 3) return res.status(429).json({ error: 'quota' });
  const r = submitLead(req.body);
  if (r.error) return res.status(400).json(r);
  leadQuota.byIp.set(ip, n + 1);
  console.log('[lead] 收到電子籤索取（內容在 Slack 與 leads 檔，log 不記個資）');
  res.json({ ok: true });
});

// 宮廟服務時段追問（2026-09-14）🅤 **2026-09-25 站主裁示撤掉，路由已移除。**
//   終局數字：上線 11 天、8 件收單、0 件回填（回收率 0%）。
//   🔴 撤的理由是沒人填、不是壞掉：當天查證過端點健康、9 筆收單全部帶 ref（送出會被接受）、
//   而 temple-services.jsonl 從來沒有被建立（該檔只在成功落檔時產生）＝一次都沒有人送出。
//   前端區塊同日自 folk.tw 的 src/pages/for-temples/index.astro 移除，
//   `pnpm letter:stats` 的回收率段一併移除。temple-services.mjs 留著沒刪（要復原改回來就好），
//   但 **沒有任何路由指向它**。⚠️ 要再做同一件事別照原樣搬回來，同位置同問法已實測是 0。

app.get('/healthz', (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ ok: false, reason: 'no_api_key' });
  res.json({ ok: true });
});

// 風格清單（2026-08-15）：前端風格選擇器的資料源；縮圖走 /style-thumbs 靜態（長快取）。
app.use('/style-thumbs', express.static(join(ROOT, 'style-thumbs'), { maxAge: '7d', immutable: true }));
app.get('/v1/styles', (req, res) => {
  const avail = new Set(stylePool().map((e) => e.preset.key.slice(0, 2)));
  res.set('Cache-Control', 'public, max-age=3600').json(
    STYLE_PRESETS.filter((s) => avail.has(s.key.slice(0, 2))).map((s) => ({
      key: s.key.slice(0, 2),
      name: s.name,
      thumb: `/style-thumbs/${s.key.slice(0, 2)}.webp`,
    })),
  );
});

// 成品預覽（2026-08-15，所選即所得）：該籤×該風格的實際卡片（含籤詩文字）縮小版，
// 與下載端點用同一張確定性底圖——選擇器顯示的就是會下載到的。480×720 webp、磁碟快取。
app.get('/v1/card-preview/:poemId/:styleKey', async (req, res) => {
  try {
    const { poems } = data();
    const poem = poems.get(String(req.params.poemId || ''));
    const preset = presetByKey(String(req.params.styleKey || ''));
    const pick = poem && preset ? bgFor(preset, poem.id) : null;
    if (!poem || !preset || !pick) return res.status(404).json({ error: 'not_found' });
    const cacheFile = join(ROOT, 'preview-cache', preset.key.slice(0, 2), `${poem.id}.webp`);
    if (existsSync(cacheFile) && statSync(cacheFile).mtimeMs >= statSync(pick.path).mtimeMs) {
      return res.set('Cache-Control', 'public, max-age=86400').type('webp').send(readFileSync(cacheFile));
    }
    const W = 1024, H = 1536;
    const full = await sharp(pick.path)
      .resize(W, H, { fit: 'cover' })
      .composite([
        { input: cardStyleSvg(poem, W, H, preset) },
        { input: overlaySvg(poem, '', W, H, preset) },
      ])
      .png()
      .toBuffer();
    const webp = await sharp(full).resize(480, 720).webp({ quality: 82 }).toBuffer();
    mkdirSync(dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, webp);
    res.set('Cache-Control', 'public, max-age=86400').type('webp').send(webp);
  } catch (e) {
    console.error(`[card-preview] fail ${e.message}`);
    res.status(500).json({ error: 'compose_failed' });
  }
});

// 無照片版「直接下載」（2026-08-15）：任一支籤都可下載——從風格底圖池抽底圖＋配對風格，
// 疊正確籤詩文字後回傳。純 sharp 合成、不經 OpenAI、不吃額度；不設快取。
// ?style=NN 指定風格（只在該風格的底圖裡抽）；未指定＝全池隨機。
app.get('/v1/qian-card/:poemId', async (req, res) => {
  try {
    const { poems } = data();
    const poem = poems.get(String(req.params.poemId || ''));
    const styleParam = String(req.query.style || '');
    const wanted = presetByKey(styleParam);
    if (styleParam && !wanted) return res.status(400).json({ error: 'bad_style' });
    // 指定風格＝確定性底圖（與 /v1/card-preview 同一張，所選即所得）；未指定＝隨機風格
    const pick = poem ? bgFor(wanted ?? randomPreset(), poem.id) : null;
    if (!poem || !pick) return res.status(404).json({ error: 'not_found' });
    const W = 1024, H = 1536;
    const png = await sharp(pick.path)
      .resize(W, H, { fit: 'cover' })
      .composite([
        { input: cardStyleSvg(poem, W, H, pick.preset) },
        { input: overlaySvg(poem, '', W, H, pick.preset) },
      ])
      .png()
      .toBuffer();
    res.set('Cache-Control', 'no-store').type('png').send(png);
    console.log(`[qian-card] ready poem=${poem.id} style=${pick.preset.key.slice(0, 2)}`);
  } catch (e) {
    console.error(`[qian-card] ready fail ${e.message}`);
    res.status(500).json({ error: 'compose_failed' });
  }
});

app.post('/v1/qian-card', upload.single('photo'), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'disabled' });
    const { poems, partners } = data();
    const poem = poems.get(String(req.body.poem || ''));
    // temple 可省略（2026-08-15）：一般籤詩頁無合作廟，隨機抽一種風格；
    // 有給 temple 但不在合作名單仍是 400（防亂塞參數）。
    const templeParam = String(req.body.temple || '');
    const partner = templeParam ? partners.get(templeParam) : null;
    const photo = req.file;
    if (!poem || (templeParam && !partner) || !photo || !/^image\//.test(photo.mimetype)) return res.status(400).json({ error: 'bad_request' });
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '?';
    if (!takeQuota(ip)) return res.status(429).json({ error: 'quota' });

    // style 可指定（'01'…'10'，前端風格選擇器）；未指定＝合作廟走 01、一般隨機
    const styleParam = String(req.body.style || '');
    const chosen = presetByKey(styleParam);
    if (styleParam && !chosen) return res.status(400).json({ error: 'bad_style' });
    const preset = chosen ?? (partner ? DEFAULT_STYLE : randomPreset());
    const art = await stylize(photo.buffer, photo.mimetype, preset);
    const W = 1024, H = 1536;
    const png = await sharp(art)
      .resize(W, H, { fit: 'cover' })
      .composite([
        { input: cardStyleSvg(poem, W, H, preset) },
        { input: overlaySvg(poem, partner?.name ?? '', W, H, preset) },
      ])
      .png()
      .toBuffer();
    res.type('png').send(png);
    console.log(`[qian-card] ok temple=${partner?.temple ?? '-'} style=${preset.key.slice(0, 2)} poem=${poem.id} day=${quota.day} total=${quota.total}`);
  } catch (e) {
    console.error(`[qian-card] fail ${e.status ?? 500} ${e.message}`);
    res.status(e.status ?? 500).json({ error: e.status === 422 ? 'photo_rejected' : 'generation_failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`folk-qian-api on :${PORT} (cap ${DAILY_CAP}/day, ${IP_DAILY}/ip)`));
