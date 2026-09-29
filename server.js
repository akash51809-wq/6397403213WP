const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { connection: dbConnection, connectPostgres } = require('./db');

dbConnection.on('connected', () => console.log('[PostgreSQL] Connected'));
dbConnection.on('open', () => console.log('[PostgreSQL] Connection open'));
dbConnection.on('disconnected', () => console.error('[PostgreSQL] Disconnected'));
dbConnection.on('error', (err) => console.error('[PostgreSQL] Connection error:', err?.name || 'Error', err?.message || err));


/* =========================================================
   BAILEYS ADMIN WHATSAPP BRIDGE
   ========================================================= */
try {
  const baileysModulePath = require.resolve('@whiskeysockets/baileys');
  const originalBaileys = require(baileysModulePath);
  const originalMakeWASocket = originalBaileys.default;
  const wrappedBaileys = Object.create(originalBaileys);

  function normalizeIndianWhatsAppNumber(value) {
    let digits = String(value ?? '').trim().replace(/\D/g, '');
    if (digits.startsWith('0091')) digits = digits.slice(4);
    if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    if (digits.length >= 10) return digits;
    throw new Error('Invalid WhatsApp mobile number: ' + value);
  }

  // Robust helper to send message through active Baileys socket
  async function sendAdminText(number, text, retries = 3) {
    let lastError = null;
    let socketWasAvailable = false;

    for (let attempt = 1; attempt <= retries; attempt++) {
      let current = global.__waAdminSocket;
      if (!current || typeof current.sendMessage !== 'function') {
        try {
          const { getSessionByPhoneOrUserId, sessions } = require('./userSessions');
          const adminPhone = process.env.ADMIN_PHONE ? String(process.env.ADMIN_PHONE).trim() : '';
          const match = adminPhone ? getSessionByPhoneOrUserId(adminPhone) : null;
          if (match?.session?.socket && match?.session?.status === 'connected') {
            current = match.session.socket;
            global.__waAdminSocket = current;
          } else {
            const fallbackUser = process.env.ADMIN_DEFAULT_USER_ID ? String(process.env.ADMIN_DEFAULT_USER_ID).trim() : '';
            if (fallbackUser) {
              const userS = sessions?.get(fallbackUser);
              if (userS?.socket && userS?.status === 'connected') {
                current = userS.socket;
                global.__waAdminSocket = current;
              }
            }
          }
        } catch (e) {}
      }

      if (current && typeof current.sendMessage === 'function') {
        socketWasAvailable = true;
        try {
          const digits = normalizeIndianWhatsAppNumber(number);
          const jid = `${digits}@s.whatsapp.net`;
          const result = await current.sendMessage(jid, { text: String(text) });
          console.log(`[Auth WhatsApp] Message sent successfully to ${digits}`);
          return result;
        } catch (error) {
          lastError = error;
          console.error(`[Auth WhatsApp] Attempt ${attempt}/${retries} failed:`, error?.message || error);
        }
      } else {
        console.warn(`[Auth WhatsApp] Attempt ${attempt}/${retries}: Admin socket not available (socket=${!!current}, sendMessage=${typeof current?.sendMessage})`);
      }

      if (attempt < retries) {
        console.log(`[Auth WhatsApp] Waiting 2s before retry (${attempt}/${retries})...`);
        await new Promise(res => setTimeout(res, 2000));
      }
    }

    // If the socket was available but sending failed, throw the actual error
    if (socketWasAvailable && lastError) {
      console.error('[Auth WhatsApp] All retries exhausted. Last error:', lastError?.message || lastError);
      throw new Error(`WhatsApp message भेजने में error: ${lastError?.message || 'Unknown error'}`);
    }

    throw new Error('Admin WhatsApp अभी connected नहीं है। कृपया कुछ देर, फिर प्रयास करें।');
  }

  global.__waSendAdminText = sendAdminText;
  console.log('[Baileys bridge] Admin send text helper initialized');
} catch (error) {
  console.error('[Baileys bridge] Setup failed:', error?.message || error);
}

const { router: authRouter, ensureAdminUser, authRequired, adminRequired } = require('./auth');
const cors = require('cors');

let botApp = null;
let botStartup = null;
const originalListen = express.application.listen;
express.application.listen = function (...args) {
  botApp = this;
  const lastArg = args[args.length - 1];
  if (typeof lastArg === 'function') botStartup = lastArg;
  return { close(callback) { if (typeof callback === 'function') callback(); } };
};

