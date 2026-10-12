const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { formatISTDate } = require('./smsCrypto');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'sms_gateway.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Tables
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      device_name TEXT,
      battery_level INTEGER DEFAULT 100,
      is_charging INTEGER DEFAULT 0,
      sim_cards_json TEXT DEFAULT '[]',
      webhook_url TEXT DEFAULT '',
      sender_whitelist TEXT DEFAULT '',
      is_online INTEGER DEFAULT 0,
      last_seen_at INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sms_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT,
      sender TEXT,
      message TEXT,
      sim_slot INTEGER DEFAULT 0,
      received_at TEXT,
      received_timestamp INTEGER,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sms_id INTEGER,
      device_id TEXT,
      target_url TEXT,
      status TEXT,
      http_status INTEGER DEFAULT 0,
      response_time_ms INTEGER DEFAULT 0,
      response_body TEXT DEFAULT '',
      error_message TEXT DEFAULT '',
      attempts INTEGER DEFAULT 1,
      next_retry_at INTEGER DEFAULT 0,
      last_attempt_at INTEGER,
      created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_sms_received_ts ON sms_messages(received_timestamp);
    CREATE INDEX IF NOT EXISTS idx_sms_sender ON sms_messages(sender);
    CREATE INDEX IF NOT EXISTS idx_delivery_status ON webhook_deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_delivery_sms_id ON webhook_deliveries(sms_id);
  `);

  // Default Settings Seed
  const defaultSettings = [
    { key: 'api_key', value: 'ers_key_8899' },
    { key: 'default_webhook_url', value: '' },
    { key: 'default_sender_whitelist', value: '' },
    { key: 'plan_status', value: 'ACTIVE' },
    { key: 'retention_hours', value: '48' }
  ];

  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const s of defaultSettings) {
    stmt.run(s.key, s.value);
  }
}

initSchema();

// Settings Helpers
function getSetting(key, defaultValue = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  for (const r of rows) {
    obj[r.key] = r.value;
  }
  return obj;
}

// Devices Helpers
function upsertDevice(dev) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO devices (
      device_id, device_name, battery_level, is_charging, sim_cards_json, is_online, last_seen_at, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      device_name = excluded.device_name,
      battery_level = excluded.battery_level,
      is_charging = excluded.is_charging,
      sim_cards_json = excluded.sim_cards_json,
      is_online = 1,
      last_seen_at = excluded.last_seen_at
  `);

  stmt.run(
    dev.deviceId,
    dev.deviceName || 'Android Device',
    dev.batteryLevel !== undefined ? dev.batteryLevel : 100,
    dev.isCharging ? 1 : 0,
    JSON.stringify(dev.simCards || []),
    now,
    now
  );
}

function updateDeviceConfig(deviceId, webhookUrl, senderWhitelist) {
  db.prepare(`
    UPDATE devices 
    SET webhook_url = ?, sender_whitelist = ?
    WHERE device_id = ?
  `).run(webhookUrl !== undefined ? webhookUrl.trim() : '', senderWhitelist !== undefined ? senderWhitelist.trim() : '', deviceId);
}

function setDeviceOnlineStatus(deviceId, isOnline) {
  db.prepare('UPDATE devices SET is_online = ?, last_seen_at = ? WHERE device_id = ?')
    .run(isOnline ? 1 : 0, Date.now(), deviceId);
}

function getDevice(deviceId) {
  const row = db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId);
  if (!row) return null;
  return {
    ...row,
    simCards: JSON.parse(row.sim_cards_json || '[]')
  };
}

function getAllDevices() {
  const rows = db.prepare('SELECT * FROM devices ORDER BY last_seen_at DESC').all();
  return rows.map(r => ({
    ...r,
    simCards: JSON.parse(r.sim_cards_json || '[]')
  }));
}

// SMS Messages Helpers
function isDuplicateSms(sender, message, timestampWindow = 60000) {
  const threshold = Date.now() - timestampWindow;
  const row = db.prepare(`
    SELECT id FROM sms_messages 
    WHERE sender = ? AND message = ? AND created_at >= ?
    LIMIT 1
  `).get(sender, message, threshold);
  return !!row;
}

