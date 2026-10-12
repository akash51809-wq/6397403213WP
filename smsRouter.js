const express = require('express');
const QRCode = require('qrcode');
const os = require('os');
const router = express.Router();

const db = require('./utils/smsDb');
const { encryptPayload, decryptPayload, formatISTDate } = require('./utils/smsCrypto');
const { processIncomingSmsWebhook, sendTestWebhook } = require('./utils/smsWebhook');

// Helper to determine local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

// In-Memory store for active connected Android sockets & sent outbox
const outboxMessages = [];

// 1. GET SMS STATUS METRICS
router.get('/api/sms/status', (req, res) => {
  try {
    const devices = db.getAllDevices();
    const recentSms = db.getSmsList({ limit: 100 });
    const recentDeliveries = db.getRecentDeliveries({ limit: 100 });

    const totalSms = recentSms.length;
    const delivered = recentDeliveries.filter(d => d.status === 'DELIVERED').length;
    const retrying = recentDeliveries.filter(d => d.status === 'RETRY_SCHEDULED').length;
    const failed = recentDeliveries.filter(d => d.status === 'FAILED').length;
    const activeDevicesCount = devices.filter(d => d.is_online).length;

    res.json({
      success: true,
      data: {
        totalSms,
        delivered,
        retrying,
        failed,
        activeDevicesCount,
        devicesCount: devices.length,
        serverUrl: process.env.APP_URL || `http://${localIp}:${process.env.PORT || 10000}`
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET PAIRING QR CODE
router.get('/api/sms/qr', async (req, res) => {
  try {
    const apiKey = db.getSetting('api_key', 'ers_key_8899');
    const port = process.env.PORT || 10000;
    const serverUrl = process.env.APP_URL || `http://${localIp}:${port}`;

    const qrData = JSON.stringify({
      serverUrl,
      apiKey,
      deviceName: 'ERS SMS Gateway Panel'
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 280,
      margin: 2,
      color: { dark: '#0284C7', light: '#FFFFFF' }
    });

    res.json({
      success: true,
      qrCode: qrCodeDataUrl,
      serverUrl,
      apiKey
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET CONNECTED DEVICES
router.get('/api/sms/devices', (req, res) => {
  try {
    const devices = db.getAllDevices();
    res.json({ success: true, devices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. UPDATE DEVICE CONFIG
router.post('/api/sms/devices/:deviceId/config', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { webhookUrl, senderWhitelist } = req.body;
    db.updateDeviceConfig(deviceId, webhookUrl, senderWhitelist);
    res.json({ success: true, message: 'Device configuration updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. GET / POST SETTINGS
router.get('/api/sms/settings', (req, res) => {
  try {
    const settings = db.getAllSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/api/sms/settings', (req, res) => {
  try {
    const { apiKey, defaultWebhookUrl, defaultSenderWhitelist, retentionHours } = req.body;
    if (apiKey) db.setSetting('api_key', apiKey.trim());
    if (defaultWebhookUrl !== undefined) db.setSetting('default_webhook_url', defaultWebhookUrl.trim());
    if (defaultSenderWhitelist !== undefined) db.setSetting('default_sender_whitelist', defaultSenderWhitelist.trim());
    if (retentionHours) db.setSetting('retention_hours', String(retentionHours));

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. TEST WEBHOOK
router.post('/api/sms/webhook/test', async (req, res) => {
  try {
    const { targetUrl, apiKey } = req.body;
    const url = targetUrl || db.getSetting('default_webhook_url');
    if (!url) {
      return res.status(400).json({ success: false, message: 'Webhook URL provide karein.' });
    }

    const result = await sendTestWebhook(url, apiKey);
    res.json({ success: result.success, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. GET INCOMING SMS MESSAGES
router.get('/api/sms/messages', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const sender = req.query.sender || '';
    const deviceId = req.query.deviceId || '';

    const messages = db.getSmsList({ limit, offset, sender, deviceId });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. GET WEBHOOK DELIVERIES
router.get('/api/sms/webhook-deliveries', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const status = req.query.status || '';

    const deliveries = db.getRecentDeliveries({ limit, offset, status });
    res.json({ success: true, deliveries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. INCOMING SMS ENDPOINT (CALLED BY ANDROID APP)
router.post('/api/sms/incoming', async (req, res) => {
  try {
    const { deviceId, payload, sender, message, simSlot, timestamp } = req.body;
    let smsData = null;

    if (payload) {
      const apiKey = db.getSetting('api_key', 'ers_key_8899');
      try {
        smsData = decryptPayload(payload, apiKey);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid encrypted payload: ' + e.message });
      }
    } else if (sender && message) {
      smsData = { sender, message, simSlot, timestamp };
    } else {
      return res.status(400).json({ success: false, message: 'Missing sender or message payload' });
    }

    // Duplicate check within 60s
    if (db.isDuplicateSms(smsData.sender, smsData.message, 60000)) {
      return res.json({ success: true, ignored: true, reason: 'Duplicate SMS' });
    }

    const saved = db.saveIncomingSms({
      deviceId: deviceId || 'android_device',
      sender: smsData.sender,
      message: smsData.message,
      simSlot: smsData.simSlot || 0,
      timestamp: smsData.timestamp || Date.now()
    });

    // Auto-dispatch webhook in background
    processIncomingSmsWebhook(saved).catch(err => {
      console.warn('[SMS Webhook] Background error:', err.message);
    });

    res.json({ success: true, messageId: saved.id, receivedAt: saved.receivedAt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. SEND SMS OUTBOX
router.post('/api/sms/send', (req, res) => {
  try {
    const { recipient, message, simSlot = 0, deviceId } = req.body;
    if (!recipient || !message) {
      return res.status(400).json({ success: false, message: 'Mobile number aur message body zaroori hai.' });
    }

    const outboxItem = {
      id: Date.now(),
      recipient: String(recipient).trim(),
      message: String(message).trim(),
      simSlot: Number(simSlot),
      deviceId: deviceId || 'default',
      status: 'QUEUED',
      createdAt: formatISTDate(Date.now())
    };

    outboxMessages.unshift(outboxItem);
    if (outboxMessages.length > 200) outboxMessages.pop();

    res.json({
      success: true,
      message: `SMS to ${recipient} queued successfully.`,
      sms: outboxItem
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/api/sms/outbox', (req, res) => {
  res.json({ success: true, outbox: outboxMessages });
});

module.exports = router;
