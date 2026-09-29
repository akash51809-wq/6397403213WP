const crypto = require('crypto');
const SessionAuth = require('./models/SessionAuth');
const { initAuthCreds } = require('@whiskeysockets/baileys');

const BufferJSON = {
  replacer: (k, v) => (Buffer.isBuffer(v) ? { type: 'Buffer', data: v.toString('base64') } : v),
  reviver: (k, v) => (v && typeof v === 'object' && v.type === 'Buffer' ? Buffer.from(v.data, 'base64') : v),
};

let cachedCandidateKeys = null;
let lastEnvSignature = null;
const SALT = 'wa_session_auth_salt_v1';

function normalizeSecret(val) {
  if (!val) return '';
  let str = String(val).trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1);
  }
  return str;
}

function deriveKey(secret) {
  return crypto.scryptSync(secret, SALT, 32);
}

// Hardened candidate keys derivation: strictly from environment variables
function getCandidateKeys() {
  const isProd = process.env.NODE_ENV === 'production';
  const primaryRaw = process.env.SESSION_ENCRYPTION_KEY || process.env.WHATSAPP_SESSION_ENCRYPTION_KEY;
  let primary = normalizeSecret(primaryRaw);

  if (isProd) {
    if (!primary || primary.length < 16) {
      const errMsg = 'FATAL: SESSION_ENCRYPTION_KEY is required in production and must be at least 16 characters long. Refusing to run with insecure fallback.';
      console.error(`[SessionAuth] ${errMsg}`);
      throw new Error(errMsg);
    }
  } else {
    // Non-production fallback (development/test only)
    if (!primary || primary.length < 16) {
      primary = normalizeSecret(process.env.AUTH_SECRET);
      if (!primary || primary.length < 16) {
        primary = 'dev_env_session_key_' + (process.env.PORT || '10000');
      }
    }
  }

  const authSecret = normalizeSecret(process.env.AUTH_SECRET);
  const dbUri = normalizeSecret(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.MONGO_URI);

  const envSig = `${primary}||${authSecret}||${dbUri}`;
  if (cachedCandidateKeys && lastEnvSignature === envSig) {
    return cachedCandidateKeys;
  }

  const candidates = [];
  const seenSecrets = new Set();

  // 1. Primary candidate (SESSION_ENCRYPTION_KEY)
  candidates.push({
    label: 'primary',
    key: deriveKey(primary)
  });
  seenSecrets.add(primary);

  // 2. Fallback candidate: AUTH_SECRET (if defined and >= 16 chars)
  if (authSecret && authSecret.length >= 16 && !seenSecrets.has(authSecret)) {
    candidates.push({
      label: 'AUTH_SECRET',
      key: deriveKey(authSecret)
    });
    seenSecrets.add(authSecret);
  }

  // 3. Fallback candidate: DB URI (if defined and >= 16 chars)
  if (dbUri && dbUri.length >= 16 && !seenSecrets.has(dbUri)) {
    candidates.push({
      label: 'DB_URI',
      key: deriveKey(dbUri)
    });
    seenSecrets.add(dbUri);
  }

  cachedCandidateKeys = candidates;
  lastEnvSignature = envSig;
  return candidates;
}

// Derive 32-byte key for AES-256-GCM encryption using primary key
function getEncryptionKey() {
  const candidates = getCandidateKeys();
  return candidates[0].key;
}

function encryptPayload(plaintext) {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
      encrypted: true,
      iv: iv.toString('hex'),
      tag: authTag,
      data: encrypted
    };
  } catch (err) {
    console.error('[SessionAuth] Encryption error:', err.message);
    throw err;
  }
}

// In-memory multi-key decryption: strictly read-only, NO DB writes
function decryptPayload(payload) {
  try {
    if (!payload || !payload.encrypted || !payload.iv || !payload.tag || !payload.data) {
      return null;
    }
    const candidates = getCandidateKeys();
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.tag, 'hex');

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', candidate.key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(payload.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        if (i > 0) {
          console.log(`[SessionAuth] Successfully decrypted record with legacy key candidate: ${candidate.label}`);
        }
        return decrypted;
      } catch (err) {
        // Tag verification failed for this candidate, try next
      }
    }

    console.error('[SessionAuth] Decryption error: Unsupported state or unable to authenticate data with any known candidate key.');
    return null;
  } catch (err) {
    console.error('[SessionAuth] Decryption error:', err.message);
    return null;
  }
}

function isEncryptedPayload(payload) {
  return Boolean(payload && typeof payload === 'object' && payload.encrypted === true && payload.iv && payload.tag && payload.data);
}

