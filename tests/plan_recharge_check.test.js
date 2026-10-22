const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { fetchLastRechargeDetails } = require('../plan API/services/rechargeCheckService');
const { authenticateApiRequest } = require('../plan API/services/clientService');
const planRouter = require('../planRouter');

test('Plan API Last Recharge Check - Limited EzyTM Format & Auth Verification', async (t) => {
  await t.test('1. fetchLastRechargeDetails returns strictly limited 5 fields matching EzyTM', async () => {
    const testNumber = '7202019040';
    const result = await fetchLastRechargeDetails(testNumber, '2');

    assert.ok(result, 'Result should exist');
    assert.equal(result.error, '0', 'error code should be 0');
    assert.equal(result.status, '1', 'status should be 1');
    assert.ok(result.DATA, 'DATA should exist');

    // Check exact 5 EzyTM response keys
    assert.equal(result["Operator Name"], 'Airtel');
    assert.equal(result["Amount"], '199');
    assert.equal(result["Mobile No"], '7202019040');
    assert.equal(result["Expiry Date"], '2026-11-18');
    assert.equal(result["Last Recharge Date"], '2026/10/22');

    // Check DATA contains exact 5 fields
    assert.equal(result.DATA["Operator Name"], 'Airtel');
    assert.equal(result.DATA["Amount"], '199');
    assert.equal(result.DATA["Mobile No"], '7202019040');
    assert.equal(result.DATA["Expiry Date"], '2026-11-18');
    assert.equal(result.DATA["Last Recharge Date"], '2026/10/22');

    // Ensure unwanted DTH / raw bloated fields are NOT in DATA
    assert.equal(result.DATA.Balance, undefined);
    assert.equal(result.DATA.Monthly, undefined);
    assert.equal(result.DATA.VC, undefined);
    assert.equal(result.DATA.Address, undefined);
  });

  await t.test('2. fetchLastRechargeDetails for 8127285272 matches live https://planapi.in/RechargeCheck.aspx', async () => {
    const result = await fetchLastRechargeDetails('8127285272', '2');
    assert.ok(result, 'Result should exist');
    assert.equal(result.error, '0');
    assert.equal(result["Operator Name"], 'Airtel');
    assert.equal(result["Amount"], '199');
    assert.equal(result["Mobile No"], '8127285272');
    assert.equal(result["Expiry Date"], '2026-11-15');
    assert.equal(result["Last Recharge Date"], '2026/10/19');
    assert.equal(result.DATA["Operator Name"], 'Airtel');
    assert.equal(result.DATA["Amount"], '199');
  });

  await t.test('3. authenticateApiRequest verifies 8840457632 with tok_0b8f94d2a4aea41fcb981e773767339e', async () => {
    const auth = await authenticateApiRequest('8840457632', 'tok_0b8f94d2a4aea41fcb981e773767339e', '127.0.0.1');
    assert.ok(auth, 'Auth result should exist');
    assert.equal(auth.authenticated, true, 'User 8840457632 must authenticate successfully');
  });

  await t.test('4. Express route /RechargeCheck.aspx with user credentials returns 200 and limited fields', async () => {
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

      // Test 2: Live user call with 8840457632 and token for 7202019040
      const liveUrl = `${baseUrl}/RechargeCheck.aspx?apimember_id=8840457632&api_password=tok_0b8f94d2a4aea41fcb981e773767339e&mobile_no=7202019040&Opcode=2`;
      const liveRes = await fetch(liveUrl);
      assert.equal(liveRes.status, 200);
      const liveJson = await liveRes.json();
      assert.equal(liveJson.error, '0');
      assert.equal(liveJson["Operator Name"], 'Airtel');
      assert.equal(liveJson["Amount"], '199');
      assert.equal(liveJson["Mobile No"], '7202019040');
      assert.equal(liveJson["Expiry Date"], '2026-11-18');
      assert.equal(liveJson["Last Recharge Date"], '2026/10/22');
      assert.equal(liveJson.DATA["Operator Name"], 'Airtel');
      assert.equal(liveJson.DATA["Amount"], '199');

      // Test 3: Alias route /api/Mobile/RechargeCheck
      const aliasRes = await fetch(`${baseUrl}/api/Mobile/RechargeCheck?apimember_id=8840457632&api_password=tok_0b8f94d2a4aea41fcb981e773767339e&mobile_no=7202019040&Opcode=2`);
      const aliasJson = await aliasRes.json();
      assert.equal(aliasJson.error, '0');
      assert.equal(aliasJson["Operator Name"], 'Airtel');
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
