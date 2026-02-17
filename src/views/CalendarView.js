/**
 * Mission Control v4 — Calendar View
 *
 * Monthly calendar grid showing tasks with deadlineAt and scheduledStartAt.
 * Stub for drag-to-schedule.
 */

import { getActiveTasks } from '../store/selectors.js';
import { getCalendarDays, formatDate } from '../utils/dates.js';

let store = null;
let container = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

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
  const tasks = getActiveTasks(state);

  container.innerHTML = '';

  // Navigation
  const nav = document.createElement('div');
  nav.style.cssText = 'display: flex; align-items: center; gap: var(--space-lg); margin-bottom: var(--space-xl);';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn--secondary';
  prevBtn.textContent = 'Prev';
  prevBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    render();
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn--secondary';
  nextBtn.textContent = 'Next';
  nextBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    render();
  });

  const todayBtn = document.createElement('button');
  todayBtn.className = 'btn btn--secondary';
  todayBtn.textContent = 'Today';
  todayBtn.addEventListener('click', () => {
    currentYear = new Date().getFullYear();
    currentMonth = new Date().getMonth();
    render();
  });

  const title = document.createElement('span');
  title.style.cssText = 'font-size: var(--text-lg); font-weight: var(--font-weight-bold);';
  title.textContent = new Date(currentYear, currentMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);
  nav.appendChild(todayBtn);
  nav.appendChild(title);
  container.appendChild(nav);

  // Calendar grid
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Day headers
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  dayNames.forEach(name => {
    const header = document.createElement('div');
    header.className = 'calendar-grid__header';
    header.textContent = name;
    grid.appendChild(header);
  });

  // Calendar days
  const days = getCalendarDays(currentYear, currentMonth);

  days.forEach(dayInfo => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-grid__day';
    if (dayInfo.isToday) dayEl.classList.add('calendar-grid__day--today');
    if (!dayInfo.isCurrentMonth) dayEl.style.opacity = '0.4';

    const dateStr = dayInfo.date.toISOString().split('T')[0];

    const number = document.createElement('div');
    number.className = 'calendar-grid__day-number';
    number.textContent = dayInfo.date.getDate();
    dayEl.appendChild(number);

    // Find tasks for this day (deadline or scheduled)
    const dayTasks = tasks.filter(t => {
      const deadline = t.deadlineAt ? t.deadlineAt.split('T')[0] : null;
      const scheduled = t.scheduledStartAt ? t.scheduledStartAt.split('T')[0] : null;
      return deadline === dateStr || scheduled === dateStr;
    });

    dayTasks.slice(0, 3).forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.style.cssText = `
        font-size: var(--text-xs);
        padding: 2px 4px;
        margin-top: 2px;
        border-radius: var(--radius-sm);
        background: ${task.deadlineAt?.split('T')[0] === dateStr ? 'var(--color-p2-bg)' : 'var(--color-teal-light)'};
        color: ${task.deadlineAt?.split('T')[0] === dateStr ? 'var(--color-p2)' : 'var(--color-teal-dark)'};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
      `;
      taskEl.textContent = `${task.key} ${task.title}`;
      taskEl.title = task.title;
      dayEl.appendChild(taskEl);
    });

    if (dayTasks.length > 3) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px;';
      more.textContent = `+${dayTasks.length - 3} more`;
      dayEl.appendChild(more);
    }

    grid.appendChild(dayEl);
  });

  container.appendChild(grid);
}

export const CalendarView = { init, mount };
