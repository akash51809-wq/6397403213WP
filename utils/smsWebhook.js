const { encryptPayload, formatISTDate } = require('./smsCrypto');
const db = require('./smsDb');

function isSenderAllowed(sender, whitelistString) {
  if (!whitelistString || !whitelistString.trim()) {
    return true;
  }

  const cleanSender = String(sender || '').trim().toUpperCase();
  const tokens = whitelistString
    .split(/[,;\n]+/)
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0);

  if (tokens.length === 0) return true;
  return tokens.some(token => cleanSender.includes(token) || cleanSender === token);
}

function buildWebhookUrl(targetUrl, encryptedBase64) {
  const url = new URL(targetUrl);
  url.searchParams.set('enc_data', encryptedBase64);
  return url.toString();
}

async function sendWebhookHttpRequest(fullUrl) {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'ERS-SMS-Webhook-Gateway/1.0',
        'Accept': 'application/json, text/plain, */*'
      },
      signal: controller.signal,
      redirect: 'manual'
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    const httpStatus = response.status;
    const responseText = await response.text();

    const isSuccess = httpStatus >= 200 && httpStatus <= 299;

    return {
      success: isSuccess,
      httpStatus,
      responseTimeMs,
      responseBody: responseText,
      errorMessage: isSuccess ? '' : `HTTP Error ${httpStatus}: ${responseText.slice(0, 200)}`
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    const isTimeout = error.name === 'AbortError';

    return {
      success: false,
      httpStatus: 0,
      responseTimeMs,
      responseBody: '',
      errorMessage: isTimeout ? 'Request timed out after 10000ms' : (error.message || 'Network request failed')
    };
  }
}

async function processIncomingSmsWebhook(smsRecord) {
  const device = db.getDevice(smsRecord.deviceId);
  const targetUrl = (device?.webhook_url || db.getSetting('default_webhook_url') || '').trim();
  const whitelist = (device?.sender_whitelist || db.getSetting('default_sender_whitelist') || '').trim();
  const apiKey = db.getSetting('api_key', 'ers_key_8899');

  if (!isSenderAllowed(smsRecord.sender, whitelist)) {
    return {
      action: 'IGNORED_WHITELIST',
      sender: smsRecord.sender
    };
  }

  if (!targetUrl) {
    db.createWebhookDelivery({
      smsId: smsRecord.id,
      deviceId: smsRecord.deviceId,
      targetUrl: '',
      status: 'FAILED',
      errorMessage: 'No webhook URL configured (Device or Global).'
    });
    return { action: 'NO_WEBHOOK_URL' };
  }

  let encryptedPayload;
  try {
    encryptedPayload = encryptPayload({
      id: smsRecord.id,
      sender: smsRecord.sender,
      message: smsRecord.message,
      simSlot: smsRecord.simSlot,
      receivedAt: smsRecord.receivedAt
    }, apiKey);
  } catch (encErr) {
    db.createWebhookDelivery({
      smsId: smsRecord.id,
      deviceId: smsRecord.deviceId,
      targetUrl,
      status: 'FAILED',
      errorMessage: `Encryption failed: ${encErr.message}`
    });
    return { action: 'ENCRYPTION_ERROR', error: encErr.message };
  }

  let finalUrl;
  try {
    finalUrl = buildWebhookUrl(targetUrl, encryptedPayload);
  } catch (urlErr) {
    db.createWebhookDelivery({
      smsId: smsRecord.id,
      deviceId: smsRecord.deviceId,
      targetUrl,
      status: 'FAILED',
      errorMessage: `Invalid URL: ${urlErr.message}`
    });
    return { action: 'INVALID_URL', error: urlErr.message };
  }

  const result = await sendWebhookHttpRequest(finalUrl);

  if (result.success) {
    db.createWebhookDelivery({
      smsId: smsRecord.id,
      deviceId: smsRecord.deviceId,
      targetUrl,
      status: 'DELIVERED',
      httpStatus: result.httpStatus,
      responseTimeMs: result.responseTimeMs,
      responseBody: result.responseBody,
      attempts: 1
    });
    return { action: 'DELIVERED', result };
  } else {
    const nextRetry = Date.now() + (2 * 60 * 1000); // 2 minutes
    db.createWebhookDelivery({
      smsId: smsRecord.id,
      deviceId: smsRecord.deviceId,
      targetUrl,
      status: 'RETRY_SCHEDULED',
      httpStatus: result.httpStatus,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage,
      attempts: 1,
      nextRetryAt: nextRetry
    });
    return { action: 'RETRY_SCHEDULED', result, nextRetryAt: nextRetry };
  }
}

async function sendTestWebhook(targetUrl, apiKey) {
  if (!targetUrl || !targetUrl.trim()) {
    throw new Error('Valid target URL is required');
  }

  const keyToUse = apiKey || db.getSetting('api_key', 'ers_key_8899');
  const now = Date.now();
  const testPayload = {
    id: 999999,
    sender: 'TEST-OTP',
    message: 'Test OTP message: Your verification code is 123456 (Valid for 5 mins).',
    simSlot: 0,
    receivedAt: formatISTDate(now)
  };

  const encrypted = encryptPayload(testPayload, keyToUse);
  const finalUrl = buildWebhookUrl(targetUrl, encrypted);

  return sendWebhookHttpRequest(finalUrl);
}

module.exports = {
  isSenderAllowed,
  buildWebhookUrl,
  sendWebhookHttpRequest,
  processIncomingSmsWebhook,
  sendTestWebhook
};
