/**
 * Mission Control v4 — ID Generators
 *
 * - ULID: time-sortable unique IDs (offline-safe)
 * - MC Key: human-readable display keys (MC-001, MC-002)
 * - UUID v4: for idempotency keys
 */

// ---------- ULID ----------

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(now, len) {
  let str = '';
  for (let i = len; i > 0; i--) {
    const mod = now % ENCODING.length;
    str = ENCODING[mod] + str;
    now = (now - mod) / ENCODING.length;
  }
  return str;
}

function encodeRandom(len) {
  let str = '';
  const randomBytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) {
    str += ENCODING[randomBytes[i] % ENCODING.length];
  }
  return str;
}

/**
 * Generate a ULID (Universally Unique Lexicographically Sortable Identifier)
 * Format: 10 chars timestamp + 16 chars random = 26 chars
 */
export function generateULID() {
  const now = Date.now();
  return encodeTime(now, 10) + encodeRandom(16);
}

// ---------- MC Key ----------

const MC_KEY_COUNTER = 'mc4_key_counter';

/**
 * Generate next MC display key (MC-001, MC-002, ...)
 * Counter is persisted in localStorage for local-only mode.
 */
export function generateMCKey() {
  let counter = parseInt(localStorage.getItem(MC_KEY_COUNTER) || '0', 10);
  counter += 1;
  localStorage.setItem(MC_KEY_COUNTER, counter.toString());
  return `MC-${counter.toString().padStart(3, '0')}`;
}

/**
 * Get current MC key counter value without incrementing
 */
export function getCurrentKeyCounter() {
  return parseInt(localStorage.getItem(MC_KEY_COUNTER) || '0', 10);
}

/**
 * Set the MC key counter (for sync with backend)
 */
export function setKeyCounter(value) {
  localStorage.setItem(MC_KEY_COUNTER, value.toString());
}

/**
 * Get next MC key based on existing keys
 * Scans existing keys and returns the next one in sequence.
 * @param {string[]} existingKeys - Array of existing MC-### keys
 * @returns {string}
 */
export function nextMCKey(existingKeys = []) {
  let maxNum = 0;
  existingKeys.forEach(key => {
    const match = key.match(/MC-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  const next = maxNum + 1;
  localStorage.setItem(MC_KEY_COUNTER, next.toString());
  return `MC-${next.toString().padStart(3, '0')}`;
}

/**
 * Alias for ULID generator
 */
export function generateId() {
  return generateULID();
}

// ---------- UUID v4 ----------

/**
 * Generate a UUID v4 (random)
 * Used for idempotency keys.
 */
export function generateUUID() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
