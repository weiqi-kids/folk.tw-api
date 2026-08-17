// 第 1 層：卡片風格層。
// 只放可重複使用的墨色、金線、框面與落款底，絕不放任何文字。
import { cardLayout } from './layout.mjs';
import { DEFAULT_STYLE } from './style-presets.mjs';

function decorSvg(style, panel) {
  const a = style.accent;
  const s = style.accentStrong;
  const { x, y, width, bottom } = panel;
  const right = x + width;
  const midX = x + width / 2;
  switch (style.decor) {
    case 'song':
      return `<path d="M ${x + 18} ${y + 34} q 28 10 48 0 q 22 -10 48 2 M ${x + 18} ${bottom - 36} q 26 -9 48 0" fill="none" stroke="${a}" stroke-opacity="0.7" stroke-width="1.3" />
      <circle cx="${x + 18}" cy="${y + 34}" r="2.5" fill="${s}" /><circle cx="${x + 66}" cy="${y + 34}" r="2" fill="${s}" />`;
    case 'lacquer':
      return `<path d="M ${x + 18} ${y + 24} h 62 M ${x + 18} ${y + 24} v 62 M ${right - 18} ${bottom - 24} h -62 M ${right - 18} ${bottom - 24} v -62" fill="none" stroke="${a}" stroke-opacity="0.82" stroke-width="2.4" />
      <path d="M ${x + 18} ${y + 24} l 8 -8 l 8 8 l -8 8 z M ${right - 18} ${bottom - 24} l -8 8 l -8 -8 l 8 -8 z" fill="${s}" fill-opacity="0.88" />`;
    case 'dunhuang':
      return `<path d="M ${x + 18} ${y + 38} q 24 -22 48 0 t 48 0 M ${x + 20} ${bottom - 40} q 28 20 55 0" fill="none" stroke="${a}" stroke-opacity="0.72" stroke-width="2" />
      <path d="M ${x + 34} ${y + 55} q 18 -12 36 0 M ${right - 42} ${bottom - 54} q -18 12 -36 0" fill="none" stroke="${s}" stroke-opacity="0.62" stroke-width="1.2" />`;
    case 'woodblock':
      return `<path d="M ${x + 18} ${y + 22} h 54 M ${x + 18} ${y + 22} v 54 M ${right - 18} ${bottom - 22} h -54 M ${right - 18} ${bottom - 22} v -54" fill="none" stroke="${a}" stroke-opacity="0.9" stroke-width="3.2" />
      <rect x="${x + 14}" y="${y + 18}" width="8" height="8" fill="${s}" /><rect x="${right - 22}" y="${bottom - 26}" width="8" height="8" fill="${s}" />`;
    case 'cyber':
      return `<path d="M ${x + 16} ${y + 20} h 76 M ${x + 16} ${y + 20} v 58 M ${right - 16} ${bottom - 20} h -76 M ${right - 16} ${bottom - 20} v -58" fill="none" stroke="${a}" stroke-opacity="0.92" stroke-width="2" stroke-dasharray="18 7" />
      <path d="M ${x + 16} ${y + 92} h 34 M ${right - 16} ${bottom - 92} h -34" stroke="${s}" stroke-opacity="0.85" stroke-width="2" />`;
    case 'comic':
      return `<path d="M ${x + 16} ${y + 20} h 66 M ${x + 16} ${y + 20} v 66 M ${right - 16} ${bottom - 20} h -66 M ${right - 16} ${bottom - 20} v -66" fill="none" stroke="${a}" stroke-opacity="0.95" stroke-width="4" />
      <path d="M ${x + 92} ${y + 32} l 20 8 M ${x + 92} ${y + 48} l 26 0 M ${right - 92} ${bottom - 32} l -20 -8" stroke="${s}" stroke-opacity="0.78" stroke-width="2" />`;
    case 'magic':
      return `<circle cx="${x + 42}" cy="${y + 42}" r="24" fill="none" stroke="${a}" stroke-opacity="0.8" stroke-width="1.4" /><circle cx="${x + 42}" cy="${y + 42}" r="9" fill="none" stroke="${s}" stroke-opacity="0.82" stroke-width="1.2" />
      <circle cx="${right - 42}" cy="${bottom - 42}" r="24" fill="none" stroke="${a}" stroke-opacity="0.72" stroke-width="1.4" /><path d="M ${x + 42} ${y + 10} v 64 M ${x + 10} ${y + 42} h 64" stroke="${s}" stroke-opacity="0.45" stroke-width="1" />`;
    case 'brass':
      return `<circle cx="${x + 42}" cy="${y + 42}" r="26" fill="none" stroke="${a}" stroke-opacity="0.8" stroke-width="2.5" /><circle cx="${x + 42}" cy="${y + 42}" r="9" fill="${s}" fill-opacity="0.72" /><path d="M ${x + 42} ${y + 10} v 14 M ${x + 42} ${y + 60} v 14 M ${x + 10} ${y + 42} h 14 M ${x + 60} ${y + 42} h 14" stroke="${a}" stroke-opacity="0.8" stroke-width="3" />`;
    case 'glass':
      return `<path d="M ${x + 18} ${y + 18} l 34 26 l -34 26 z M ${right - 18} ${bottom - 18} l -34 -26 l 34 -26 z" fill="none" stroke="${a}" stroke-opacity="0.76" stroke-width="1.8" />
      <path d="M ${x + 18} ${y + 18} h 58 M ${right - 18} ${bottom - 18} h -58" stroke="${s}" stroke-opacity="0.72" stroke-width="2" />`;
    case 'classic':
    default:
      return `<path d="M ${x + 22} ${y + 30} h 46 M ${x + 22} ${y + 30} v 48 M ${x + 22} ${bottom - 30} h 46" fill="none" stroke="${a}" stroke-opacity="0.72" stroke-width="1.5" />
      <circle cx="${x + 22}" cy="${y + 30}" r="3" fill="${s}" fill-opacity="0.9" /><circle cx="${x + 22}" cy="${bottom - 30}" r="2" fill="${s}" fill-opacity="0.75" />`;
  }
}

