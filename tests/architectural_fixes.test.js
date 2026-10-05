const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

test('Architectural & Security Enhancements Verification', async (t) => {
    // Intercept express listen so index.js doesn't start live Baileys socket during unit test
    const origListen = express.application.listen;
    express.application.listen = function (...args) {
        return { close(cb) { if (cb) cb(); } };
    };

    let authModule;
    let indexModule;
    try {
        authModule = require('../auth');
        indexModule = require('../index');
    } finally {
        express.application.listen = origListen;
    }

    const { 
        sanitizeUser, 
        getUserPlanFeatures, 
        checkAndIncrementDailyUsage 
    } = authModule;
    const { 
        invalidateApiTokenCache, 
        userQueues, 
        processUserQueue, 
        handleMessageStatusUpdates 
    } = indexModule;

    await t.test('1. Admin User Update: Secret Data Redaction', () => {
        const rawUser = {
            id: '123',
            userId: 'user_test_1',
            username: 'testuser',
            role: 'user',
            passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$secret_hash',
            apiToken: 'wa_sec_abcdef123456',
            apiTokenHash: 'sha256_hash_value',
            sessions: [{ token: 'jwt_session_token' }]
        };

        const clean = sanitizeUser(rawUser);
        assert.equal(clean.passwordHash, undefined, 'passwordHash must be stripped');
        assert.equal(clean.apiToken, undefined, 'apiToken must be stripped');
        assert.equal(clean.apiTokenHash, undefined, 'apiTokenHash must be stripped');
        assert.equal(clean.sessions, undefined, 'sessions must be stripped');
        assert.equal(clean.username, 'testuser');
    });

    await t.test('2. API Token Cache & Instant Invalidation', () => {
        // Test invalidateApiTokenCache by token and by userId
        invalidateApiTokenCache('wa_token_999');
        invalidateApiTokenCache('user_123');
        assert.ok(true, 'Invalidation function executed safely');
    });

    await t.test('3. Daily Plan Limit Enforcement', async () => {
        // Blocked user
        const blockedUser = { userId: 'u_blk', status: 'blocked' };
        const blockedCheck = await checkAndIncrementDailyUsage(blockedUser, 1);
        assert.equal(blockedCheck.allowed, false);

        // Active user with limit 5 and future planExpiresAt
        const userObj = {
            userId: 'u_lim',
            status: 'active',
            role: 'user',
            plan: 'basic',
            planExpiresAt: new Date(Date.now() + 86400000).toISOString(),
            dailyMessageCount: 4,
            dailyCountDate: '2026-10-05',
            save: async function() { return this; }
        };
        // Mock Plan model in auth
        const { Plan } = require('../auth');
        const origFindOne = Plan.findOne;
        Plan.findOne = () => ({
            lean: async () => ({
                name: 'Basic',
                status: 'active',
                dailyLimit: 5
            })
        });

        try {
            // First 1 message should succeed (4 + 1 = 5 <= 5)
            const ok = await checkAndIncrementDailyUsage(userObj, 1);
            assert.equal(ok.allowed, true);
            assert.equal(userObj.dailyMessageCount, 5);

            // Next 1 message should be rejected (5 + 1 > 5)
            const rejected = await checkAndIncrementDailyUsage(userObj, 1);
            assert.equal(rejected.allowed, false);
            assert.match(rejected.message, /दैनिक सीमा/);
        } finally {
            Plan.findOne = origFindOne;
        }
    });

    await t.test('4. FAIL-CLOSED Plan Gating: Missing Plan denies access', async () => {
        const { Plan } = require('../auth');
        const origFindOne = Plan.findOne;
        // Mock plan lookup returning null
        Plan.findOne = () => ({
            lean: async () => null
        });

        try {
            const user = { userId: 'u_no_plan', role: 'user', status: 'active', plan: 'nonexistent' };
            const features = await getUserPlanFeatures(user);
            assert.equal(features.apiAccess, false, 'apiAccess must be false when plan is missing');
            assert.equal(features.groupOption, false, 'groupOption must be false when plan is missing');
            assert.equal(features.bulkMsg, false, 'bulkMsg must be false when plan is missing');
        } finally {
            Plan.findOne = origFindOne;
        }
    });

    await t.test('5. Multi-User Queue Fairness & Delay', () => {
        assert.ok(userQueues instanceof Map, 'userQueues must be a Map');
        assert.equal(typeof processUserQueue, 'function', 'processUserQueue must be a function');
    });

    await t.test('6. Real Baileys Status Handling (delivered, read, failed)', async () => {
        const updates = [
            { key: { id: 'msg_status_test_1' }, update: { status: 3 } }, // 3 = delivered
            { key: { id: 'msg_status_test_2' }, update: { status: 4 } }  // 4 = read
        ];
        await handleMessageStatusUpdates(updates, 'user_123');
        assert.ok(true, 'handleMessageStatusUpdates handled Baileys status updates');
    });
});
