const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { fetchLastRechargeDetails } = require('../plan API/services/rechargeCheckService');
const planRouter = require('../planRouter');

test('Plan API Last Recharge Check - Service & Route Verification', async (t) => {
  await t.test('1. fetchLastRechargeDetails normalizes both camelCase and planapi.in keys', async () => {
    const testNumber = '9840123456';
    const result = await fetchLastRechargeDetails(testNumber, '2');

    assert.ok(result, 'Result should exist');
    assert.equal(result.error, '0', 'error code should be 0');
    assert.equal(result.ERROR, '0', 'ERROR code should be 0');
    assert.equal(result.status, '1', 'status should be 1');
    assert.equal(result.STATUS, '1', 'STATUS should be 1');
    assert.ok(result.DATA, 'DATA should exist');

    // Check planapi.in keys
    assert.ok(result.DATA["Last Recharge Date"], '"Last Recharge Date" must be present');
    assert.ok(result.DATA["Next Recharge Date"], '"Next Recharge Date" must be present');
    assert.ok(result.DATA.Balance, 'Balance must be present');
    assert.ok(result.DATA.Monthly, 'Monthly must be present');
    assert.ok(result.DATA.Plan, 'Plan must be present');
    assert.ok(result.DATA.Operator, 'Operator must be present');

    // Check frontend camelCase keys
    assert.ok(result.DATA.lastRechargeDate, 'lastRechargeDate must be present');
    assert.ok(result.DATA.expiryDate, 'expiryDate must be present');
    assert.ok(result.DATA.lastRechargeAmount, 'lastRechargeAmount must be present');
    assert.ok(result.DATA.amount, 'amount must be present');
    assert.ok(result.DATA.operator, 'operator must be present');
    assert.ok(result.DATA.mobile, 'mobile must be present');
  });

  await t.test('2. Express routing supports /RechargeCheck.aspx and /api/Mobile/RechargeCheck', async () => {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(planRouter);

    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // Test 1: Missing auth params -> error 3
      const unauthRes = await fetch(`${baseUrl}/RechargeCheck.aspx?mobile_no=9840123456&Opcode=2`);
      const unauthJson = await unauthRes.json();
      assert.equal(unauthJson.error, '3', 'Unauthenticated request must return error 3');
      assert.equal(unauthJson.Message, 'Authentication failed');

      // Test 2: Invalid number format -> with dummy auth
      const invalidNumRes = await fetch(`${baseUrl}/RechargeCheck.aspx?ApiUserID=admin&token=dummy&mobile_no=123&Opcode=2`);
      const invalidJson = await invalidNumRes.json();
      // Even if auth fails or number is invalid, it returns error code
      assert.ok(['2', '3'].includes(invalidJson.error), 'Must return validation or auth error');

      // Test 3: Route existence on /api/Mobile/RechargeCheck
      const aliasRes = await fetch(`${baseUrl}/api/Mobile/RechargeCheck?mobile_no=9840123456&Opcode=2`);
      const aliasJson = await aliasRes.json();
      assert.equal(aliasJson.error, '3', '/api/Mobile/RechargeCheck route must exist and handle request');
    } finally {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close();
      try {
        const db = require('../plan API/services/db');
        if (db && typeof db.closePool === 'function') {
          await db.closePool();
        }
      } catch (e) {}
    }
  });
});

