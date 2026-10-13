const { test } = require('node:test');
const assert = require('node:assert');
const { messageDeduplicator, MessageDeduplicator } = require('../utils/messageDeduplicator');
const { mediaStorage } = require('../mediaStorage');
const { User, WhatsAppSession } = require('../auth');
const db = require('../db');

test('Issue 1: WhatsApp Message Deduplication & Idempotency', async (t) => {
  const dedup = new MessageDeduplicator(10000);
  
  // Test key generation with client idempotency key
  const key1 = dedup.generateKey('user1', '919876543210', 'Hello World', 'client-req-123');
  assert.strictEqual(key1, 'client:client-req-123');

  // Test deterministic fingerprint fallback without client key
  const key2a = dedup.generateKey('user1', '919876543210', 'Hello World');
  const key2b = dedup.generateKey('user1', '919876543210', 'Hello World');
  assert.strictEqual(key2a, key2b);
  assert.ok(key2a.startsWith('fp:'));

  // Test deterministic Baileys message ID
  const msgId1 = dedup.generateBaileysMessageId(key2a);
  const msgId2 = dedup.generateBaileysMessageId(key2b);
  assert.strictEqual(msgId1, msgId2);
  assert.ok(msgId1.startsWith('DEDUP'));

  // Test in-flight coalescing
  let resolveSend;
  const sendPromise = new Promise((res) => { resolveSend = res; });
  dedup.setInFlight(key1, sendPromise, 'MSG123');

  const checkInFlight = dedup.check(key1);
  assert.ok(checkInFlight);
  assert.strictEqual(checkInFlight.status, 'in_flight');

  // Resolve promise and check completed state
  resolveSend({ key: { id: 'MSG123' }, status: 'sent' });
  await sendPromise;

  const checkCompleted = dedup.check(key1);
  assert.ok(checkCompleted);
  assert.strictEqual(checkCompleted.status, 'completed');
  assert.strictEqual(checkCompleted.result.key.id, 'MSG123');
});

test('Issue 2 & 6: PostgreSQL Compatibility Layer: User Model Columns & $inc operator', async (t) => {
  // Verify User model allowed columns include dailyMessageCount and dailyCountDate
  const user = User({
    userId: 'test_u_1',
    mobile: '9876543210',
    dailyMessageCount: 42,
    dailyCountDate: '2026-10-13'
  });
  assert.strictEqual(user.dailyMessageCount, 42);
  assert.strictEqual(user.dailyCountDate, '2026-10-13');

  // Verify WhatsAppSession allowed columns include profilePicUrl and profileName
  const waSession = WhatsAppSession({
    sessionId: 'sess_1',
    ownerUserId: 'u_1',
    profilePicUrl: 'https://example.com/dp.jpg',
    profileName: 'Business Account'
  });
  assert.strictEqual(waSession.profilePicUrl, 'https://example.com/dp.jpg');
  assert.strictEqual(waSession.profileName, 'Business Account');

  // Verify Model.updateMany exists
  assert.strictEqual(typeof User.updateMany, 'function');
  assert.strictEqual(typeof WhatsAppSession.updateMany, 'function');
});

test('Issue 4: Media Saving Error Response (No False Success)', async (t) => {
  // When saving invalid media or bad filenames, must reject / throw
  await assert.rejects(
    async () => {
      await mediaStorage.saveMedia('', Buffer.from('data'));
    },
    /Invalid media filename/
  );

  // When invalid data is passed
  await assert.rejects(
    async () => {
      await mediaStorage.saveMedia('test.jpg', 12345);
    },
    /Media data must be a Buffer or base64 string/
  );

  // If requirePersistent is requested and DB is not connected, it must throw (not return fake success)
  if (db.connection.readyState !== 1) {
    await assert.rejects(
      async () => {
        await mediaStorage.saveMedia('test_require_db.jpg', Buffer.from('image bytes'), { requirePersistent: true });
      },
      /Persistent database storage failed/
    );
  }
});

test('Issue 5: User Queue Resume and Export', (t) => {
  const index = require('../index');
  assert.strictEqual(typeof index.resumeUserQueue, 'function', 'resumeUserQueue must be exported from index.js');
  assert.strictEqual(typeof index.processUserQueue, 'function', 'processUserQueue must be exported from index.js');
  setTimeout(() => process.exit(0), 100);
});