export function cardStyleSvg(poem, W, H, style = DEFAULT_STYLE) {
  const { panel, footer, fortune } = cardLayout(poem, W, H);
  const theme = style ?? DEFAULT_STYLE;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="inkWash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.panel.top}" stop-opacity="${theme.panel.topOpacity}" />
      <stop offset="1" stop-color="${theme.panel.bottom}" stop-opacity="${theme.panel.bottomOpacity}" />
    </linearGradient>
    <linearGradient id="footerWash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.footer.color}" stop-opacity="0" />
      <stop offset="0.38" stop-color="${theme.footer.color}" stop-opacity="${theme.footer.midOpacity}" />
      <stop offset="1" stop-color="${theme.footer.color}" stop-opacity="${theme.footer.endOpacity}" />
    </linearGradient>
  </defs>
  <rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" rx="20" fill="url(#inkWash)" stroke="${theme.panel.stroke}" stroke-opacity="${theme.panel.strokeOpacity}" stroke-width="1.2" />
  <rect x="${panel.x + 9}" y="${panel.y + 9}" width="${panel.width - 18}" height="${panel.height - 18}" rx="14" fill="none" stroke="${theme.panel.inner}" stroke-opacity="${theme.panel.innerOpacity}" stroke-width="1" />
  ${decorSvg(theme, panel)}
  <rect x="0" y="${footer.y}" width="${W}" height="${footer.height}" fill="url(#footerWash)" />
  <path d="M 36 ${H - 116} H 178" stroke="${theme.accent}" stroke-opacity="0.72" stroke-width="1.5" />
  <circle cx="36" cy="${H - 116}" r="3" fill="${theme.accentStrong}" fill-opacity="0.9" />
  ${poem.fortune ? `<rect x="${fortune.x}" y="${fortune.y}" width="${fortune.width}" height="${fortune.height}" rx="21" fill="${theme.badge}" fill-opacity="0.88" />` : ''}
</svg>`);
}
