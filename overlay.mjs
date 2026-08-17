// 第 2 層：純文字層。
// 籤詩、廟名、籤號、吉凶與位置都在這裡確定性排版；不繪製底框或背景。
// style 參數（2026-08-15 加）：吉凶徽章文字色吃 preset 的 badgeText——
// 淺色徽章（01）配深字、深色徽章（03 漆線雕等）配淺字，寫死會深壓深讀不到。
// templeName 可為空字串（一般籤詩頁、無合作廟），落款只寫籤系與籤號。
import { cardLayout } from './layout.mjs';
import { DEFAULT_STYLE } from './style-presets.mjs';

export function overlaySvg(poem, templeName, W, H, style = DEFAULT_STYLE) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[c]));
  const layout = cardLayout(poem, W, H);
  const title = templeName
    ? `${templeName} · ${poem.sysLabel} 第${poem.no}籤`
    : `${poem.sysLabel} 第${poem.no}籤`;
  const titleSize = title.length > 20 ? 23 : 26;
  const cols = layout.lines
    .map((line, i) => {
      const x = layout.x0 - i * layout.colGap;
      return line
        .map((ch, j) => `<text class="poem" x="${x}" y="${layout.textY + j * layout.step}" font-size="${layout.fontSize}" text-anchor="middle">${esc(ch)}</text>`)
        .join('');
    })
    .join('');

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .poem{font-family:'Noto Serif CJK TC','Noto Sans CJK TC',serif;fill:#fff8e8;font-weight:600;paint-order:stroke;stroke:#2b1c0f;stroke-opacity:0.16;stroke-width:1.2}
    .footer-title{font-family:'Noto Serif CJK TC','Noto Sans CJK TC',serif;fill:#fff8e8;font-weight:600}
    .footer-meta{font-family:'Noto Sans CJK TC','Noto Sans',sans-serif;fill:#f2dfb5;font-weight:400;letter-spacing:1px}
  </style>
  ${cols}
  <text class="footer-title" x="36" y="${layout.titleBaselineY}" font-size="${titleSize}" text-anchor="start">${esc(title)}</text>
  ${poem.fortune ? `<text x="${layout.fortune.centerX}" y="${layout.fortune.baselineY}" font-family="'Noto Serif CJK TC','Noto Sans CJK TC',serif" font-size="22" font-weight="700" fill="${(style ?? DEFAULT_STYLE).badgeText}" text-anchor="middle">${esc(poem.fortune)}</text>` : ''}
  <text class="footer-meta" x="36" y="${layout.metaBaselineY}" font-size="18" text-anchor="start">folk.tw 神酷 · 線上解籤</text>
</svg>`);
}
