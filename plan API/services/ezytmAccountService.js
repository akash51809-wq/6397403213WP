const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('./logger');

let rootDb = null;
try {
  rootDb = require('../../db');
} catch (e) {
  try {
    rootDb = require('../db');
  } catch (e2) {}
}
const localDb = require('./db');

const ACCOUNTS_JSON_PATH = path.join(__dirname, '..', 'data', 'ezytm_accounts.json');

let roundRobinIndex = 0;
const changeListeners = new Set();

function addAccountChangeListener(fn) {
  if (typeof fn === 'function') {
    changeListeners.add(fn);
  }
}

function removeAccountChangeListener(fn) {
  changeListeners.delete(fn);
}

function notifyChange(event, data) {
  for (const fn of changeListeners) {
    try {
      fn(event, data);
    } catch (err) {
      logger.error('Error in account change listener', { event, error: err.message });
    }
  }
}

function getDbClient() {
  if (rootDb && rootDb.connection && rootDb.connection.readyState === 1 && rootDb.connection.pool) {
    return rootDb;
  }
  if (localDb && (localDb.isConnected || localDb.pool)) {
    return localDb;
  }
  return null;
}

async function queryDb(sql, params) {
  const client = getDbClient();
  if (client) {
    try {
      return await client.query(sql, params);
    } catch (e) {
      logger.warn('DB query error in ezytmAccountService', { error: e.message });
    }
  }
  return null;
}

/**
 * Single default primary account if store is completely empty
 */
