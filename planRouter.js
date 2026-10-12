const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authRequired } = require('./auth');

// Telecom Services from "plan API"
const { resolveTelecomDetails, OPERATOR_CODE_MAP, CIRCLE_CODE_MAP } = require('./plan API/services/seriesEngine');
const { fetchOperatorPlans, OPERATORS_LIST, CIRCLES_LIST } = require('./plan API/services/mobilePlanService');
const { fetchRofferDetails } = require('./plan API/services/rofferService');
const { fetchLastRechargeDetails } = require('./plan API/services/rechargeCheckService');
const { fetchDthInfoDetails, DTH_OPERATOR_MAP } = require('./plan API/services/dthInfoService');
const operatorCacheService = require('./plan API/services/operatorCacheService');
const { getUsers, saveUser, findUser, deductUserHit, regenerateUserToken } = require('./plan API/services/userService');
const { authenticateApiRequest } = require('./plan API/services/clientService');
const { getClientIp } = require('./plan API/services/ipService');

// User helper to get or auto-initialize Plan API user profile with test hits
async function getOrCreatePlanUser(authUser) {
  if (!authUser) return null;
  const identifier = authUser.mobile || authUser.username || authUser.userId || 'User';
  const cleanMobile = String(identifier).trim().replace(/\D/g, '').slice(-10);
  const targetId = cleanMobile.length === 10 ? cleanMobile : String(identifier).trim();

  let user = await findUser(targetId);
  if (!user) {
    user = await saveUser({
      name: authUser.name || authUser.username || 'User',
      mobile: targetId,
      id: authUser.userId || ('USR_' + targetId),
      totalHits: 100,
      remainingHits: 100,
      usedHits: 0,
      status: 'Active'
    });
  }
  return user;
}

// -------------------------------------------------------------
// 1. DASHBOARD PORTAL ENDPOINTS
// -------------------------------------------------------------

