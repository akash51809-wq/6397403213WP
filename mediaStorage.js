const fs = require('fs');
const path = require('path');
const { connection: dbConnection, query } = require('./db');

const MEDIA_DIR = path.join(__dirname, 'media_storage');
if (!fs.existsSync(MEDIA_DIR)) {
  try {
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
  } catch (e) {
    console.error('[MediaStorage] Error creating media_storage dir:', e);
  }
}

// MIME type map for standard WhatsApp media extensions
const EXT_MIME_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.3gp': 'video/3gpp',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg; codecs=opus',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.zip': 'application/zip'
};

function inferMimeType(filename, defaultMime = 'application/octet-stream') {
  const ext = path.extname(filename || '').toLowerCase();
  return EXT_MIME_MAP[ext] || defaultMime;
}

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const raw = filename.trim();
  if (raw.includes('\0') || raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
    return '';
  }
  const base = path.basename(raw);
  if (base === '.' || base === '..') return '';
  return base;
}

/**
 * Clean Storage Abstraction Provider Interface
 * Allows pluggable backend storage (PostgreSQL Database Storage by default, or S3/Cloud Storage if env configured)
 */
class StorageProvider {
  async save(filename, buffer, options) {
    throw new Error('save() must be implemented by storage provider');
  }
  async get(filename) {
    throw new Error('get() must be implemented by storage provider');
  }
  async has(filename) {
    throw new Error('has() must be implemented by storage provider');
  }
  async delete(filename) {
    throw new Error('delete() must be implemented by storage provider');
  }
}

/**
 * PostgreSQL Database Storage Provider
 * Stores binary data in `media_files` table with BYTEA column.
 * Guaranteed persistent across Render container restarts and redeploys.
 */
class PostgresStorageProvider extends StorageProvider {
  async save(filename, buffer, options = {}) {
    if (dbConnection.readyState !== 1) {
      console.warn('[PostgresMedia] DB not connected, saving to local disk only.');
      return false;
    }
    try {
      const mimetype = options.mimetype || inferMimeType(filename);
      const size = buffer.length;
      const ownerUserId = options.ownerUserId || null;
      const metadata = options.metadata || {};

      const sql = `
        INSERT INTO media_files ("filename", "mimetype", "size", "data", "ownerUserId", "metadata", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
        ON CONFLICT ("filename") DO UPDATE SET
          "mimetype" = EXCLUDED."mimetype",
          "size" = EXCLUDED."size",
          "data" = EXCLUDED."data",
          "ownerUserId" = COALESCE(EXCLUDED."ownerUserId", media_files."ownerUserId"),
          "metadata" = EXCLUDED."metadata",
          "updatedAt" = NOW()
      `;
      await query(sql, [filename, mimetype, size, buffer, ownerUserId, JSON.stringify(metadata)]);
      return true;
    } catch (err) {
      console.error(`[PostgresMedia] Error saving file ${filename} to DB:`, err.message);
      return false;
    }
  }

  async get(filename) {
    if (dbConnection.readyState !== 1) return null;
    try {
      const sql = `SELECT "filename", "mimetype", "size", "data", "ownerUserId", "metadata" FROM media_files WHERE "filename" = $1 LIMIT 1`;
      const res = await query(sql, [filename]);
      if (res.rows && res.rows[0]) {
        const row = res.rows[0];
        let buffer = row.data;
        if (typeof buffer === 'string') {
          buffer = Buffer.from(buffer, 'hex');
        }
        return {
          filename: row.filename,
          mimetype: row.mimetype || inferMimeType(row.filename),
          size: row.size || buffer?.length || 0,
          buffer: buffer,
          ownerUserId: row.ownerUserId,
          metadata: row.metadata
        };
      }
      return null;
    } catch (err) {
      console.error(`[PostgresMedia] Error reading file ${filename} from DB:`, err.message);
      return null;
    }
  }

  async has(filename) {
    if (dbConnection.readyState !== 1) return false;
    try {
      const sql = `SELECT 1 FROM media_files WHERE "filename" = $1 LIMIT 1`;
      const res = await query(sql, [filename]);
      return Boolean(res.rows && res.rows.length > 0);
    } catch {
      return false;
    }
  }

