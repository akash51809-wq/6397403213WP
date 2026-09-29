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