function getDefaultSeedAccounts() {
  const defaultUser = (config.username && /^\d{10}$/.test(config.username) && config.username !== 'admin') 
    ? config.username 
    : '8840457632';
  const defaultPass = config.password || '123456';

  return [
    {
      id: 'EZY_DEFAULT_1',
      username: defaultUser,
      password: defaultPass,
      label: `Primary EzyTM Node (${defaultUser})`,
      status: 'Active',
      total_requests: 0,
      success_requests: 0,
      failed_requests: 0,
      last_used_at: null,
      last_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}

/**
 * Read accounts from JSON file (Never re-seeds inside read)
 */
function readAccountsFromFile() {
  try {
    if (fs.existsSync(ACCOUNTS_JSON_PATH)) {
      const content = fs.readFileSync(ACCOUNTS_JSON_PATH, 'utf8');
      if (content && content.trim()) {
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          return data.filter(a => a && a.username && String(a.username).toLowerCase() !== 'admin');
        }
      }
    }
  } catch (e) {
    logger.warn('Error reading ezytm_accounts.json', { error: e.message });
  }
  return [];
}

/**
 * Save accounts to JSON file
 */
function saveAccountsToFile(accounts) {
  try {
    const dir = path.dirname(ACCOUNTS_JSON_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const cleanAccounts = (accounts || []).filter(a => a && a.username && String(a.username).toLowerCase() !== 'admin');
    fs.writeFileSync(ACCOUNTS_JSON_PATH, JSON.stringify(cleanAccounts, null, 2), 'utf8');
  } catch (e) {
    logger.error('Error writing ezytm_accounts.json', { error: e.message });
  }
}

/**
 * Get all accounts (Admin view)
 * 1. Checks PostgreSQL first
 * 2. Falls back to JSON file
 * 3. Never restores deleted accounts
 */
async function getAllAccounts() {
  const dbClient = getDbClient();
  let dbAccounts = [];

  if (dbClient) {
    try {
      // Auto-purge any dummy admin entries permanently
      await dbClient.query("DELETE FROM ezytm_accounts WHERE LOWER(username) = 'admin' OR LOWER(label) LIKE '%admin%'").catch(() => {});

      const res = await dbClient.query("SELECT * FROM ezytm_accounts WHERE LOWER(username) != 'admin' ORDER BY created_at ASC");
      if (res && Array.isArray(res.rows)) {
        dbAccounts = res.rows;
      }
    } catch (e) {
      logger.warn('Database query for ezytm_accounts failed, using local store', { error: e.message });
    }
  }

  const fileAccounts = readAccountsFromFile();

  // If DB has accounts, sync to file and return DB rows
  if (dbAccounts.length > 0) {
    saveAccountsToFile(dbAccounts);
    return dbAccounts;
  }

  // If DB has no accounts, but file has accounts, insert file accounts into DB
  if (fileAccounts.length > 0) {
    if (dbClient) {
      for (const acc of fileAccounts) {
        try {
          await dbClient.query(
            `INSERT INTO ezytm_accounts (id, username, password, label, status, total_requests, success_requests, failed_requests, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
             ON CONFLICT (username) DO UPDATE
             SET password = EXCLUDED.password, label = EXCLUDED.label, status = EXCLUDED.status, updated_at = NOW()`,
            [
              acc.id || ('EZY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
              acc.username,
              acc.password,
              acc.label || `EzyTM (${acc.username})`,
              acc.status || 'Active',
              acc.total_requests || 0,
              acc.success_requests || 0,
              acc.failed_requests || 0
            ]
          );
        } catch (err) {}
      }
    }
    return fileAccounts;
  }

  // If BOTH DB and File are empty, seed only the primary account
  const initialSeeds = getDefaultSeedAccounts();
  saveAccountsToFile(initialSeeds);
  if (dbClient) {
    for (const acc of initialSeeds) {
      try {
        await dbClient.query(
          `INSERT INTO ezytm_accounts (id, username, password, label, status, total_requests, success_requests, failed_requests, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 0, 0, 0, NOW(), NOW())
           ON CONFLICT (username) DO NOTHING`,
          [acc.id, acc.username, acc.password, acc.label, acc.status]
        );
      } catch (err) {}
    }
  }
  return initialSeeds;
}

/**
 * Get all active accounts
 */
async function getActiveAccounts() {
  const all = await getAllAccounts();
  const active = all.filter(a => a.status === 'Active');
  if (active.length === 0) {
    return all.length > 0 ? [all[0]] : getDefaultSeedAccounts();
  }
  return active;
}

/**
 * Add / Upsert an EzyTM Account (Persists to both DB and File)
 */
async function addAccount({ username, password, label }) {
  if (!username || !password) {
    throw new Error('Username and Password are required.');
  }

  const cleanUser = String(username).trim();
  if (cleanUser.toLowerCase() === 'admin') {
    throw new Error('Cannot add "admin" as an EzyTM account.');
  }

  const cleanPass = String(password).trim();
  const cleanLabel = String(label || `EzyTM (${cleanUser})`).trim();
  const accountId = 'EZY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

  let createdAccount = {
    id: accountId,
    username: cleanUser,
    password: cleanPass,
    label: cleanLabel,
    status: 'Active',
    total_requests: 0,
    success_requests: 0,
    failed_requests: 0,
    last_used_at: null,
    last_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const dbClient = getDbClient();
  if (dbClient) {
    try {
      const res = await dbClient.query(
        `INSERT INTO ezytm_accounts (id, username, password, label, status, total_requests, success_requests, failed_requests, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Active', 0, 0, 0, NOW(), NOW())
         ON CONFLICT (username) DO UPDATE
         SET password = EXCLUDED.password,
             label = EXCLUDED.label,
             status = 'Active',
             updated_at = NOW()
         RETURNING *`,
        [accountId, cleanUser, cleanPass, cleanLabel]
      );
      if (res && res.rows && res.rows[0]) {
        createdAccount = res.rows[0];
      }
    } catch (e) {
      logger.error('Failed to insert/update ezytm account in DB', { error: e.message });
    }
  }

  // Always sync to local file store
  const accounts = readAccountsFromFile();
  const existingIdx = accounts.findIndex(a => a.id === createdAccount.id || a.username === cleanUser);
  if (existingIdx !== -1) {
    accounts[existingIdx] = {
      ...accounts[existingIdx],
      ...createdAccount,
      password: cleanPass,
      label: cleanLabel,
      status: 'Active',
      updated_at: new Date().toISOString()
    };
    createdAccount = accounts[existingIdx];
  } else {
    accounts.push(createdAccount);
  }
  saveAccountsToFile(accounts);

  notifyChange('add', createdAccount);
  return createdAccount;
}

/**
 * Update an existing account (Persists to both DB and File)
 */
async function updateAccount(id, { username, password, label, status }) {
  if (!id) throw new Error('Account ID is required.');

  let updatedRow = null;
  const dbClient = getDbClient();

  if (dbClient) {
    try {
      const updates = [];
      const values = [id];
      let idx = 2;

      if (username) { updates.push(`username = $${idx++}`); values.push(String(username).trim()); }
      if (password) { updates.push(`password = $${idx++}`); values.push(String(password).trim()); }
      if (label) { updates.push(`label = $${idx++}`); values.push(String(label).trim()); }
      if (status) { updates.push(`status = $${idx++}`); values.push(status === 'Active' ? 'Active' : 'Disabled'); }
      updates.push(`updated_at = NOW()`);

      const sql = `UPDATE ezytm_accounts SET ${updates.join(', ')} WHERE id = $1 OR username = $1 RETURNING *`;
      const res = await dbClient.query(sql, values);
      if (res && res.rows && res.rows.length > 0) {
        updatedRow = res.rows[0];
      }
    } catch (e) {
      logger.error('Failed to update ezytm account in DB', { error: e.message });
    }
  }

  // Always sync to local file store
  const accounts = readAccountsFromFile();
  const accIndex = accounts.findIndex(a => a.id === id || a.username === id);
  if (accIndex !== -1) {
    if (username) accounts[accIndex].username = String(username).trim();
    if (password) accounts[accIndex].password = String(password).trim();
    if (label) accounts[accIndex].label = String(label).trim();
    if (status) accounts[accIndex].status = status === 'Active' ? 'Active' : 'Disabled';
    accounts[accIndex].updated_at = new Date().toISOString();
    saveAccountsToFile(accounts);
    if (!updatedRow) updatedRow = accounts[accIndex];
  }

  if (updatedRow) {
    notifyChange('update', updatedRow);
    return updatedRow;
  }
  throw new Error('Account not found.');
}

/**
 * Toggle active / disabled status
 */
async function toggleAccountStatus(id) {
  const all = await getAllAccounts();
  const target = all.find(a => a.id === id || a.username === id);
  if (!target) throw new Error('Account not found.');

  const newStatus = target.status === 'Active' ? 'Disabled' : 'Active';
  return await updateAccount(target.id || id, { status: newStatus });
}

/**
 * Delete an account (Deletes permanently from both DB and File)
 */
async function deleteAccount(id) {
  if (!id) throw new Error('Account ID is required.');

  const dbClient = getDbClient();
  if (dbClient) {
    try {
      await dbClient.query('DELETE FROM ezytm_accounts WHERE id = $1 OR username = $1', [id]);
    } catch (e) {
      logger.error('Failed to delete ezytm account from DB', { error: e.message });
    }
  }

  const accounts = readAccountsFromFile();
  const filtered = accounts.filter(a => a.id !== id && a.username !== id);
  saveAccountsToFile(filtered);
  notifyChange('delete', id);
  return true;
}

/**
 * Get Next Active Account (Round-Robin with failover support)
 */
async function getNextActiveAccount() {
  const activeAccounts = await getActiveAccounts();
  if (activeAccounts.length === 0) {
    return {
      id: 'EZY_CONFIG_FALLBACK',
      username: config.username || '8840457632',
      password: config.password || '123456',
      label: 'Config Fallback'
    };
  }

  // Atomic round-robin rotation
  const selected = activeAccounts[roundRobinIndex % activeAccounts.length];
  roundRobinIndex = (roundRobinIndex + 1) % activeAccounts.length;

  // Track usage asynchronously
  recordAccountUsage(selected.id).catch(() => {});

  return selected;
}

/**
 * Record usage
 */
async function recordAccountUsage(id) {
  if (!id) return;
  const now = new Date().toISOString();
  await queryDb(
    'UPDATE ezytm_accounts SET total_requests = total_requests + 1, last_used_at = NOW() WHERE id = $1 OR username = $1',
    [id]
  );
  try {
    const accounts = readAccountsFromFile();
    const acc = accounts.find(a => a.id === id || a.username === id);
    if (acc) {
      acc.total_requests = (acc.total_requests || 0) + 1;
      acc.last_used_at = now;
      saveAccountsToFile(accounts);
    }
  } catch (e) {}
}

/**
 * Record success
 */
async function recordAccountSuccess(id) {
  if (!id) return;
  await queryDb(
    'UPDATE ezytm_accounts SET success_requests = success_requests + 1, last_error = NULL WHERE id = $1 OR username = $1',
    [id]
  );
  try {
    const accounts = readAccountsFromFile();
    const acc = accounts.find(a => a.id === id || a.username === id);
    if (acc) {
      acc.success_requests = (acc.success_requests || 0) + 1;
      acc.last_error = null;
      saveAccountsToFile(accounts);
    }
  } catch (e) {}
}

/**
 * Record failure
 */
async function recordAccountFailure(id, errorMsg) {
  if (!id) return;
  let sanitizedErr = String(errorMsg || 'Connection timeout or authentication error').slice(0, 255);
  if (sanitizedErr.includes('locator.waitFor') || sanitizedErr.includes('Timeout')) {
    sanitizedErr = 'EzyTM Login Timeout / Portal Delay';
  }
  await queryDb(
    'UPDATE ezytm_accounts SET failed_requests = failed_requests + 1, last_error = $2 WHERE id = $1 OR username = $1',
    [id, sanitizedErr]
  );
  try {
    const accounts = readAccountsFromFile();
    const acc = accounts.find(a => a.id === id || a.username === id);
    if (acc) {
      acc.failed_requests = (acc.failed_requests || 0) + 1;
      acc.last_error = sanitizedErr;
      saveAccountsToFile(accounts);
    }
  } catch (e) {}
}

module.exports = {
  getAllAccounts,
  getActiveAccounts,
  addAccount,
  updateAccount,
  toggleAccountStatus,
  deleteAccount,
  getNextActiveAccount,
  recordAccountSuccess,
  recordAccountFailure,
  addAccountChangeListener,
  removeAccountChangeListener
};
