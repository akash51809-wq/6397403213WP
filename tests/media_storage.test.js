const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { mediaStorage, MEDIA_DIR, inferMimeType, sanitizeFilename } = require('../mediaStorage');

test('Media Storage Architecture & Persistence Verification', async (t) => {
  // 1. Sanitize filename test
  assert.equal(sanitizeFilename('../evil.jpg'), '');
  assert.equal(sanitizeFilename('..\\evil.jpg'), '');
  assert.equal(sanitizeFilename('valid_image.jpg'), 'valid_image.jpg');
  assert.equal(sanitizeFilename(''), '');

  // 2. MIME type inference
  assert.equal(inferMimeType('photo.jpg'), 'image/jpeg');
  assert.equal(inferMimeType('photo.png'), 'image/png');
  assert.equal(inferMimeType('voice.ogg'), 'audio/ogg');
  assert.equal(inferMimeType('document.pdf'), 'application/pdf');

  // 3. Save media file
  const testFilename = `test_persist_${Date.now()}.jpg`;
  const originalBuffer = Buffer.from('FAKE_IMAGE_DATA_PERSISTENCE_TEST_' + Date.now());

  const saved = await mediaStorage.saveMedia(testFilename, originalBuffer, {
    mimetype: 'image/jpeg',
    ownerUserId: 'test_user_123',
    metadata: { test: true }
  });

  assert.equal(saved.filename, testFilename);
  assert.equal(saved.url, `/media/${testFilename}`);
  assert.equal(saved.size, originalBuffer.length);

  // Check that it was saved to local disk cache
  const localFilePath = path.join(MEDIA_DIR, testFilename);
  assert.ok(fs.existsSync(localFilePath), 'Local cache file must exist after save');
  assert.deepEqual(fs.readFileSync(localFilePath), originalBuffer, 'Local buffer must match');

  // 4. Retrieve from local cache
  const retrieved1 = await mediaStorage.getMedia(testFilename);
  assert.equal(retrieved1.found, true);
  assert.equal(retrieved1.filename, testFilename);
  assert.equal(retrieved1.fromCache, true);

  // 5. SIMULATE RENDER RESTART / CONTAINER REDEPLOY (Wipe local file from disk)
  fs.unlinkSync(localFilePath);
  assert.ok(!fs.existsSync(localFilePath), 'Local file should be deleted to simulate Render container restart');

  // 6. Test Self-Healing Recovery: getMedia should load from PostgreSQL and write back to disk if DB is connected
  const { connection: dbConnection } = require('../db');
  if (dbConnection.readyState === 1) {
    const recovered = await mediaStorage.getMedia(testFilename);
    assert.equal(recovered.found, true, 'Media must be recovered from PostgreSQL');
    assert.equal(recovered.restoredFromDb, true, 'Flag restoredFromDb must be true');
    assert.deepEqual(recovered.buffer, originalBuffer, 'Recovered buffer must match original byte-for-byte');

    // Verify self-healing: file should be recreated on disk
    assert.ok(fs.existsSync(localFilePath), 'File must be restored back to local disk cache (self-healing)');
  }

  // 7. Cleanup
  await mediaStorage.deleteMedia(testFilename);
  assert.ok(!fs.existsSync(localFilePath), 'Local file should be deleted after deleteMedia');
});
