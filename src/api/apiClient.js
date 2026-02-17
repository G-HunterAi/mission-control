/**
 * Mission Control v4 — API Client
 *
 * HTTP client wrapping fetch. Falls back to local-only mode
 * when no backend URL is configured.
 */

import { getToken } from './auth.js';
import { offlineQueue } from './offlineQueue.js';
import { generateUUID } from '../utils/ids.js';

const DEFAULT_BASE = ''; // empty = local-only mode

class ApiClient {
  constructor() {
    this.baseUrl = localStorage.getItem('mc4_api_url') || DEFAULT_BASE;
    this.online = navigator.onLine;

    window.addEventListener('online', () => { this.online = true; this._flush(); });
    window.addEventListener('offline', () => { this.online = false; });
  }

  /** Check if a remote backend is configured */
  isRemote() {
    return !!this.baseUrl;
  }

  /** Configure the backend URL */
  setBaseUrl(url) {
    this.baseUrl = url;
    localStorage.setItem('mc4_api_url', url);
  }

  /** Core fetch wrapper */
  async _fetch(method, path, { body, params, idempotencyKey } = {}) {
    if (!this.isRemote()) {
      return { ok: false, status: 0, data: null, localOnly: true };
    }

    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    const opts = { method, headers };
    if (body && method !== 'GET') {
      opts.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url.toString(), opts);
      const data = res.headers.get('content-type')?.includes('json')
        ? await res.json()
        : null;

      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.warn('[API] Network error:', err.message);

      // Queue for retry if it's a write operation
      if (method !== 'GET' && idempotencyKey) {
        offlineQueue.enqueue({
          method, path, body, idempotencyKey,
          enqueuedAt: new Date().toISOString(),
        });
      }

      return { ok: false, status: 0, data: null, offline: true };
    }
  }

  /** Flush offline queue */
  async _flush() {
    if (!this.isRemote() || !this.online) return;
    await offlineQueue.flush(this);
  }

  // ===== Tasks =====

  getTasks(filters = {}) {
    return this._fetch('GET', '/api/v1/tasks', { params: filters });
  }

  getTask(id) {
    return this._fetch('GET', `/api/v1/tasks/${id}`);
  }

  createTask(task) {
    return this._fetch('POST', '/api/v1/tasks', {
      body: task,
      idempotencyKey: generateUUID(),
    });
  }

  updateTask(id, changes) {
    return this._fetch('PATCH', `/api/v1/tasks/${id}`, {
      body: changes,
      idempotencyKey: generateUUID(),
    });
  }

  archiveTask(id) {
    return this._fetch('POST', `/api/v1/tasks/${id}/archive`, {
      idempotencyKey: generateUUID(),
    });
  }

  restoreTask(id) {
    return this._fetch('POST', `/api/v1/tasks/${id}/restore`, {
      idempotencyKey: generateUUID(),
    });
  }

  // ===== Projects =====

  getProjects() {
    return this._fetch('GET', '/api/v1/projects');
  }

  createProject(project) {
    return this._fetch('POST', '/api/v1/projects', {
      body: project,
      idempotencyKey: generateUUID(),
    });
  }

  updateProject(id, changes) {
    return this._fetch('PATCH', `/api/v1/projects/${id}`, {
      body: changes,
      idempotencyKey: generateUUID(),
    });
  }

  // ===== Comments =====

  getComments(taskId) {
    return this._fetch('GET', `/api/v1/tasks/${taskId}/comments`);
  }

  addComment(taskId, comment) {
    return this._fetch('POST', `/api/v1/tasks/${taskId}/comments`, {
      body: comment,
      idempotencyKey: generateUUID(),
    });
  }

  // ===== Outputs =====

  getOutputs(taskId) {
    return this._fetch('GET', `/api/v1/tasks/${taskId}/outputs`);
  }

  addOutput(taskId, output) {
    return this._fetch('POST', `/api/v1/tasks/${taskId}/outputs`, {
      body: output,
      idempotencyKey: generateUUID(),
    });
  }

  // ===== Activity =====

  getActivity(filters = {}) {
    return this._fetch('GET', '/api/v1/activity', { params: filters });
  }

  // ===== Agents =====

  getAgents() {
    return this._fetch('GET', '/api/v1/agents');
  }

  updateAgent(id, changes) {
    return this._fetch('PATCH', `/api/v1/agents/${id}`, {
      body: changes,
      idempotencyKey: generateUUID(),
    });
  }

  // ===== Sync =====

  getSyncStatus() {
    return this._fetch('GET', '/api/v1/sync/status');
  }
}

export const api = new ApiClient();
