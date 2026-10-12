const crypto = require('crypto');

/**
 * Derives a 32-byte (256-bit) encryption key from the API key using SHA-256.
 * @param {string} apiKey 
 * @returns {Buffer} 32-byte Buffer
 */
function deriveKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Valid apiKey string is required for key derivation.');
  }
  return crypto.createHash('sha256').update(apiKey, 'utf8').digest();
}

/**
 * Formats a timestamp into Indian Standard Time (IST, UTC+5:30)
 * in 'YYYY-MM-DD HH:mm:ss' format.
 * @param {number|Date} dateInput 
 * @returns {string} e.g. "2026-10-10 19:55:00"
 */
function formatISTDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utc + istOffset);

  const pad = (n) => String(n).padStart(2, '0');
  const year = istDate.getFullYear();
  const month = pad(istDate.getMonth() + 1);
  const day = pad(istDate.getDate());
  const hours = pad(istDate.getHours());
  const minutes = pad(istDate.getMinutes());
  const seconds = pad(istDate.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Encrypts a JavaScript object using AES-256-GCM.
 * Format: 12-byte IV + Ciphertext + 16-byte Auth Tag -> Base64
 */
function encryptPayload(payloadObject, apiKey) {
  const key = deriveKey(apiKey);
  const iv = crypto.randomBytes(12);
  const jsonString = JSON.stringify(payloadObject);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(jsonString, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  if (authTag.length !== 16) {
    throw new Error('Authentication tag length is not 16 bytes.');
  }

  const combined = Buffer.concat([iv, ciphertext, authTag]);
  return combined.toString('base64');
}

/**
 * Decrypts a Base64 encoded AES-256-GCM payload.
 */
function decryptPayload(base64String, apiKey) {
  const key = deriveKey(apiKey);
  const combined = Buffer.from(base64String, 'base64');

  if (combined.length < 28) {
    throw new Error('Invalid payload length: Must be at least 28 bytes (12 IV + 16 Tag).');
  }

  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(12, combined.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString('utf8');

  return JSON.parse(decrypted);
}

module.exports = {
  deriveKey,
  formatISTDate,
  encryptPayload,
  decryptPayload
};
