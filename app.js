/**
 * Mission Control v4 — App Entry Point
 *
 * Bootstraps the application:
 *  - Loads seed/saved data into store
 *  - Sets up hash-based routing
 *  - Registers keyboard shortcuts
 *  - Wires global search + notification badges
 *  - Mounts views + task create/detail modals
 */

import { store } from './src/store/store.js';
import { setView, loadTasks, loadProjects, loadAgents, createTask } from './src/store/actions.js';
import { getNotificationCounts, getActiveTasks } from './src/store/selectors.js';
import { searchTasks, updateSearchIndex } from './src/utils/search.js';
import { generateId, nextMCKey } from './src/utils/ids.js';

// Views
import { KanbanView } from './src/views/KanbanView.js';
import { InboxView } from './src/views/InboxView.js';
import { CalendarView } from './src/views/CalendarView.js';
import { AgentsView } from './src/views/AgentsView.js';
import { TimelineView } from './src/views/TimelineView.js';
import { OutputsView } from './src/views/OutputsView.js';
import { SettingsView } from './src/views/SettingsView.js';
import { ConflictsView } from './src/views/ConflictsView.js';

// Components
import { CommandPalette } from './src/components/CommandPalette.js';
import { Toasts } from './src/components/Toasts.js';
import { BulkActionsBar } from './src/components/BulkActionsBar.js';
import { Modal } from './src/components/Modal.js';

// ---------- Constants ----------

const VIEW_MAP = {
  kanban:   KanbanView,
  inbox:    InboxView,
  calendar: CalendarView,
  agents:   AgentsView,
  timeline: TimelineView,
  outputs:   OutputsView,
  conflicts: ConflictsView,
  settings:  SettingsView,
};

const VIEW_TITLES = {
  kanban:    'Kanban',
  inbox:     'Inbox',
  calendar:  'Calendar',
  agents:    'Agents',
  timeline:  'Timeline',
  outputs:   'Outputs',
  conflicts: 'Conflicts',
  settings:  'Settings',
};

const STORAGE_KEY = 'mc4_state';

// ---------- Data Loading ----------

async function loadData() {
  // 1. Try localStorage first (persisted state)
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.tasks && data.tasks.length > 0) {
        store.dispatch(loadTasks(data.tasks));
        store.dispatch(loadProjects(data.projects || []));
        store.dispatch(loadAgents(data.agents || []));
        console.log(`[MC4] Loaded ${data.tasks.length} tasks from localStorage`);
        return;
      }
    } catch (e) {
      console.warn('[MC4] Failed to parse saved state:', e);
    }
  }

  // 2. Fall back to seed data
  try {
    const res = await fetch('./data/real-projects.json');
    if (res.ok) {
      const seed = await res.json();
      store.dispatch(loadTasks(seed.tasks || []));
      store.dispatch(loadProjects(seed.projects || []));
      store.dispatch(loadAgents(seed.agents || []));
      console.log(`[MC4] Loaded ${seed.tasks?.length || 0} tasks from seed data`);
    }
  } catch (e) {
    console.warn('[MC4] Could not load seed data:', e);
  }
}

function saveState() {
  const state = store.getState();
  const data = {
    tasks: Object.values(state.tasks),
    projects: Object.values(state.projects),
    agents: state.agents,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[MC4] Failed to save state:', e);
  }
}

// ---------- Router ----------

function getViewFromHash() {
  const hash = window.location.hash.replace('#/', '') || 'kanban';
  return VIEW_MAP[hash] ? hash : 'kanban';
}

export function navigateTo(viewName) {
  window.location.hash = `#/${viewName}`;
}

function handleRouteChange() {
  const viewName = getViewFromHash();
  store.dispatch(setView(viewName));
  activateView(viewName);
}

