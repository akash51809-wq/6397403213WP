const { Pool } = require('pg');
const EventEmitter = require('events');

class DatabaseConnection extends EventEmitter {
  constructor() {
    super();
    this.pool = null;
    this.readyState = 0; // 0: disconnected, 1: connected, 2: connecting
  }
}

const connection = new DatabaseConnection();

function getConnectionString() {
  const envUrl = process.env.DATABASE_URL || 
                 process.env.POSTGRES_URL || 
                 process.env.PGURI || 
                 process.env.PG_URI;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }

  // Fallback to individual connection variables if set
  if (process.env.PGHOST && process.env.PGDATABASE) {
    const user = process.env.PGUSER || 'postgres';
    const password = process.env.PGPASSWORD ? `:${encodeURIComponent(process.env.PGPASSWORD)}` : '';
    const host = process.env.PGHOST;
    const port = process.env.PGPORT || 5432;
    const db = process.env.PGDATABASE;
    return `postgresql://${user}${password}@${host}:${port}/${db}`;
  }

  return '';
}

function shouldEnableSSL(connectionString) {
  if (process.env.PGSSLMODE === 'disable') return false;
  if (process.env.PGSSL === 'true') return true;
  
  // Render PostgreSQL requires SSL (usually rejectUnauthorized: false)
  const isRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (connectionString) {
    const lower = connectionString.toLowerCase();
    if (lower.includes('localhost') || lower.includes('127.0.0.1')) {
      return false;
    }
    if (lower.includes('sslmode=disable')) {
      return false;
    }
    if (lower.includes('sslmode=require') || lower.includes('render.com')) {
      return true;
    }
  }

  return isRender || isProduction;
}

async function connectPostgres(customUri = null) {
  const connStr = (customUri || getConnectionString()).trim();
  if (!connStr) {
    throw new Error('DATABASE_URL is not set. Please provide a valid PostgreSQL connection string.');
  }

  connection.readyState = 2; // connecting
  const useSSL = shouldEnableSSL(connStr);

  const config = {
    connectionString: connStr,
    max: Number(process.env.PG_MAX_POOL || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };

  if (useSSL) {
    config.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected pool error:', err.message);
    connection.emit('error', err);
  });

  // Verify connection by running SELECT 1
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  connection.pool = pool;
  connection.readyState = 1; // connected
  console.log('[PostgreSQL] Connected successfully to database');
  
  // Initialize all tables automatically
  await initTables(pool);

  connection.emit('connected');
  connection.emit('open');

  return pool;
}

async function query(text, params) {
  if (!connection.pool) {
    throw new Error('[PostgreSQL] Database not connected. Call connectPostgres() first.');
  }
  return connection.pool.query(text, params);
}

