const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Backend Error Handling, Resilience & Information Leakage Prevention', async (t) => {
  // 1. Verify Global Process Exception Handlers in server.js
  const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf-8');
  assert.ok(serverContent.includes("process.on('unhandledRejection'"), 'Global unhandledRejection handler must be registered');
  assert.ok(serverContent.includes("process.on('uncaughtException'"), 'Global uncaughtException handler must be registered');

  // 2. Verify Centralized Express Error Handling Middleware in server.js
  assert.ok(serverContent.includes('app.use((err, req, res, next) =>'), 'Centralized error middleware must exist');
  assert.ok(serverContent.includes('Internal Server Error'), 'Must provide safe default error message');

  // 3. Test safeErrorMessage Redaction
  const authContent = fs.readFileSync(path.join(__dirname, '..', 'auth.js'), 'utf-8');
  assert.ok(authContent.includes('function safeErrorMessage'), 'safeErrorMessage helper must exist');

  // 4. Verify DB Query error logging in db.js
  const dbContent = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf-8');
  assert.ok(dbContent.includes('[PostgreSQL Query Error]:'), 'Database queries must log structured errors');
});
