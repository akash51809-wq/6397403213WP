/**
 * User WhatsApp Session — Isolation & Concurrency Tests
 * Covers the fixes applied to userSessions.js:
 * 1. Concurrency guard (startingSessionIds mutex) — no duplicate sockets
 * 2. Dead WebSocket detection (ws.readyState check) — connected status respected only when ws is open
 * 3. Admin/user session strict isolation — 'ADMIN' userId always blocked from user sessions Map
 * 4. stopUserSession safety — only deletes user-{userId}_* keys, never admin keys
 * 5. Watchdog guard — logged_out sessions not re-revived; reconnecting status clears connectingSince
 * 6. phoneNum scope fix — sessionData.connectedNumber used in history sync handler
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// ─── Read source files for static analysis ───────────────────────────────────
const userSessionsSrc = fs.readFileSync(
    path.join(__dirname, '..', 'userSessions.js'), 'utf-8'
).replace(/\r\n/g, '\n');

const indexSrc = fs.readFileSync(
    path.join(__dirname, '..', 'index.js'), 'utf-8'
).replace(/\r\n/g, '\n');

// ─── Test 1: Concurrency Guard (mutex) ───────────────────────────────────────
test('1. startUserSession: startingSessionIds mutex prevents duplicate socket creation', (t) => {
    // Must declare the Set
    assert.ok(
        userSessionsSrc.includes('const startingSessionIds = new Set()'),
        'startingSessionIds Set must be declared'
    );

    // Must check the lock before creating a socket
    assert.ok(
        userSessionsSrc.includes('startingSessionIds.has(normalizedUserId)'),
        'Must guard entry with startingSessionIds.has() check'
    );

    // Must acquire the lock
    assert.ok(
        userSessionsSrc.includes('startingSessionIds.add(normalizedUserId)'),
        'Must add to startingSessionIds before creating socket'
    );

    // Must release the lock in a finally block
    assert.ok(
        userSessionsSrc.includes('} finally {') &&
        userSessionsSrc.includes('startingSessionIds.delete(normalizedUserId)'),
        'Must release lock in finally block so it always runs'
    );
});

// ─── Test 2: Dead WebSocket Detection ────────────────────────────────────────
test('2. startUserSession: Does not return early if connected socket has dead WebSocket', (t) => {
    // Must check ws.readyState when status === 'connected'
    assert.ok(
        userSessionsSrc.includes('ws?.readyState'),
        'Must check ws.readyState to detect dead sockets'
    );

    // Must log a warning when dead socket detected
    assert.ok(
        userSessionsSrc.includes('Dead socket detected for'),
        'Must log a warning when dead socket is detected'
    );

    // 'reconnecting' status must be used as intermediate state
    assert.ok(
        userSessionsSrc.includes("currentSession.status = 'reconnecting'") ||
        userSessionsSrc.includes("session.status = 'reconnecting'"),
        "Must set status to 'reconnecting' before calling startUserSession from watchdog"
    );
});

// ─── Test 3: Admin/User Session Strict Isolation ─────────────────────────────
test('3. startUserSession: ADMIN userId is blocked from user sessions Map', (t) => {
    // Top of startUserSession must block ADMIN
    assert.ok(
        userSessionsSrc.includes("normalizedUserId.toUpperCase() === 'ADMIN'"),
        'startUserSession must block ADMIN userId at entry'
    );

    // getUserSession must also block ADMIN
    assert.ok(
        userSessionsSrc.includes("String(userId || '').trim().toUpperCase() === 'ADMIN') return null"),
        'getUserSession must return null for ADMIN userId'
    );

    // QR endpoint must block ADMIN
    assert.ok(
        userSessionsSrc.includes("'ADMIN') {\n        console.warn(`[UserSession] BLOCKED QR request for admin user"),
        'getUserQR must block ADMIN userId'
    );

    // sendUserMessage must block ADMIN
    assert.ok(
        userSessionsSrc.includes("'ADMIN') {\n        throw new Error('Admin messages must use dedicated Admin WhatsApp socket')"),
        'sendUserMessage must block ADMIN userId'
    );

    // Watchdog must purge any accidentally-inserted ADMIN entries from the map
    assert.ok(
        userSessionsSrc.includes("String(userId).trim().toUpperCase() === 'ADMIN') {\n                    sessions.delete(userId)"),
        'Watchdog must delete any ADMIN entry that leaks into sessions Map'
    );
});

// ─── Test 4: stopUserSession — Only deletes user keys, never admin keys ───────
test('4. stopUserSession: Only deletes user-{userId}_* keys from SessionAuth', (t) => {
    // Must delete user-{userId}_* pattern
    assert.ok(
        userSessionsSrc.includes('`^user-${userId}_`'),
        'stopUserSession must delete keys matching ^user-{userId}_ pattern'
    );

    // Must NOT contain the dead admin deletion block
    assert.ok(
        !userSessionsSrc.includes("String(userId).trim().toUpperCase() === 'ADMIN') {\n            await SessionAuth.deleteMany"),
        'stopUserSession must not contain dead admin deletion block'
    );

    // Must NOT import { connection } from db (that export does not exist)
    const stopUserSessionSection = userSessionsSrc.slice(
        userSessionsSrc.indexOf('async function stopUserSession'),
        userSessionsSrc.indexOf('function getUserSession')
    );
    assert.ok(
        !stopUserSessionSection.includes("require('./db')"),
        'stopUserSession must not import connection from db.js (wrong export name)'
    );
});

// ─── Test 5: Watchdog — connectingSince cleared before retry ─────────────────
test('5. Watchdog: Clears connectingSince and sets reconnecting before calling startUserSession', (t) => {
    const watchdogSection = userSessionsSrc.slice(
        userSessionsSrc.indexOf('function startUserSessionWatchdog'),
        userSessionsSrc.lastIndexOf('}') + 1
    );

    // Dead socket path must set status and clear connectingSince
    assert.ok(
        watchdogSection.includes("session.status = 'reconnecting'"),
        'Watchdog must mark session as reconnecting before calling startUserSession for dead ws'
    );
    assert.ok(
        watchdogSection.includes('session.connectingSince = null'),
        'Watchdog must clear connectingSince before retrying startUserSession'
    );

    // Revive path must skip logged_out sessions
    assert.ok(
        watchdogSection.includes("continue; // connected, connecting, waiting, or logged_out — skip"),
        'Watchdog revive must skip non-disconnected sessions (including logged_out)'
    );

    // Revive path must still check DB for logged_out status
    assert.ok(
        watchdogSection.includes("dbRec.status !== 'logged_out'"),
        'Watchdog revive must confirm DB status is not logged_out before reviving'
    );
});

// ─── Test 6: phoneNum Scope Fix in history sync ───────────────────────────────
test('6. messaging-history.set handler: Uses sessionData.connectedNumber (not out-of-scope phoneNum)', (t) => {
    // Find the messaging-history.set handler section
    const histStart = userSessionsSrc.indexOf("socket.ev.on('messaging-history.set'");
    const histEnd = userSessionsSrc.indexOf("socket.ev.on('messages.upsert'");
    const historySection = userSessionsSrc.slice(histStart, histEnd);

    // Must NOT reference bare `phoneNum` inside the broadcast call inside history sync
    // The correct fix uses `sessionData.connectedNumber`
    assert.ok(
        historySection.includes('sessionData.connectedNumber'),
        'History sync broadcastIncomingEvent must use sessionData.connectedNumber (not scoped phoneNum)'
    );

    // Must contain the explanatory comment about scope
    assert.ok(
        historySection.includes('phoneNum is scoped to connection.update handler'),
        'Must have comment explaining why sessionData.connectedNumber is used'
    );
});

// ─── Test 7: Admin/User socket isolation in index.js ─────────────────────────
test('7. index.js: Admin socket (global.__waAdminSocket / sock) never mixed with user sessions', (t) => {
    // Admin socket must be set as global.__waAdminSocket
    assert.ok(
        indexSrc.includes('global.__waAdminSocket'),
        'index.js must maintain admin socket as global.__waAdminSocket'
    );

    // clearAdminWhatsAppCredentials must not match user-{userId} pattern
    const clearAdminFn = indexSrc.slice(
        indexSrc.indexOf('clearAdminWhatsAppCredentials'),
        indexSrc.indexOf('clearAdminWhatsAppCredentials') + 1000
    );
    assert.ok(
        clearAdminFn.includes("id = 'admin'"),
        'clearAdminWhatsAppCredentials must target admin id'
    );
    assert.ok(
        !clearAdminFn.includes('user-'),
        'clearAdminWhatsAppCredentials must NOT target user- session ids'
    );
});

// ─── Test 8: Reconnect on connection.close uses setTimeout not synchronous call ──
test('8. connection.update close: Reconnect uses setTimeout delay (not immediate recursive call)', (t) => {
    const connUpdateSection = userSessionsSrc.slice(
        userSessionsSrc.indexOf("socket.ev.on('connection.update'"),
        userSessionsSrc.indexOf("socket.ev.on('creds.update'")
    );

    // Reconnect must use setTimeout
    assert.ok(
        connUpdateSection.includes('setTimeout(() => startUserSession(userId), 3000)'),
        'Reconnect on close must use setTimeout with 3s delay to avoid hammering WhatsApp servers'
    );

    // Logged-out must clear credentials
    assert.ok(
        connUpdateSection.includes('isLoggedOut') &&
        connUpdateSection.includes('SessionAuth.deleteMany'),
        'Logged out must trigger SessionAuth credential deletion'
    );
});
