/**
 * Mission Control v4 — Conflicts View
 *
 * Display pending sync conflicts between Apple and MC.
 * Shows side-by-side comparison with resolve buttons:
 *   - "Use Apple Version"
 *   - "Use MC Version"
 *   - "Merge Both"
 */

import { api } from '../api/apiClient.js';
import { getToken } from '../api/auth.js';
import { Toasts } from '../components/Toasts.js';
import { relativeTime } from '../utils/dates.js';

let store = null;
let container = null;
let conflicts = [];
let filterStatus = 'pending';

function init(el, storeRef) {
  container = el;
  store = storeRef;
}

function mount(el, storeRef) {
  container = el;
  store = storeRef;
  conflicts = [];
  filterStatus = 'pending';

  render();
  fetchConflicts();
}

async function fetchConflicts() {
  if (!api.isRemote()) {
    // Local mode — no conflicts possible
    render();
    return;
  }

  try {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const res = await fetch(`${api.baseUrl}/api/v1/sync/conflicts${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });

    if (res.ok) {
      const data = await res.json();
      conflicts = data.conflicts || [];
    } else {
      conflicts = [];
    }
  } catch {
    conflicts = [];
  }

  render();
}

function render() {
  if (!container) return;
  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.marginBottom = 'var(--space-xl)';
  header.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <span style="font-size: var(--text-md); font-weight: var(--font-weight-bold);">
          Sync Conflicts
        </span>
        <span class="badge badge--tag" style="margin-left: var(--space-sm);">
          ${conflicts.filter(c => c.status === 'pending').length} pending
        </span>
        <p style="color: var(--color-text-secondary); font-size: var(--text-sm); margin-top: var(--space-sm);">
          Resolve conflicts between Apple and Mission Control data.
        </p>
      </div>
      <div style="display: flex; gap: var(--space-sm);">
        <button class="btn ${filterStatus === 'pending' ? 'btn--primary' : 'btn--secondary'}" id="filter-pending">Pending</button>
        <button class="btn ${filterStatus === 'resolved' ? 'btn--primary' : 'btn--secondary'}" id="filter-resolved">Resolved</button>
        <button class="btn ${filterStatus === null ? 'btn--primary' : 'btn--secondary'}" id="filter-all">All</button>
      </div>
    </div>
  `;
  container.appendChild(header);

  // Wire filter buttons
  setTimeout(() => {
    document.getElementById('filter-pending')?.addEventListener('click', () => {
      filterStatus = 'pending';
      fetchConflicts();
    });
    document.getElementById('filter-resolved')?.addEventListener('click', () => {
      filterStatus = 'resolved';
      fetchConflicts();
    });
    document.getElementById('filter-all')?.addEventListener('click', () => {
      filterStatus = null;
      fetchConflicts();
    });
  }, 0);

  if (!api.isRemote()) {
    const info = document.createElement('div');
    info.className = 'empty-state';
    info.innerHTML = `
      <div class="empty-state__title">Local Mode</div>
      <div class="empty-state__desc">Sync conflicts are only tracked when connected to the MC backend API.</div>
    `;
    container.appendChild(info);
    return;
  }

  if (conflicts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state__title">No conflicts</div>
      <div class="empty-state__desc">${filterStatus === 'pending' ? 'All sync conflicts have been resolved.' : 'No conflicts found with current filter.'}</div>
    `;
    container.appendChild(empty);
    return;
  }

  // Conflict list
  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column; gap:var(--space-md); max-width:800px;';

  conflicts.forEach(conflict => {
    list.appendChild(createConflictCard(conflict));
  });

  container.appendChild(list);
}

function createConflictCard(conflict) {
  const card = document.createElement('div');
  card.className = 'conflict-card';
  card.style.cssText = `
    background: var(--color-surface);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
    ${conflict.status === 'resolved' ? 'opacity: 0.7;' : ''}
  `;

  const isPending = conflict.status === 'pending';

  card.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md);">
      <div style="display:flex; align-items:center; gap:var(--space-sm);">
        <span class="task-card__key">${conflict.task_id || 'Unknown'}</span>
        <span class="badge badge--tag">${escapeHtml(conflict.type)}</span>
        <span class="badge ${isPending ? 'badge--p2' : 'badge--done'}">${conflict.status}</span>
      </div>
      <span style="font-size:var(--text-xs); color:var(--color-text-muted);">${relativeTime(conflict.created_at)}</span>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md); margin-bottom:var(--space-md);">
      <div style="padding:var(--space-md); background:var(--color-p3-bg); border-radius:var(--radius-md);">
        <div style="font-size:var(--text-xs); font-weight:var(--font-weight-bold); color:var(--color-p3); margin-bottom:var(--space-xs);">Apple Version</div>
        <div style="font-size:var(--text-sm); word-break:break-word;">${escapeHtml(conflict.apple_value || '(empty)')}</div>
        <div style="font-size:var(--text-xs); color:var(--color-text-muted); margin-top:var(--space-xs);">
          ${conflict.apple_timestamp ? new Date(conflict.apple_timestamp).toLocaleString() : ''}
        </div>
      </div>
      <div style="padding:var(--space-md); background:var(--color-teal-light); border-radius:var(--radius-md);">
        <div style="font-size:var(--text-xs); font-weight:var(--font-weight-bold); color:var(--color-teal-dark); margin-bottom:var(--space-xs);">MC Version</div>
        <div style="font-size:var(--text-sm); word-break:break-word;">${escapeHtml(conflict.mc_value || '(empty)')}</div>
        <div style="font-size:var(--text-xs); color:var(--color-text-muted); margin-top:var(--space-xs);">
          ${conflict.mc_timestamp ? new Date(conflict.mc_timestamp).toLocaleString() : ''}
        </div>
      </div>
    </div>

    ${isPending ? `
    <div style="display:flex; gap:var(--space-sm); justify-content:flex-end;">
      <button class="btn btn--secondary resolve-btn" data-id="${conflict.id}" data-resolution="apple" data-value="${escapeAttr(conflict.apple_value)}">Use Apple Version</button>
      <button class="btn btn--secondary resolve-btn" data-id="${conflict.id}" data-resolution="mc" data-value="${escapeAttr(conflict.mc_value)}">Use MC Version</button>
      <button class="btn btn--primary resolve-btn" data-id="${conflict.id}" data-resolution="merge" data-value="${escapeAttr(conflict.apple_value)}">Merge Both</button>
    </div>
    ` : `
    <div style="font-size:var(--text-sm); color:var(--color-text-secondary);">
      Resolved: <strong>${escapeHtml(conflict.resolved_value || '')}</strong>
      by ${escapeHtml(conflict.resolved_by || 'auto')}
      ${conflict.resolved_at ? `at ${new Date(conflict.resolved_at).toLocaleString()}` : ''}
    </div>
    `}
  `;

  // Wire resolve buttons
  if (isPending) {
    setTimeout(() => {
      card.querySelectorAll('.resolve-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.id);
          const resolution = btn.dataset.resolution;
          let value = btn.dataset.value;

          if (resolution === 'merge') {
            const merged = prompt(
              'Edit merged value:',
              `${conflict.apple_value} | ${conflict.mc_value}`
            );
            if (merged === null) return;
            value = merged;
          }

          await resolveConflict(id, resolution, value);
        });
      });
    }, 0);
  }

  return card;
}

async function resolveConflict(id, resolution, value) {
  try {
    const res = await fetch(`${api.baseUrl}/api/v1/sync/conflicts/${id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        resolution,
        value,
        resolved_by: 'owner',
      }),
    });

    if (res.ok) {
      Toasts.success('Conflict resolved');
      fetchConflicts();
    } else {
      Toasts.error('Failed to resolve conflict');
    }
  } catch {
    Toasts.error('Failed to resolve conflict');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const ConflictsView = { init, mount };