try { require('./index'); } finally { express.application.listen = originalListen; }
if (!botApp) throw new Error('WhatsApp backend app could not be loaded from index.js');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY || 1);

// Strict CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') {
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
    }
    if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.RENDER_EXTERNAL_URL && origin === process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Api-Token']
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
const cron = require('node-cron');

/* =========================================================
   AUTO-PING / KEEP-ALIVE SYSTEM (PREVENT RENDER SLEEP)
========================================================= */

const autoPingStats = {
  enabled: true,
  url: '',
  intervalMinutes: 5,
  cronSchedule: '*/5 * * * *',
  lastPingTime: null,
  lastPingStatus: null,
  totalPings: 0,
  failures: 0
};

function getAutoPingUrl() {
  if (process.env.AUTOPING_URL) return process.env.AUTOPING_URL.trim();
  if (process.env.RENDER_EXTERNAL_URL) return `${process.env.RENDER_EXTERNAL_URL.trim().replace(/\/$/, '')}/ping`;
  if (process.env.APP_URL) return `${process.env.APP_URL.trim().replace(/\/$/, '')}/ping`;
  return 'https://local-whatsapp.onrender.com/ping';
}

async function performAutoPing() {
  const pingUrl = getAutoPingUrl();
  autoPingStats.url = pingUrl;
  autoPingStats.totalPings += 1;
  const started = Date.now();

  try {
    const res = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'WA-Control-AutoPing-Cron/1.0 (Keep-Alive)'
      },
      signal: AbortSignal.timeout(15000)
    });
    const elapsed = Date.now() - started;
    autoPingStats.lastPingTime = new Date().toISOString();
    autoPingStats.lastPingStatus = `${res.status} ${res.statusText} (${elapsed}ms)`;
    console.log(`[AutoPing Cron] Keep-Alive Ping -> ${pingUrl} [${autoPingStats.lastPingStatus}]`);
  } catch (err) {
    autoPingStats.failures += 1;
    autoPingStats.lastPingTime = new Date().toISOString();
    autoPingStats.lastPingStatus = `Error: ${err.message}`;
    console.warn(`[AutoPing Cron] Keep-Alive Ping to ${pingUrl} failed:`, err.message);
  }
}

function startAutoPing() {
  const minutes = Math.max(1, Number(process.env.AUTOPING_INTERVAL_MINUTES || 5));
  const cronSchedule = process.env.AUTOPING_CRON_SCHEDULE || `*/${minutes} * * * *`;
  autoPingStats.intervalMinutes = minutes;
  autoPingStats.cronSchedule = cronSchedule;
  autoPingStats.url = getAutoPingUrl();

  console.log(`[AutoPing] Render Keep-Alive active. Registered cron job "${cronSchedule}" to ping ${autoPingStats.url}`);

  // Initial warmup ping after 15 seconds
  setTimeout(performAutoPing, 15000);

  // Setup cronjob with node-cron
  if (cron.validate(cronSchedule)) {
    cron.schedule(cronSchedule, () => {
      performAutoPing();
    });
    console.log(`[AutoPing] node-cron active on schedule: "${cronSchedule}"`);
  } else {
    console.warn(`[AutoPing] Invalid cron schedule "${cronSchedule}", falling back to setInterval (${minutes}m)`);
    setInterval(performAutoPing, minutes * 60 * 1000);
  }
}


const distPath = path.join(__dirname, 'whatsapp-dashboard', 'dist');
const websitePath = fs.existsSync(path.join(__dirname, 'frontend design', 'WP-UI-design-main', 'index.html'))
  ? path.join(__dirname, 'frontend design', 'WP-UI-design-main')
  : path.join(__dirname, 'frontend design');

app.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'alive',
    message: 'OK - Alive',
    serverTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    autoping: {
      enabled: autoPingStats.enabled,
      interval: `${autoPingStats.intervalMinutes}m`,
      lastPingTime: autoPingStats.lastPingTime,
      lastPingStatus: autoPingStats.lastPingStatus,
      totalPings: autoPingStats.totalPings
    }
  });
});

app.get('/api/system/autoping', authRequired, adminRequired, (req, res) => {
  res.json({
    success: true,
    stats: autoPingStats,
    targetUrl: getAutoPingUrl()
  });
});

