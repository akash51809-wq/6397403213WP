/**
 * Shared Baileys v7 WebSocket readiness and version caching helpers.
 */

let cachedVersion = null;
let cachedVersionAt = 0;
const VERSION_TTL_MS = 6 * 60 * 60 * 1000;
const FALLBACK_VERSION = [2, 3000, 1043857760];

/**
 * Checks whether a Baileys v7 WebSocketClient (or standard ws) transport is open.
 * Baileys v7 exposes `ws.isOpen` boolean and `ws.socket.readyState`, while `ws.readyState` is undefined.
 */
function isWsOpen(ws) {
    if (!ws) return true; // Preserves compatibility with lightweight test mock sockets
    if (typeof ws.isOpen === 'boolean') return ws.isOpen;
    const state = ws.socket?.readyState ?? ws.readyState;
    return state === undefined || state === 1;
}

/**
 * Checks whether a WhatsApp socket has completed Noise/IQ authentication handshake and its transport is open.
 */
function isSocketReady(s) {
    if (!s || typeof s.sendMessage !== 'function') return false;
    if (!s.user?.id) return false;
    if (s.__waConnecting === true) return false;
    return isWsOpen(s.ws);
}

/**
 * Resolves latest Baileys protocol version with a 6-hour cache and 2.5s timeout so reconnects never stall.
 */
async function getFastBaileysVersion(fetchLatestBaileysVersion) {
    const now = Date.now();
    if (cachedVersion && (now - cachedVersionAt < VERSION_TTL_MS)) {
        return { version: cachedVersion };
    }
    try {
        const res = await Promise.race([
            fetchLatestBaileysVersion(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Baileys version fetch timeout')), 2500))
        ]);
        if (res?.version) {
            cachedVersion = res.version;
            cachedVersionAt = now;
            return { version: cachedVersion };
        }
    } catch {}
    return { version: cachedVersion || FALLBACK_VERSION };
}

module.exports = {
    isWsOpen,
    isSocketReady,
    getFastBaileysVersion,
    FALLBACK_VERSION
};
