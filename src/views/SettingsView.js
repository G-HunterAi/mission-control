/**
 * Mission Control v4 — Settings View
 *
 * Configuration: API URL, auth, Apple sync, agent WIP limits,
 * notification preferences, sync status.
 */

import { api } from '../api/apiClient.js';
import { getToken, setToken, clearToken, getRole, setRole } from '../api/auth.js';
import { Toasts } from '../components/Toasts.js';

let store = null;
let container = null;

function init(el, storeRef) {
  container = el;
  store = storeRef;
}

function mount(el, storeRef) {
  container = el;
  store = storeRef;
  render();
}

function render() {
  if (!container) return;

  container.innerHTML = '';

  const settings = document.createElement('div');
  settings.className = 'settings';

  // --- Connection ---
  settings.appendChild(createSection('Connection', `
    <div class="settings__row">
      <div>
        <div class="settings__row-label">API URL</div>
        <div class="settings__row-desc">Backend endpoint. Leave empty for local-only mode.</div>
      </div>
      <input type="url" id="setting-api-url" class="input" style="width: 280px;"
        placeholder="https://mc4-api.workers.dev"
        value="${escapeHtml(api.baseUrl || '')}">
    </div>
    <div class="settings__row">
      <div>
        <div class="settings__row-label">Auth Token</div>
        <div class="settings__row-desc">Bearer token for API authentication.</div>
      </div>
      <input type="password" id="setting-auth-token" class="input" style="width: 280px;"
        placeholder="Enter token..."
        value="${getToken() || ''}">
    </div>
    <div class="settings__row">
      <div>
        <div class="settings__row-label">Role</div>
        <div class="settings__row-desc">Current permission level.</div>
      </div>
      <select id="setting-role" class="input" style="width: 160px;">
        <option value="owner" ${getRole() === 'owner' ? 'selected' : ''}>Owner</option>
        <option value="agent" ${getRole() === 'agent' ? 'selected' : ''}>Agent</option>
      </select>
    </div>
    <div style="margin-top: var(--space-md);">
      <button id="setting-save-connection" class="btn btn--primary">Save Connection</button>
    </div>
  `));

  // --- Apple Sync ---
  settings.appendChild(createSection('Apple Sync', `
    <div class="settings__row">
      <div>
        <div class="settings__row-label">Sync Status</div>
        <div class="settings__row-desc">Apple daemon heartbeat and last sync info.</div>
      </div>
      <span id="sync-status-indicator" class="badge badge--tag">Unknown</span>
    </div>
    <div class="settings__row">
      <div>
        <div class="settings__row-label">Last Sync</div>
        <div class="settings__row-desc">Most recent successful sync.</div>
      </div>
      <span id="sync-last-time">Never</span>
    </div>
    <div class="settings__row">
      <div>
        <div class="settings__row-label">Last Error</div>
        <div class="settings__row-desc">Most recent sync error, if any.</div>
      </div>
      <span id="sync-last-error" style="color: var(--color-p1);">None</span>
    </div>
  `));

  // --- Agent WIP Limits ---
  settings.appendChild(createSection('Agent WIP Limits', `
    <div class="settings__row-desc" style="margin-bottom: var(--space-md);">
      Maximum tasks an agent can have in "In Progress" simultaneously.
    </div>
    <div id="agent-wip-settings">
      ${createWipRow('Hunter', 5)}
      ${createWipRow('Opus', 3)}
      ${createWipRow('Claude Code', 3)}
      ${createWipRow('Codex', 3)}
    </div>
  `));

  // --- Data Management ---
  settings.appendChild(createSection('Data', `
    <div class="settings__row">
      <div>
        <div class="settings__row-label">Export Data</div>
        <div class="settings__row-desc">Download all tasks and projects as JSON.</div>
      </div>
      <button id="setting-export" class="btn btn--secondary">Export JSON</button>
    </div>
    <div class="settings__row">
      <div>
        <div class="settings__row-label">Import Data</div>
        <div class="settings__row-desc">Import tasks from a JSON file.</div>
      </div>
      <button id="setting-import" class="btn btn--secondary">Import JSON</button>
    </div>
  `));

  container.appendChild(settings);

  // Wire up event listeners
  wireUpEvents();

  // Fetch sync status if API configured
  fetchSyncStatus();
}

