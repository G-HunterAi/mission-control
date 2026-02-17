/**
 * Mission Control v4 — Kanban View
 *
 * 4-column board: Backlog, In Progress, Review, Done.
 * SortableJS drag-and-drop with blocked enforcement and WIP limits.
 */

import { getTasksByStatus } from '../store/selectors.js';
import { moveTask } from '../store/actions.js';
import { createTaskCard } from '../components/TaskCard.js';
import { Modal } from '../components/Modal.js';
import { canTransitionTo } from '../api/auth.js';
import { Toasts } from '../components/Toasts.js';

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog',     status: 'backlog' },
  { id: 'in_progress', label: 'In Progress', status: 'in_progress', wipLimit: 5 },
  { id: 'review',      label: 'Review',      status: 'review', wipLimit: 3 },
  { id: 'done',        label: 'Done',        status: 'done' },
];

let store = null;
let container = null;
let sortableInstances = [];
let unsubscribe = null;

function init(el, storeRef) {
  container = el;
  store = storeRef;
}

function mount(el, storeRef) {
  container = el;
  store = storeRef;

  render();

  // Subscribe to state changes
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
  const tasksByStatus = getTasksByStatus(state);

  container.innerHTML = '';

  const kanban = document.createElement('div');
  kanban.className = 'kanban';

  COLUMNS.forEach(col => {
    const column = createColumn(col, tasksByStatus[col.status] || []);
    kanban.appendChild(column);
  });

  container.appendChild(kanban);

  // Initialize drag-and-drop
  initSortable();
}

function createColumn(colDef, tasks) {
  const column = document.createElement('div');
  column.className = 'kanban__column';
  column.dataset.status = colDef.status;

  // Header
  const header = document.createElement('div');
  header.className = 'kanban__column-header';

  const titleRow = document.createElement('div');
  titleRow.style.display = 'flex';
  titleRow.style.alignItems = 'center';
  titleRow.style.gap = '8px';

  const title = document.createElement('span');
  title.className = 'kanban__column-title';
  title.textContent = colDef.label;
  titleRow.appendChild(title);

  const count = document.createElement('span');
  count.className = 'kanban__column-count';
  count.textContent = tasks.length;
  titleRow.appendChild(count);

  header.appendChild(titleRow);

  if (colDef.wipLimit) {
    const wip = document.createElement('span');
    wip.className = 'kanban__column-wip';
    const isOver = tasks.filter(t => t.status === colDef.status && !t.archivedAt).length > colDef.wipLimit;
    wip.textContent = `WIP ${colDef.wipLimit}`;
    if (isOver) wip.style.color = 'var(--color-p1)';
    header.appendChild(wip);
  }

  column.appendChild(header);

  // Card list
  const cardList = document.createElement('div');
  cardList.className = 'kanban__card-list';
  cardList.dataset.status = colDef.status;

  // Sort by priority score
  const sorted = [...tasks].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  if (sorted.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="empty-state__desc">No tasks</div>`;
    cardList.appendChild(empty);
  } else {
    sorted.forEach(task => {
      const card = createTaskCard(task, {
        onClick: (t) => openTaskDetail(t),
        onSelect: (id, selected) => {
          // Bulk selection handled by BulkActionsBar
        },
        selectable: true,
      });
      cardList.appendChild(card);
    });
  }

  column.appendChild(cardList);
  return column;
}

function initSortable() {
  // Destroy previous instances
  sortableInstances.forEach(s => s.destroy());
  sortableInstances = [];

  if (typeof Sortable === 'undefined') {
    console.warn('[Kanban] SortableJS not loaded, drag-and-drop disabled');
    return;
  }

  const lists = container.querySelectorAll('.kanban__card-list');

  lists.forEach(list => {
    const instance = new Sortable(list, {
      group: 'kanban',
      animation: 150,
      ghostClass: 'task-card--ghost',
      dragClass: 'task-card--drag',
      handle: '.task-card',

      onEnd: (evt) => {
        const taskId = evt.item.dataset.taskId;
        const newStatus = evt.to.dataset.status;
        const task = store.getState().tasks[taskId];

        if (!task) return;

        // Enforce blocked rule
        if (newStatus === 'in_progress' && task.isBlocked) {
          Toasts.warning('Blocked tasks cannot move to In Progress');
          render(); // Re-render to snap back
          return;
        }

        // Enforce permissions
        if (!canTransitionTo(newStatus, task)) {
          Toasts.warning('You don\'t have permission for this transition');
          render();
          return;
        }

        store.dispatch(moveTask(taskId, newStatus));
      },
    });

    sortableInstances.push(instance);
  });
}

function openTaskDetail(task) {
  const content = document.createElement('div');

  // Task detail form
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
        <div><span class="badge badge--tag">${task.status}</span></div>
      </div>
      <div>
        <label class="modal__label">Priority</label>
        <div><span class="badge badge--${task.priority?.toLowerCase()}">${task.priority || 'None'}</span></div>
      </div>
      <div>
        <label class="modal__label">Assigned To</label>
        <div>${task.assignedTo || 'Unassigned'}</div>
      </div>
      <div>
        <label class="modal__label">Project</label>
        <div>${task.projectId || 'None'}</div>
      </div>
    </div>

    ${task.definitionOfDone ? `
    <div class="modal__section">
      <label class="modal__label">Definition of Done</label>
      <div style="white-space: pre-wrap;">${escapeHtml(task.definitionOfDone)}</div>
    </div>` : ''}

    ${task.acceptanceCriteria?.length > 0 ? `
    <div class="modal__section">
      <label class="modal__label">Acceptance Criteria</label>
      <ul style="padding-left: var(--space-lg);">
        ${task.acceptanceCriteria.map(ac => `
          <li style="margin-bottom: 4px;">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" ${ac.done ? 'checked' : ''} disabled>
              ${escapeHtml(ac.text)}
            </label>
          </li>
        `).join('')}
      </ul>
    </div>` : ''}

    ${task.handoff ? `
    <div class="modal__section" style="background: var(--color-bg-secondary); padding: var(--space-md); border-radius: var(--radius-md);">
      <label class="modal__label">Handoff: ${escapeHtml(task.handoff.from)} → ${escapeHtml(task.handoff.to)}</label>
      <div style="margin-top: var(--space-sm);">${escapeHtml(task.handoff.summary)}</div>
      ${task.handoff.nextSteps?.length > 0 ? `
        <div style="margin-top: var(--space-sm);">
          <strong>Next steps:</strong>
          <ul style="padding-left: var(--space-lg);">
            ${task.handoff.nextSteps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>` : ''}
    </div>` : ''}
  `;

  Modal.open({
    title: `${task.key}: ${task.title}`,
    content,
    size: 'large',
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const KanbanView = { init, mount };
