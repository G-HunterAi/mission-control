/**
 * Mission Control v4 — Offline Mutation Queue
 *
 * Stores pending mutations in IndexedDB when offline.
 * Flushes on reconnect with exponential backoff.
 * Each mutation carries an idempotency key for safe retries.
 */

const DB_NAME = 'mc4_offline';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

class OfflineQueue {
  constructor() {
    this.db = null;
    this.flushing = false;
    this._listeners = new Map();
  }

  /** Open IndexedDB connection */
  async _openDb() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'idempotencyKey' });
          store.createIndex('enqueuedAt', 'enqueuedAt');
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /** Enqueue a mutation for later replay */
  async enqueue(mutation) {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        ...mutation,
        retries: 0,
        enqueuedAt: mutation.enqueuedAt || new Date().toISOString(),
      };

      const req = store.put(record);
      req.onsuccess = () => {
        this._emit('enqueued', record);
        resolve(record);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Get all pending mutations (oldest first) */
  async getAll() {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('enqueuedAt');
      const req = index.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Remove a mutation after successful replay */
  async remove(idempotencyKey) {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(idempotencyKey);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Get count of pending mutations */
  async count() {
    const db = await this._openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Flush all pending mutations through the API client */
  async flush(apiClient) {
    if (this.flushing) return;
    this.flushing = true;

    try {
      const mutations = await this.getAll();
      if (mutations.length === 0) {
        this.flushing = false;
        return;
      }

      console.log(`[OfflineQueue] Flushing ${mutations.length} pending mutations`);

      for (const mutation of mutations) {
        if (mutation.retries >= MAX_RETRIES) {
          console.warn('[OfflineQueue] Max retries reached, discarding:', mutation.idempotencyKey);
          await this.remove(mutation.idempotencyKey);
          this._emit('failed', mutation);
          continue;
        }

        // Exponential backoff delay
        if (mutation.retries > 0) {
          const delay = BASE_DELAY_MS * Math.pow(2, mutation.retries - 1);
          await new Promise(r => setTimeout(r, delay));
        }

        const result = await apiClient._fetch(mutation.method, mutation.path, {
          body: mutation.body,
          idempotencyKey: mutation.idempotencyKey,
        });

        if (result.ok) {
          await this.remove(mutation.idempotencyKey);
          this._emit('flushed', mutation);
        } else if (result.offline) {
          // Still offline, stop flushing
          break;
        } else if (result.status === 409) {
          // Conflict — log and remove
          console.warn('[OfflineQueue] Conflict for:', mutation.idempotencyKey);
          await this.remove(mutation.idempotencyKey);
          this._emit('conflict', mutation);
        } else {
          // Increment retry counter
          mutation.retries += 1;
          await this.enqueue(mutation);
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  /** Event listener */
  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(callback);
  }

  _emit(event, data) {
    const cbs = this._listeners.get(event) || [];
    cbs.forEach(cb => cb(data));
  }
}

export const offlineQueue = new OfflineQueue();
