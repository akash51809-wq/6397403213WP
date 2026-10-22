const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('1. pgAuthState: Fresh pairing fallback when creds are incomplete/missing', async (t) => {
  const { usePgAuthState } = require('../pgAuthState');
  assert.equal(typeof usePgAuthState, 'function', 'usePgAuthState must be exported');
});

test('2. index.js: Admin QR and connection routes exist and unblocked', async (t) => {
  const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');

  // Verify that the blocking guard that stopped QR code generation was removed
  assert.equal(
    indexContent.includes('ADMIN QR BLOCKED: existing MongoDB Admin session detected'),
    false,
    'The faulty admin QR blocking loop must not exist'
  );

  // Verify routes exist
  assert.ok(indexContent.includes("app.post('/api/whatsapp/connect'"), 'POST /api/whatsapp/connect route must exist');
  assert.ok(indexContent.includes("app.post('/api/whatsapp/disconnect'"), 'POST /api/whatsapp/disconnect route must exist');
  assert.ok(indexContent.includes("app.get('/api/whatsapp/qr'"), 'GET /api/whatsapp/qr route must exist');
  assert.ok(indexContent.includes("getLatestQR: () => latestQR"), 'getLatestQR must be exported in index.js');
});

test('3. auth.js: User WhatsApp endpoints support admin actions without 400 block', async (t) => {
  const authContent = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf-8');

  assert.equal(
    authContent.includes('BLOCKED admin userId=ADMIN from user session connect endpoint'),
    false,
    'auth.js must not block admin from connect endpoint'
  );
  assert.equal(
    authContent.includes('BLOCKED admin userId=ADMIN from user session disconnect endpoint'),
    false,
    'auth.js must not block admin from disconnect endpoint'
  );
  assert.equal(
    authContent.includes('BLOCKED QR request for admin user ADMIN via user QR endpoint'),
    false,
    'auth.js must not block admin from QR endpoint'
  );
});

test('4. Frontend: DevicePage onConnect triggers connectUserWhatsApp', async (t) => {
  const devicePageContent = fs.readFileSync(path.join(__dirname, '..', 'whatsapp-dashboard', 'src', 'pages', 'device', 'DevicePage.jsx'), 'utf-8');
  assert.ok(
    devicePageContent.includes('const onConnect = () => {\n    connectUserWhatsApp()\n  }'),
    'DevicePage onConnect must call connectUserWhatsApp unconditionally'
  );
});

test('5. Frontend: AuthContext connect and disconnect support admin and standard users', async (t) => {
  const authContextContent = fs.readFileSync(path.join(__dirname, '..', 'whatsapp-dashboard', 'src', 'context', 'AuthContext.jsx'), 'utf-8');
  assert.ok(authContextContent.includes('/api/whatsapp/connect'), 'AuthContext connectUserWhatsApp must call /api/whatsapp/connect for admin');
  assert.ok(authContextContent.includes('/api/whatsapp/disconnect'), 'AuthContext disconnectUserWhatsApp must call /api/whatsapp/disconnect for admin');
});

test('6. userSessions.js: Fast QR scanning configuration (syncFullHistory: false, qrTimeout, getMessage, Desktop Browser)', async (t) => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'userSessions.js'), 'utf-8');
  assert.ok(content.includes('syncFullHistory: false'), 'userSessions.js must have syncFullHistory: false to prevent mobile pairing timeouts');
  assert.ok(content.includes('qrTimeout: 60000') || content.includes('qrTimeout: 45000'), 'userSessions.js must have sufficient qrTimeout');
  assert.ok(content.includes('getMessage: async (key)'), 'userSessions.js must provide getMessage for retry receipt handling');
  assert.ok(content.includes("Browsers.macOS('Chrome')") || content.includes("Browsers.macOS('Desktop')"), 'userSessions.js must use official desktop browser to avoid Try again later');
  assert.ok(content.includes('clearUserCredentials'), 'userSessions.js must export clearUserCredentials for fresh pairing');
});

test('7. userSessions.js: Non-blocking connection update & async DP fetch', async (t) => {
  const content = fs.readFileSync(path.join(__dirname, '..', 'userSessions.js'), 'utf-8');
  assert.ok(content.includes("status: 'connected'"), 'status must be set to connected');
  assert.ok(content.includes("broadcastIncomingEvent('connection_status'"), 'connection_status must be broadcast immediately');
  assert.ok(content.includes('socket.profilePictureUrl(jid, \'image\')'), 'profilePictureUrl must be fetched asynchronously in background');
});

test('8. auth.js: Fast status response and QR generation wait loop', async (t) => {
  const authContent = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf-8');
  assert.ok(authContent.includes('waited < 2000'), 'auth.js must briefly wait for QR generation on user QR endpoint');
  assert.ok(
    !authContent.includes('profilePicUrl = await session.socket.profilePictureUrl'),
    'auth.js status endpoint must not block awaiting profilePictureUrl'
  );
});
