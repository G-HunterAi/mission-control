/**
 * Mission Control v4 — Accessibility Helpers
 *
 * Focus management, screen reader announcements, keyboard navigation,
 * reduced motion detection.
 */

// ---------- Focus Trap (for modals/dialogs) ----------

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Create a focus trap within a container element.
 * Returns a cleanup function to remove the trap.
 *
 * @param {HTMLElement} container - The element to trap focus within
 * @returns {Function} cleanup function
 */
export function createFocusTrap(container) {
  if (!container) return () => {};

  const previouslyFocused = document.activeElement;

  function getFocusableElements() {
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS));
  }

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  // Focus the first focusable element
  requestAnimationFrame(() => {
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  });

  // Return cleanup
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  };
}

// ---------- Screen Reader Announcements ----------

let announceEl = null;

/**
 * Announce a message to screen readers via a live region
 * @param {string} message - Text to announce
 * @param {'polite'|'assertive'} priority - aria-live value
 */
export function announce(message, priority = 'polite') {
  if (!announceEl) {
    announceEl = document.createElement('div');
    announceEl.setAttribute('aria-live', 'polite');
    announceEl.setAttribute('aria-atomic', 'true');
    announceEl.classList.add('sr-only');
    document.body.appendChild(announceEl);
  }

  announceEl.setAttribute('aria-live', priority);

  // Clear and reset to trigger re-read
  announceEl.textContent = '';
  requestAnimationFrame(() => {
    announceEl.textContent = message;
  });
}

// ---------- Keyboard Navigation ----------

/**
 * Handle arrow key navigation within a list of items
 *
 * @param {HTMLElement} container - List container
 * @param {string} itemSelector - CSS selector for items
 * @param {object} options
 * @param {Function} options.onSelect - Called when Enter/Space is pressed
 * @param {boolean} options.horizontal - Use left/right instead of up/down
 * @returns {Function} cleanup function
 */
export function enableArrowNavigation(container, itemSelector, options = {}) {
  const { onSelect, horizontal = false } = options;

  const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
  const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';

  function handleKeyDown(e) {
    const items = Array.from(container.querySelectorAll(itemSelector));
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === prevKey) {
      e.preventDefault();
      const newIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      items[newIndex].focus();
    } else if (e.key === nextKey) {
      e.preventDefault();
      const newIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
      items[newIndex].focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
      e.preventDefault();
      if (currentIndex >= 0) {
        onSelect(items[currentIndex], currentIndex);
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);
  return () => container.removeEventListener('keydown', handleKeyDown);
}

// ---------- Reduced Motion ----------

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Subscribe to reduced motion preference changes
 * @param {Function} callback - Called with boolean value
 * @returns {Function} cleanup function
 */
export function onReducedMotionChange(callback) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e) => callback(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
