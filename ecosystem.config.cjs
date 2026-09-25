module.exports = {
  apps: [
    {
      name: 'folk-qian-api',
      // 用 __dirname 不寫死路徑：專案搬 volume 時寫死的 cwd 不會跟著改，而 pm2 以 cwd 解析
      // script 與 .env——reload 不會出事，只有 pm2 delete 後重新 start 才引爆（2026-09-25
      // gcm-fhir-server 實際踩到：跑到舊路徑那份、讀不到 .env，port 與 OAuth aud 全退回預設）。
      cwd: __dirname,
      script: 'server.mjs',
      node_args: '--env-file-if-exists=/mnt/folk-tw/folk.tw-api/.env',
      env: { PORT: 8495 },
      max_memory_restart: '400M',
    },
  ],
};
