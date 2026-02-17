/**
 * Mission Control v4 — Command Palette
 *
 * Cmd/Ctrl+K overlay for fuzzy search across tasks and actions.
 * Keyboard navigable (up/down/enter/esc).
 */

import { searchCommands } from '../utils/search.js';

let paletteEl = null;
let inputEl = null;
let resultsEl = null;
let isVisible = false;
let activeIndex = -1;
let commands = [];

/**
 * Initialize the command palette
 */
function init() {
  paletteEl = document.getElementById('command-palette');
  inputEl = document.getElementById('command-input');
  resultsEl = document.getElementById('command-results');

  if (!paletteEl || !inputEl || !resultsEl) return;

  // Default commands
  commands = [
    { label: 'Go to Kanban',   action: () => navigate('kanban'),   shortcut: 'G K' },
    { label: 'Go to Inbox',    action: () => navigate('inbox'),    shortcut: 'G I' },
    { label: 'Go to Calendar', action: () => navigate('calendar'), shortcut: 'G C' },
    { label: 'Go to Agents',   action: () => navigate('agents'),   shortcut: 'G A' },
    { label: 'Go to Timeline', action: () => navigate('timeline'), shortcut: 'G T' },
    { label: 'Go to Outputs',  action: () => navigate('outputs'),  shortcut: 'G O' },
    { label: 'Go to Settings', action: () => navigate('settings'), shortcut: 'G S' },
    { label: 'Create New Task', action: () => createTask(), shortcut: 'N' },
    { label: 'Search Tasks',   action: () => focusSearch(), shortcut: '/' },
  ];

  // Input handler
  inputEl.addEventListener('input', () => {
    renderResults(inputEl.value);
  });

  // Keyboard navigation
  inputEl.addEventListener('keydown', handleKeyDown);

  // Click overlay to close
  const overlay = paletteEl.querySelector('.command-palette__overlay');
  if (overlay) {
    overlay.addEventListener('click', close);
  }
}

function navigate(viewName) {
  window.location.hash = `#/${viewName}`;
  close();
}

function createTask() {
  close();
  // Dynamic import to avoid circular dependency
  import('../../app.js').then(mod => {
    if (typeof mod.openNewTaskModal === 'function') {
      mod.openNewTaskModal();
    }
  }).catch(() => {
    console.warn('[CommandPalette] Could not open task modal');
  });
}

function focusSearch() {
  close();
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.focus();
}

/**
 * Register additional commands
 * @param {Array} newCommands - Array of {label, action, shortcut}
 */
function registerCommands(newCommands) {
  commands = [...commands, ...newCommands];
}

/**
 * Toggle visibility
 */
function toggle() {
  isVisible ? close() : open();
}

/**
 * Open the command palette
 */
function open() {
  if (!paletteEl) return;
  paletteEl.hidden = false;
  isVisible = true;
  activeIndex = -1;
  inputEl.value = '';
  renderResults('');

  requestAnimationFrame(() => inputEl.focus());
}

/**
 * Close the command palette
 */
function close() {
  if (!paletteEl) return;
  paletteEl.hidden = true;
  isVisible = false;
  activeIndex = -1;
}

function renderResults(query) {
  if (!resultsEl) return;

  const filtered = searchCommands(query, commands);
  resultsEl.innerHTML = '';
  activeIndex = -1;

  filtered.forEach((cmd, i) => {
    const item = document.createElement('li');
    item.className = 'command-palette__item';
    item.setAttribute('role', 'option');
    item.dataset.index = i;

    const label = document.createElement('span');
    label.className = 'command-palette__item-label';
    label.textContent = cmd.label;
    item.appendChild(label);

    if (cmd.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'command-palette__item-shortcut';
      shortcut.textContent = cmd.shortcut;
      item.appendChild(shortcut);
    }

    item.addEventListener('click', () => {
      cmd.action();
      close();
    });

    item.addEventListener('mouseenter', () => {
      setActiveItem(i);
    });

    resultsEl.appendChild(item);
  });
}

function handleKeyDown(e) {
  const items = resultsEl.querySelectorAll('.command-palette__item');

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setActiveItem(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
      break;
    case 'ArrowUp':
      e.preventDefault();
      setActiveItem(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
      break;
    case 'Enter':
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < items.length) {
        items[activeIndex].click();
      }
      break;
    case 'Escape':
      e.preventDefault();
      close();
      break;
  }
}

function setActiveItem(index) {
  const items = resultsEl.querySelectorAll('.command-palette__item');
  items.forEach(item => item.classList.remove('command-palette__item--active'));

  activeIndex = index;
  if (index >= 0 && index < items.length) {
    items[index].classList.add('command-palette__item--active');
    items[index].scrollIntoView({ block: 'nearest' });
  }
}

export const CommandPalette = { init, open, close, toggle, registerCommands };
