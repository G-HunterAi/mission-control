/**
 * Mission Control v4 — Toast Notification System
 *
 * Queue-based, auto-dismiss notifications.
 * Types: info, success, warning, error.
 */

const DISMISS_DELAY = 4000;
const MAX_VISIBLE = 5;

let container = null;
let toasts = [];

/**
 * Initialize the toast system
 */
function init() {
  container = document.getElementById('toast-container');
}

/**
 * Show a toast notification
 * @param {object} options
 * @param {string} options.message - Toast text
 * @param {'info'|'success'|'warning'|'error'} options.type - Toast type
 * @param {number} options.duration - Auto-dismiss time in ms (0 = manual)
 * @returns {string} Toast ID
 */
function show({ message, type = 'info', duration = DISMISS_DELAY } = {}) {
  if (!container) init();
  if (!container) return null;

  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.id = id;
  el.setAttribute('role', 'status');

  const textEl = document.createElement('span');
  textEl.className = 'toast__message';
  textEl.textContent = message;
  el.appendChild(textEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast__close';
  closeBtn.setAttribute('aria-label', 'Dismiss');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => dismiss(id));
  el.appendChild(closeBtn);

  // Add to queue
  toasts.push({ id, el, timer: null });

  // Limit visible toasts
  if (toasts.length > MAX_VISIBLE) {
    const oldest = toasts.shift();
    oldest.el.remove();
    if (oldest.timer) clearTimeout(oldest.timer);
  }

  container.appendChild(el);

  // Auto-dismiss
  if (duration > 0) {
    const entry = toasts.find(t => t.id === id);
    if (entry) {
      entry.timer = setTimeout(() => dismiss(id), duration);
    }
  }

  return id;
}

/**
 * Dismiss a toast by ID
 */
function dismiss(id) {
  const index = toasts.findIndex(t => t.id === id);
  if (index === -1) return;

  const toast = toasts[index];
  if (toast.timer) clearTimeout(toast.timer);

  toast.el.style.opacity = '0';
  toast.el.style.transform = 'translateX(20px)';

  setTimeout(() => {
    toast.el.remove();
    toasts.splice(index, 1);
  }, 200);
}

/** Convenience methods */
function info(message, duration)    { return show({ message, type: 'info', duration }); }
function success(message, duration) { return show({ message, type: 'success', duration }); }
function warning(message, duration) { return show({ message, type: 'warning', duration }); }
function error(message, duration)   { return show({ message, type: 'error', duration }); }

export const Toasts = { init, show, dismiss, info, success, warning, error };
