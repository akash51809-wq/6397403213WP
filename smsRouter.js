const express = require('express');
const QRCode = require('qrcode');
const os = require('os');
const WebSocket = require('ws');
const router = express.Router();
const { authRequired, User, Plan } = require('./auth');

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
const phoneSockets = new Map(); // deviceId -> ws
const outboxMessages = [];

/**
 * Initialize WebSocket server for ERS SMS Gateway Android App
 */
function initSmsWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const apiKey = parsedUrl.searchParams.get('apiKey') || req.headers['x-api-key'] || '';
      const deviceId = parsedUrl.searchParams.get('deviceId') || req.headers['x-device-id'] || 'android_phone';

      console.log(`[SMS Gateway] Incoming WebSocket connection attempt from device: ${deviceId}, apiKey: ${apiKey}`);

      const expectedKey = db.getSetting('api_key', 'ers_key_8899');
      if (apiKey && expectedKey && apiKey !== expectedKey && apiKey !== 'ers_key_8899') {
        console.warn(`[SMS Gateway] Notice: Device ${deviceId} connected with key "${apiKey}" (expected "${expectedKey}") - allowing`);
      }

      phoneSockets.set(deviceId, ws);
      db.setDeviceOnlineStatus(deviceId, true);
      console.log(`[SMS Gateway] Mobile app connected successfully! DeviceId: ${deviceId}`);

      ws.on('message', async (messageText) => {
        try {
          const msg = JSON.parse(messageText.toString());
          const event = msg.event;
          const data = msg.data || {};

          // 1. Device Registration & SIM info from phone
          if (event === 'device_register') {
            db.upsertDevice({
              deviceId: data.deviceId || deviceId,
              deviceName: data.deviceName || 'Android Device',
              batteryLevel: data.batteryLevel !== undefined ? data.batteryLevel : 100,
              isCharging: !!data.isCharging,
              simCards: data.simCards || []
            });
            console.log(`[SMS Gateway] Device registered: ${data.deviceName || deviceId} | SIMs: ${(data.simCards || []).length} | Battery: ${data.batteryLevel}%`);
          }

          // 2. Incoming SMS received by phone
          else if (event === 'incoming_sms') {
            const sender = data.sender || data.from || data.address || data.phoneNumber || data.mobile || 'Unknown';
            const message = data.message || data.body || data.text || data.msg || '';
            const simSlot = data.simSlot !== undefined ? data.simSlot : (data.slot !== undefined ? data.slot : 0);
            const timestamp = data.timestamp || Date.now();

            if (db.isDuplicateSms(sender, message, 60000)) {
              console.log(`[SMS Gateway] Duplicate SMS skipped from ${sender}`);
              return;
            }

            const smsRecord = db.saveIncomingSms({
              deviceId: deviceId,
              sender,
              message,
              simSlot,
              timestamp
            });
            console.log(`[SMS Gateway] Received incoming SMS #${smsRecord.id} from ${sender}: "${message.slice(0, 40)}"`);

            processIncomingSmsWebhook(smsRecord).catch(err => {
              console.warn('[SMS Gateway Webhook] Delivery error:', err.message);
            });
          }

          // 3. Outgoing SMS delivery status callback from phone
          else if (event === 'sms_status') {
            console.log(`[SMS Gateway] SMS status update: messageId=${data.messageId}, status=${data.status}`);
            const item = outboxMessages.find(m => String(m.id) === String(data.messageId));
            if (item) {
              item.status = data.status;
              item.error = data.error || null;
            }
          }

          // 4. Ping / Pong heartbeat
          else if (event === 'pong') {
            // Heartbeat ack
          }
        } catch (err) {
          console.error('[SMS Gateway] Error parsing socket message:', err.message);
        }
      });

      ws.on('close', () => {
        console.log(`[SMS Gateway] Mobile app disconnected: ${deviceId}`);
        phoneSockets.delete(deviceId);
        db.setDeviceOnlineStatus(deviceId, false);
      });

      ws.on('error', (err) => {
        console.warn(`[SMS Gateway] WebSocket error for ${deviceId}:`, err.message);
      });

      // Send initial ping to check socket
      try {
        ws.send(JSON.stringify({ event: 'ping', data: { timestamp: Date.now() } }));
      } catch (e) {}

    } catch (connErr) {
      console.error('[SMS Gateway] Connection error:', connErr.message);
    }
  });

  // Keep-alive ping interval every 25 seconds
  const pingTimer = setInterval(() => {
    for (const [id, ws] of phoneSockets.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ event: 'ping', data: { timestamp: Date.now() } }));
        } catch (e) {
          phoneSockets.delete(id);
        }
      } else {
        phoneSockets.delete(id);
      }
    }
  }, 25000);
  if (typeof pingTimer.unref === 'function') pingTimer.unref();

  return wss;
}

