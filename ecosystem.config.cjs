module.exports = {
  apps: [
    {
      name: 'folk-qian-api',
      cwd: '/mnt/folk-tw/folk.tw-api',
      script: 'server.mjs',
      node_args: '--env-file-if-exists=/mnt/folk-tw/folk.tw-api/.env',
      env: { PORT: 8495 },
      max_memory_restart: '300M',
    },
  ],
};