function activateView(viewName) {
  // Update view containers
  document.querySelectorAll('.view').forEach(el => {
    el.classList.toggle('view--active', el.dataset.view === viewName);
  });

  // Update sidebar active link
  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.classList.toggle('sidebar__link--active', link.dataset.view === viewName);
  });

  // Update mobile tabs
  document.querySelectorAll('.mobile-tabs__tab').forEach(tab => {
    tab.classList.toggle('mobile-tabs__tab--active', tab.dataset.view === viewName);
  });

  // Update title
  const titleEl = document.getElementById('view-title');
  if (titleEl) {
    titleEl.textContent = VIEW_TITLES[viewName] || viewName;
  }

  // Mount the view
  const ViewModule = VIEW_MAP[viewName];
  if (ViewModule && typeof ViewModule.mount === 'function') {
    const container = document.getElementById(`view-${viewName}`);
    if (container) {
      ViewModule.mount(container, store);
    }
  }
}

// ---------- Notification Badges ----------

function updateNotificationBadges() {
  const counts = getNotificationCounts(store.getState());

  setBadgeVisibility('notif-review', counts.review > 0);
  setBadgeVisibility('notif-overdue', counts.overdue > 0);
  setBadgeVisibility('notif-blocked', counts.blocked > 0);

  // Inbox badge
  const inboxBadge = document.getElementById('inbox-badge');
  if (inboxBadge) {
    if (counts.inbox > 0) {
      inboxBadge.hidden = false;
      inboxBadge.textContent = counts.inbox;
    } else {
      inboxBadge.hidden = true;
    }
  }
}

function setBadgeVisibility(id, visible) {
  const el = document.getElementById(id);
  if (el) el.hidden = !visible;
}

// ---------- Global Search ----------

function initGlobalSearch() {
  const searchInput = document.getElementById('global-search');
  if (!searchInput) return;

  let debounceTimer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length < 2) {
        const viewName = getViewFromHash();
        activateView(viewName);
        return;
      }

      const tasks = getActiveTasks(store.getState());
      const results = searchTasks(query, tasks);
      showSearchResults(results, query);
    }, 250);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchInput.blur();
      const viewName = getViewFromHash();
      activateView(viewName);
    }
  });
}

function showSearchResults(results, query) {
  const activeView = document.querySelector('.view--active');
  if (!activeView) return;

  activeView.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.style.maxWidth = '720px';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-lg);';
  header.innerHTML = `
    <h3 style="font-size:var(--text-md); font-weight:var(--font-weight-bold);">
      Search: "${escapeHtml(query)}" (${results.length})
    </h3>
    <button class="btn btn--secondary" id="clear-search">Clear</button>
  `;
  wrapper.appendChild(header);

  if (results.length === 0) {
    wrapper.innerHTML += `
      <div class="empty-state">
        <div class="empty-state__title">No tasks found</div>
        <div class="empty-state__desc">Try a different search query.</div>
      </div>`;
  } else {
    const list = document.createElement('div');
    list.className = 'inbox-list';

    results.forEach(task => {
      const item = document.createElement('div');
      item.className = 'inbox-item';
      item.style.cursor = 'pointer';
      item.innerHTML = `
        <div class="inbox-item__content">
          <div style="display:flex; align-items:center; gap:var(--space-sm); margin-bottom:4px;">
            <span class="task-card__key">${task.key}</span>
            <span class="badge badge--${task.priority?.toLowerCase()}">${task.priority}</span>
            <span class="badge badge--tag">${task.status.replace('_', ' ')}</span>
          </div>
          <div style="font-weight:var(--font-weight-medium);">${escapeHtml(task.title)}</div>
          ${task.assignedTo ? `<div style="font-size:var(--text-sm); color:var(--color-text-secondary); margin-top:2px;">Assigned to ${task.assignedTo}</div>` : ''}
        </div>`;
      item.addEventListener('click', () => openTaskDetailModal(task));
      list.appendChild(item);
    });

    wrapper.appendChild(list);
  }

  activeView.appendChild(wrapper);

  const clearBtn = document.getElementById('clear-search');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('global-search').value = '';
      activateView(getViewFromHash());
    });
  }
}

// ---------- Task Creation Modal ----------

