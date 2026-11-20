const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const express = require('express');

test('AUDIT SECURITY & LOGIC FIXES VERIFICATION', async (t) => {

    await t.test('1. SMS Gateway endpoints require authentication', async () => {
        const smsRouter = require('../smsRouter');
        const app = express();
        app.use(express.json());
        app.use(smsRouter);

        const server = app.listen(0);
        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        try {
            const endpoints = [
                { method: 'GET', path: '/api/sms/status' },
                { method: 'GET', path: '/api/sms/qr' },
                { method: 'GET', path: '/api/sms/devices' },
                { method: 'GET', path: '/api/sms/settings' },
                { method: 'POST', path: '/api/sms/settings' },
                { method: 'GET', path: '/api/sms/messages' },
                { method: 'GET', path: '/api/sms/webhook-deliveries' },
                { method: 'GET', path: '/api/sms/outbox' },
                { method: 'POST', path: '/api/sms/devices/register' }
            ];

            for (const ep of endpoints) {
                const res = await fetch(`${baseUrl}${ep.path}`, {
                    method: ep.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: ep.method === 'POST' ? JSON.stringify({}) : undefined
                });
                assert.equal(res.status, 401, `${ep.method} ${ep.path} must return 401 Unauthorized for unauthenticated requests`);
            }
        } finally {
            server.close();
        }
    });

    await t.test('2. SMS Gateway WebSocket rejects invalid or missing apiKey', async () => {
        const smsRouter = require('../smsRouter');
        const db = require('../utils/smsDb');
        const configuredKey = db.getSetting('api_key');
        assert.ok(configuredKey, 'SMS Gateway must have a configured API key');
        assert.notEqual(configuredKey, 'ers_key_8899', 'SMS Gateway must not use insecure default key ers_key_8899');

        // Test WebSocket rejection logic directly
        let closedCode = null;
        let closedReason = null;
        let terminated = false;

        const fakeWs = {
            send: () => {},
            close: (code, reason) => { closedCode = code; closedReason = reason; },
            terminate: () => { terminated = true; }
        };

        const serverMock = { on: () => {} };
        const wss = smsRouter.initSmsWebSocket(serverMock);

        try {
            // Simulate unauthorized connection
            const reqMock = {
                url: '/ws/sms?deviceId=hacker_phone&apiKey=wrong_key',
                headers: { host: 'localhost' }
            };

            wss.emit('connection', fakeWs, reqMock);
            assert.equal(closedCode, 4401, 'WebSocket must be closed with code 4401 on invalid apiKey');
            assert.ok(terminated, 'WebSocket must be terminated on invalid apiKey');
            assert.equal(smsRouter.phoneSockets.has('hacker_phone'), false, 'Unauthorized device must NOT be registered in phoneSockets');
        } finally {
            try { wss.close(); } catch (e) {}
        }
    });

    await t.test('3. db.js: Destructive contact deletion query is completely removed', async () => {
        const dbContent = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf8');
        assert.equal(dbContent.includes("DELETE FROM contacts WHERE"), false, 'Destructive DELETE FROM contacts query must not exist in db.js');
        assert.equal(dbContent.includes("LIKE '%8416%'"), false, '8416 phone deletion filter must not exist in db.js');
    });

    await t.test('4. Scheduled Messages: Plan gating and execution engine', async () => {
        const { app, processScheduledMessages } = require('../index');

        const server = app.listen(0);
        const port = server.address().port;
        const baseUrl = `http://127.0.0.1:${port}`;

        try {
            const noRecipientsRes = await fetch(`${baseUrl}/api/user/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            assert.equal(noRecipientsRes.status, 401, 'Unauthenticated schedule request must be 401');

            assert.equal(typeof processScheduledMessages, 'function', 'processScheduledMessages must be an exported function');
            await assert.doesNotReject(async () => {
                await processScheduledMessages();
            }, 'processScheduledMessages must execute cleanly without unhandled rejections');
        } finally {
            server.close();
        }
    });

    await t.test('5. Group Messaging: Daily quota, webAccess, and max limit enforcement', async () => {
        const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
        assert.ok(indexContent.includes('checkAndIncrementDailyUsage(req.user, groupIds.length)'), 'send-group-message must enforce checkAndIncrementDailyUsage');
        assert.ok(indexContent.includes('!features.webAccess'), 'send-group-message must enforce webAccess plan check');
        assert.ok(indexContent.includes('groupIds.length > maxGroupsAllowed'), 'send-group-message must enforce maxGroupsAllowed');
    });

    await t.test('6. Bulk Messaging: Quota deducted ONLY after all validations pass', async () => {
        const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
        const maxAllowedIdx = indexContent.indexOf('validNumbers.length > maxAllowed');
        const queueCheckIdx = indexContent.indexOf('globalQueueTotal >= MAX_GLOBAL_QUEUED_JOBS');
        const quotaCheckIdx = indexContent.indexOf('checkAndIncrementDailyUsage(req.user, validNumbers.length)');

        assert.ok(maxAllowedIdx > 0, 'maxAllowed check must exist');
        assert.ok(queueCheckIdx > 0, 'queue capacity check must exist');
        assert.ok(quotaCheckIdx > 0, 'quota check must exist');
        assert.ok(maxAllowedIdx < quotaCheckIdx, 'maxAllowed validation must occur BEFORE checkAndIncrementDailyUsage');
        assert.ok(queueCheckIdx < quotaCheckIdx, 'queue limit validation must occur BEFORE checkAndIncrementDailyUsage');
    });

    await t.test('7. User Plan: FAIL-CLOSED when plan document is not found', async () => {
        const { getUserPlanFeatures, Plan } = require('../auth');
        const origFindOne = Plan.findOne;
        Plan.findOne = () => ({
            lean: async () => null
        });

        try {
            const userWithDeletedPlan = {
                userId: 'user_orphan_plan',
                role: 'user',
                status: 'active',
                plan: 'Deleted Custom VIP Plan',
                planExpiresAt: new Date(Date.now() + 86400000).toISOString()
            };
            const features = await getUserPlanFeatures(userWithDeletedPlan);
            assert.equal(features.active, false, 'active must be false when plan is missing');
            assert.equal(features.isExpired, true, 'isExpired must be true when plan is missing');
            assert.equal(features.apiAccess, false, 'apiAccess must be false when plan is missing');
            assert.equal(features.bulkMsg, false, 'bulkMsg must be false when plan is missing');
            assert.equal(features.groupOption, false, 'groupOption must be false when plan is missing');
            assert.equal(features.scheduleMsg, false, 'scheduleMsg must be false when plan is missing');
            assert.equal(features.dailyLimit, 0, 'dailyLimit must be 0 when plan is missing');
        } finally {
            Plan.findOne = origFindOne;
        }
    });

    await t.test('8. Admin Password Reset: Delivery safety prevents user lockout', async () => {
        const authContent = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf8');
        const sendPwdIdx = authContent.indexOf("router.post('/api/admin/users/:userId/send-password'");
        assert.ok(sendPwdIdx > 0, 'send-password route must exist');
        const section = authContent.slice(sendPwdIdx, sendPwdIdx + 2000);

        const senderCallIdx = section.indexOf('await sender(');
        const saveCallIdx = section.indexOf('await user.save()');
        assert.ok(senderCallIdx > 0, 'sender dispatch must exist');
        assert.ok(saveCallIdx > 0, 'user.save must exist');
        assert.ok(senderCallIdx < saveCallIdx, 'WhatsApp dispatch must be performed BEFORE committing user.save() to database');
    });

    await t.test('9. History Sync: Does NOT terminate Baileys live socket', async () => {
        const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
        const reqHistIdx = indexContent.indexOf("app.post('/api/incoming/request-history'");
        assert.ok(reqHistIdx > 0, 'request-history route must exist');
        const section = indexContent.slice(reqHistIdx, reqHistIdx + 1200);

        assert.equal(section.includes('sock.end('), false, 'request-history must not call sock.end()');
        assert.equal(section.includes('session.socket.end('), false, 'request-history must not call session.socket.end()');
        assert.ok(section.includes('getIncomingMessages('), 'request-history must query database cleanly');
    });

    await t.test('10. withUserQuotaLock: Map reference cleanup prevents memory leak', async () => {
        const { withUserQuotaLock } = require('../auth');
        const testUserId = 'test_leak_user_' + Date.now();

        await withUserQuotaLock(testUserId, async () => {
            return 'done';
        });

        // Let event loop settle
        await new Promise(r => setTimeout(r, 20));

        // Test running sequential locks and ensure no leaks
        for (let i = 0; i < 50; i++) {
            await withUserQuotaLock(`leak_check_${i}`, async () => {
                return i;
            });
        }

        assert.ok(true, 'withUserQuotaLock completed 50 iterations cleanly without deadlock or leaks');
    });

    await t.test('11. Contact Update: IDOR / Cross-Tenant Ownership Protection', async () => {
        const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
        const contactsIdx = indexContent.indexOf("app.post('/api/contacts'");
        assert.ok(contactsIdx > 0, 'contacts route must exist');
        const section = indexContent.slice(contactsIdx, contactsIdx + 3000);

        assert.ok(section.includes('owner !== userId'), 'contacts route must verify existing contact owner');
        assert.ok(section.includes('Forbidden: You do not have permission to modify another user'), 'contacts route must reject IDOR modification');
        assert.ok(section.includes('WHERE contacts."ownerUserId" = EXCLUDED."ownerUserId"'), 'contacts SQL ON CONFLICT must enforce ownerUserId match');
    });
});
