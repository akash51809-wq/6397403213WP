const crypto = require('crypto');
const SessionAuth = require('./models/SessionAuth');
const { initAuthCreds } = require('@whiskeysockets/baileys');
const { query } = require('./db');

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

const sessionCaches = new Map();

function getSessionCache(sessionId) {
  if (!sessionCaches.has(sessionId)) {
    sessionCaches.set(sessionId, new Map());
  }
  return sessionCaches.get(sessionId);
}

function clearSessionCache(sessionId) {
  if (sessionId) {
    sessionCaches.delete(sessionId);
  } else {
    sessionCaches.clear();
  }
}

async function usePgAuthState(sessionId) {
  const normalizedSessionId = String(sessionId || '').trim();
  const isInvalidAdminUserSession = /^user-admin$/i.test(normalizedSessionId);
  if (isInvalidAdminUserSession) {
    const msg = `FATAL: Invalid Admin user session detected (sessionId='${sessionId}'). Admin must use canonical sessionId='admin'. Rejecting to prevent initAuthCreds() or credential pollution.`;
    console.error(`[SessionAuth] ${msg}`);
    throw new Error(msg);
  }

  const sessionCache = getSessionCache(normalizedSessionId);

  const writeData = async (data, file) => {
    const key = `${normalizedSessionId}_${file}`;
    try {
      const jsonString = JSON.stringify(data, BufferJSON.replacer);
      const encryptedRecord = encryptPayload(jsonString);
      await query(
        `INSERT INTO session_auth ("id", "data") VALUES ($1, $2)
         ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data"`,
        [key, JSON.stringify(encryptedRecord)]
      );
      sessionCache.set(key, data);
    } catch (e) {
      sessionCache.delete(key);
      console.error(`[SessionAuth] Error writing ${file}:`, e.message);
      throw new Error(`[SessionAuth] Failed to persist ${file}: ${e.message}`);
    }
  };

  const readData = async (file) => {
    const key = `${normalizedSessionId}_${file}`;
    if (sessionCache.has(key)) {
      return sessionCache.get(key);
    }
    const res = await query(
      `SELECT "data" FROM session_auth WHERE "id" = $1 LIMIT 1`,
      [key]
    );
    if (!res.rows || res.rows.length === 0 || !res.rows[0].data) {
      return null;
    }
    const rawData = res.rows[0].data;
    let parsed = null;
    if (rawData.encrypted === true) {
      const decryptedJson = decryptPayload(rawData);
      if (!decryptedJson) {
        throw new Error(`Failed to decrypt ${key} with any candidate key`);
      }
      parsed = JSON.parse(decryptedJson, BufferJSON.reviver);
    } else {
      const jsonString = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
      parsed = JSON.parse(jsonString, BufferJSON.reviver);
      try {
        const encryptedRecord = encryptPayload(jsonString);
        await query(
          `UPDATE session_auth SET "data" = $1 WHERE "id" = $2`,
          [JSON.stringify(encryptedRecord), key]
        );
      } catch (migErr) {}
    }
    sessionCache.set(key, parsed);
    return parsed;
  };

  const removeData = async (file) => {
    const key = `${normalizedSessionId}_${file}`;
    sessionCache.delete(key);
    try {
      await query(`DELETE FROM session_auth WHERE "id" = $1`, [key]);
    } catch (error) {
      console.warn(`[SessionAuth] Warning deleting ${file}:`, error.message);
    }
  };

  const credsKey = `${normalizedSessionId}_creds.json`;

  // Read creds from database or initialize fresh
  let creds = null;
  try {
    creds = await readData('creds.json');
  } catch (err) {
    console.error(`[SessionAuth] Database error reading credentials for ${normalizedSessionId}:`, err.message);
    throw new Error(`[SessionAuth] Failed to load session credentials from PostgreSQL: ${err.message}`);
  }

  if (!creds) {
    console.log(`[SessionAuth] Initializing fresh credentials for session: ${normalizedSessionId}`);
    creds = initAuthCreds();
    await writeData(creds, 'creds.json');
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          if (!Array.isArray(ids) || ids.length === 0) return data;

          const missingIds = [];
          for (const id of ids) {
            const key = `${normalizedSessionId}_${type}-${id}.json`;
            if (sessionCache.has(key)) {
              data[id] = sessionCache.get(key);
            } else {
              missingIds.push(id);
            }
          }

          if (missingIds.length === 0) return data;

          try {
            const fullKeys = missingIds.map(id => `${normalizedSessionId}_${type}-${id}.json`);
            const res = await query(
              `SELECT "id", "data" FROM session_auth WHERE "id" = ANY($1)`,
              [fullKeys]
            );
            const resultMap = new Map();
            for (const row of (res.rows || [])) {
              try {
                let parsed = null;
                if (row.data && row.data.encrypted === true) {
                  const dec = decryptPayload(row.data);
                  if (dec) parsed = JSON.parse(dec, BufferJSON.reviver);
                } else if (row.data) {
                  const str = typeof row.data === 'string' ? row.data : JSON.stringify(row.data);
                  parsed = JSON.parse(str, BufferJSON.reviver);
                }
                resultMap.set(row.id, parsed);
                sessionCache.set(row.id, parsed);
              } catch (e) {
                resultMap.set(row.id, null);
              }
            }
            for (const id of missingIds) {
              const key = `${normalizedSessionId}_${type}-${id}.json`;
              const val = resultMap.has(key) ? resultMap.get(key) : null;
              data[id] = val;
              if (val === null) sessionCache.set(key, null);
            }
          } catch (batchErr) {
            console.error(`[SessionAuth] Batch get error for ${type}:`, batchErr.message);
            for (const id of missingIds) {
              data[id] = null;
            }
          }

          return data;
        },
        set: async (data) => {
          const writes = [];
          const deletes = [];

          for (const category of Object.keys(data)) {
            for (const id of Object.keys(data[category])) {
              const value = data[category][id];
              const key = `${normalizedSessionId}_${category}-${id}.json`;
              if (value) {
                const jsonString = JSON.stringify(value, BufferJSON.replacer);
                const encryptedRecord = encryptPayload(jsonString);
                writes.push({ id: key, data: JSON.stringify(encryptedRecord), value });
              } else {
                deletes.push(key);
              }
            }
          }

          if (deletes.length > 0) {
            try {
              await query(`DELETE FROM session_auth WHERE "id" = ANY($1)`, [deletes]);
              for (const k of deletes) {
                sessionCache.delete(k);
              }
            } catch (delErr) {
              console.error('[SessionAuth] Batch delete error:', delErr.message);
              throw new Error(`[SessionAuth] Batch delete failed: ${delErr.message}`);
            }
          }

          if (writes.length > 0) {
            const CHUNK_SIZE = 50;
            for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
              const chunk = writes.slice(i, i + CHUNK_SIZE);
              const ids = chunk.map(w => w.id);
              const payloads = chunk.map(w => w.data);
              try {
                await query(
                  `INSERT INTO session_auth ("id", "data")
                   SELECT unnest($1::text[]), unnest($2::jsonb[])
                   ON CONFLICT ("id") DO UPDATE SET "data" = EXCLUDED."data"`,
                  [ids, payloads]
                );
                for (const item of chunk) {
                  sessionCache.set(item.id, item.value);
                }
              } catch (writeErr) {
                for (const item of chunk) {
                  sessionCache.delete(item.id);
                }
                console.error('[SessionAuth] Batch write error:', writeErr.message);
                throw new Error(`[SessionAuth] Batch write failed: ${writeErr.message}`);
              }
            }
          }
        },
      },
    },
    saveCreds: () => writeData(creds, 'creds.json'),
  };
}

async function migrateUnencryptedSessionAuth() {
  try {
    const allRecords = await SessionAuth.find({}).lean();
    if (!Array.isArray(allRecords) || allRecords.length === 0) {
      return 0;
    }

    const unencryptedRecords = allRecords.filter(record => {
      if (!record || !record.id || !record.data) return false;
      const d = record.data;
      return !(d && d.encrypted === true && d.iv && d.tag);
    });

    if (unencryptedRecords.length === 0) {
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
  clearSessionCache,
  encryptPayload,
  decryptPayload,
  encryptData: encryptPayload,
  decryptData: decryptPayload,
  encryptSessionData: encryptPayload,
  decryptSessionData: decryptPayload,
  isEncryptedPayload,
  migrateUnencryptedSessionAuth
};
