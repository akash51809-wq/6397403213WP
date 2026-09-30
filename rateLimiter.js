/**
 * Hybrid High-Performance Sliding-Window Rate Limiter Middleware
 * Combines ultra-fast local in-memory tracking with distributed PostgreSQL synchronization
 * to prevent multi-instance bypass across horizontal clusters / Render containers.
 */

const { connection: dbConnection, query } = require('./db');

function createRateLimiter(options = {}) {
  const windowMs = Number(options.windowMs) || 60 * 1000; // default: 1 minute
  const max = Number(options.max) || 60; // default: 60 requests per window
  const message = options.message || 'बहुत सारे अनुरोध (Too many requests). कृपया कुछ देर बाद प्रयास करें।';
  const statusCode = Number(options.statusCode) || 429;
  const distributed = options.distributed !== false; // distributed by default
  const keyGenerator = options.keyGenerator || ((req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return String(ip).trim();
  });

  // Tier 1: Local In-Memory Fast Cache
  const memoryHits = new Map();

  // Periodic in-memory garbage collection
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryHits.entries()) {
      if (now - entry.windowStart > windowMs * 2) {
        memoryHits.delete(key);
      }
    }
  }, 60 * 1000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  // Periodic DB garbage collection (every 5 minutes)
  let lastDbCleanup = Date.now();
  async function maybeCleanupDb(now) {
    if (now - lastDbCleanup > 5 * 60 * 1000 && dbConnection.readyState === 1) {
      lastDbCleanup = now;
      try {
        const cutoff = now - windowMs * 2;
        await query(`DELETE FROM rate_limits WHERE "windowStart" < $1`, [cutoff]);
      } catch (err) {
        // Non-blocking cleanup warning
      }
    }
  }

  return async function rateLimiterMiddleware(req, res, next) {
    const key = keyGenerator(req);
    if (!key) return next();

    const now = Date.now();

    // 1. Check local in-memory tier first
    let memEntry = memoryHits.get(key);
    if (!memEntry || (now - memEntry.windowStart > windowMs)) {
      memEntry = { windowStart: now, count: 1 };
      memoryHits.set(key, memEntry);
    } else {
      memEntry.count += 1;
    }

    // If local memory count alone already exceeds max, block immediately
    if (memEntry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((memEntry.windowStart + windowMs - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(statusCode).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds
      });
    }

    // 2. Distributed Tier: PostgreSQL multi-instance synchronization
    if (distributed && dbConnection.readyState === 1) {
      try {
        maybeCleanupDb(now);

        const windowThreshold = now - windowMs;
        const sql = `
          INSERT INTO rate_limits ("key", "count", "windowStart", "updatedAt")
          VALUES ($1, 1, $2, NOW())
          ON CONFLICT ("key") DO UPDATE
          SET "count" = CASE 
            WHEN rate_limits."windowStart" < $3 THEN 1 
            ELSE rate_limits."count" + 1 
          END,
          "windowStart" = CASE 
            WHEN rate_limits."windowStart" < $3 THEN $2 
            ELSE rate_limits."windowStart" 
          END,
          "updatedAt" = NOW()
          RETURNING "count", "windowStart";
        `;

        const result = await query(sql, [key, now, windowThreshold]);
        if (result.rows && result.rows[0]) {
          const row = result.rows[0];
          const totalCount = Number(row.count);
          const start = Number(row.windowStart);

          // Synchronize local memory with global total
          memEntry.count = Math.max(memEntry.count, totalCount);

          if (totalCount > max) {
            const retryAfterSeconds = Math.max(1, Math.ceil((start + windowMs - now) / 1000));
            res.setHeader('Retry-After', retryAfterSeconds);
            return res.status(statusCode).json({
              success: false,
              message,
              retryAfter: retryAfterSeconds
            });
          }
        }
      } catch (dbErr) {
        // Fallback gracefully to in-memory tier if DB query encounters transient issue
      }
    }

    next();
  };
}

module.exports = { createRateLimiter };
