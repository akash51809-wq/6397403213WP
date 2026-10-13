const crypto = require('crypto');

/**
 * High-performance Idempotency & Message Deduplication Manager
 * Prevents duplicate WhatsApp messages from being sent due to network timeouts,
 * client retries, or concurrent webhook/API requests.
 */
class MessageDeduplicator {
  constructor(ttlMs = 120000) { // 2 minutes window
    this.ttlMs = ttlMs;
    this.cache = new Map();
    setInterval(() => this.cleanup(), 30000).unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generates a stable request key. If client passes idempotencyKey, uses it.
   * Otherwise derives deterministic fingerprint from sender + recipient + content.
   */
  generateKey(sender, recipient, content, clientKey = null) {
    if (clientKey && String(clientKey).trim()) {
      return `client:${String(clientKey).trim()}`;
    }
    const raw = `${String(sender || '')}|${String(recipient || '')}|${String(content || '')}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
    return `fp:${hash}`;
  }

  /**
   * Generates a deterministic Baileys/WhatsApp message ID from the idempotency key.
   * Baileys message IDs are typically 12-24 character alphanumeric strings.
   */
  generateBaileysMessageId(key) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return 'DEDUP' + hash.substring(0, 16).toUpperCase();
  }

  /**
   * Checks if request is already in-flight or completed.
   */
  check(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  /**
   * Marks a message send operation as in-flight with its promise.
   */
  setInFlight(key, promise, baileysMessageId) {
    const entry = {
      status: 'in_flight',
      promise,
      baileysMessageId,
      timestamp: Date.now(),
      result: null,
      error: null
    };
    this.cache.set(key, entry);

    promise
      .then((res) => {
        entry.status = 'completed';
        entry.result = res;
      })
      .catch((err) => {
        this.cache.delete(key);
      });

    return entry;
  }

  /**
   * Records a successfully sent message result.
   */
  setCompleted(key, result, baileysMessageId) {
    this.cache.set(key, {
      status: 'completed',
      result,
      baileysMessageId,
      timestamp: Date.now()
    });
  }
}

const messageDeduplicator = new MessageDeduplicator();

module.exports = {
  messageDeduplicator,
  MessageDeduplicator
};
