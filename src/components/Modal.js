/**
 * Mission Control v4 — Modal Component
 *
 * Generic modal dialog with overlay, close button, focus trap,
 * and ESC to close.
 */

import { createFocusTrap, announce } from '../utils/accessibility.js';

let activeModal = null;
let cleanupFocusTrap = null;

/**
 * Open a modal with the given content
 * @param {object} options
 * @param {string} options.title - Modal title
 * @param {HTMLElement|string} options.content - Body content (element or HTML string)
 * @param {Function} options.onClose - Called when modal is closed
 * @param {string} options.size - 'default' | 'large' | 'small'
 * @returns {HTMLElement} The modal element
 */
function open({ title, content, onClose, size = 'default' } = {}) {
  close(); // Close any existing modal

  const root = document.getElementById('modal-root');
  if (!root) return null;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => close());

  // Modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', title || 'Dialog');

  if (size === 'large') modal.style.width = '800px';
  if (size === 'small') modal.style.width = '420px';

  // Header
  const header = document.createElement('div');
  header.className = 'modal__header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'modal__title';
  titleEl.textContent = title || '';
  header.appendChild(titleEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal__close';
  closeBtn.setAttribute('aria-label', 'Close dialog');
  closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>`;
  closeBtn.addEventListener('click', () => close());
  header.appendChild(closeBtn);

  modal.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'modal__body';

  if (typeof content === 'string') {
    body.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    body.appendChild(content);
  }

  modal.appendChild(body);

  // Mount
  root.appendChild(overlay);
  root.appendChild(modal);
  root.hidden = false;

  // Prevent body scroll
  document.body.style.overflow = 'hidden';

  // Focus trap
  cleanupFocusTrap = createFocusTrap(modal);

  // ESC handler
  activeModal = { modal, overlay, onClose };

  // Announce to screen reader
  announce(`${title || 'Dialog'} opened`);

  return modal;
}

/**
 * Close the currently open modal
 */
function close() {
  if (!activeModal) return;

  const root = document.getElementById('modal-root');
  if (root) {
    root.innerHTML = '';
    root.hidden = true;
  }

  document.body.style.overflow = '';

  if (cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }

  if (activeModal.onClose) {
    activeModal.onClose();
  }

  activeModal = null;
  announce('Dialog closed');
}

/**
 * Check if a modal is currently open
 */
function isOpen() {
  return activeModal !== null;
}

/**
 * Handle global ESC key — called from app.js
 */
function handleEscape() {
  if (isOpen()) {
    close();
    return true;
  }
  return false;
}

export const Modal = { open, close, isOpen, handleEscape };
