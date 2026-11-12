const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const indexSrc = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
const authSrc = fs.readFileSync(path.join(ROOT, 'auth.js'), 'utf8');
const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');

test('1. clearAdminWhatsAppCredentials preserves admin_2..4 multi-device slots', () => {
    const start = indexSrc.indexOf('async function clearAdminWhatsAppCredentials');
    const end = indexSrc.indexOf('app.post(\'/api/whatsapp/disconnect\'', start);
    assert.ok(start !== -1 && end > start, 'clearAdminWhatsAppCredentials block must exist');
    const fnBody = indexSrc.slice(start, end);

    assert.ok(fnBody.includes("'^admin_[^0-9]'"), 'Must match ^admin_[^0-9] so admin_2..4 are preserved');
    assert.ok(!fnBody.includes("LIKE 'admin_%'"), 'Must NOT use overly broad LIKE admin_%');
    assert.ok(!fnBody.includes("{ $regex: '^admin_' }"), 'Must NOT use overly broad ^admin_ regex');

    // Verify auth.js disconnect fallback matches the same safe pattern
    const authDisconnectStart = authSrc.indexOf("router.post('/api/user/whatsapp/disconnect'");
    const authDisconnectEnd = authSrc.indexOf("router.get('/api/user/whatsapp/status'", authDisconnectStart);
    const authDisconnectBody = authSrc.slice(authDisconnectStart, authDisconnectEnd);
    assert.ok(authDisconnectBody.includes("'^admin_[^0-9]'"), 'auth.js disconnect fallback must preserve admin_2..4');
    assert.ok(!authDisconnectBody.includes("LIKE 'admin_%'"), 'auth.js disconnect fallback must NOT use LIKE admin_%');
});

test('2. handleSendText uses fresh per-attempt sendWithTimeout instead of reusing sendTimeoutPromise', () => {
    assert.ok(indexSrc.includes('function sendWithTimeout('), 'sendWithTimeout helper must exist');
    assert.ok(!indexSrc.includes('sendTimeoutPromise'), 'Stale shared sendTimeoutPromise must be removed');

    const sendFnStart = indexSrc.indexOf('async function handleSendText');
    const sendFnBody = indexSrc.slice(sendFnStart);
    const timeoutCalls = sendFnBody.match(/sendWithTimeout\(/g) || [];
    assert.ok(timeoutCalls.length >= 2, 'handleSendText must use fresh sendWithTimeout for both first send and retry');
});

test('3. dispatchQueuedApiMessage bounds bgSocket.sendMessage with timeout', () => {
    const fnStart = indexSrc.indexOf('function dispatchQueuedApiMessage');
    const fnEnd = indexSrc.indexOf('async function handleSendText', fnStart);
    const fnBody = indexSrc.slice(fnStart, fnEnd);

    assert.ok(fnBody.includes('sendWithTimeout(bgSocket, jid, messagePayload'), 'Queued delivery must wrap bgSocket.sendMessage in sendWithTimeout');
});

test('4. handleSendText parses form/string async flags, fast-paths ready sockets, and bounds wait loop by wall clock', () => {
    const fnStart = indexSrc.indexOf('async function handleSendText');
    const fnEnd = indexSrc.indexOf('function startBot', fnStart);
    const fnBody = indexSrc.slice(fnStart, fnEnd);

    assert.ok(fnBody.includes("req.body?.async === '1'"), 'isAsync must accept string "1" from form-urlencoded requests');
    assert.ok(fnBody.includes('const waitDeadline = Date.now() + 8000'), 'Wait loop must enforce 8s wall-clock deadline');

    const waitStart = fnBody.indexOf('const waitDeadline = Date.now() + 8000');
    const waitEnd = fnBody.indexOf('if (!activeSocket && !hasValidCredentialsInDb)', waitStart);
    const waitLoopBody = fnBody.slice(waitStart, waitEnd);
    assert.ok(!waitLoopBody.includes('findOrLoadSession('), '8s wait loop must NOT call blocking findOrLoadSession on every 300ms tick');
});

test('5. resolvePairedSlotsAndCredentials includes direct SQL session_auth fallback and connecting guard', () => {
    const fnStart = indexSrc.indexOf('async function resolvePairedSlotsAndCredentials');
    const fnEnd = indexSrc.indexOf('function wakeRequiredSessions', fnStart);
    const fnBody = indexSrc.slice(fnStart, fnEnd);

    assert.ok(fnBody.includes("admin_creds.json"), 'resolvePairedSlotsAndCredentials must have direct session_auth SQL fallback');
    assert.ok(fnBody.includes('hasConnectingAdminSocket'), 'Must preserve in-memory connecting socket state against transient DB hiccups');
});

test('6. auth.js connect routes do not unconditionally wipe live admin session with startBot(true)', () => {
    const userConnectStart = authSrc.indexOf("router.post('/api/user/whatsapp/connect'");
    const userConnectEnd = authSrc.indexOf("router.post('/api/user/whatsapp/disconnect'", userConnectStart);
    const userConnectBody = authSrc.slice(userConnectStart, userConnectEnd);
    assert.ok(!userConnectBody.includes('startBot(true)'), '/api/user/whatsapp/connect must NOT hardcode startBot(true)');
    assert.ok(userConnectBody.includes('getActiveAdminSocket'), '/api/user/whatsapp/connect must check existing active admin socket');

    const devConnectStart = authSrc.indexOf("router.post('/api/devices/connect'");
    const devConnectEnd = authSrc.indexOf("router.post('/api/devices/pairing-code'", devConnectStart);
    const devConnectBody = authSrc.slice(devConnectStart, devConnectEnd);
    assert.ok(!devConnectBody.includes('startBot(true)'), '/api/devices/connect must NOT hardcode startBot(true)');
    assert.ok(devConnectBody.includes('getActiveAdminSocket'), '/api/devices/connect slot 1 must check existing active admin socket');
});

test('7. server.js AutoPing supports fallback candidates when RENDER_EXTERNAL_URL fails', () => {
    assert.ok(serverSrc.includes('function getAutoPingCandidates()'), 'server.js must define getAutoPingCandidates()');
    assert.ok(serverSrc.includes('https://services.easyrechargesolution.com/ping'), 'AutoPing candidates must include production domain ping URL');
    assert.ok(serverSrc.includes('http://127.0.0.1:${PORT}/ping'), 'AutoPing candidates must include local loopback ping fallback');
});
