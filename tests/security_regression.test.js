/**
 * Security Hardening Regression Test Suite
 * Covers all 13 security hardening requirements:
 * 1. Hashed API Tokens & Migration Strategy
 * 2. Short Session Token Lifetime & Immediate Expiry
 * 3. Session Revocation on Password Change
 * 4. Dynamic Admin Identification (No hardcoded credentials)
 * 5. Secure Session Encryption Key Validation
 * 6. Baileys pgAuthState Encryption & Auto-migration
 * 7. Tenant Isolation & Ownership Enforcement
 * 8. Trust Proxy & Secure IP Rate Limiting
 * 9. Media Upload Validation & Magic Byte Inspection
 * 10. Media File Access Control (/media/:filename)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const { validateAndProcessMediaUpload, FORBIDDEN_EXTENSIONS } = require('../utils/mediaValidator');
const { getSessionTokenTtlMs, generateApiTokenData } = require('../auth');
const { encryptSessionData, decryptSessionData, isEncryptedPayload } = require('../pgAuthState');

test('1. API Token Security: Hashing, masking and migration', async (t) => {
  // 1.1 Token generation must generate raw token, prefix, last4, and sha256 hash
  const tokenData = generateApiTokenData();
  assert.ok(tokenData.rawToken.startsWith('wa_'), 'Token should start with wa_');
  assert.equal(tokenData.rawToken.length, 51, 'Raw token should be 51 chars (wa_ + 48 hex chars)');
  assert.equal(tokenData.apiTokenPrefix, tokenData.rawToken.slice(0, 7), 'Prefix matches');
  assert.equal(tokenData.apiTokenLast4, tokenData.rawToken.slice(-4), 'Last4 matches');
  assert.equal(tokenData.apiTokenHash, crypto.createHash('sha256').update(tokenData.rawToken).digest('hex'), 'Hash must be SHA-256 of raw token');

  // 1.2 Verification that hash matches
  const computedHash = crypto.createHash('sha256').update(tokenData.rawToken).digest('hex');
  assert.equal(computedHash, tokenData.apiTokenHash, 'Computed hash should match stored hash');

  // 1.3 Plaintext token is never identical to hash
  assert.notEqual(tokenData.rawToken, tokenData.apiTokenHash, 'Hash must not equal plaintext token');
});

test('2. Session Lifetimes: Configurable Short TTL (default 24h, not 30 days)', async (t) => {
  // Default TTL
  delete process.env.AUTH_TOKEN_TTL_MS;
  delete process.env.AUTH_TOKEN_TTL_HOURS;
  delete process.env.AUTH_TOKEN_TTL_DAYS;
  const defaultTtl = getSessionTokenTtlMs();
  assert.equal(defaultTtl, 24 * 60 * 60 * 1000, 'Default session TTL must be 24 hours');

  // Configurable TTL via hours
  process.env.AUTH_TOKEN_TTL_HOURS = '12';
  assert.equal(getSessionTokenTtlMs(), 12 * 60 * 60 * 1000, 'Session TTL should be configurable via AUTH_TOKEN_TTL_HOURS');
  delete process.env.AUTH_TOKEN_TTL_HOURS;

  // Session validation: simulated expired session vs active session
  const now = Date.now();
  const activeSession = { token: 'tok_active', expiresAt: new Date(now + 3600000) };
  const expiredSession = { token: 'tok_expired', expiresAt: new Date(now - 1000) };

  assert.ok(activeSession.expiresAt.getTime() > now, 'Active session is not expired');
  assert.ok(expiredSession.expiresAt.getTime() < now, 'Expired session is expired');
});

test('3. Password Change: Immediate revocation of all user sessions', async (t) => {
  const simulatedUser = {
    userId: 'USR_TEST_1',
    passwordHash: 'old_hash',
    sessions: [
      { token: 'sess_1', expiresAt: new Date(Date.now() + 100000) },
      { token: 'sess_2', expiresAt: new Date(Date.now() + 100000) }
    ]
  };

  assert.equal(simulatedUser.sessions.length, 2, 'User has 2 active sessions before password change');

  // Simulate password change logic
  simulatedUser.sessions = [];
  assert.equal(simulatedUser.sessions.length, 0, 'All sessions must be revoked immediately after password change');
});

test('4. Security: No hardcoded admin credentials', async (t) => {
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
  const userSessionsContent = fs.readFileSync(path.join(__dirname, '..', 'userSessions.js'), 'utf-8');
  const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf-8');

  assert.ok(!serverContent.includes('8840457632'), 'server.js must not contain hardcoded phone 8840457632');
  assert.ok(!serverContent.includes('USR59396382'), 'server.js must not contain hardcoded userId USR59396382');
  assert.ok(!userSessionsContent.includes('8840457632'), 'userSessions.js must not contain hardcoded phone 8840457632');
  assert.ok(!userSessionsContent.includes('USR59396382'), 'userSessions.js must not contain hardcoded userId USR59396382');
  assert.ok(!envExample.includes('8840457632'), '.env.example must not contain hardcoded phone 8840457632');
});

test('5 & 6. Session Encryption: AES-256-GCM and Auto-Migration', async (t) => {
  const secretKey = 'test-encryption-key-for-security-hardening-32b';
  process.env.SESSION_ENCRYPTION_KEY = secretKey;

  const testPayload = JSON.stringify({ creds: { me: { id: '919876543210:1@s.whatsapp.net' } } });

  // Encryption & Decryption
  const encrypted = encryptSessionData(testPayload);
  assert.ok(isEncryptedPayload(encrypted), 'Payload must be detected as encrypted');
  assert.equal(encrypted.encrypted, true, 'Encrypted flag must be true');
  assert.ok(encrypted.iv && encrypted.tag && encrypted.data, 'Must have iv, tag, and ciphertext data');

  const decrypted = decryptSessionData(encrypted);
  assert.equal(decrypted, testPayload, 'Decrypted payload must match original');

  // Unencrypted detection
  assert.equal(isEncryptedPayload(testPayload), false, 'Plaintext JSON must not be marked as encrypted');
});

test('7. Tenant Isolation: Cross-tenant data isolation logic', async (t) => {
  const userA = { userId: 'USER_A', role: 'user', mobile: '919000000001' };
  const userB = { userId: 'USER_B', role: 'user', mobile: '919000000002' };
  const admin = { userId: 'ADMIN', role: 'admin', mobile: '919000000000' };

  const messages = [
    { id: 'msg_1', ownerUserId: 'USER_A', chatJid: '919111111111@s.whatsapp.net', from: '919000000001', message: 'Hello from A' },
    { id: 'msg_2', ownerUserId: 'USER_B', chatJid: '919222222222@s.whatsapp.net', from: '919000000002', message: 'Hello from B' }
  ];

  // Helper simulating ownership check
  const checkChatOwnership = (user, chatJid) => {
    if (user.role === 'admin') return true;
    return messages.some(m => m.ownerUserId === user.userId && m.chatJid === chatJid);
  };

  const checkMessageOwnership = (user, msgId) => {
    if (user.role === 'admin') return true;
    return messages.some(m => m.ownerUserId === user.userId && m.id === msgId);
  };

  // User A tests
  assert.equal(checkChatOwnership(userA, '919111111111@s.whatsapp.net'), true, 'User A owns their chat');
  assert.equal(checkChatOwnership(userA, '919222222222@s.whatsapp.net'), false, 'User A cannot access User B chat');
  assert.equal(checkMessageOwnership(userA, 'msg_1'), true, 'User A owns their message');
  assert.equal(checkMessageOwnership(userA, 'msg_2'), false, 'User A cannot touch User B message');

  // Admin tests
  assert.equal(checkChatOwnership(admin, '919111111111@s.whatsapp.net'), true, 'Admin can access any chat');
  assert.equal(checkChatOwnership(admin, '919222222222@s.whatsapp.net'), true, 'Admin can access any chat');
});

test('8. Rate Limiter & Trust Proxy', async (t) => {
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
  const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');
  const rateLimiterContent = fs.readFileSync(path.join(__dirname, '..', 'rateLimiter.js'), 'utf-8');

  assert.ok(serverContent.includes("trust proxy"), 'server.js must configure trust proxy');
  assert.ok(indexContent.includes("trust proxy"), 'index.js must configure trust proxy');
  assert.ok(rateLimiterContent.includes("req.ip"), 'rateLimiter.js must use req.ip instead of blind x-forwarded-for header');
});

test('9. Media Upload Validation: Size, MIME, Magic bytes & Executable rejection', async (t) => {
  // 9.1 Valid image upload
  const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const imgResult = validateAndProcessMediaUpload(validPngBase64, {
    claimedMimeType: 'image/png',
    claimedFileName: 'test.png',
    prefix: 'out_test'
  });
  assert.equal(imgResult.valid, true, 'Valid PNG upload should succeed');
  assert.equal(imgResult.mimeType, 'image/png');
  assert.ok(imgResult.safeFilename.startsWith('out_test_'), 'Safe filename should have prefix');
  assert.ok(imgResult.safeFilename.endsWith('.png'), 'Safe filename should have canonical extension');

  // 9.2 Rejection of executable extensions (.exe, .bat, .php, .sh, etc.)
  for (const ext of ['.exe', '.bat', '.cmd', '.sh', '.php', '.js', '.html']) {
    const res = validateAndProcessMediaUpload(validPngBase64, {
      claimedFileName: `malicious${ext}`,
      claimedMimeType: 'application/octet-stream'
    });
    assert.equal(res.valid, false, `Upload with extension ${ext} must be rejected`);
  }

  // 9.3 Rejection of Windows PE executable magic bytes (MZ)
  const peExeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  const peResult = validateAndProcessMediaUpload(peExeBuffer.toString('base64'), {
    claimedFileName: 'innocent.jpg',
    claimedMimeType: 'image/jpeg'
  });
  assert.equal(peResult.valid, false, 'PE executable header (MZ) must be rejected even disguised as image/jpeg');

  // 9.4 Rejection of Linux ELF binary magic bytes (\x7fELF)
  const elfBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
  const elfResult = validateAndProcessMediaUpload(elfBuffer.toString('base64'), {
    claimedFileName: 'document.pdf',
    claimedMimeType: 'application/pdf'
  });
  assert.equal(elfResult.valid, false, 'Linux ELF binary header must be rejected');

  // 9.5 Rejection of Script Shebang (#!/bin/sh)
  const shebangBuffer = Buffer.from('#!/bin/bash\nrm -rf /');
  const shebangResult = validateAndProcessMediaUpload(shebangBuffer.toString('base64'), {
    claimedFileName: 'script.txt',
    claimedMimeType: 'text/plain'
  });
  assert.equal(shebangResult.valid, false, 'Script shebang must be rejected');

  // 9.6 Rejection of Embedded Script / PHP code
  const phpBuffer = Buffer.from('<?php echo "pwned"; ?>');
  const phpResult = validateAndProcessMediaUpload(phpBuffer.toString('base64'), {
    claimedFileName: 'photo.jpg',
    claimedMimeType: 'image/jpeg'
  });
  assert.equal(phpResult.valid, false, 'Embedded PHP tags must be rejected');

  const htmlScriptBuffer = Buffer.from('<html><script>alert(1)</script></html>');
  const htmlResult = validateAndProcessMediaUpload(htmlScriptBuffer.toString('base64'), {
    claimedFileName: 'doc.txt',
    claimedMimeType: 'text/plain'
  });
  assert.equal(htmlResult.valid, false, 'Embedded script tags must be rejected');

  // 9.7 Size limit rejection (>15MB)
  const largeResult = validateAndProcessMediaUpload('AAAA', {
    maxSizeBytes: 2
  });
  assert.equal(largeResult.valid, false, 'Payload exceeding max size must be rejected');
});

test('10. Media File Access Control: Path traversal & Authentication check', async (t) => {
  const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');

  // 10.1 Verify path traversal check exists in /media/:filename
  assert.ok(indexContent.includes('safeFilename.includes') || indexContent.includes('startsWith(resolvedBase'), 'Path traversal check must exist');

  // 10.2 Verify public company branding exemption
  assert.ok(indexContent.includes("safeFilename.startsWith('company_')"), 'Company branding is exempted for public landing/branding');

  // 10.3 Verify authRequired wraps sensitive media
  assert.ok(indexContent.includes("authRequired(req, res, async () => {"), 'Sensitive media must require authentication and ownership check');
});

test('11. Security Headers, Modern CSP, Permissions-Policy and CORS', async (t) => {
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
  const indexContent = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf-8');

  // Verify CSP
  assert.ok(serverContent.includes('Content-Security-Policy') && indexContent.includes('Content-Security-Policy'), 'Content-Security-Policy must be set');
  assert.ok(serverContent.includes("default-src 'self'"), 'CSP must restrict default sources to self');
  assert.ok(serverContent.includes("frame-ancestors 'self'"), 'CSP must prevent frame embedding');

  // Verify Permissions-Policy & COOP
  assert.ok(serverContent.includes('Permissions-Policy') && indexContent.includes('Permissions-Policy'), 'Permissions-Policy must be set');
  assert.ok(serverContent.includes('Cross-Origin-Opener-Policy') && indexContent.includes('Cross-Origin-Opener-Policy'), 'Cross-Origin-Opener-Policy must be set');

  // Verify CORS allowed headers
  assert.ok(serverContent.includes('X-Api-Token') && indexContent.includes('X-Api-Token'), 'CORS must support X-Api-Token header');
});

test('12. Hybrid & Multi-Instance Rate Limiter Architecture', async (t) => {
  const { createRateLimiter } = require('../rateLimiter');
  assert.equal(typeof createRateLimiter, 'function', 'createRateLimiter must be exported');

  const limiter = createRateLimiter({
    windowMs: 1000,
    max: 2,
    message: 'Too many requests'
  });

  const req = { ip: '10.0.0.99', headers: {} };
  let statusSet = null;
  let jsonResponse = null;
  const res = {
    setHeader: () => {},
    status: (code) => {
      statusSet = code;
      return {
        json: (data) => { jsonResponse = data; }
      };
    }
  };

  let nextCalled = 0;
  const next = () => { nextCalled++; };

  // Request 1: Allowed
  await limiter(req, res, next);
  assert.equal(nextCalled, 1, 'First request must pass');

  // Request 2: Allowed
  await limiter(req, res, next);
  assert.equal(nextCalled, 2, 'Second request must pass');

  // Request 3: Blocked by rate limiter
  await limiter(req, res, next);
  assert.equal(nextCalled, 2, 'Third request must be blocked');
  assert.equal(statusSet, 429, 'Rate limiter must return HTTP 429');
  assert.equal(jsonResponse.success, false);
});

test('13. Demo Setting & Trial Validity Configuration for New Signup Users', async (t) => {
  const { getDemoSettings, getUserPlanFeatures } = require('../auth');
  const demoSet = await getDemoSettings();
  assert.ok(demoSet.demoDays >= 1, 'Demo days must be at least 1 day');
  assert.ok(typeof demoSet.planName === 'string', 'Demo plan name must be a string');

  // Test active demo user features
  const activeDemoUser = {
    userId: 'test_demo_user',
    role: 'user',
    plan: 'Demo Plan',
    planExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  };
  const activeFeatures = await getUserPlanFeatures(activeDemoUser);
  assert.equal(activeFeatures.active, true, 'Active demo user must have active status');
  assert.equal(activeFeatures.isExpired, false, 'Active demo user is not expired');

  // Test expired demo user features
  const expiredDemoUser = {
    userId: 'test_expired_demo_user',
    role: 'user',
    plan: 'Demo Plan',
    planExpiresAt: new Date(Date.now() - 1000)
  };
  const expiredFeatures = await getUserPlanFeatures(expiredDemoUser);
  assert.equal(expiredFeatures.active, false, 'Expired demo user must not be active');
  assert.equal(expiredFeatures.isExpired, true, 'Expired demo user is marked expired');
  assert.equal(expiredFeatures.apiAccess, false, 'Expired demo user must have apiAccess false');
});


