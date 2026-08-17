# folk.tw-api

[folk.tw（神酷）](https://folk.tw) 的周邊 API（`api.folk.tw`）：

- **祈福籤詩圖**：照片上傳 → OpenAI 風格化 → 伺服器疊籤詩文字（照片即生即毀；每日／每 IP 限額）
- **風格底圖池**：無合作廟的「直接下載」從 `style-previews/*/backgrounds/`（不進版控）抽確定性底圖
- **預生成卡靜態供檔**：`/cards/<廟>/<籤>.png`
- **同籤留言（送審制）**：`/v1/whispers`，審核工具 `review-whispers.mjs`

部署：pm2（`ecosystem.config.cjs`，服務名 `folk-qian-api`）。金鑰走 `.env`（不進版控）；
`OPENAI_API_KEY` 未設時 `/healthz` 回 503＝功能閘門，非故障。
規格與決策脈絡見 folk.tw repo 的 `docs/temple-partner-links.md` §P2 與 `docs/qian-interactive.md`。