// 1. GET SMS STATUS METRICS
router.get('/api/sms/status', (req, res) => {
  try {
    const devices = db.getAllDevices();
    const totalSms = db.getTotalSmsCount ? db.getTotalSmsCount() : 0;
    const delivered = db.getTotalDeliveriesCount ? db.getTotalDeliveriesCount('DELIVERED') : 0;
    const retrying = db.getTotalDeliveriesCount ? db.getTotalDeliveriesCount('RETRY_SCHEDULED') : 0;
    const failed = db.getTotalDeliveriesCount ? db.getTotalDeliveriesCount('FAILED') : 0;
    const activeDevicesCount = Array.from(phoneSockets.values()).filter(ws => ws.readyState === WebSocket.OPEN).length || devices.filter(d => d.is_online).length;

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
    const resolvedLocalIp = getLocalIp();

    // Mobile phones cannot connect to 'localhost' or '127.0.0.1' (localhost on phone refers to phone itself).
    // Prefer external APP_URL if not localhost; else request host if not localhost; otherwise local LAN IP.
    const reqHost = req.get('host') || '';
    const isLocal = reqHost.includes('localhost') || reqHost.includes('127.0.0.1') || reqHost.startsWith('192.168.') || reqHost.startsWith('10.');
    const reqProtocol = (!isLocal) ? 'https' : (req.headers['x-forwarded-proto'] || req.protocol || 'http');
    let serverUrl = '';

    if (process.env.APP_URL && !process.env.APP_URL.includes('localhost') && !process.env.APP_URL.includes('127.0.0.1')) {
      serverUrl = process.env.APP_URL.trim().replace(/\/$/, '');
    } else if (reqHost && !isLocal) {
      serverUrl = `https://${reqHost}`;
    } else if (reqHost && !reqHost.includes('localhost') && !reqHost.includes('127.0.0.1')) {
      serverUrl = `${reqProtocol}://${reqHost}`;
    } else {
      serverUrl = `http://${resolvedLocalIp}:${port}`;
    }

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
      localIp: resolvedLocalIp,
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

// 3b. REGISTER DEVICE VIA HTTP POST
router.post('/api/sms/devices/register', (req, res) => {
  try {
    const data = req.body || {};
    const devId = data.deviceId || req.headers['x-device-id'] || 'android_phone';
    db.upsertDevice({
      deviceId: devId,
      deviceName: data.deviceName || 'Android Device',
      batteryLevel: data.batteryLevel !== undefined ? Number(data.batteryLevel) : 100,
      isCharging: !!data.isCharging,
      simCards: data.simCards || []
    });
    db.setDeviceOnlineStatus(devId, true);
    res.json({ success: true, message: 'Device registered successfully' });
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

// 9. INCOMING SMS ENDPOINTS (SUPPORTS /inbox, /api/inbox, /api/sms/inbox, /api/sms/incoming)
router.post(['/inbox', '/api/inbox', '/api/sms/inbox', '/api/sms/incoming'], async (req, res) => {
  try {
    const rawItems = Array.isArray(req.body) 
      ? req.body 
      : (Array.isArray(req.body?.messages) ? req.body.messages : [req.body]);

    const apiKey = db.getSetting('api_key', 'ers_key_8899');
    const savedRecords = [];

    for (const item of rawItems) {
      if (!item) continue;
      let rawSender = item.sender || item.from || item.address || item.phoneNumber || item.mobile;
      let rawMessage = item.content || item.message || item.body || item.text || item.msg;
      const rawSlot = item.simSlot !== undefined 
        ? item.simSlot 
        : (item.simNumber !== undefined ? Math.max(0, parseInt(item.simNumber) - 1) : (item.slot !== undefined ? item.slot : 0));
      const rawTs = item.createdAt ? new Date(item.createdAt).getTime() : (item.timestamp || Date.now());
      const devId = item.deviceId || req.body.deviceId || 'android_device';

      if (item.payload) {
        try {
          const dec = decryptPayload(item.payload, apiKey);
          if (dec) {
            rawSender = dec.sender || rawSender;
            rawMessage = dec.message || dec.content || rawMessage;
          }
        } catch (e) {
          console.warn('[SMS Gateway] Decrypt error for item:', e.message);
        }
      }

      if (!rawSender || !rawMessage) continue;

      const senderStr = String(rawSender).trim();
      const messageStr = String(rawMessage).trim();

      // Duplicate check within 60s
      if (db.isDuplicateSms(senderStr, messageStr, 60000)) {
        continue;
      }

      const saved = db.saveIncomingSms({
        deviceId: devId,
        sender: senderStr,
        message: messageStr,
        simSlot: parseInt(rawSlot) || 0,
        timestamp: Number(rawTs) || Date.now()
      });

      savedRecords.push(saved);

      // Auto-dispatch webhook in background
      processIncomingSmsWebhook(saved).catch(err => {
        console.warn('[SMS Webhook] Background error:', err.message);
      });
    }

    res.json({ 
      success: true, 
      processedCount: savedRecords.length, 
      messages: savedRecords 
    });
  } catch (err) {
    console.error('[SMS Incoming Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. SEND SMS OUTBOX
router.post('/api/sms/send', authRequired, async (req, res) => {
  try {
    const { recipient, message, simSlot = 0, deviceId } = req.body;
    if (!recipient || !message) {
      return res.status(400).json({ success: false, message: 'Mobile number aur message body zaroori hai.' });
    }

    const user = req.user;
    if (user && user.role !== 'admin' && String(user.userId).toUpperCase() !== 'ADMIN') {
      if (!user.smsPlan || (user.smsPlanExpiresAt && new Date(user.smsPlanExpiresAt).getTime() < Date.now())) {
        return res.status(403).json({
          success: false,
          message: 'आपका SMS प्लान सक्रिय नहीं है या समाप्त हो चुका है। कृपया SMS प्लान सब्सक्राइब करें।'
        });
      }
      const planDoc = await Plan.findOne({
        service: 'sms',
        $or: [{ name: new RegExp(`^${user.smsPlan}$`, 'i') }, { planId: String(user.smsPlan).toLowerCase() }]
      });
      if (planDoc && planDoc.outgoingAllowed === false) {
        return res.status(403).json({
          success: false,
          message: 'Outgoing SMS आपके वर्तमान प्लान में अनुमत नहीं है (Invalid Plan: Outgoing SMS not allowed)। कृपया प्लान अपग्रेड करें।'
        });
      }
    }

    const messageId = 'msg_' + Date.now();
    const outboxItem = {
      id: messageId,
      recipient: String(recipient).trim(),
      message: String(message).trim(),
      simSlot: Number(simSlot),
      deviceId: deviceId || 'default',
      status: 'QUEUED',
      createdAt: formatISTDate(Date.now())
    };

    // If active phone WebSocket is connected, dispatch SMS directly to Android phone
    const activeSockets = Array.from(phoneSockets.values()).filter(ws => ws.readyState === WebSocket.OPEN);
    if (activeSockets.length > 0) {
      const targetSocket = activeSockets[0];
      try {
        targetSocket.send(JSON.stringify({
          event: 'send_sms',
          data: {
            messageId: messageId,
            phoneNumber: outboxItem.recipient,
            message: outboxItem.message,
            simSlot: outboxItem.simSlot
          }
        }));
        outboxItem.status = 'DISPATCHED_TO_PHONE';
        console.log(`[SMS Gateway] Dispatched SMS ${messageId} to connected Android phone`);
      } catch (sendErr) {
        console.warn('[SMS Gateway] Failed sending to phone socket:', sendErr.message);
      }
    }

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

// Download ERS SMS Gateway Android APK
const path = require('path');
const fs = require('fs');

router.get(['/api/sms/download-apk', '/download/ERS-SMS-Gateway.apk'], (req, res) => {
  const possiblePaths = [
    path.join(__dirname, 'whatsapp-dashboard', 'public', 'downloads', 'ERS-SMS-Gateway.apk'),
    path.join(__dirname, 'whatsapp-dashboard', 'dist', 'downloads', 'ERS-SMS-Gateway.apk'),
    path.join(__dirname, 'mobile SMS app', 'ERS-SMS-Gateway.apk')
  ];

  for (const apkPath of possiblePaths) {
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="ERS-SMS-Gateway.apk"');
      return res.sendFile(apkPath);
    }
  }

  res.status(404).json({ success: false, message: 'ERS-SMS-Gateway.apk file not found on server.' });
});

router.initSmsWebSocket = initSmsWebSocket;
router.phoneSockets = phoneSockets;

module.exports = router;

