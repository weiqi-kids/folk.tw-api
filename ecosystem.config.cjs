module.exports = {
  apps: [
    {
      name: 'folk-qian-api',
      cwd: '/root/folk.tw-api',
      script: 'server.mjs',
      node_args: '--env-file-if-exists=/root/folk.tw-api/.env',
      env: { PORT: 8495 },
      max_memory_restart: '300M',
    },
  ],
};
