// 籤詩卡的共用版面設定。
// 這裡只描述文字與風格層的幾何位置，不產生任何像素或文字。
export function cardLayout(poem, W, H) {
  const lines = (poem.lines ?? []).map((line) => [...String(line)]);
  if (!lines.length) throw new Error(`poem ${poem.id ?? '?'} 沒有籤詩內容`);

  const fontSize = 44;
  const step = fontSize * 1.32;
  const colGap = fontSize * 1.7;
  const panelY = 42;
  const textY = 112;
  const x0 = W - 78;
  const maxChars = Math.max(...lines.map((line) => line.length), 1);
  const textBottom = textY + (maxChars - 1) * step + fontSize * 0.42;
  const panelBottom = textBottom + 30;
  const panelX = x0 - (lines.length - 1) * colGap - fontSize * 1.25;
  const panelRight = x0 + fontSize * 0.9;
  const footerH = Math.round(H * 0.112);
  const footerY = H - footerH;
  const fortune = poem.fortune ? String(poem.fortune) : '';
  const fortuneW = Math.max(86, [...fortune].length * 28 + 34);

  return {
    lines,
    fontSize,
    step,
    colGap,
    x0,
    textY,
    panel: {
      x: panelX,
      y: panelY,
      width: panelRight - panelX,
      height: panelBottom - panelY,
      bottom: panelBottom,
    },
    footer: { y: footerY, height: footerH },
    fortune: {
      x: W - 36 - fortuneW,
      y: H - 96,
      width: fortuneW,
      height: 42,
      centerX: W - 36 - fortuneW / 2,
      baselineY: H - 67,
    },
    titleBaselineY: H - 68,
    metaBaselineY: H - 27,
  };
}
