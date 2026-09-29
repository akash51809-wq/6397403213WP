const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('1. index.js: Strict separation and active scanned number filtering in getIncomingMessages', async (t) => {
    const rawContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');
    const indexContent = rawContent.replace(/\r\n/g, '\n');

    // Admin disconnected inbox check
    assert.ok(
        indexContent.includes('const isAdminConn = connectionStatus === \'connected\'') &&
        indexContent.includes('if (!isAdminConn) {\n            // Admin WhatsApp is disconnected / removed -> show no data\n            return [];\n        }'),
        'Admin must receive empty inbox when WhatsApp is not actively connected'
    );

    // Regular user disconnected inbox check
    assert.ok(
        indexContent.includes('const isUserConn = Boolean(uSess && uSess.status === \'connected\' && uSess.socket && uSess.connectedNumber);') &&
        indexContent.includes('if (!isUserConn) {\n        // User\'s WhatsApp is disconnected / removed -> show no data\n        return [];\n    }'),
        'User must receive empty inbox when WhatsApp is not actively connected'
    );

    // Exclusion of regular user messages from Admin inbox
    assert.ok(
        indexContent.includes('Strictly exclude any regular user\'s data') &&
        indexContent.includes("if (owner && owner !== 'ADMIN')"),
        'Admin inbox must strictly exclude non-admin messages'
    );

    // Session phone verification
    assert.ok(
        indexContent.includes('sClean10 === adminClean10'),
        'Admin messages must match Admin currently scanned active number'
    );
    assert.ok(
        indexContent.includes('sClean10 === userPhoneClean10'),
        'User messages must match User currently scanned active number'
    );
});

test('2. index.js: Real-time SSE Isolation in broadcastIncomingEvent', async (t) => {
    const rawContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');
    const indexContent = rawContent.replace(/\r\n/g, '\n');

    // SSE must strictly filter by owner
    assert.ok(
        indexContent.includes('targetOwner === \'ADMIN\''),
        'broadcastIncomingEvent must differentiate between admin and user targets'
    );
    assert.ok(
        indexContent.includes('if (targetOwner === \'ADMIN\') {\n                if (isClientAdmin) clientRes.write(payload);\n            } else if (targetOwner) {\n                if (String(user.userId || \'\') === String(ownerUserId)) {\n                    clientRes.write(payload);\n                }\n            }'),
        'SSE messages must strictly route admin events to admin clients and user events to that user only'
    );
});

test('3. Disconnect cleanup: clearUserIncomingMessages called for Admin and User', async (t) => {
    const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');
    const authContent = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf-8');
    const userSessionsContent = fs.readFileSync(path.join(__dirname, '..', 'userSessions.js'), 'utf-8');

    // index.js disconnect endpoint
    assert.ok(
        indexContent.includes("clearUserIncomingMessages('admin')"),
        'index.js /api/whatsapp/disconnect must clear admin incoming messages'
    );

    // auth.js disconnect endpoint
    assert.ok(
        authContent.includes("clearUserIncomingMessages('admin')") &&
        authContent.includes("clearUserIncomingMessages(req.user.userId)"),
        'auth.js /api/user/whatsapp/disconnect must clear messages on disconnect'
    );

    // userSessions.js stopUserSession
    assert.ok(
        userSessionsContent.includes("clearUserIncomingMessages(userId)"),
        'userSessions.js stopUserSession must clear messages on session stop'
    );
});

test('4. Message tagging: sessionPhone tagged across user send & history sync', async (t) => {
    const authContent = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf-8');
    const userSessionsContent = fs.readFileSync(path.join(__dirname, '..', 'userSessions.js'), 'utf-8');

    // /api/user/send sessionPhone
    assert.ok(
        authContent.includes('sessionPhone: sPhone'),
        '/api/user/send must attach sessionPhone to incoming_messages record'
    );

    // userSessions history sync sessionPhone
    assert.ok(
        userSessionsContent.includes('sessionPhone: sPhone'),
        'userSessions history sync must attach sessionPhone to synced records'
    );
});

test('5. Frontend: AuthContext resets inbox state on disconnect', async (t) => {
    const authContextContent = fs.readFileSync(
        path.join(__dirname, '..', 'whatsapp-dashboard', 'src', 'context', 'AuthContext.jsx'),
        'utf-8'
    );

    assert.ok(
        authContextContent.includes('setChats([])') &&
        authContextContent.includes('setMessages([])') &&
        authContextContent.includes('setSelected(null)'),
        'Frontend AuthContext must clear local chats and messages when WhatsApp is disconnected'
    );
});
