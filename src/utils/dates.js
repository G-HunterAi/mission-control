/**
 * Mission Control v4 — Date Utilities
 *
 * Formatting, relative time, deadline status, duration helpers.
 */

// ---------- Formatting ----------

/**
 * Format ISO date to a human-readable string
 * @param {string} isoString - ISO 8601 date string
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(isoString, options = {}) {
  if (!isoString) return '';
  const defaults = { month: 'short', day: 'numeric' };
  return new Date(isoString).toLocaleDateString('en-US', { ...defaults, ...options });
}

/**
 * Format ISO date with time
 */
export function formatDateTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format ISO date to YYYY-MM-DD (for input[type=date])
 */
export function toDateInputValue(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toISOString().split('T')[0];
}

/**
 * Format ISO date to YYYY-MM-DDTHH:MM (for input[type=datetime-local])
 */
export function toDateTimeInputValue(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toISOString().slice(0, 16);
}

// ---------- Relative Time ----------

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

/**
 * Get relative time string ("2 hours ago", "in 3 days")
 */
export function relativeTime(isoString) {
  if (!isoString) return '';

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.round((now - then) / 1000);
  const absDiff = Math.abs(diffSec);
  const isFuture = diffSec < 0;

  let text;
  if (absDiff < MINUTE) text = 'just now';
  else if (absDiff < HOUR) {
    const mins = Math.floor(absDiff / MINUTE);
    text = `${mins}m`;
  } else if (absDiff < DAY) {
    const hours = Math.floor(absDiff / HOUR);
    text = `${hours}h`;
  } else if (absDiff < WEEK) {
    const days = Math.floor(absDiff / DAY);
    text = `${days}d`;
  } else if (absDiff < MONTH) {
    const weeks = Math.floor(absDiff / WEEK);
    text = `${weeks}w`;
  } else {
    const months = Math.floor(absDiff / MONTH);
    text = `${months}mo`;
  }

  if (text === 'just now') return text;
  return isFuture ? `in ${text}` : `${text} ago`;
}

// ---------- Deadline Status ----------

/**
 * Determine deadline urgency
 * @returns {'overdue'|'today'|'upcoming'|'future'|null}
 */
export function deadlineStatus(deadlineAt) {
  if (!deadlineAt) return null;

  const now = new Date();
  const deadline = new Date(deadlineAt);
  const diffMs = deadline - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 'overdue';
  if (diffDays < 1) return 'today';
  if (diffDays < 3) return 'upcoming';
  return 'future';
}

/**
 * Check if a date is today
 */
export function isToday(isoString) {
  if (!isoString) return false;
  const date = new Date(isoString);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

// ---------- Duration Formatting ----------

/**
 * Format minutes to human-readable duration
 * e.g., 90 → "1h 30m", 45 → "45m"
 */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Get the start of the current week (Monday)
 */
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get an array of dates for a calendar month grid
 */
export function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Monday before first day of month
  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const days = [];
  const current = new Date(startDate);

  // Generate 6 weeks (42 days) to fill the grid
  for (let i = 0; i < 42; i++) {
    days.push({
      date: new Date(current),
      isCurrentMonth: current.getMonth() === month,
      isToday: current.toDateString() === new Date().toDateString(),
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}
