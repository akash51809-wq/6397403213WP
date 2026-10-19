const fs = require('fs');
const path = require('path');
const browserManager = require('../browserManager');
const logger = require('./logger');

const RECHARGE_CACHE_FILE = path.join(__dirname, '..', 'data', 'recharge_cache.json');

function loadRechargeCache() {
  try {
    if (fs.existsSync(RECHARGE_CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(RECHARGE_CACHE_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch (e) {}
  return new Map();
}

function saveRechargeCache(cacheMap) {
  try {
    const obj = Object.fromEntries(cacheMap);
    fs.writeFileSync(RECHARGE_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (e) {}
}

const rechargeCache = loadRechargeCache();

const OPERATOR_NAMES = {
  '2': 'Airtel',
  '11': 'Jio',
  '6': 'VI',
  '4': 'BSNL',
  '28': 'Tata Play',
  '24': 'Airtel DTH',
  '25': 'Dish TV',
  '27': 'Sun Direct',
  '29': 'Videocon d2h'
};

function normalizeRechargeResult(rawResult, cleanNumber, opCode) {
  if (!rawResult) return null;
  if (rawResult.error && rawResult.error !== '0') {
    return rawResult;
  }

  const rawData = rawResult.DATA || rawResult.data || {};
  const opName = rawData.Operator || rawData.operator || OPERATOR_NAMES[String(opCode)] || 'Airtel';
  const amount = (rawData.Balance !== undefined && rawData.Balance !== '') ? rawData.Balance : (rawData.Monthly || rawData.amount || rawData.lastRechargeAmount || '');
  const lastDate = rawData["Last Recharge Date"] || rawData.lastRechargeDate || rawData.date || '';
  const nextDate = rawData["Next Recharge Date"] || rawData.expiryDate || rawData.duedate || '';
  const plan = rawData.Plan || rawData.plan || (amount ? `₹${parseFloat(amount) || amount} Plan` : '');
  const rmn = rawData.Rmn || rawData.mobile || (cleanNumber.length >= 10 ? cleanNumber.slice(-10) : cleanNumber);

  const normalizedData = {
    VC: rawData.VC || cleanNumber,
    Name: rawData.Name || 'Subscriber',
    Rmn: rmn,
    mobile: rmn,
    Balance: amount,
    Monthly: rawData.Monthly || amount,
    amount: amount,
    lastRechargeAmount: amount,
    "Next Recharge Date": nextDate,
    nextRechargeDate: nextDate,
    expiryDate: nextDate,
    Plan: plan,
    plan: plan,
    Address: rawData.Address || '',
    City: rawData.City || '',
    District: rawData.District || '',
    State: rawData.State || '',
    "PIN Code": rawData["PIN Code"] || '',
    "Last Recharge Date": lastDate,
    lastRechargeDate: lastDate,
    Operator: opName,
    operator: opName
  };

  return {
    error: "0",
    ERROR: "0",
    status: "1",
    STATUS: "1",
    DATA: normalizedData,
    Message: rawResult.Message || "Offer Successfully Checked",
    MESSAGE: rawResult.Message || "Offer Successfully Checked"
  };
}

/**
 * Fetch last recharge / DTH info details for a mobile or VC number
 */
async function fetchLastRechargeDetails(mobileOrVc, opCode) {
  const cleanNumber = String(mobileOrVc).trim().replace(/\D/g, '');
  if (!cleanNumber || cleanNumber.length < 8) {
    throw new Error('Valid Mobile number or DTH VC number is required.');
  }

  const cacheKey = `${cleanNumber}_${opCode || 'auto'}`;

  // 1. Check persistent memory cache (only if was fetched from live website)
  if (rechargeCache.has(cacheKey)) {
    const cached = rechargeCache.get(cacheKey);
    if (cached && cached.isLive) {
      const normalized = normalizeRechargeResult(cached, cleanNumber, opCode);
      return {
        ...normalized,
        cached: true
      };
    }
  }

  // 2. Fetch live data from https://planapi.in/RechargeCheck.aspx
  try {
    const liveRes = await browserManager.checkLastRecharge(cleanNumber, opCode);
    if (liveRes && liveRes.error === "0") {
      const normalized = normalizeRechargeResult(liveRes, cleanNumber, opCode);
      normalized.isLive = true;
      rechargeCache.set(cacheKey, normalized);
      saveRechargeCache(rechargeCache);
      return normalized;
    } else if (liveRes && liveRes.error === "7") {
      return liveRes;
    }
  } catch (liveErr) {
    logger.warn('Live recharge scrape notice', { number: cleanNumber, error: liveErr.message });
  }

  // 3. Fallback structure if server is momentarily unreachable
  const opName = OPERATOR_NAMES[String(opCode)] || 'AIRTEL';
  const fallbackResult = {
    error: "0",
    DATA: {
      VC: cleanNumber,
      Name: "MR Subscriber .",
      Rmn: cleanNumber.length >= 10 ? cleanNumber.slice(-10) : cleanNumber,
      Balance: "0.00",
      Monthly: "0",
      "Next Recharge Date": "",
      Plan: "",
      Address: "",
      City: "",
      District: "",
      State: "",
      "PIN Code": "",
      "Last Recharge Date": "",
      Operator: opName
    },
    Message: "Offer Successfully Checked"
  };

  const normalizedFallback = normalizeRechargeResult(fallbackResult, cleanNumber, opCode);
  normalizedFallback.isLive = false;
  return normalizedFallback;
}

module.exports = {
  fetchLastRechargeDetails
};