async function fetchSyncStatus() {
  if (!api.isRemote()) {
    // Local-only mode: check localStorage for daemon state
    const indicator = document.getElementById('sync-status-indicator');
    if (indicator) {
      indicator.textContent = 'Local Only';
      indicator.style.background = 'var(--color-bg-secondary)';
    }
    return;
  }

  try {
    const res = await fetch(`${api.baseUrl}/api/v1/sync/status`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });

    if (res.ok) {
      const data = await res.json();
      const indicator = document.getElementById('sync-status-indicator');
      const lastTime = document.getElementById('sync-last-time');
      const lastError = document.getElementById('sync-last-error');

      if (indicator) {
        const isRecent = data.lastSyncAt &&
          (Date.now() - new Date(data.lastSyncAt).getTime()) < 10 * 60 * 1000;
        indicator.textContent = isRecent ? 'Connected' : 'Stale';
        indicator.style.background = isRecent ? 'var(--color-done-bg)' : 'var(--color-p2-bg)';
        indicator.style.color = isRecent ? 'var(--color-done)' : 'var(--color-p2)';
      }
      if (lastTime && data.lastSyncAt) {
        lastTime.textContent = new Date(data.lastSyncAt).toLocaleString();
      }
      if (lastError) {
        lastError.textContent = data.lastError || 'None';
        lastError.style.color = data.lastError ? 'var(--color-p1)' : 'var(--color-done)';
      }
    }
  } catch {
    const indicator = document.getElementById('sync-status-indicator');
    if (indicator) {
      indicator.textContent = 'Offline';
      indicator.style.background = 'var(--color-p1-bg)';
      indicator.style.color = 'var(--color-p1)';
    }
  }
}

function createSection(title, bodyHtml) {
  const section = document.createElement('div');
  section.className = 'settings__section';
  section.innerHTML = `
    <h3 class="settings__section-title">${title}</h3>
    ${bodyHtml}
  `;
  return section;
}

function createWipRow(name, defaultLimit) {
  return `
    <div class="settings__row">
      <div class="settings__row-label">${name}</div>
      <input type="number" class="input wip-input" data-agent="${name}"
        style="width: 80px;" min="1" max="20" value="${defaultLimit}">
    </div>
  `;
}

function wireUpEvents() {
  // Save connection
  const saveBtn = document.getElementById('setting-save-connection');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const url = document.getElementById('setting-api-url')?.value?.trim();
      const token = document.getElementById('setting-auth-token')?.value?.trim();
      const role = document.getElementById('setting-role')?.value;

      api.setBaseUrl(url || '');
      if (token) setToken(token); else clearToken();
      if (role) setRole(role);

      Toasts.success('Connection settings saved');
    });
  }

  // Export
  const exportBtn = document.getElementById('setting-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const state = store.getState();
      const data = {
        tasks: Object.values(state.tasks),
        projects: Object.values(state.projects),
        exportedAt: new Date().toISOString(),
        version: 'mc4-v1',
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mission-control-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      Toasts.success('Data exported');
    });
  }

  // Import
  const importBtn = document.getElementById('setting-import');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const data = JSON.parse(text);

          if (data.tasks) {
            store.dispatch({ type: 'tasks/load', payload: data.tasks });
          }
          if (data.projects) {
            store.dispatch({ type: 'projects/load', payload: data.projects });
          }

          Toasts.success(`Imported ${data.tasks?.length || 0} tasks`);
        } catch (err) {
          Toasts.error('Invalid JSON file');
        }
      });
      input.click();
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const SettingsView = { init, mount };
