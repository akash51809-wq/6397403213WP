#!/usr/bin/env node

const targetUrl = process.argv[2] || process.env.AUTOPING_URL || process.env.RENDER_EXTERNAL_URL || 'https://local-whatsapp.onrender.com/ping';
const pingUrl = targetUrl.endsWith('/ping') ? targetUrl : `${targetUrl.replace(/\/$/, '')}/ping`;

console.log(`[Ping] Pinging ${pingUrl}...`);
const started = Date.now();

fetch(pingUrl, {
  method: 'GET',
  headers: { 'User-Agent': 'WA-Cron-Job/1.0' }
})
  .then(res => {
    const time = Date.now() - started;
    console.log(`[Ping] Success: ${res.status} ${res.statusText} in ${time}ms`);
    process.exit(0);
  })
  .catch(err => {
    console.error(`[Ping] Failed:`, err.message);
    process.exit(1);
  });
