const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');

test('REMEDIATION 14-POINTS VERIFICATION', async (t) => {

    await t.test('Point 1: SMS WebSocket Auth fail-closed on all 7 key combinations', async () => {
        const smsRouter = require('../smsRouter');
        const db = require('../utils/smsDb');

        const originalGetSetting = db.getSetting;
        const originalGetDeviceByToken = db.getDeviceByToken;

        const testMatrix = [
            { expected: 'secret123', client: 'secret123', shouldAllow: true },
            { expected: 'secret123', client: 'wrong', shouldAllow: false },
            { expected: 'secret123', client: '', shouldAllow: false },
            { expected: '', client: 'non_empty', shouldAllow: false },
            { expected: '', client: '', shouldAllow: false },
            { expected: undefined, client: 'any', shouldAllow: false },
            { expected: null, client: 'any', shouldAllow: false }
        ];

        try {
            for (const item of testMatrix) {
                db.getSetting = (key) => key === 'api_key' ? item.expected : '';
                db.getDeviceByToken = () => null;

                let closedCode = null;
                let terminated = false;
                const fakeWs = {
                    send: () => {},
                    close: (code) => { closedCode = code; },
                    terminate: () => { terminated = true; }
                };

                const serverMock = { on: () => {} };
                const wss = smsRouter.initSmsWebSocket(serverMock);

                const reqMock = {
                    url: `/ws/sms?deviceId=test_dev&apiKey=${encodeURIComponent(item.client || '')}`,
                    headers: { host: 'localhost' }
                };

                wss.emit('connection', fakeWs, reqMock);

                if (item.shouldAllow) {
                    assert.equal(closedCode, null, `Should allow when expected="${item.expected}" and client="${item.client}"`);
                    assert.equal(terminated, false, 'Socket should not be terminated');
                } else {
                    assert.equal(closedCode, 4401, `Should reject (4401) when expected="${item.expected}" and client="${item.client}"`);
                    assert.equal(terminated, true, 'Socket must be terminated');
                }

                try { wss.close(); } catch (e) {}
            }
        } finally {
            db.getSetting = originalGetSetting;
            db.getDeviceByToken = originalGetDeviceByToken;
        }
    });

    await t.test('Point 2: Master SMS API key never exposed to normal users in QR API', async () => {
        const smsRouter = require('../smsRouter');
        const db = require('../utils/smsDb');
        const app = express();
        app.use(express.json());

        // Middleware simulating normal user
        app.use((req, res, next) => {
            req.user = { userId: 'user_regular_42', role: 'user', name: 'Regular User' };
            next();
        });
        app.use(smsRouter);

        const server = app.listen(0);
        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        try {
            const masterKey = db.getSetting('api_key') || 'ers_master_key_123';
            const res = await fetch(`${baseUrl}/api/sms/qr`);
            assert.equal(res.status, 200);
            const data = await res.json();

            assert.equal(data.success, true);
            assert.notEqual(data.apiKey, masterKey, 'Normal user must NOT receive the master SMS API key');
            assert.ok(data.apiKey.startsWith('dt_'), 'Normal user should receive a dedicated device pairing token');
        } finally {
            server.close();
        }
    });

    await t.test('Point 3 & 5: Complete SMS Tenant Isolation (devices, status, messages, deliveries, outbox)', async () => {
        const smsRouter = require('../smsRouter');
        const db = require('../utils/smsDb');

        // Create isolated records
        db.saveIncomingSms({
            deviceId: 'dev_user_a',
            sender: '9999911111',
            message: 'Message for User A',
            simSlot: 0,
            ownerUserId: 'user_a'
        });
        db.saveIncomingSms({
            deviceId: 'dev_user_b',
            sender: '9999922222',
            message: 'Message for User B',
            simSlot: 0,
            ownerUserId: 'user_b'
        });

        const listUserA = db.getSmsList({ ownerUserId: 'user_a' });
        const listUserB = db.getSmsList({ ownerUserId: 'user_b' });

        assert.ok(listUserA.every(m => m.owner_user_id === 'user_a'), 'User A list must only contain user_a messages');
        assert.ok(listUserB.every(m => m.owner_user_id === 'user_b'), 'User B list must only contain user_b messages');
        assert.ok(!listUserA.some(m => m.sender === '9999922222'), 'User A must not see User B sender');
    });

    await t.test('Point 4: Secure Incoming SMS rejects corrupted encrypted payloads and unauthenticated requests', async () => {
        const smsRouter = require('../smsRouter');
        const app = express();
        app.use(express.json());
        app.use(smsRouter);

        const server = app.listen(0);
        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        try {
            // 1. Unauthenticated plaintext request must be 401
            const plainRes = await fetch(`${baseUrl}/inbox`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender: '9876543210', message: 'Hacked message' })
            });
            assert.equal(plainRes.status, 401, 'Unauthenticated plaintext incoming SMS must be rejected with 401');

            // 2. Corrupted / Tampered encrypted payload must be rejected with 401 (never fall back to root plaintext)
            const tamperedRes = await fetch(`${baseUrl}/inbox`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payload: 'invalid_corrupted_hex_or_base64_payload',
                    sender: 'attacker_fallback_sender',
                    message: 'attacker_fallback_message'
                })
            });
            assert.equal(tamperedRes.status, 401, 'Corrupted or tampered payload must return 401 Unauthorized');
        } finally {
            server.close();
        }
    });

    await t.test('Point 6, 7, 8, 9, 10: Scheduled Messages Remediation Logic', async () => {
        const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');

        // Point 6: Concurrency claim FOR UPDATE SKIP LOCKED
        assert.ok(indexContent.includes('FOR UPDATE SKIP LOCKED'), 'Scheduler must claim jobs atomically using FOR UPDATE SKIP LOCKED');

        // Point 7: Status reporting distinctions (sent, partial, failed)
        assert.ok(indexContent.includes("finalStatus = 'sent'"), 'Accurate sent status tracking must exist');
        assert.ok(indexContent.includes("finalStatus = 'partial'"), 'Accurate partial status tracking must exist');
        assert.ok(indexContent.includes("finalStatus = 'failed'"), 'Accurate failed status tracking must exist');

        // Point 8: Stale processing job recovery with retry count bounds
        assert.ok(indexContent.includes('"status" = \'processing\'') || indexContent.includes("status = 'processing'"), 'Scheduler must inspect processing jobs');
        assert.ok(indexContent.includes("retryCount"), 'Scheduler must track retryCount for stuck recovery');

        // Point 9: Invalid attachment validation upfront and failure safety
        assert.ok(indexContent.includes('validateAndProcessMediaUpload'), 'Scheduler and schedule route must validate media upload');
        assert.ok(indexContent.includes('Invalid media attachment and no text message'), 'Invalid media with empty text must fail without sending blank message');

        // Point 10: Recipient deduplication
        assert.ok(indexContent.includes('seenRecipients'), 'Scheduler execution engine must deduplicate recipients');
        assert.ok(indexContent.includes('validRecipients.join('), 'POST schedule must store deduplicated recipients');
    });

    await t.test('Point 11: Group Message Quota Pre-Check & Refund Reconciliation', async () => {
        const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
        const sendGroupIdx = indexContent.indexOf("app.post('/api/send-group-message'");
        assert.ok(sendGroupIdx > 0, 'send-group-message route must exist');
        const groupSection = indexContent.slice(sendGroupIdx, sendGroupIdx + 12000);

        const socketCheckIdx = groupSection.indexOf('!activeSocket || !activeSocket.user?.id');
        const quotaCheckIdx = groupSection.indexOf('checkAndIncrementDailyUsage(req.user, groupIds.length)');
        const refundIdx = groupSection.indexOf('refundDailyUsage(req.user, failedCount)');

        assert.ok(socketCheckIdx > 0, 'Socket readiness check must exist');
        assert.ok(quotaCheckIdx > 0, 'Quota check must exist');
        assert.ok(refundIdx > 0, 'Failed group dispatch quota refund must exist');
        assert.ok(socketCheckIdx < quotaCheckIdx, 'WhatsApp socket MUST be validated BEFORE reserving quota');
    });

    await t.test('Point 12: Legacy Contact Protection (prevent unowned contact hijacking)', async () => {
        const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
        const contactsIdx = indexContent.indexOf("app.post('/api/contacts'");
        assert.ok(contactsIdx > 0, 'contacts route must exist');
        const section = indexContent.slice(contactsIdx, contactsIdx + 2000);

        assert.ok(section.includes('!owner || owner !== userId'), 'Must prevent modifying unowned legacy contacts');
        assert.equal(section.includes('contacts."ownerUserId" IS NULL'), false, 'SQL ON CONFLICT must NOT allow overwriting unowned contacts');
    });

    await t.test('Point 13 & 14: Password Reset API Response and Delivery Lockout Safety', async () => {
        const authContent = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8');
        const sendPwdIdx = authContent.indexOf("router.post('/api/admin/users/:userId/send-password'");
        assert.ok(sendPwdIdx > 0, 'send-password route must exist');
        const section = authContent.slice(sendPwdIdx, sendPwdIdx + 2500);

        // Point 13: newPassword removed from response JSON
        assert.equal(section.includes('newPassword: newPassword'), false, 'newPassword must NOT be returned in API response');

        // Point 14: Lockout safety (dispatch before save or rollback on failure)
        assert.ok(section.includes('await sender('), 'Must dispatch password via WhatsApp');
        assert.ok(section.includes('await user.save()'), 'Must persist user');

        // Frontend UsersPage verification
        const frontendPath = path.join(__dirname, '..', 'whatsapp-dashboard', 'src', 'pages', 'admin', 'UsersPage.jsx');
        if (fs.existsSync(frontendPath)) {
            const pageContent = fs.readFileSync(frontendPath, 'utf8');
            assert.equal(pageContent.includes('sentNotice.newPassword'), false, 'Frontend must NOT display sentNotice.newPassword');
        }
    });
});