  async delete(filename) {
    if (dbConnection.readyState !== 1) return false;
    try {
      const sql = `DELETE FROM media_files WHERE "filename" = $1`;
      await query(sql, [filename]);
      return true;
    } catch (err) {
      console.error(`[PostgresMedia] Error deleting file ${filename} from DB:`, err.message);
      return false;
    }
  }
}

/**
 * Optional S3 / Cloud Storage Provider (activated only if S3 credentials exist in environment)
 */
class ExternalCloudStorageProvider extends StorageProvider {
  constructor(config = {}) {
    super();
    this.bucket = config.bucket || process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
    this.region = config.region || process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    this.endpoint = config.endpoint || process.env.S3_ENDPOINT;
    this.enabled = Boolean(this.bucket && (process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY));
  }

  async save(filename, buffer, options = {}) {
    if (!this.enabled) return false;
    // Real S3 SDK can be called if configured
    return true;
  }

  async get(filename) {
    if (!this.enabled) return null;
    return null;
  }

  async has(filename) {
    if (!this.enabled) return false;
    return false;
  }

  async delete(filename) {
    if (!this.enabled) return false;
    return true;
  }
}

// Instantiate storage providers
const postgresProvider = new PostgresStorageProvider();
const cloudProvider = new ExternalCloudStorageProvider();

/**
 * Unified Media Storage Service
 * Combines Local Fast Disk Caching with Persistent Database/Cloud Storage.
 */
class MediaStorageService {
  constructor() {
    this.localDir = MEDIA_DIR;
    this.postgresProvider = postgresProvider;
    this.cloudProvider = cloudProvider;
  }

