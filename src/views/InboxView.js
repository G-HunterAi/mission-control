/**
 * Mission Control v4 — Inbox/Triage View
 *
 * Shows untriaged tasks (triaged=false).
 * Triage actions: set project, priority, estimate, DoD, then mark triaged.
 */

import { getInboxTasks } from '../store/selectors.js';
import { triageTask } from '../store/actions.js';
import { Toasts } from '../components/Toasts.js';

let store = null;
let container = null;
let unsubscribe = null;

function init(el, storeRef) {
  container = el;
  store = storeRef;
}

function mount(el, storeRef) {
  container = el;
  store = storeRef;

  render();

  if (unsubscribe) unsubscribe();
  unsubscribe = store.subscribe((state, prev, action) => {
    if (action.type.startsWith('task/') || action.type.startsWith('tasks/')) {
      render();
    }
  });
}

function render() {
  if (!container || !store) return;

  const state = store.getState();
  const inboxTasks = getInboxTasks(state);

  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.marginBottom = 'var(--space-xl)';
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: var(--space-md);">
      <span style="font-size: var(--text-md); font-weight: var(--font-weight-bold);">
        Inbox
      </span>
      <span class="badge badge--tag">${inboxTasks.length} items</span>
    </div>
    <p style="color: var(--color-text-secondary); font-size: var(--text-sm); margin-top: var(--space-sm);">
      New tasks that need triage. Set priority, project, and estimates before they enter planning.
    </p>
  `;
  container.appendChild(header);

  if (inboxTasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state__title">Inbox is clear</div>
      <div class="empty-state__desc">All tasks have been triaged. Nice work.</div>
    `;
    container.appendChild(empty);
    return;
  }

  // Task list
  const list = document.createElement('div');
  list.className = 'inbox-list';

  inboxTasks.forEach(task => {
    list.appendChild(createInboxItem(task));
  });

  container.appendChild(list);
}

function createInboxItem(task) {
  const item = document.createElement('div');
  item.className = 'inbox-item';
  item.dataset.taskId = task.id;

  const content = document.createElement('div');
  content.className = 'inbox-item__content';
  content.innerHTML = `
    <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs);">
      <span class="task-card__key">${task.key}</span>
      <span style="font-weight: var(--font-weight-medium);">${escapeHtml(task.title)}</span>
    </div>
    ${task.description ? `<div style="font-size: var(--text-sm); color: var(--color-text-secondary); margin-top: var(--space-xs);">${escapeHtml(task.description).slice(0, 120)}${task.description.length > 120 ? '...' : ''}</div>` : ''}
    <div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--space-xs);">
      Source: ${task.source || 'manual'}
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'inbox-item__actions';

  // Quick triage button
  const triageBtn = document.createElement('button');
  triageBtn.className = 'btn btn--primary';
  triageBtn.textContent = 'Triage';
  triageBtn.addEventListener('click', () => {
    // Quick triage with defaults
    store.dispatch(triageTask(task.id, {
      priority: task.priority || 'P3',
      status: 'backlog',
    }));
    Toasts.success(`${task.key} triaged`);
  });
  actions.appendChild(triageBtn);

  // Archive button
  const archiveBtn = document.createElement('button');
  archiveBtn.className = 'btn btn--secondary';
  archiveBtn.textContent = 'Skip';
  archiveBtn.setAttribute('aria-label', 'Archive this task');
  archiveBtn.addEventListener('click', () => {
    store.dispatch({
      type: 'task/archive',
      payload: { id: task.id },
    });
    Toasts.info(`${task.key} archived`);
  });
  actions.appendChild(archiveBtn);

  item.appendChild(content);
  item.appendChild(actions);
  return item;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const InboxView = { init, mount };