app.post('/api/system/autoping/trigger', authRequired, adminRequired, async (req, res) => {
  await performAutoPing();
  res.json({
    success: true,
    stats: autoPingStats
  });
});

app.use('/api/settings/company', express.json({ limit: '15mb' }));
app.use('/api/user/settings/auto-image', express.json({ limit: '15mb' }));
app.use(authRouter);
app.use(botApp);

// 1. Serve static files from marketing website and React dashboard
app.use(express.static(websitePath, { index: false }));
app.use(express.static(distPath, { index: false }));

// 2. Marketing website subpages (plans, api-docs, contact, privacy, refund, security, terms)
const marketingSubpages = ['plans', 'api-docs', 'contact', 'privacy', 'refund', 'security', 'terms'];
marketingSubpages.forEach(sp => {
  app.get(`/${sp}`, (req, res) => {
    const cleanPath = req.originalUrl.split('?')[0];
    if (!cleanPath.endsWith('/')) {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, `/${sp}/${query}`);
    }
    const file = path.join(websitePath, sp, 'index.html');
    if (fs.existsSync(file)) return res.sendFile(file);
    const notFound = path.join(websitePath, '404.html');
    if (fs.existsSync(notFound)) return res.status(404).sendFile(notFound);
    res.status(404).send('Not Found');
  });
});

// 3. Marketing website home page
app.get(['/', '/index.html'], (req, res) => {
  const homeFile = path.join(websitePath, 'index.html');
  if (fs.existsSync(homeFile)) return res.sendFile(homeFile);
  const fallbackDashboard = path.join(distPath, 'index.html');
  return res.sendFile(fallbackDashboard);
});

// 4. React Dashboard SPA fallback (/login, /signup, /dashboard, /subscription, /admin, etc.)
app.use((req, res, next) => {
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/api/') &&
    !req.path.startsWith('/media') &&
    !req.path.startsWith('/send-text') &&
    req.path !== '/ping'
  ) {
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
      return next();
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

const PORT = process.env.PORT || 10000;
const DATABASE_URL = String(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.MONGO_URI || '').trim();

async function startServer() {
  if (!DATABASE_URL) {
    console.error('FATAL: DATABASE_URL (or POSTGRES_URL) is not configured.');
    process.exit(1);
  }

  const encryptionKey = process.env.SESSION_ENCRYPTION_KEY ? String(process.env.SESSION_ENCRYPTION_KEY).trim() : '';
  if (!encryptionKey || encryptionKey.length < 16) {
    console.error('FATAL: SESSION_ENCRYPTION_KEY is missing or too short (min 16 chars). Required for secure WhatsApp credentials storage.');
    process.exit(1);
  }

  try {
    await connectPostgres(DATABASE_URL);

    console.log('PostgreSQL Connected Successfully');
    await ensureAdminUser();
    try {
      const { migrateUnencryptedSessionAuth } = require('./pgAuthState');
      await migrateUnencryptedSessionAuth();
    } catch (migAuthErr) {
      console.warn('[SessionAuth] Encryption migration warning:', migAuthErr.message);
    }
    try {
      const { initPostgresDataSync, initMongoDataSync } = require('./index');
      const syncFn = initPostgresDataSync || initMongoDataSync;
      if (typeof syncFn === 'function') {
        await syncFn();
      }
    } catch (syncErr) {
      console.warn('[Server] Initial data sync warning:', syncErr.message);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Unified Server running and listening on 0.0.0.0:${PORT}`);
      if (botStartup) {
        try { botStartup(); } catch (err) { console.error('WhatsApp bot startup failed:', err); }
      }
      try {
        const { restoreAllSessions, startUserSessionWatchdog } = require('./userSessions');
        restoreAllSessions().catch(e => console.error('[UserSessions] Restore error:', e));
        if (typeof startUserSessionWatchdog === 'function') {
          startUserSessionWatchdog();
        }
      } catch (err) {
        console.error('[UserSessions] Load error:', err);
      }
      // Start Auto-Ping keep-alive to keep Render awake 24/7
      try {
        startAutoPing();
      } catch (pingErr) {
        console.error('[AutoPing] Initialization error:', pingErr);
      }
    });
  } catch (err) {
    console.error('FATAL: PostgreSQL connection failed:', err?.message || err);
    process.exit(1);
  }
}

startServer();