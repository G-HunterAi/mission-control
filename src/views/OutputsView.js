/**
 * Mission Control v4 — Outputs View
 *
 * Grid/list of task outputs (files, URLs, images, videos).
 * Filterable by task/project.
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

  // Flatten all outputs across tasks
  const allOutputs = [];
  Object.entries(state.outputs || {}).forEach(([taskId, outputs]) => {
    outputs.forEach(output => {
      const task = state.tasks[taskId];
      allOutputs.push({
        ...output,
        taskKey: task?.key || taskId,
        taskTitle: task?.title || '',
      });
    });
  });

  // Sort by newest first
  allOutputs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.marginBottom = 'var(--space-xl)';
  header.innerHTML = `
    <span style="font-size: var(--text-md); font-weight: var(--font-weight-bold);">Outputs</span>
    <span class="badge badge--tag" style="margin-left: var(--space-sm);">${allOutputs.length} items</span>
    <p style="color: var(--color-text-secondary); font-size: var(--text-sm); margin-top: var(--space-sm);">
      Files, links, and deliverables produced by tasks. URLs work cross-device.
    </p>
  `;
  container.appendChild(header);

  if (allOutputs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state__title">No outputs yet</div>
      <div class="empty-state__desc">Outputs will appear here as agents produce deliverables.</div>
    `;
    container.appendChild(empty);
    return;
  }

  // Grid
  const grid = document.createElement('div');
  grid.className = 'outputs-grid';

  allOutputs.forEach(output => {
    grid.appendChild(createOutputCard(output));
  });

  container.appendChild(grid);
}

function createOutputCard(output) {
  const card = document.createElement('div');
  card.className = 'output-card';

  const icon = getTypeIcon(output.type);

  card.innerHTML = `
    <div class="output-card__icon">${icon}</div>
    <div class="output-card__label">${escapeHtml(output.label)}</div>
    <div class="output-card__meta">
      ${output.taskKey} &bull; ${output.type}
      ${output.mime ? ` &bull; ${output.mime}` : ''}
    </div>
    <div class="output-card__meta">${relativeTime(output.createdAt)}</div>
    ${output.url ? `<a href="${escapeHtml(output.url)}" target="_blank" rel="noopener" class="btn btn--secondary" style="margin-top: var(--space-sm); font-size: var(--text-xs);">Open</a>` : ''}
  `;

  return card;
}

function getTypeIcon(type) {
  const icons = {
    file:  '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 2h8l4 4v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z"/></svg>',
    url:   '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 12l4-4M6.5 13.5a3.5 3.5 0 010-5l2-2a3.5 3.5 0 015 5M13.5 6.5a3.5 3.5 0 010 5l-2 2a3.5 3.5 0 01-5-5"/></svg>',
    image: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="16" height="16" rx="2"/><circle cx="7" cy="7" r="2"/><path d="M18 13l-4-4-8 8"/></svg>',
    video: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="12" height="12" rx="2"/><path d="M14 8l4-2v8l-4-2"/></svg>',
  };
  return icons[type] || icons.file;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const OutputsView = { init, mount };
