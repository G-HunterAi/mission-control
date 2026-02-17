/**
 * Mission Control v4 — Timeline View
 *
 * Append-only activity feed. Filterable by actor, type, task, project.
 */

import { relativeTime } from '../utils/dates.js';

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
  if (!container || !store) return;

  const state = store.getState();
  const activity = state.activity || [];

  container.innerHTML = '';

  // Header + filters
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-xl);';
  header.innerHTML = `
    <span style="font-size: var(--text-md); font-weight: var(--font-weight-bold);">Activity Timeline</span>
    <span class="badge badge--tag">${activity.length} events</span>
  `;

  // Filter bar
  const filters = document.createElement('div');
  filters.style.cssText = 'display: flex; gap: var(--space-sm); margin-left: auto;';
  filters.innerHTML = `
    <select class="input" id="timeline-filter-type" style="font-size: var(--text-sm); padding: var(--space-xs) var(--space-sm);">
      <option value="">All types</option>
      <option value="task.created">Created</option>
      <option value="task.updated">Updated</option>
      <option value="task.moved">Moved</option>
      <option value="comment.created">Comment</option>
      <option value="sync.conflict">Sync Conflict</option>
      <option value="sync.error">Sync Error</option>
    </select>
    <select class="input" id="timeline-filter-actor" style="font-size: var(--text-sm); padding: var(--space-xs) var(--space-sm);">
      <option value="">All actors</option>
      <option value="Hunter">Hunter</option>
      <option value="Opus">Opus</option>
      <option value="Claude Code">Claude Code</option>
      <option value="Codex">Codex</option>
      <option value="System">System</option>
      <option value="AppleDaemon">AppleDaemon</option>
    </select>
  `;
  header.appendChild(filters);
  container.appendChild(header);

  if (activity.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state__title">No activity yet</div>
      <div class="empty-state__desc">Activity will appear here as tasks are created, updated, and synced.</div>
    `;
    container.appendChild(empty);
    return;
  }

  // Timeline list
  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  activity.forEach(event => {
    const item = document.createElement('div');
    item.className = 'timeline__item';

    const dotColor = getEventColor(event.type);

    item.innerHTML = `
      <div class="timeline__dot" style="background: ${dotColor};"></div>
      <div style="flex: 1;">
        <div class="timeline__text">
          <strong>${escapeHtml(event.actor || 'System')}</strong>
          ${formatEventType(event.type)}
          ${event.taskId ? `<span class="task-card__key" style="margin-left: 4px;">${event.taskId}</span>` : ''}
        </div>
        ${event.meta?.message ? `<div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px;">${escapeHtml(event.meta.message)}</div>` : ''}
        <div class="timeline__time">${relativeTime(event.ts)}</div>
      </div>
    `;

    timeline.appendChild(item);
  });

  container.appendChild(timeline);
}

function formatEventType(type) {
  const map = {
    'task.created':    'created a task',
    'task.updated':    'updated a task',
    'task.moved':      'moved a task',
    'task.archived':   'archived a task',
    'task.restored':   'restored a task',
    'comment.created': 'added a comment',
    'output.created':  'added an output',
    'sync.conflict':   'sync conflict detected',
    'sync.error':      'sync error occurred',
    'sync.heartbeat':  'sync heartbeat',
  };
  return map[type] || type;
}

function getEventColor(type) {
  if (type?.startsWith('sync.error') || type?.startsWith('sync.conflict')) return 'var(--color-p1)';
  if (type?.startsWith('task.created')) return 'var(--color-done)';
  if (type?.startsWith('task.moved')) return 'var(--color-teal)';
  return 'var(--color-text-muted)';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const TimelineView = { init, mount };