export function openNewTaskModal() {
  const state = store.getState();
  const projects = Object.values(state.projects);

  const form = document.createElement('div');
  form.innerHTML = `
    <div class="modal__section">
      <label class="modal__label" for="new-task-title">Title *</label>
      <input type="text" id="new-task-title" class="input" placeholder="What needs to be done?" autofocus>
    </div>
    <div class="modal__section">
      <label class="modal__label" for="new-task-desc">Description</label>
      <textarea id="new-task-desc" class="input input--textarea" placeholder="Details, context, requirements..."></textarea>
    </div>
    <div class="modal__section" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md);">
      <div>
        <label class="modal__label" for="new-task-priority">Priority</label>
        <select id="new-task-priority" class="input" style="width:100%;">
          <option value="P3">P3 — Low</option>
          <option value="P2">P2 — Medium</option>
          <option value="P1">P1 — High</option>
        </select>
      </div>
      <div>
        <label class="modal__label" for="new-task-project">Project</label>
        <select id="new-task-project" class="input" style="width:100%;">
          <option value="">None</option>
          ${projects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal__section" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md);">
      <div>
        <label class="modal__label" for="new-task-assignee">Assign To</label>
        <select id="new-task-assignee" class="input" style="width:100%;">
          <option value="">Unassigned</option>
          <option value="Hunter">Hunter</option>
          <option value="Opus">Opus</option>
          <option value="Claude Code">Claude Code</option>
          <option value="Codex">Codex</option>
        </select>
      </div>
      <div>
        <label class="modal__label" for="new-task-estimate">Estimate (mins)</label>
        <input type="number" id="new-task-estimate" class="input" style="width:100%;" min="1" placeholder="60">
      </div>
    </div>
    <div class="modal__section">
      <label class="modal__label" for="new-task-deadline">Deadline</label>
      <input type="datetime-local" id="new-task-deadline" class="input">
    </div>
    <div class="modal__section">
      <label class="modal__label" for="new-task-dod">Definition of Done</label>
      <textarea id="new-task-dod" class="input input--textarea" placeholder="What does 'done' look like?"></textarea>
    </div>
    <div class="modal__section">
      <label class="modal__label" for="new-task-tags">Tags (comma-separated)</label>
      <input type="text" id="new-task-tags" class="input" placeholder="revenue, frontend, urgent">
    </div>
    <div style="display:flex; gap:var(--space-md); justify-content:flex-end; margin-top:var(--space-lg);">
      <button type="button" class="btn btn--secondary" id="new-task-cancel">Cancel</button>
      <button type="button" class="btn btn--primary" id="new-task-save">Create Task</button>
    </div>`;

  Modal.open({ title: 'New Task', content: form });

  form.querySelector('#new-task-cancel')?.addEventListener('click', () => Modal.close());

  form.querySelector('#new-task-save')?.addEventListener('click', () => {
    const title = document.getElementById('new-task-title')?.value?.trim();
    if (!title) {
      Toasts.warning('Task title is required');
      return;
    }

    const allKeys = Object.values(store.getState().tasks).map(t => t.key);
    const newKey = nextMCKey(allKeys);
    const now = new Date().toISOString();
    const deadline = document.getElementById('new-task-deadline')?.value;
    const tagsRaw = document.getElementById('new-task-tags')?.value || '';
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

    const task = {
      id: generateId(),
      key: newKey,
      title,
      description: document.getElementById('new-task-desc')?.value || '',
      status: 'backlog',
      triaged: true,
      priority: document.getElementById('new-task-priority')?.value || 'P3',
      projectId: document.getElementById('new-task-project')?.value || null,
      tags,
      assignedTo: document.getElementById('new-task-assignee')?.value || null,
      deadlineAt: deadline ? new Date(deadline).toISOString() : null,
      scheduledStartAt: null,
      scheduledEndAt: null,
      durationMins: null,
      estimateMins: parseInt(document.getElementById('new-task-estimate')?.value) || null,
      actualMins: null,
      progress: 0,
      revenuePotential: null,
      blockedBy: [],
      definitionOfDone: document.getElementById('new-task-dod')?.value || null,
      acceptanceCriteria: [],
      handoff: null,
      source: 'manual',
      apple: {},
      seriesId: null,
      recurrence: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    store.dispatch(createTask(task));
    Modal.close();
    Toasts.success(`Created ${newKey}: ${title}`);
  });
}

// ---------- Task Detail Modal ----------

export function openTaskDetailModal(task) {
  const state = store.getState();
  const project = task.projectId ? state.projects[task.projectId] : null;
  const projectName = project ? project.name : (task.projectId || 'None');

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="modal__section">
      <label class="modal__label">Title</label>
      <div style="font-size: var(--text-md); font-weight: var(--font-weight-medium);">${escapeHtml(task.title)}</div>
    </div>
    ${task.description ? `
    <div class="modal__section">
      <label class="modal__label">Description</label>
      <div style="white-space: pre-wrap;">${escapeHtml(task.description)}</div>
    </div>` : ''}
    <div class="modal__section" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
      <div>
        <label class="modal__label">Status</label>
        <div><span class="badge badge--tag">${task.status.replace('_', ' ')}</span></div>
      </div>
      <div>
        <label class="modal__label">Priority</label>
        <div><span class="badge badge--${task.priority?.toLowerCase()}">${task.priority || 'None'}</span></div>
      </div>
      <div>
        <label class="modal__label">Assigned To</label>
        <div>${task.assignedTo ? `<span class="badge badge--agent">${task.assignedTo}</span>` : 'Unassigned'}</div>
      </div>
      <div>
        <label class="modal__label">Project</label>
        <div>${projectName !== 'None' ? `<span class="badge badge--tag">${escapeHtml(projectName)}</span>` : 'None'}</div>
      </div>
    </div>
    ${task.deadlineAt ? `
    <div class="modal__section" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
      <div>
        <label class="modal__label">Deadline</label>
        <div>${new Date(task.deadlineAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      </div>
      ${task.estimateMins ? `<div>
        <label class="modal__label">Estimate</label>
        <div>${task.estimateMins} mins${task.actualMins ? ` (actual: ${task.actualMins})` : ''}</div>
      </div>` : ''}
    </div>` : ''}
    ${task.tags?.length > 0 ? `
    <div class="modal__section">
      <label class="modal__label">Tags</label>
      <div style="display:flex; flex-wrap:wrap; gap:4px;">
        ${task.tags.map(t => `<span class="badge badge--tag">${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>` : ''}
    ${task.isBlocked ? `
    <div class="modal__section" style="background: var(--color-blocked-bg); padding: var(--space-md); border-radius: var(--radius-md);">
      <label class="modal__label" style="color: var(--color-blocked);">Blocked</label>
      <div style="font-size: var(--text-sm);">Blocked by ${task.blockedBy.length} task(s).</div>
    </div>` : ''}
    ${task.definitionOfDone ? `
    <div class="modal__section">
      <label class="modal__label">Definition of Done</label>
      <div style="white-space: pre-wrap; font-size: var(--text-sm); background: var(--color-bg-secondary); padding: var(--space-md); border-radius: var(--radius-md);">${escapeHtml(task.definitionOfDone)}</div>
    </div>` : ''}
    ${task.acceptanceCriteria?.length > 0 ? `
    <div class="modal__section">
      <label class="modal__label">Acceptance Criteria</label>
      <ul style="list-style:none; padding:0;">
        ${task.acceptanceCriteria.map(ac => `
          <li style="display:flex; align-items:center; gap:8px; padding:4px 0;">
            <span style="color: ${ac.done ? 'var(--color-done)' : 'var(--color-text-muted)'}; font-size:16px;">${ac.done ? '&#10003;' : '&#9675;'}</span>
            <span style="${ac.done ? 'text-decoration:line-through; color:var(--color-text-muted);' : ''}">${escapeHtml(ac.text)}</span>
          </li>`).join('')}
      </ul>
    </div>` : ''}
    ${task.handoff ? `
    <div class="modal__section" style="background: var(--color-teal-light); padding: var(--space-lg); border-radius: var(--radius-md);">
      <label class="modal__label" style="color: var(--color-teal-dark);">Handoff: ${escapeHtml(task.handoff.from)} → ${escapeHtml(task.handoff.to)}</label>
      <div style="margin-top:var(--space-sm); font-size:var(--text-sm);">${escapeHtml(task.handoff.summary)}</div>
      ${task.handoff.nextSteps?.length > 0 ? `
        <div style="margin-top:var(--space-sm);">
          <strong style="font-size:var(--text-sm);">Next steps:</strong>
          <ul style="padding-left:var(--space-lg); font-size:var(--text-sm);">
            ${task.handoff.nextSteps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>` : ''}
    </div>` : ''}
    ${task.progress > 0 ? `
    <div class="modal__section">
      <label class="modal__label">Progress</label>
      <div style="display:flex; align-items:center; gap:var(--space-md);">
        <div style="flex:1; height:8px; background:var(--color-border); border-radius:var(--radius-full); overflow:hidden;">
          <div style="height:100%; width:${Math.round(task.progress * 100)}%; background:var(--color-teal); border-radius:var(--radius-full);"></div>
        </div>
        <span style="font-size:var(--text-sm); font-weight:var(--font-weight-medium);">${Math.round(task.progress * 100)}%</span>
      </div>
    </div>` : ''}
    <div class="modal__section" style="border-top:1px solid var(--color-border-light); padding-top:var(--space-md); margin-top:var(--space-md);">
      <div style="font-size:var(--text-xs); color:var(--color-text-muted);">
        Created: ${new Date(task.createdAt).toLocaleString()} &bull;
        Updated: ${new Date(task.updatedAt).toLocaleString()}
        ${task.completedAt ? ` &bull; Completed: ${new Date(task.completedAt).toLocaleString()}` : ''}
        ${task.source !== 'manual' ? ` &bull; Source: ${task.source}` : ''}
      </div>
    </div>
    <div style="display:flex; gap:var(--space-md); justify-content:flex-end; margin-top:var(--space-lg); border-top:1px solid var(--color-border-light); padding-top:var(--space-lg);">
      <button type="button" class="btn btn--secondary" id="detail-close-btn">Close</button>
      <button type="button" class="btn btn--primary" id="detail-edit-btn">Edit Task</button>
    </div>`;

  Modal.open({ title: `${task.key}: ${task.title}`, content, size: 'large' });

  content.querySelector('#detail-close-btn')?.addEventListener('click', () => Modal.close());
  content.querySelector('#detail-edit-btn')?.addEventListener('click', () => {
    Modal.close();
    openEditTaskModal(task);
  });
}

// ---------- Task Edit Modal ----------

export function openEditTaskModal(task) {
  const state = store.getState();
  const projects = Object.values(state.projects);
  const deadlineVal = task.deadlineAt ? new Date(task.deadlineAt).toISOString().slice(0, 16) : '';
  const tagsVal = (task.tags || []).join(', ');

  const form = document.createElement('div');
  form.innerHTML = `
    <div class="modal__section">
      <label class="modal__label" for="edit-task-title">Title *</label>
      <input type="text" id="edit-task-title" class="input" value="${escapeHtml(task.title)}">
    </div>
    <div class="modal__section">
      <label class="modal__label" for="edit-task-desc">Description</label>
      <textarea id="edit-task-desc" class="input input--textarea">${escapeHtml(task.description || '')}</textarea>
    </div>
    <div class="modal__section" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md);">
      <div>
        <label class="modal__label" for="edit-task-status">Status</label>
        <select id="edit-task-status" class="input" style="width:100%;">
          <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
          <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="review" ${task.status === 'review' ? 'selected' : ''}>Review</option>
          <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
      <div>
        <label class="modal__label" for="edit-task-priority">Priority</label>
        <select id="edit-task-priority" class="input" style="width:100%;">
          <option value="P1" ${task.priority === 'P1' ? 'selected' : ''}>P1 — High</option>
          <option value="P2" ${task.priority === 'P2' ? 'selected' : ''}>P2 — Medium</option>
          <option value="P3" ${task.priority === 'P3' ? 'selected' : ''}>P3 — Low</option>
        </select>
      </div>
    </div>
    <div class="modal__section" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md);">
      <div>
        <label class="modal__label" for="edit-task-project">Project</label>
        <select id="edit-task-project" class="input" style="width:100%;">
          <option value="">None</option>
          ${projects.map(p => `<option value="${p.id}" ${task.projectId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="modal__label" for="edit-task-assignee">Assign To</label>
        <select id="edit-task-assignee" class="input" style="width:100%;">
          <option value="">Unassigned</option>
          <option value="Hunter" ${task.assignedTo === 'Hunter' ? 'selected' : ''}>Hunter</option>
          <option value="Opus" ${task.assignedTo === 'Opus' ? 'selected' : ''}>Opus</option>
          <option value="Claude Code" ${task.assignedTo === 'Claude Code' ? 'selected' : ''}>Claude Code</option>
          <option value="Codex" ${task.assignedTo === 'Codex' ? 'selected' : ''}>Codex</option>
        </select>
      </div>
    </div>
    <div class="modal__section" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md);">
      <div>
        <label class="modal__label" for="edit-task-deadline">Deadline</label>
        <input type="datetime-local" id="edit-task-deadline" class="input" value="${deadlineVal}">
      </div>
      <div>
        <label class="modal__label" for="edit-task-estimate">Estimate (mins)</label>
        <input type="number" id="edit-task-estimate" class="input" style="width:100%;" min="1" value="${task.estimateMins || ''}">
      </div>
    </div>
    <div class="modal__section">
      <label class="modal__label" for="edit-task-progress">Progress (%)</label>
      <input type="range" id="edit-task-progress" min="0" max="100" value="${Math.round((task.progress || 0) * 100)}" style="width:100%;">
      <span id="edit-progress-label" style="font-size:var(--text-sm); color:var(--color-text-secondary);">${Math.round((task.progress || 0) * 100)}%</span>
    </div>
    <div class="modal__section">
      <label class="modal__label" for="edit-task-dod">Definition of Done</label>
      <textarea id="edit-task-dod" class="input input--textarea">${escapeHtml(task.definitionOfDone || '')}</textarea>
    </div>
    <div class="modal__section">
      <label class="modal__label" for="edit-task-tags">Tags (comma-separated)</label>
      <input type="text" id="edit-task-tags" class="input" value="${escapeHtml(tagsVal)}">
    </div>
    <div style="display:flex; gap:var(--space-md); justify-content:flex-end; margin-top:var(--space-lg);">
      <button type="button" class="btn btn--secondary" id="edit-task-cancel">Cancel</button>
      <button type="button" class="btn btn--primary" id="edit-task-save">Save Changes</button>
    </div>`;

  Modal.open({ title: `Edit ${task.key}`, content: form, size: 'large' });

  // Live progress label
  const progressSlider = form.querySelector('#edit-task-progress');
  const progressLabel = form.querySelector('#edit-progress-label');
  if (progressSlider && progressLabel) {
    progressSlider.addEventListener('input', () => {
      progressLabel.textContent = `${progressSlider.value}%`;
    });
  }

  form.querySelector('#edit-task-cancel')?.addEventListener('click', () => Modal.close());

  form.querySelector('#edit-task-save')?.addEventListener('click', () => {
    const title = document.getElementById('edit-task-title')?.value?.trim();
    if (!title) {
      Toasts.warning('Task title is required');
      return;
    }

    const deadline = document.getElementById('edit-task-deadline')?.value;
    const tagsRaw = document.getElementById('edit-task-tags')?.value || '';
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const newStatus = document.getElementById('edit-task-status')?.value;

    const changes = {
      title,
      description: document.getElementById('edit-task-desc')?.value || '',
      status: newStatus,
      priority: document.getElementById('edit-task-priority')?.value || 'P3',
      projectId: document.getElementById('edit-task-project')?.value || null,
      assignedTo: document.getElementById('edit-task-assignee')?.value || null,
      deadlineAt: deadline ? new Date(deadline).toISOString() : null,
      estimateMins: parseInt(document.getElementById('edit-task-estimate')?.value) || null,
      progress: parseInt(document.getElementById('edit-task-progress')?.value || '0') / 100,
      definitionOfDone: document.getElementById('edit-task-dod')?.value || null,
      tags,
      updatedAt: new Date().toISOString(),
    };

    // Set completedAt if transitioning to done
    if (newStatus === 'done' && task.status !== 'done') {
      changes.completedAt = new Date().toISOString();
    } else if (newStatus !== 'done') {
      changes.completedAt = null;
    }

    store.dispatch({ type: 'task/update', payload: { id: task.id, changes } });
    Modal.close();
    Toasts.success(`Updated ${task.key}`);

    // Re-render current view
    const viewName = getViewFromHash();
    activateView(viewName);
  });
}

// ---------- Keyboard Shortcuts ----------

function registerKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Cmd/Ctrl + K → Command Palette (always works)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      CommandPalette.toggle();
      return;
    }

    // Escape → Close modals / command palette
    if (e.key === 'Escape') {
      if (Modal.isOpen()) { Modal.close(); return; }
      CommandPalette.close();
      return;
    }

    // Shortcuts only when not typing
    if (isInput) return;

    // N → New task
    if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      openNewTaskModal();
      return;
    }

    // / → Focus search
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
      return;
    }
  });
}

// ---------- Bootstrap ----------

async function init() {
  // Load data
  await loadData();

  // Set up routing
  window.addEventListener('hashchange', handleRouteChange);

  // Set initial route
  if (!window.location.hash) {
    window.location.hash = '#/kanban';
  }
  handleRouteChange();

  // Register keyboard shortcuts
  registerKeyboardShortcuts();

  // Initialize global components
  Toasts.init();
  CommandPalette.init();
  CommandPalette.registerCommands([
    { label: 'New Task', action: () => openNewTaskModal(), shortcut: 'N' },
  ]);
  BulkActionsBar.init((action, ids) => {
    if (!ids.length) return;

    switch (action) {
      case 'assign': {
        const who = prompt('Assign to (Hunter, Opus, Claude Code, Codex):');
        if (!who) return;
        ids.forEach(id => {
          store.dispatch({ type: 'task/update', payload: { id, changes: { assignedTo: who, updatedAt: new Date().toISOString() } } });
        });
        Toasts.success(`Assigned ${ids.length} tasks to ${who}`);
        break;
      }
      case 'priority': {
        const p = prompt('Set priority (P1, P2, P3):');
        if (!p || !['P1','P2','P3'].includes(p.toUpperCase())) return;
        ids.forEach(id => {
          store.dispatch({ type: 'task/update', payload: { id, changes: { priority: p.toUpperCase(), updatedAt: new Date().toISOString() } } });
        });
        Toasts.success(`Set ${ids.length} tasks to ${p.toUpperCase()}`);
        break;
      }
      case 'move': {
        const status = prompt('Move to (backlog, in_progress, review, done):');
        if (!status || !['backlog','in_progress','review','done'].includes(status)) return;
        ids.forEach(id => {
          const changes = { status, updatedAt: new Date().toISOString() };
          if (status === 'done') changes.completedAt = new Date().toISOString();
          store.dispatch({ type: 'task/update', payload: { id, changes } });
        });
        Toasts.success(`Moved ${ids.length} tasks to ${status.replace('_', ' ')}`);
        break;
      }
      case 'archive': {
        ids.forEach(id => {
          store.dispatch({ type: 'task/archive', payload: { id } });
        });
        Toasts.info(`Archived ${ids.length} tasks`);
        break;
      }
    }

    BulkActionsBar.clear();
    const viewName = getViewFromHash();
    activateView(viewName);
  });

  // Initialize global search
  initGlobalSearch();

  // Update notification badges + auto-save on state changes
  updateNotificationBadges();
  store.subscribe(() => {
    updateNotificationBadges();
    saveState();
  });

  // Update search index when tasks change
  store.subscribe((state) => {
    updateSearchIndex(Object.values(state.tasks));
  });
  updateSearchIndex(Object.values(store.getState().tasks));

  // Init all views
  Object.entries(VIEW_MAP).forEach(([name, ViewModule]) => {
    const container = document.getElementById(`view-${name}`);
    if (container && typeof ViewModule.init === 'function') {
      ViewModule.init(container, store);
    }
  });

  console.log('[MC4] Mission Control v4 initialized.');
  console.log(`[MC4] ${Object.keys(store.getState().tasks).length} tasks loaded`);
  console.log(`[MC4] ${Object.keys(store.getState().projects).length} projects loaded`);
}

// ---------- Helpers ----------

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { store };
