/**
 * High-performance, in-memory sliding-window rate limiter middleware
 * Zero external dependencies, automatic garbage collection
 */

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default: 1 minute
  const max = options.max || 60; // default: 60 requests per window
  const message = options.message || 'बहुत सारे अनुरोध (Too many requests). कृपया कुछ देर बाद प्रयास करें।';
  const statusCode = options.statusCode || 429;
  const keyGenerator = options.keyGenerator || ((req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? String(forwarded).split(',')[0].trim() : (req.socket?.remoteAddress || '127.0.0.1');
    return ip;
  });

  const hits = new Map();

  // Periodic cleanup of stale entries every 60 seconds
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now - entry.windowStart > windowMs) {
        hits.delete(key);
      }
    }
  }, 60 * 1000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    const key = keyGenerator(req);
    if (!key) return next();

    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || (now - entry.windowStart > windowMs)) {
      entry = { windowStart: now, count: 1 };
      hits.set(key, entry);
      return next();
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(statusCode).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds
      });
    }

    next();
  };
}

module.exports = { createRateLimiter };
