/**
 * Mission Control v4 — TaskCard Component
 *
 * Renders a draggable task card with priority badge, project tag,
 * assignee, deadline/schedule badges, blocked indicator, and progress bar.
 */

import { formatDate, deadlineStatus, formatDuration } from '../utils/dates.js';

/**
 * Create a task card DOM element
 * @param {object} task - Task object from store
 * @param {object} options
 * @param {Function} options.onClick - Card click handler
 * @param {Function} options.onSelect - Checkbox select handler
 * @param {boolean} options.selectable - Show selection checkbox
 * @returns {HTMLElement}
 */
export function createTaskCard(task, options = {}) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.taskId = task.id;
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Task ${task.key}: ${task.title}`);

  if (task.isBlocked) card.classList.add('task-card--blocked');

  // Header: key + title
  const header = document.createElement('div');
  header.className = 'task-card__header';

  if (options.selectable) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-card__checkbox';
    checkbox.setAttribute('aria-label', `Select ${task.key}`);
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.toggle('task-card--selected', checkbox.checked);
      options.onSelect?.(task.id, checkbox.checked);
    });
    header.appendChild(checkbox);
  }

  const key = document.createElement('span');
  key.className = 'task-card__key';
  key.textContent = task.key;
  header.appendChild(key);

  const title = document.createElement('span');
  title.className = 'task-card__title';
  title.textContent = task.title;
  header.appendChild(title);

  card.appendChild(header);

  // Meta: badges
  const meta = document.createElement('div');
  meta.className = 'task-card__meta';

  // Priority badge
  if (task.priority) {
    meta.appendChild(createBadge(task.priority, `badge--${task.priority.toLowerCase()}`));
  }

  // Blocked badge
  if (task.isBlocked) {
    meta.appendChild(createBadge('Blocked', 'badge--blocked'));
  }

  // Project tag
  if (task.projectId) {
    meta.appendChild(createBadge(task.projectId, 'badge--tag'));
  }

  // Assignee
  if (task.assignedTo) {
    meta.appendChild(createBadge(task.assignedTo, 'badge--agent'));
  }

  // Deadline
  if (task.deadlineAt) {
    const status = deadlineStatus(task.deadlineAt);
    const cls = status === 'overdue' ? 'badge--deadline-overdue' : 'badge--deadline';
    meta.appendChild(createBadge(`Due ${formatDate(task.deadlineAt)}`, cls));
  }

  // Schedule
  if (task.scheduledStartAt) {
    meta.appendChild(createBadge(`Sched ${formatDate(task.scheduledStartAt)}`, 'badge--schedule'));
  }

  // Duration
  if (task.estimateMins) {
    meta.appendChild(createBadge(formatDuration(task.estimateMins), 'badge--tag'));
  }

  card.appendChild(meta);

  // Progress bar
  if (task.progress > 0) {
    const progressBar = document.createElement('div');
    progressBar.className = 'task-card__progress';
    const fill = document.createElement('div');
    fill.className = 'task-card__progress-fill';
    fill.style.width = `${Math.round(task.progress * 100)}%`;
    progressBar.appendChild(fill);
    card.appendChild(progressBar);
  }

  // Click handler
  card.addEventListener('click', () => options.onClick?.(task));

  // Keyboard: Enter to open
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      options.onClick?.(task);
    }
  });

  return card;
}

function createBadge(text, className) {
  const badge = document.createElement('span');
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

export const TaskCard = { createTaskCard };