async function usePgAuthState(sessionId) {
  const writeData = async (data, file) => {
    try {
      const key = `${sessionId}_${file}`;
      const jsonString = JSON.stringify(data, BufferJSON.replacer);
      // Encrypt sensitive WhatsApp credentials before saving to PostgreSQL
      const encryptedRecord = encryptPayload(jsonString);
      await SessionAuth.findOneAndUpdate(
        { id: key },
        { data: encryptedRecord },
        { upsert: true }
      );
    } catch (e) {
      console.error(`[SessionAuth] Error writing ${file}:`, e.message);
    }
  };

  const readData = async (file) => {
    try {
      const key = `${sessionId}_${file}`;
      const result = await SessionAuth.findOne({ id: key });
      if (!result || !result.data) return null;

      // Handle encrypted payload
      if (result.data.encrypted === true) {
        const decryptedJson = decryptPayload(result.data);
        if (!decryptedJson) {
          throw new Error(`Failed to decrypt ${key} with any candidate key`);
        }
        return JSON.parse(decryptedJson, BufferJSON.reviver);
      }

      // If unencrypted record encountered:
      const jsonString = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
      const parsed = JSON.parse(jsonString, BufferJSON.reviver);

      // In production, do NOT silently accept unencrypted credentials!
      // Immediately migrate & encrypt the record into the database!
      try {
        const encryptedRecord = encryptPayload(jsonString);
        await SessionAuth.updateOne(
          { id: key },
          { $set: { data: encryptedRecord } }
        );
        console.warn(`[SessionAuth Security Audit] Auto-migrated and encrypted unencrypted credential '${key}'.`);
      } catch (migErr) {
        if (process.env.NODE_ENV === 'production') {
          console.error(`[SessionAuth Security] Failed to securely migrate unencrypted credential '${key}':`, migErr.message);
          throw new Error(`Insecure WhatsApp credential format rejected in production for ${key}`);
        }
      }

      return parsed;
    } catch (error) {
      if (file === 'creds.json') {
        throw error;
      }
      return null;
    }
  };

  const removeData = async (file) => {
    try {
      const key = `${sessionId}_${file}`;
      await SessionAuth.deleteOne({ id: key });
    } catch (error) {}
  };

  const normalizedSessionId = String(sessionId || '').trim();
  const isInvalidAdminUserSession = /^user-admin$/i.test(normalizedSessionId);
  if (isInvalidAdminUserSession) {
    const msg = `FATAL: Invalid Admin user session detected (sessionId='${sessionId}'). Admin must use canonical sessionId='admin'. Rejecting to prevent initAuthCreds() or credential pollution.`;
    console.error(`[SessionAuth] ${msg}`);
    throw new Error(msg);
  }

  const isAdmin = (sessionId === 'admin');
  const credsKey = `${sessionId}_creds.json`;

  // Verify whether SessionAuth contains existing credentials for this session
  let hasExistingCreds = false;
  try {
    hasExistingCreds = Boolean(await SessionAuth.exists({ id: credsKey }));
  } catch (err) {
    if (isAdmin) hasExistingCreds = true; // Err on the side of safety for Admin
  }

  // Read creds with bounded retry logic
  const retryDelays = [250, 500, 1000, 2000, 4000];
  let creds = null;
  let lastReadError = null;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      creds = await readData('creds.json');
      if (creds && (creds.me || !hasExistingCreds)) {
        break;
      }
      if (creds && isAdmin && creds.me) {
        break;
      }
      if (!hasExistingCreds && !isAdmin) {
        break;
      }
    } catch (err) {
      lastReadError = err;
      console.warn(`[SessionAuth] Attempt ${attempt + 1}/${retryDelays.length + 1} read ${credsKey} failed:`, err.message);
    }

    if (attempt < retryDelays.length && (hasExistingCreds || isAdmin)) {
      const delay = retryDelays[attempt];
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  if (!creds || !creds.me) {
    if (hasExistingCreds && isAdmin) {
      console.warn(`[SessionAuth] Existing Admin WhatsApp credentials (${credsKey}) incomplete or invalid. Initializing fresh credentials for QR pairing.`);
    }
    creds = initAuthCreds();
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              try {
                let value = await readData(`${type}-${id}.json`);
                data[id] = value;
              } catch (e) {
                data[id] = null;
              }
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const file = `${category}-${id}.json`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds.json'),
  };
}

async function migrateUnencryptedSessionAuth() {
  try {
    const unencryptedRecords = await SessionAuth.find({
      $or: [
        { 'data.encrypted': { $ne: true } },
        { 'data.encrypted': null }
      ]
    }).lean();

    if (!Array.isArray(unencryptedRecords) || unencryptedRecords.length === 0) {
      return 0;
    }

    console.log(`[SessionAuth Security] Found ${unencryptedRecords.length} unencrypted session credential records. Beginning safe encryption migration...`);
    let migratedCount = 0;

    for (const record of unencryptedRecords) {
      if (!record || !record.id || !record.data) continue;
      if (record.data.encrypted === true && record.data.iv && record.data.tag) continue;

      const jsonString = typeof record.data === 'string' ? record.data : JSON.stringify(record.data);
      const encryptedPayload = encryptPayload(jsonString);

      await SessionAuth.updateOne(
        { id: record.id },
        { $set: { data: encryptedPayload } }
      );
      migratedCount++;
    }

    if (migratedCount > 0) {
      console.log(`[SessionAuth Security] Successfully migrated and encrypted ${migratedCount} session credential records.`);
    }
    return migratedCount;
  } catch (err) {
    console.error('[SessionAuth Security] Error during credential encryption migration:', err.message);
    return 0;
  }
}

module.exports = { 
  usePgAuthState,
  useMongoAuthState: usePgAuthState, // Alias for backwards compatibility
  encryptPayload,
  decryptPayload,
  encryptData: encryptPayload,
  decryptData: decryptPayload,
  encryptSessionData: encryptPayload,
  decryptSessionData: decryptPayload,
  isEncryptedPayload,
  migrateUnencryptedSessionAuth
};