function saveIncomingSms({ deviceId, sender, message, simSlot, timestamp }) {
  const now = Date.now();
  const ts = timestamp || now;
  const istString = formatISTDate(ts);

  const res = db.prepare(`
    INSERT INTO sms_messages (
      device_id, sender, message, sim_slot, received_at, received_timestamp, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    deviceId || 'unknown',
    String(sender).trim(),
    String(message).trim(),
    simSlot !== undefined ? parseInt(simSlot) : 0,
    istString,
    ts,
    now
  );

  return {
    id: Number(res.lastInsertRowid),
    deviceId: deviceId || 'unknown',
    sender: String(sender).trim(),
    message: String(message).trim(),
    simSlot: simSlot !== undefined ? parseInt(simSlot) : 0,
    receivedAt: istString,
    receivedTimestamp: ts
  };
}

function getSmsById(id) {
  return db.prepare('SELECT * FROM sms_messages WHERE id = ?').get(id);
}

function getSmsList({ limit = 50, offset = 0, sender, deviceId } = {}) {
  let query = `
    SELECT m.*, d.status as webhook_status, d.http_status as webhook_http_status, d.target_url, d.attempts, d.id as delivery_id
    FROM sms_messages m
    LEFT JOIN webhook_deliveries d ON d.sms_id = m.id
    WHERE 1=1
  `;
  const params = [];

  if (sender) {
    query += ' AND m.sender LIKE ?';
    params.push(`%${sender}%`);
  }
  if (deviceId) {
    query += ' AND m.device_id = ?';
    params.push(deviceId);
  }

  query += ' ORDER BY m.id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

// Webhook Delivery Logs Helpers
function createWebhookDelivery({
  smsId, deviceId, targetUrl, status, httpStatus = 0,
  responseTimeMs = 0, responseBody = '', errorMessage = '',
  attempts = 1, nextRetryAt = 0
}) {
  const now = Date.now();
  const res = db.prepare(`
    INSERT INTO webhook_deliveries (
      sms_id, device_id, target_url, status, http_status,
      response_time_ms, response_body, error_message, attempts,
      next_retry_at, last_attempt_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    smsId, deviceId, targetUrl, status, httpStatus,
    responseTimeMs, responseBody.slice(0, 2000), errorMessage.slice(0, 1000),
    attempts, nextRetryAt, now, now
  );

  return Number(res.lastInsertRowid);
}

function updateWebhookDelivery(id, fields) {
  const updates = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    updates.push(`${key} = ?`);
    params.push(val);
  }

  params.push(id);
  db.prepare(`UPDATE webhook_deliveries SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

function getDeliveryBySmsId(smsId) {
  return db.prepare('SELECT * FROM webhook_deliveries WHERE sms_id = ? ORDER BY id DESC LIMIT 1').get(smsId);
}

function getDeliveryById(id) {
  return db.prepare('SELECT * FROM webhook_deliveries WHERE id = ?').get(id);
}

function getPendingRetries() {
  const now = Date.now();
  return db.prepare(`
    SELECT d.*, m.sender, m.message, m.received_at
    FROM webhook_deliveries d
    JOIN sms_messages m ON m.id = d.sms_id
    WHERE d.status = 'RETRY_SCHEDULED' AND d.next_retry_at <= ? AND d.next_retry_at > 0
    LIMIT 20
  `).all(now);
}

function getRecentDeliveries({ limit = 50, offset = 0, status } = {}) {
  let query = `
    SELECT d.*, m.sender, m.message, m.received_at
    FROM webhook_deliveries d
    LEFT JOIN sms_messages m ON m.id = d.sms_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND d.status = ?';
    params.push(status);
  }

  query += ' ORDER BY d.id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

// Retention: Automatically delete messages older than 48 hours
function cleanupOldData(retentionHours = 48) {
  const cutoff = Date.now() - (retentionHours * 60 * 60 * 1000);
  
  const oldMessages = db.prepare('SELECT id FROM sms_messages WHERE received_timestamp < ?').all(cutoff);
  if (oldMessages.length > 0) {
    const ids = oldMessages.map(m => m.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM webhook_deliveries WHERE sms_id IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM sms_messages WHERE id IN (${placeholders})`).run(...ids);
    console.log(`[RETENTION] Cleaned up ${oldMessages.length} SMS older than ${retentionHours} hours.`);
  }
}

function getTotalSmsCount() {
  const row = db.prepare('SELECT COUNT(*) as count FROM sms_messages').get();
  return row ? Number(row.count) : 0;
}

function getTotalDeliveriesCount(status = null) {
  if (status) {
    const row = db.prepare('SELECT COUNT(*) as count FROM webhook_deliveries WHERE status = ?').get(status);
    return row ? Number(row.count) : 0;
  }
  const row = db.prepare('SELECT COUNT(*) as count FROM webhook_deliveries').get();
  return row ? Number(row.count) : 0;
}

module.exports = {
  db,
  getSetting,
  setSetting,
  getAllSettings,
  upsertDevice,
  updateDeviceConfig,
  setDeviceOnlineStatus,
  getDevice,
  getAllDevices,
  isDuplicateSms,
  saveIncomingSms,
  getSmsById,
  getSmsList,
  getTotalSmsCount,
  createWebhookDelivery,
  updateWebhookDelivery,
  getDeliveryBySmsId,
  getDeliveryById,
  getPendingRetries,
  getRecentDeliveries,
  getTotalDeliveriesCount,
  cleanupOldData
};