// Automatically create tables and indexes if they do not exist
async function initTables(pool) {
  console.log('[PostgreSQL] Initializing tables if not existing...');
  const statements = [
    // 1. users
    `CREATE TABLE IF NOT EXISTS users (
      "userId" VARCHAR(100) PRIMARY KEY,
      "username" VARCHAR(100) UNIQUE NOT NULL,
      "name" TEXT DEFAULT '',
      "mobile" VARCHAR(30) UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "apiToken" VARCHAR(100) UNIQUE,
      "apiTokenHash" VARCHAR(128) UNIQUE,
      "apiTokenPrefix" VARCHAR(20),
      "apiTokenLast4" VARCHAR(10),
      "role" VARCHAR(20) DEFAULT 'user',
      "plan" VARCHAR(50) DEFAULT 'Standard',
      "planExpiresAt" TIMESTAMPTZ,
      "status" VARCHAR(20) DEFAULT 'active',
      "sessions" JSONB DEFAULT '[]'::jsonb,
      "autoSendImage" JSONB DEFAULT '{"enabled":false,"imageUrl":"","fileName":""}'::jsonb,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "apiTokenHash" VARCHAR(128) UNIQUE;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "apiTokenPrefix" VARCHAR(20);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "apiTokenLast4" VARCHAR(10);`,
    `CREATE INDEX IF NOT EXISTS idx_users_username ON users("username");`,
    `CREATE INDEX IF NOT EXISTS idx_users_mobile ON users("mobile");`,
    `CREATE INDEX IF NOT EXISTS idx_users_apiToken ON users("apiToken");`,
    `CREATE INDEX IF NOT EXISTS idx_users_apiTokenHash ON users("apiTokenHash");`,
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users("role");`,

    // 2. otps
    `CREATE TABLE IF NOT EXISTS otps (
      "id" SERIAL PRIMARY KEY,
      "mobile" VARCHAR(30) NOT NULL,
      "otpHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "lastSentAt" TIMESTAMPTZ DEFAULT NOW(),
      "attempts" INT DEFAULT 0,
      "verified" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_otps_mobile ON otps("mobile");`,
    `CREATE INDEX IF NOT EXISTS idx_otps_expiresAt ON otps("expiresAt");`,

    // 3. whatsapp_sessions
    `CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      "sessionId" VARCHAR(100) PRIMARY KEY,
      "ownerUserId" VARCHAR(100),
      "phone" VARCHAR(50),
      "role" VARCHAR(20) DEFAULT 'admin',
      "authPath" TEXT,
      "status" VARCHAR(50) DEFAULT 'waiting',
      "lastConnectedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_wa_sessions_ownerUserId ON whatsapp_sessions("ownerUserId");`,

    // 4. plans
    `CREATE TABLE IF NOT EXISTS plans (
      "planId" VARCHAR(100) PRIMARY KEY,
      "name" VARCHAR(100) NOT NULL,
      "price" NUMERIC NOT NULL,
      "currency" VARCHAR(10) DEFAULT 'INR',
      "description" TEXT DEFAULT '',
      "dailyLimit" VARCHAR(50) DEFAULT '500/Day',
      "validity" VARCHAR(50) DEFAULT '30 Days',
      "validityDays" INT DEFAULT 30,
      "deviceLimit" VARCHAR(50) DEFAULT '1 Free + 1 Add-on',
      "apiAccess" BOOLEAN DEFAULT FALSE,
      "webAccess" BOOLEAN DEFAULT TRUE,
      "bulkMsg" BOOLEAN DEFAULT FALSE,
      "groupOption" BOOLEAN DEFAULT FALSE,
      "scheduleMsg" BOOLEAN DEFAULT FALSE,
      "ipSecurity" BOOLEAN DEFAULT FALSE,
      "headerColor" VARCHAR(30) DEFAULT '#705ec8',
      "badgeText" VARCHAR(50) DEFAULT '',
      "active" BOOLEAN DEFAULT TRUE,
      "sortOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );`,

    // 5. plan_purchase_requests
    `CREATE TABLE IF NOT EXISTS plan_purchase_requests (
      "requestId" VARCHAR(100) PRIMARY KEY,
      "userId" VARCHAR(100) NOT NULL,
      "userName" TEXT DEFAULT '',
      "userMobile" VARCHAR(50) DEFAULT '',
      "planId" VARCHAR(100) NOT NULL,
      "planName" VARCHAR(100) NOT NULL,
      "amount" NUMERIC NOT NULL,
      "paymentDate" VARCHAR(50),
      "bankDetails" TEXT NOT NULL,
      "screenshot" TEXT DEFAULT '',
      "status" VARCHAR(30) DEFAULT 'pending',
      "adminNotes" TEXT DEFAULT '',
      "approvedAt" TIMESTAMPTZ,
      "rejectedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_ppr_userId ON plan_purchase_requests("userId");`,
    `CREATE INDEX IF NOT EXISTS idx_ppr_status ON plan_purchase_requests("status");`,

    // 6. company_settings
    `CREATE TABLE IF NOT EXISTS company_settings (
      "key" VARCHAR(50) PRIMARY KEY DEFAULT 'company',
      "companyName" TEXT DEFAULT '',
      "faviconUrl" TEXT DEFAULT '',
      "logoUrl" TEXT DEFAULT '',
      "bannerUrl" TEXT DEFAULT '',
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT DEFAULT '';`,


    // 7. session_auth (Baileys WhatsApp multi-session auth creds & keys)
    `CREATE TABLE IF NOT EXISTS session_auth (
      "id" VARCHAR(255) PRIMARY KEY,
      "data" JSONB NOT NULL
    );`,

    // 8. api_settings
    `CREATE TABLE IF NOT EXISTS api_settings (
      "key" VARCHAR(50) PRIMARY KEY DEFAULT 'default',
      "token" VARCHAR(100) DEFAULT '',
      "isEnabled" BOOLEAN DEFAULT TRUE,
      "webhookUrl" TEXT DEFAULT '',
      "webhookEnabled" BOOLEAN DEFAULT FALSE,
      "totalSent" INT DEFAULT 0,
      "lastUsed" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );`,

    // 9. contacts
    `CREATE TABLE IF NOT EXISTS contacts (
      "id" VARCHAR(255) PRIMARY KEY,
      "name" TEXT,
      "notify" TEXT,
      "verifiedName" TEXT,
      "phone" VARCHAR(50),
      "lid" VARCHAR(100),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts("phone");`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_lid ON contacts("lid");`,

    // 10. incoming_messages
    `CREATE TABLE IF NOT EXISTS incoming_messages (
      "id" VARCHAR(255) PRIMARY KEY,
      "chatJid" VARCHAR(100) NOT NULL,
      "ownerUserId" VARCHAR(100),
      "from" VARCHAR(100) DEFAULT '',
      "fromMe" BOOLEAN DEFAULT FALSE,
      "message" TEXT DEFAULT '',
      "mediaType" VARCHAR(50),
      "mediaUrl" TEXT,
      "fileName" TEXT,
      "date" TEXT,
      "timestamp" BIGINT,
      "isRead" BOOLEAN DEFAULT FALSE,
      "sessionPhone" VARCHAR(50),
      "isGroup" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_incoming_chatJid ON incoming_messages("chatJid");`,
    `CREATE INDEX IF NOT EXISTS idx_incoming_timestamp ON incoming_messages("timestamp");`,
    `CREATE INDEX IF NOT EXISTS idx_incoming_ownerUserId ON incoming_messages("ownerUserId");`,

    // 11. message_reports
    `CREATE TABLE IF NOT EXISTS message_reports (
      "id" VARCHAR(255) PRIMARY KEY,
      "date" TEXT NOT NULL,
      "ownerUserId" VARCHAR(100),
      "from" VARCHAR(100) DEFAULT '',
      "to" VARCHAR(100) DEFAULT '',
      "message" TEXT DEFAULT '',
      "status" VARCHAR(50) DEFAULT 'sent',
      "session" VARCHAR(100) DEFAULT '',
      "type" VARCHAR(50) DEFAULT 'text',
      "source" VARCHAR(50) DEFAULT 'web',
      "recipient" VARCHAR(100) DEFAULT '',
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_reports_date ON message_reports("date");`,
    `CREATE INDEX IF NOT EXISTS idx_reports_ownerUserId ON message_reports("ownerUserId");`,
    `CREATE INDEX IF NOT EXISTS idx_reports_status ON message_reports("status");`,
    `CREATE INDEX IF NOT EXISTS idx_reports_createdAt ON message_reports("createdAt");`
  ];

  for (const stmt of statements) {
    await pool.query(stmt);
  }
  console.log('[PostgreSQL] All tables and indexes are verified/created successfully.');

  // Migrate existing plain text API tokens to secure SHA-256 hashes
  try {
    const crypto = require('crypto');
    const existingTokens = await pool.query(
      `SELECT "userId", "apiToken" FROM users WHERE "apiToken" IS NOT NULL AND "apiToken" != '' AND ("apiTokenHash" IS NULL OR "apiTokenHash" = '')`
    );
    if (existingTokens.rows && existingTokens.rows.length > 0) {
      console.log(`[Security Migration] Migrating ${existingTokens.rows.length} plaintext API tokens to secure SHA-256 hashes...`);
      for (const row of existingTokens.rows) {
        const token = row.apiToken;
        const hash = crypto.createHash('sha256').update(String(token)).digest('hex');
        const prefix = String(token).slice(0, 7);
        const last4 = String(token).slice(-4);
        await pool.query(
          `UPDATE users SET "apiTokenHash" = $1, "apiTokenPrefix" = $2, "apiTokenLast4" = $3, "apiToken" = NULL WHERE "userId" = $4`,
          [hash, prefix, last4, row.userId]
        );
      }
      console.log(`[Security Migration] API tokens successfully migrated to hash format.`);
    }
  } catch (migErr) {
    console.warn('[Security Migration] API token migration notice:', migErr.message);
  }
}

/* ==========================================================================
   MODEL HELPER: Translates MongoDB / Mongoose semantics to PostgreSQL
   Provides find, findOne, create, updateOne, findOneAndUpdate,
   findOneAndDelete, deleteOne, deleteMany, countDocuments, exists, bulkWrite
   ========================================================================== */

function parseFilter(filter, paramOffset = 1, jsonCols = []) {
  if (!filter || Object.keys(filter).length === 0) {
    return { clause: '1=1', params: [] };
  }

  const conditions = [];
  const params = [];
  let pIdx = paramOffset;

  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(value)) {
      const orClauses = [];
      for (const subFilter of value) {
        const sub = parseFilter(subFilter, pIdx, jsonCols);
        orClauses.push(`(${sub.clause})`);
        params.push(...sub.params);
        pIdx += sub.params.length;
      }
      if (orClauses.length > 0) {
        conditions.push(`(${orClauses.join(' OR ')})`);
      }
      continue;
    }

    if (key === '$and' && Array.isArray(value)) {
      const andClauses = [];
      for (const subFilter of value) {
        const sub = parseFilter(subFilter, pIdx, jsonCols);
        andClauses.push(`(${sub.clause})`);
        params.push(...sub.params);
        pIdx += sub.params.length;
      }
      if (andClauses.length > 0) {
        conditions.push(`(${andClauses.join(' AND ')})`);
      }
      continue;
    }

    // Handle nested json array condition like 'sessions.tokenHash'
    if (key.includes('.')) {
      const [col, subProp] = key.split('.');
      if (col === 'sessions') {
        conditions.push(`("sessions" IS NOT NULL AND jsonb_typeof("sessions") = 'array' AND EXISTS (SELECT 1 FROM jsonb_array_elements("sessions") elem WHERE elem->>'${subProp}' = $${pIdx}))`);
        params.push(String(value));
        pIdx++;
        continue;
      }
    }

    const colName = `"${key}"`;

    if (value instanceof RegExp) {
      const isCaseInsensitive = value.flags.includes('i');
      conditions.push(`${colName} ${isCaseInsensitive ? '~*' : '~'} $${pIdx}`);
      params.push(value.source);
      pIdx++;
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [op, opVal] of Object.entries(value)) {
        if (op === '$ne') {
          if (opVal === null) {
            conditions.push(`${colName} IS NOT NULL`);
          } else {
            conditions.push(`(${colName} IS NULL OR ${colName} != $${pIdx})`);
            params.push(opVal);
            pIdx++;
          }
        } else if (op === '$eq') {
          if (opVal === null) {
            conditions.push(`${colName} IS NULL`);
          } else {
            conditions.push(`${colName} = $${pIdx}`);
            params.push(opVal);
            pIdx++;
          }
        } else if (op === '$gt') {
          conditions.push(`${colName} > $${pIdx}`);
          params.push(opVal);
          pIdx++;
        } else if (op === '$gte') {
          conditions.push(`${colName} >= $${pIdx}`);
          params.push(opVal);
          pIdx++;
        } else if (op === '$lt') {
          conditions.push(`${colName} < $${pIdx}`);
          params.push(opVal);
          pIdx++;
        } else if (op === '$lte') {
          conditions.push(`${colName} <= $${pIdx}`);
          params.push(opVal);
          pIdx++;
        } else if (op === '$in') {
          conditions.push(`${colName} = ANY($${pIdx})`);
          params.push(opVal);
          pIdx++;
        } else if (op === '$nin') {
          conditions.push(`${colName} != ALL($${pIdx})`);
          params.push(opVal);
          pIdx++;
        } else if (op === '$regex') {
          const regSource = opVal instanceof RegExp ? opVal.source : String(opVal);
          const flags = value.$options || (opVal instanceof RegExp ? opVal.flags : '');
          const isCaseInsensitive = flags.includes('i');
          conditions.push(`${colName} ${isCaseInsensitive ? '~*' : '~'} $${pIdx}`);
          params.push(regSource);
          pIdx++;
        }
      }
    } else if (value === null) {
      conditions.push(`${colName} IS NULL`);
    } else {
      conditions.push(`${colName} = $${pIdx}`);
      params.push(value);
      pIdx++;
    }
  }

  return {
    clause: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
    params
  };
}

function extractUpdateFields(update) {
  let setFields = {};
  let setOnInsertFields = {};

  if (!update || typeof update !== 'object') {
    return { setFields, setOnInsertFields };
  }

  if (update.$set || update.$setOnInsert) {
    if (update.$set && typeof update.$set === 'object') {
      Object.assign(setFields, update.$set);
    }
    if (update.$setOnInsert && typeof update.$setOnInsert === 'object') {
      Object.assign(setOnInsertFields, update.$setOnInsert);
    }
    for (const [k, v] of Object.entries(update)) {
      if (!k.startsWith('$')) {
        setFields[k] = v;
      }
    }
  } else {
    Object.assign(setFields, update);
  }

  // Remove any remaining operator keys
  for (const k of Object.keys(setFields)) {
    if (k.startsWith('$')) delete setFields[k];
  }
  for (const k of Object.keys(setOnInsertFields)) {
    if (k.startsWith('$')) delete setOnInsertFields[k];
  }

  return { setFields, setOnInsertFields };
}

function createModel(tableName, primaryKey, defaultFields = {}, jsonColumns = [], allowedColumns = []) {
  function wrapRow(row) {
    if (!row) return null;

    // Convert jsonb columns if they were strings, or ensure defaults
    for (const jc of jsonColumns) {
      if (typeof row[jc] === 'string') {
        try { row[jc] = JSON.parse(row[jc]); } catch (e) {}
      }
    }

    const doc = { ...row };

    // Provide save() method
    Object.defineProperty(doc, 'save', {
      enumerable: false,
      value: async function () {
        this.updatedAt = new Date();
        const pkVal = this[primaryKey];
        if (pkVal === undefined || pkVal === null) {
          const created = await Model.create(this);
          Object.assign(this, created);
          return this;
        }

        const cols = [];
        const vals = [];
        let idx = 1;

        for (const [k, v] of Object.entries(this)) {
          if (k === primaryKey || k.startsWith('$')) continue;
          if (allowedColumns.length > 0 && !allowedColumns.includes(k)) continue;

          cols.push(`"${k}" = $${idx}`);
          let val = v;
          if (jsonColumns.includes(k) && typeof val === 'object' && val !== null) {
            val = JSON.stringify(val);
          }
          vals.push(val);
          idx++;
        }

        if (cols.length === 0) return this;

        vals.push(pkVal);
        const sql = `UPDATE "${tableName}" SET ${cols.join(', ')} WHERE "${primaryKey}" = $${idx} RETURNING *`;
        const res = await query(sql, vals);
        if (res.rows && res.rows[0]) {
          Object.assign(this, wrapRow(res.rows[0]));
        }
        return this;
      }
    });

    return doc;
  }

  function toLean(row) {
    if (!row) return null;
    const obj = { ...row };
    for (const jc of jsonColumns) {
      if (typeof obj[jc] === 'string') {
        try { obj[jc] = JSON.parse(obj[jc]); } catch (e) {}
      }
    }
    return obj;
  }

  class QueryBuilder {
    constructor(filter, selectFields, single = false) {
      this._filter = filter || {};
      this._selectFields = selectFields;
      this._sort = null;
      this._limit = single ? 1 : null;
      this._offset = null;
      this._isLean = false;
      this._single = single;
    }

    sort(sortSpec) {
      this._sort = sortSpec;
      return this;
    }

    limit(limitNum) {
      this._limit = Number(limitNum);
      return this;
    }

    skip(offsetNum) {
      this._offset = Number(offsetNum);
      return this;
    }

    lean() {
      this._isLean = true;
      return this;
    }

    async exec() {
      const { clause, params } = parseFilter(this._filter, 1, jsonColumns);
      let sql = `SELECT * FROM "${tableName}" WHERE ${clause}`;

      if (this._sort) {
        const orderParts = [];
        if (typeof this._sort === 'string') {
          const parts = this._sort.split(' ').filter(Boolean);
          for (const p of parts) {
            if (p.startsWith('-')) orderParts.push(`"${p.slice(1)}" DESC`);
            else orderParts.push(`"${p}" ASC`);
          }
        } else if (typeof this._sort === 'object') {
          for (const [k, dir] of Object.entries(this._sort)) {
            orderParts.push(`"${k}" ${dir === -1 || dir === 'desc' ? 'DESC' : 'ASC'}`);
          }
        }
        if (orderParts.length > 0) {
          sql += ` ORDER BY ${orderParts.join(', ')}`;
        }
      }

      if (this._limit !== null && this._limit !== undefined) {
        sql += ` LIMIT ${this._limit}`;
      }
      if (this._offset !== null && this._offset !== undefined) {
        sql += ` OFFSET ${this._offset}`;
      }

      const res = await query(sql, params);
      const rows = res.rows || [];

      if (this._single) {
        if (rows.length === 0) return null;
        return this._isLean ? toLean(rows[0]) : wrapRow(rows[0]);
      }

      if (this._isLean) {
        return rows.map(r => toLean(r));
      }
      return rows.map(r => wrapRow(r));
    }

    then(resolve, reject) {
      return this.exec().then(resolve, reject);
    }

    catch(reject) {
      return this.exec().catch(reject);
    }
  }

  const Model = {
    tableName,
    primaryKey,

    find(filter = {}, projection = null) {
      return new QueryBuilder(filter, projection, false);
    },

    findOne(filter = {}, projection = null) {
      return new QueryBuilder(filter, projection, true);
    },

    async create(data) {
      if (Array.isArray(data)) {
        const results = [];
        for (const item of data) {
          results.push(await this.create(item));
        }
        return results;
      }

      const raw = { ...defaultFields, ...data };
      if (!raw.createdAt) raw.createdAt = new Date();
      if (!raw.updatedAt) raw.updatedAt = new Date();

      const cols = [];
      const placeholders = [];
      const values = [];
      let idx = 1;

      for (const [k, v] of Object.entries(raw)) {
        if (v === undefined || k.startsWith('$')) continue;
        if (allowedColumns.length > 0 && !allowedColumns.includes(k)) continue;

        cols.push(`"${k}"`);
        placeholders.push(`$${idx}`);
        let val = v;
        if (jsonColumns.includes(k) && typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        values.push(val);
        idx++;
      }

      if (cols.length === 0) return null;

      const sql = `INSERT INTO "${tableName}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const res = await query(sql, values);
      return wrapRow(res.rows[0]);
    },

    async updateOne(filter, update, options = {}) {
      const { setFields, setOnInsertFields } = extractUpdateFields(update);

      const existing = await this.findOne(filter);
      if (!existing) {
        if (options.upsert) {
          const cleanFilter = {};
          for (const [k, v] of Object.entries(filter)) {
            if (!k.startsWith('$') && (typeof v !== 'object' || v === null || v instanceof Date)) {
              cleanFilter[k] = v;
            }
          }
          const insertData = { ...cleanFilter, ...setOnInsertFields, ...setFields };
          return this.create(insertData);
        }
        return { modifiedCount: 0 };
      }

      const pkVal = existing[primaryKey];
      setFields.updatedAt = new Date();

      const cols = [];
      const vals = [];
      let idx = 1;

      for (const [k, v] of Object.entries(setFields)) {
        if (k === primaryKey || k.startsWith('$')) continue;
        if (allowedColumns.length > 0 && !allowedColumns.includes(k)) continue;

        cols.push(`"${k}" = $${idx}`);
        let val = v;
        if (jsonColumns.includes(k) && typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        vals.push(val);
        idx++;
      }

      if (cols.length === 0) {
        return { modifiedCount: 0 };
      }

      vals.push(pkVal);
      const sql = `UPDATE "${tableName}" SET ${cols.join(', ')} WHERE "${primaryKey}" = $${idx}`;
      await query(sql, vals);
      return { modifiedCount: 1 };
    },

    async findOneAndUpdate(filter, update, options = {}) {
      const { setFields, setOnInsertFields } = extractUpdateFields(update);

      const existing = await this.findOne(filter);
      if (!existing) {
        if (options.upsert) {
          const cleanFilter = {};
          for (const [k, v] of Object.entries(filter)) {
            if (!k.startsWith('$') && (typeof v !== 'object' || v === null || v instanceof Date)) {
              cleanFilter[k] = v;
            }
          }
          const insertData = { ...cleanFilter, ...setOnInsertFields, ...setFields };
          return this.create(insertData);
        }
        return null;
      }

      const pkVal = existing[primaryKey];
      setFields.updatedAt = new Date();

      const cols = [];
      const vals = [];
      let idx = 1;

      for (const [k, v] of Object.entries(setFields)) {
        if (k === primaryKey || k.startsWith('$')) continue;
        if (allowedColumns.length > 0 && !allowedColumns.includes(k)) continue;

        cols.push(`"${k}" = $${idx}`);
        let val = v;
        if (jsonColumns.includes(k) && typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        vals.push(val);
        idx++;
      }

      if (cols.length === 0) {
        return existing;
      }

      vals.push(pkVal);
      const sql = `UPDATE "${tableName}" SET ${cols.join(', ')} WHERE "${primaryKey}" = $${idx} RETURNING *`;
      const res = await query(sql, vals);
      return wrapRow(res.rows[0]);
    },

    async findOneAndDelete(filter) {
      const doc = await this.findOne(filter);
      if (!doc) return null;
      await this.deleteOne(filter);
      return doc;
    },

    async deleteOne(filter) {
      const { clause, params } = parseFilter(filter, 1, jsonColumns);
      const sql = `DELETE FROM "${tableName}" WHERE "${primaryKey}" IN (SELECT "${primaryKey}" FROM "${tableName}" WHERE ${clause} LIMIT 1)`;
      const res = await query(sql, params);
      return { deletedCount: res.rowCount };
    },

    async deleteMany(filter = {}) {
      const { clause, params } = parseFilter(filter, 1, jsonColumns);
      const sql = `DELETE FROM "${tableName}" WHERE ${clause}`;
      const res = await query(sql, params);
      return { deletedCount: res.rowCount };
    },

    async countDocuments(filter = {}) {
      const { clause, params } = parseFilter(filter, 1, jsonColumns);
      const sql = `SELECT COUNT(*)::int AS count FROM "${tableName}" WHERE ${clause}`;
      const res = await query(sql, params);
      return (res.rows && res.rows[0] && res.rows[0].count) || 0;
    },

    async exists(filter = {}) {
      const { clause, params } = parseFilter(filter, 1, jsonColumns);
      const sql = `SELECT 1 FROM "${tableName}" WHERE ${clause} LIMIT 1`;
      const res = await query(sql, params);
      return Boolean(res.rows && res.rows.length > 0);
    },

    async bulkWrite(ops, options = {}) {
      let upsertedCount = 0;
      let modifiedCount = 0;

      for (const op of ops) {
        if (op.updateOne) {
          const { filter, update, upsert } = op.updateOne;
          const result = await this.updateOne(filter, update, { upsert });
          if (result && result[primaryKey]) upsertedCount++;
          else modifiedCount++;
        } else if (op.insertOne) {
          await this.create(op.insertOne.document);
          upsertedCount++;
        }
      }

      return { upsertedCount, modifiedCount };
    }
  };

  return Model;
}

// Pre-define all application models with exact column constraints
const User = createModel('users', 'userId', {
  name: '',
  role: 'user',
  plan: 'Standard',
  status: 'active',
  apiTokenHash: null,
  apiTokenPrefix: null,
  apiTokenLast4: null,
  sessions: [],
  autoSendImage: { enabled: false, imageUrl: '', fileName: '' }
}, ['sessions', 'autoSendImage'], [
  'userId', 'username', 'name', 'mobile', 'passwordHash', 'apiToken', 'apiTokenHash', 'apiTokenPrefix', 'apiTokenLast4', 'role',
  'plan', 'planExpiresAt', 'status', 'sessions', 'autoSendImage', 'createdAt', 'updatedAt'
]);

const Otp = createModel('otps', 'id', {
  attempts: 0,
  verified: false
}, [], [
  'id', 'mobile', 'otpHash', 'expiresAt', 'lastSentAt', 'attempts', 'verified', 'createdAt'
]);

const WhatsAppSession = createModel('whatsapp_sessions', 'sessionId', {
  role: 'admin',
  status: 'waiting'
}, [], [
  'sessionId', 'ownerUserId', 'phone', 'role', 'authPath', 'status', 'lastConnectedAt', 'createdAt', 'updatedAt'
]);

const Plan = createModel('plans', 'planId', {
  currency: 'INR',
  description: '',
  dailyLimit: '500/Day',
  validity: '30 Days',
  validityDays: 30,
  deviceLimit: '1 Free + 1 Add-on',
  apiAccess: false,
  webAccess: true,
  bulkMsg: false,
  groupOption: false,
  scheduleMsg: false,
  ipSecurity: false,
  headerColor: '#705ec8',
  badgeText: '',
  active: true,
  sortOrder: 0
}, [], [
  'planId', 'name', 'price', 'currency', 'description', 'dailyLimit', 'validity',
  'validityDays', 'deviceLimit', 'apiAccess', 'webAccess', 'bulkMsg', 'groupOption',
  'scheduleMsg', 'ipSecurity', 'headerColor', 'badgeText', 'active', 'sortOrder', 'createdAt', 'updatedAt'
]);

const PlanPurchaseRequest = createModel('plan_purchase_requests', 'requestId', {
  status: 'pending',
  adminNotes: '',
  screenshot: ''
}, [], [
  'requestId', 'userId', 'userName', 'userMobile', 'planId', 'planName', 'amount',
  'paymentDate', 'bankDetails', 'screenshot', 'status', 'adminNotes', 'approvedAt',
  'rejectedAt', 'createdAt', 'updatedAt'
]);

const CompanySettings = createModel('company_settings', 'key', {
  key: 'company',
  companyName: '',
  faviconUrl: '',
  logoUrl: '',
  bannerUrl: ''
}, [], [
  'key', 'companyName', 'faviconUrl', 'logoUrl', 'bannerUrl', 'updatedAt'
]);


const SessionAuth = createModel('session_auth', 'id', {}, ['data'], [
  'id', 'data'
]);

const ApiSettings = createModel('api_settings', 'key', {
  key: 'default',
  token: '',
  isEnabled: true,
  webhookUrl: '',
  webhookEnabled: false,
  totalSent: 0,
  lastUsed: null
}, [], [
  'key', 'token', 'isEnabled', 'webhookUrl', 'webhookEnabled', 'totalSent', 'lastUsed', 'createdAt', 'updatedAt'
]);

const Contact = createModel('contacts', 'id', {
  name: null,
  notify: null,
  verifiedName: null,
  phone: null,
  lid: null
}, [], [
  'id', 'name', 'notify', 'verifiedName', 'phone', 'lid', 'updatedAt'
]);

const IncomingMessage = createModel('incoming_messages', 'id', {
  from: '',
  fromMe: false,
  message: '',
  mediaType: null,
  mediaUrl: null,
  fileName: null,
  isRead: false,
  sessionPhone: null,
  isGroup: false
}, [], [
  'id', 'chatJid', 'ownerUserId', 'from', 'fromMe', 'message', 'mediaType', 'mediaUrl',
  'fileName', 'date', 'timestamp', 'isRead', 'sessionPhone', 'isGroup', 'createdAt'
]);

const MessageReport = createModel('message_reports', 'id', {
  from: '',
  to: '',
  message: '',
  status: 'sent',
  session: '',
  type: 'text',
  source: 'web',
  recipient: ''
}, [], [
  'id', 'date', 'ownerUserId', 'from', 'to', 'message', 'status', 'session',
  'type', 'source', 'recipient', 'createdAt'
]);

module.exports = {
  connection,
  connectPostgres,
  query,
  createModel,
  User,
  Otp,
  WhatsAppSession,
  Plan,
  PlanPurchaseRequest,
  CompanySettings,
  SessionAuth,
  ApiSettings,
  Contact,
  IncomingMessage,
  MessageReport
};