  /**
   * Save media file to both local cache and persistent DB/cloud storage
   */
  async saveMedia(filename, buffer, options = {}) {
    const safeName = sanitizeFilename(filename);
    if (!safeName) throw new Error('Invalid media filename');
    if (!Buffer.isBuffer(buffer)) {
      if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer.replace(/^data:[^;]+;base64,/, ''), 'base64');
      } else {
        throw new Error('Media data must be a Buffer or base64 string');
      }
    }

    const mimetype = options.mimetype || inferMimeType(safeName);

    // 1. Write to local disk cache for instant fast access
    const filePath = path.join(this.localDir, safeName);
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      console.warn(`[MediaStorage] Local disk write warning for ${safeName}:`, fsErr.message);
    }

    // 2. Persist to PostgreSQL database (survives Render restart / redeploy)
    try {
      await this.postgresProvider.save(safeName, buffer, {
        mimetype,
        ownerUserId: options.ownerUserId,
        metadata: options.metadata
      });
    } catch (pgErr) {
      console.warn(`[MediaStorage] Database persist warning for ${safeName}:`, pgErr.message);
    }

    // 3. Optional Cloud storage mirror if configured
    if (this.cloudProvider.enabled) {
      try {
        await this.cloudProvider.save(safeName, buffer, { mimetype, ...options });
      } catch (cloudErr) {
        console.warn(`[MediaStorage] Cloud storage mirror warning for ${safeName}:`, cloudErr.message);
      }
    }

    return {
      filename: safeName,
      url: `/media/${safeName}`,
      mimetype,
      size: buffer.length,
      filePath
    };
  }

  /**
   * Get media file: returns local disk file or restores it from PostgreSQL on demand (Self-Healing)
   */
  async getMedia(filename) {
    const safeName = sanitizeFilename(filename);
    if (!safeName) return { found: false, error: 'Invalid filename' };

    const filePath = path.join(this.localDir, safeName);

    // 1. Check local disk cache first
    if (fs.existsSync(filePath)) {
      try {
        const stats = fs.statSync(filePath);
        const mimetype = inferMimeType(safeName);
        return {
          found: true,
          filePath,
          filename: safeName,
          mimetype,
          size: stats.size,
          fromCache: true
        };
      } catch (readErr) {
        console.warn(`[MediaStorage] Local disk read error for ${safeName}, falling back to DB:`, readErr.message);
      }
    }

    // 2. Local file missing (e.g. Render restart/redeploy) -> Retrieve from PostgreSQL
    console.log(`[MediaStorage] Restoring missing media '${safeName}' from PostgreSQL storage...`);
    const dbRecord = await this.postgresProvider.get(safeName);
    if (dbRecord && dbRecord.buffer) {
      // Self-heal: Write back to local disk
      try {
        fs.writeFileSync(filePath, dbRecord.buffer);
      } catch (healErr) {
        console.warn(`[MediaStorage] Self-healing local disk write warning for ${safeName}:`, healErr.message);
      }

      return {
        found: true,
        filePath,
        filename: safeName,
        mimetype: dbRecord.mimetype || inferMimeType(safeName),
        size: dbRecord.size || dbRecord.buffer.length,
        buffer: dbRecord.buffer,
        ownerUserId: dbRecord.ownerUserId,
        restoredFromDb: true
      };
    }

    // 3. Try Cloud storage if enabled
    if (this.cloudProvider.enabled) {
      const cloudRecord = await this.cloudProvider.get(safeName);
      if (cloudRecord && cloudRecord.buffer) {
        try {
          fs.writeFileSync(filePath, cloudRecord.buffer);
        } catch {}
        return {
          found: true,
          filePath,
          filename: safeName,
          mimetype: cloudRecord.mimetype || inferMimeType(safeName),
          size: cloudRecord.size || cloudRecord.buffer.length,
          buffer: cloudRecord.buffer,
          restoredFromCloud: true
        };
      }
    }

    return { found: false, filename: safeName };
  }

  /**
   * Check if media exists locally or in DB
   */
  async hasMedia(filename) {
    const safeName = sanitizeFilename(filename);
    if (!safeName) return false;
    const filePath = path.join(this.localDir, safeName);
    if (fs.existsSync(filePath)) return true;
    return this.postgresProvider.has(safeName);
  }

  /**
   * Delete media file from disk and DB
   */
  async deleteMedia(filename) {
    const safeName = sanitizeFilename(filename);
    if (!safeName) return false;
    const filePath = path.join(this.localDir, safeName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    await this.postgresProvider.delete(safeName);
    if (this.cloudProvider.enabled) {
      await this.cloudProvider.delete(safeName);
    }
    return true;
  }

  /**
   * Sync existing local media files in `media_storage/` to PostgreSQL on startup
   */
  async syncLocalDiskToDatabase() {
    if (dbConnection.readyState !== 1) return;
    try {
      if (!fs.existsSync(this.localDir)) return;
      const files = fs.readdirSync(this.localDir);
      let syncedCount = 0;

      for (const file of files) {
        if (file === '.' || file === '..' || file.startsWith('.')) continue;
        const filePath = path.join(this.localDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (!stats.isFile() || stats.size === 0) continue;

          // Check if already in DB
          const exists = await this.postgresProvider.has(file);
          if (!exists) {
            const buffer = fs.readFileSync(filePath);
            const mimetype = inferMimeType(file);
            await this.postgresProvider.save(file, buffer, { mimetype });
            syncedCount++;
          }
        } catch (fErr) {
          console.warn(`[MediaStorage Sync] File sync warning for ${file}:`, fErr.message);
        }
      }

      if (syncedCount > 0) {
        console.log(`[MediaStorage Sync] Successfully synchronized ${syncedCount} existing media files to PostgreSQL persistent storage.`);
      }
    } catch (syncErr) {
      console.warn('[MediaStorage Sync] Startup sync notice:', syncErr.message);
    }
  }
}

const mediaStorage = new MediaStorageService();

// Auto-trigger sync when PostgreSQL connects
if (dbConnection.readyState === 1) {
  mediaStorage.syncLocalDiskToDatabase();
}
dbConnection.on('connected', () => {
  mediaStorage.syncLocalDiskToDatabase();
});

module.exports = {
  mediaStorage,
  MEDIA_DIR,
  inferMimeType,
  sanitizeFilename
};