// Get Logged-in User's Plan API stats (hits, token, etc.)
router.get('/api/plans/user/stats', authRequired, async (req, res) => {
  try {
    const user = await getOrCreatePlanUser(req.user);
    res.json({
      success: true,
      stats: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        apiToken: user.apiToken,
        remainingHits: user.remainingHits,
        totalHits: user.totalHits,
        usedHits: user.usedHits,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Regenerate API Token for user
router.post('/api/plans/user/regenerate-token', authRequired, async (req, res) => {
  try {
    const user = await getOrCreatePlanUser(req.user);
    const updated = await regenerateUserToken(user.mobile || user.id);
    res.json({
      success: true,
      message: 'New Plan API token generated successfully!',
      apiToken: updated.apiToken,
      stats: {
        apiToken: updated.apiToken,
        remainingHits: updated.remainingHits,
        totalHits: updated.totalHits,
        usedHits: updated.usedHits
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Operators and Circles metadata
router.get('/api/plans/mobile/meta', (req, res) => {
  try {
    res.json({
      success: true,
      operators: OPERATORS_LIST || [],
      circles: CIRCLES_LIST || []
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Query Mobile Plans by Operator and Circle
router.post('/api/plans/mobile/query', async (req, res) => {
  const t0 = performance.now();
  try {
    const { operatorCode, circleCode, userMobile } = req.body;
    if (!operatorCode) {
      return res.status(400).json({ success: false, message: 'Operator code is required.' });
    }

    let hitInfo = null;
    if (userMobile) {
      hitInfo = await deductUserHit(userMobile);
    }

    const result = fetchOperatorPlans(operatorCode, circleCode || '70');
    const elapsedMs = (performance.now() - t0).toFixed(2);

    res.json({
      success: true,
      data: {
        operator: result.operator,
        circle: result.circle,
        plans: result.plans,
        responseTime: `${elapsedMs} ms`,
        remainingHits: hitInfo ? hitInfo.remainingHits : undefined
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Real-Time Operator & Circle Lookup (Ultra-fast < 1ms)
router.post(['/api/lookup/operator', '/api/lookup/full'], async (req, res) => {
  const t0 = performance.now();
  try {
    const { mobile, userMobile } = req.body;
    if (!mobile || String(mobile).trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required.' });
    }

    const cleanMobile = String(mobile).trim().replace(/\D/g, '').slice(-10);

    let hitInfo = null;
    if (userMobile) {
      hitInfo = await deductUserHit(userMobile);
    }

    // 1. Check cache first
    let result = await operatorCacheService.getOperator(cleanMobile);

    // 2. Resolve via Series Engine if not cached
    if (!result || !result.operator || result.operator === 'Unknown') {
      const resolved = resolveTelecomDetails(cleanMobile);
      result = {
        mobile: cleanMobile,
        operator: resolved.operator,
        circle: resolved.circle,
        opCode: resolved.opCode,
        circleCode: resolved.circleCode,
        cached: false
      };
      await operatorCacheService.setOperator(cleanMobile, result);
    }

    const elapsedMs = (performance.now() - t0).toFixed(4);
    res.json({
      success: true,
      data: {
        ...result,
        remainingHits: hitInfo ? hitInfo.remainingHits : undefined,
        responseTime: `${elapsedMs} ms`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Query Customer R-Offer (Special Best Offers)
router.post('/api/roffer/query', async (req, res) => {
  const t0 = performance.now();
  try {
    const { mobile, operatorCode, userMobile } = req.body;
    if (!mobile || String(mobile).trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required.' });
    }

    const cleanMobile = String(mobile).trim().replace(/\D/g, '').slice(-10);

    let hitInfo = null;
    if (userMobile) {
      hitInfo = await deductUserHit(userMobile);
    }

    const result = await fetchRofferDetails(cleanMobile, operatorCode);
    const elapsedMs = (performance.now() - t0).toFixed(2);

    res.json({
      success: true,
      data: result,
      responseTime: `${elapsedMs} ms`,
      remainingHits: hitInfo ? hitInfo.remainingHits : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Query DTH Customer Information & Balance
router.post('/api/dth/query', async (req, res) => {
  const t0 = performance.now();
  try {
    const { dthNumber, operatorCode, userMobile } = req.body;
    if (!dthNumber || String(dthNumber).trim().length < 8) {
      return res.status(400).json({ success: false, message: 'Valid DTH VC / Subscriber ID is required.' });
    }

    const cleanNumber = String(dthNumber).trim().replace(/\D/g, '');

    let hitInfo = null;
    if (userMobile) {
      hitInfo = await deductUserHit(userMobile);
    }

    const result = await fetchDthInfoDetails(cleanNumber, operatorCode);
    const elapsedMs = (performance.now() - t0).toFixed(2);

    res.json({
      success: true,
      data: result,
      responseTime: `${elapsedMs} ms`,
      remainingHits: hitInfo ? hitInfo.remainingHits : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Query Last Recharge Check
router.post('/api/recharge/query', async (req, res) => {
  const t0 = performance.now();
  try {
    const { mobile, operatorCode, userMobile } = req.body;
    if (!mobile || String(mobile).trim().length < 8) {
      return res.status(400).json({ success: false, message: 'Valid Mobile or VC number is required.' });
    }

    const cleanNumber = String(mobile).trim().replace(/\D/g, '');

    let hitInfo = null;
    if (userMobile) {
      hitInfo = await deductUserHit(userMobile);
    }

    const result = await fetchLastRechargeDetails(cleanNumber, operatorCode);
    const elapsedMs = (performance.now() - t0).toFixed(2);

    res.json({
      success: true,
      data: result,
      responseTime: `${elapsedMs} ms`,
      remainingHits: hitInfo ? hitInfo.remainingHits : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Available Hit Packs & Pricing
router.get('/api/plans/pricing', (req, res) => {
  res.json({
    success: true,
    packs: [
      {
        id: 'pack_starter',
        name: 'Starter Developer Pack',
        hits: 2000,
        price: 199,
        popular: false,
        features: ['Operator & Circle Lookup', 'Mobile Plans Browse', 'Standard Speed (< 1ms)', 'API Token Access']
      },
      {
        id: 'pack_business',
        name: 'Business Pro Pack',
        hits: 8000,
        price: 499,
        popular: true,
        features: ['All Starter Features', 'Live R-Offer Check', 'DTH Customer Info Verification', 'Higher Rate Limit (120 req/min)']
      },
      {
        id: 'pack_enterprise',
        name: 'High Volume Enterprise',
        hits: 30000,
        price: 1499,
        popular: false,
        features: ['All Business Features', 'Last Recharge Check', 'Dedicated IP Whitelisting', 'Priority Support']
      },
      {
        id: 'pack_unlimited',
        name: 'Mega Ultra Bulk',
        hits: 100000,
        price: 3999,
        popular: false,
        features: ['Full API Access Suite', 'Maximum Throughput', 'Multi-app Client Keys', '24/7 Priority SLA']
      }
    ]
  });
});

// -------------------------------------------------------------
// 2. PUBLIC DEVELOPER REST APIs (Compatible with third-party software)
// -------------------------------------------------------------

// Helper code mappings for developer APIs
function getOpCode(operatorName) {
  if (!operatorName) return '2';
  const clean = operatorName.toUpperCase().trim();
  for (const [key, val] of Object.entries(OPERATOR_CODE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) return val;
  }
  return '2';
}

function getCircleCode(circleName) {
  if (!circleName) return '51';
  const clean = circleName.toUpperCase().trim();
  for (const [key, val] of Object.entries(CIRCLE_CODE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) return val;
  }
  return '51';
}

// 1. Operator Fetch API
router.all(['/api/Mobile/OperatorFetchNew', '/api/mobile/operatorfetchnew'], async (req, res) => {
  const clientIp = getClientIp(req);
  const params = { ...req.query, ...req.body };

  const apiUserId = params.ApiUserID || params.apiuserid || params.apiUserId || params.userMobile || params.apimember_id;
  const token = params.token || params.Token || params.api_password;
  const mobileNo = params.Mobileno || params.mobileno || params.MobileNo || params.mobile;

  // Authenticate Request
  const auth = await authenticateApiRequest(apiUserId, token, clientIp);
  if (!auth.authenticated) {
    return res.status(200).json({
      "ERROR": "3",
      "STATUS": "3",
      "MOBILENO": mobileNo ? String(mobileNo).trim() : "null",
      "Operator": "null",
      "OpCode": "null",
      "Circle": "null",
      "CircleCode": "null",
      "Message": "Authentication failed"
    });
  }

  // Deduct hit
  const hitCheck = await deductUserHit(auth.user.id);
  if (!hitCheck.allowed) {
    return res.status(200).json({
      "ERROR": "4",
      "STATUS": "4",
      "Mobile": mobileNo ? String(mobileNo).trim() : "null",
      "Operator": "null",
      "OpCode": "null",
      "Circle": "null",
      "CircleCode": "null",
      "Message": "Insufficient plan hits. Please recharge your plan."
    });
  }

  if (!mobileNo || String(mobileNo).trim().replace(/\D/g, '').length < 10) {
    return res.status(200).json({
      "ERROR": "2",
      "STATUS": "2",
      "Mobile": mobileNo ? String(mobileNo).trim() : "null",
      "Operator": "null",
      "OpCode": "null",
      "Circle": "null",
      "CircleCode": "null",
      "Message": "Invalid or missing mobile number"
    });
  }

  const cleanMobile = String(mobileNo).trim().replace(/\D/g, '').slice(-10);

  try {
    let cachedRecord = await operatorCacheService.getOperator(cleanMobile);
    let operator = cachedRecord?.operator;
    let circle = cachedRecord?.circle;
    let opCode = cachedRecord?.opcode || getOpCode(operator);
    let circleCode = cachedRecord?.circleCode || getCircleCode(circle);

    if (!operator || operator === 'Unknown') {
      const resolved = resolveTelecomDetails(cleanMobile);
      operator = resolved.operator;
      circle = resolved.circle;
      opCode = resolved.opCode;
      circleCode = resolved.circleCode;

      await operatorCacheService.setOperator(cleanMobile, {
        operator,
        circle,
        opcode: opCode,
        circleCode
      });
    }

    return res.status(200).json({
      "ERROR": "0",
      "STATUS": "1",
      "Mobile": cleanMobile,
      "Operator": operator || "AIRTEL",
      "OpCode": opCode || "2",
      "Circle": circle || "UP East",
      "CircleCode": circleCode || "54",
      "Message": "Successfully"
    });
  } catch (err) {
    return res.status(200).json({
      "ERROR": "1",
      "STATUS": "0",
      "Mobile": cleanMobile,
      "Operator": "null",
      "OpCode": "null",
      "Circle": "null",
      "CircleCode": "null",
      "Message": "Service temporarily unavailable"
    });
  }
});

// 2. Mobile Plans Fetch API
router.all(['/api/Mobile/Operatorplan', '/api/Mobile/PlanFetch'], async (req, res) => {
  const clientIp = getClientIp(req);
  const params = { ...req.query, ...req.body };

  const apiUserId = params.ApiUserID || params.apiUserId || params.apimember_id || params.userMobile;
  const token = params.token || params.api_password;
  const opCode = params.operatorcode || params.OpCode || params.operatorCode || params.opcode;
  const circleCode = params.cricle || params.circle || params.Circle || params.CircleCode || params.circleCode;

  const auth = await authenticateApiRequest(apiUserId, token, clientIp);
  if (!auth.authenticated) {
    return res.status(200).json({
      "ERROR": "3",
      "STATUS": "3",
      "Operator": "null",
      "Circle": "null",
      "RDATA": null,
      "MESSAGE": "Authentication failed"
    });
  }

  const hitCheck = await deductUserHit(auth.user.id);
  if (!hitCheck.allowed) {
    return res.status(200).json({
      "ERROR": "4",
      "STATUS": "4",
      "Operator": "null",
      "Circle": "null",
      "RDATA": null,
      "MESSAGE": "Insufficient plan hits. Please recharge your plan."
    });
  }

  if (!opCode) {
    return res.status(200).json({
      "ERROR": "0",
      "STATUS": "2",
      "Operator": "null",
      "Circle": "",
      "RDATA": null,
      "MESSAGE": "Operator code is required"
    });
  }

  try {
    const result = fetchOperatorPlans(opCode, circleCode || '70');
    return res.status(200).json({
      "ERROR": "0",
      "STATUS": "0",
      "Operator": result.operator,
      "Circle": result.circle,
      "RDATA": result.plans,
      "MESSAGE": "Operator Plan Successfully"
    });
  } catch (err) {
    return res.status(200).json({
      "ERROR": "1",
      "STATUS": "0",
      "Operator": "null",
      "Circle": "null",
      "RDATA": null,
      "MESSAGE": "Service temporarily unavailable"
    });
  }
});

// 3. R-Offer Check API
router.all(['/api/Mobile/RofferCheck', '/api/Mobile/roffercheck', '/api/mobile/roffercheck', '/api/Mobile/RofferData', '/api/Mobile/ROffersCheck'], async (req, res) => {
  const clientIp = getClientIp(req);
  const params = { ...req.query, ...req.body };

  const apiUserId = params.apimember_id || params.ApiUserID || params.apiuserid || params.userMobile;
  const token = params.api_password || params.token || params.Token;
  const opCode = params.operator_code || params.OpCode || params.operatorcode || params.opcode || params.operatorCode;
  const mobileNo = params.mobile_no || params.Mobileno || params.mobileno || params.mobile || params.MobileNo;

  const auth = await authenticateApiRequest(apiUserId, token, clientIp);
  if (!auth.authenticated) {
    return res.status(200).json({
      "ERROR": "3",
      "STATUS": "3",
      "MOBILENO": mobileNo ? String(mobileNo).trim() : "null",
      "RDATA": null,
      "MESSAGE": "Authentication failed"
    });
  }

  const hitCheck = await deductUserHit(auth.user.id);
  if (!hitCheck.allowed) {
    return res.status(200).json({
      "ERROR": "4",
      "STATUS": "4",
      "MOBILENO": mobileNo ? String(mobileNo).trim() : "null",
      "RDATA": null,
      "MESSAGE": "Insufficient plan hits. Please recharge your plan."
    });
  }

  if (!mobileNo || String(mobileNo).trim().replace(/\D/g, '').length < 10) {
    return res.status(200).json({
      "ERROR": "2",
      "STATUS": "2",
      "MOBILENO": mobileNo ? String(mobileNo).trim() : "null",
      "RDATA": null,
      "MESSAGE": "Invalid or missing mobile number"
    });
  }

  const cleanMobile = String(mobileNo).trim().replace(/\D/g, '').slice(-10);

  try {
    const result = await fetchRofferDetails(cleanMobile, opCode);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({
      "ERROR": "1",
      "STATUS": "0",
      "MOBILENO": cleanMobile,
      "RDATA": null,
      "MESSAGE": "Service temporarily unavailable"
    });
  }
});

// 4. DTH Info & Last Recharge Check API
router.all([
  '/api/Mobile/DthInfoWithLastRechargeDate',
  '/api/Mobile/dthinfowithlastrechargedate',
  '/api/mobile/dthinfowithlastrechargedate',
  '/api/Mobile/DthInfo',
  '/api/Mobile/DthInfoDetails',
  '/api/Mobile/LastRechargeCheck',
  '/api/Mobile/RechargeCheck',
  '/api/Mobile/LastRecharge'
], async (req, res) => {
  const clientIp = getClientIp(req);
  const params = { ...req.query, ...req.body };

  const apiUserId = params.apimember_id || params.ApiUserID || params.apiuserid || params.userMobile;
  const token = params.api_password || params.token || params.Token;
  const opCode = params.Opcode || params.opcode || params.operator_code || params.operatorcode || params.OpCode;
  const mobileNo = params.mobile_no || params.Mobileno || params.mobileno || params.mobile || params.MobileNo || params.VC || params.vc;

  const auth = await authenticateApiRequest(apiUserId, token, clientIp);
  if (!auth.authenticated) {
    return res.status(200).json({
      "error": "3",
      "DATA": null,
      "Message": "Authentication failed"
    });
  }

  const hitCheck = await deductUserHit(auth.user.id);
  if (!hitCheck.allowed) {
    return res.status(200).json({
      "error": "4",
      "DATA": null,
      "Message": "Insufficient plan hits. Please recharge your plan."
    });
  }

  if (!mobileNo || String(mobileNo).trim().replace(/\D/g, '').length < 8) {
    return res.status(200).json({
      "error": "2",
      "DATA": null,
      "Message": "Invalid or missing mobile / DTH number"
    });
  }

  const cleanNumber = String(mobileNo).trim().replace(/\D/g, '');

  try {
    let result;
    const dthCodes = ['24', '25', '27', '28', '29', '21'];
    const cleanOpStr = String(opCode || '').trim();

    if (dthCodes.includes(cleanOpStr) || req.originalUrl.toLowerCase().includes('dth')) {
      result = await fetchDthInfoDetails(cleanNumber, opCode);
    } else {
      result = await fetchLastRechargeDetails(cleanNumber, opCode);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({
      "error": "1",
      "DATA": null,
      "Message": "Service temporarily unavailable"
    });
  }
});

module.exports = router;
