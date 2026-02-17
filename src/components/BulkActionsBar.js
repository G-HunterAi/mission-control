/**
 * Mission Control v4 — Bulk Actions Bar
 *
 * Appears when multiple tasks are selected.
 * Actions: assign, set priority, move to column, archive.
 */

let barEl = null;
let countEl = null;
let selectedIds = [];
let onAction = null;

/**
 * Initialize the bulk actions bar
 * @param {Function} actionHandler - Called with (action, selectedIds)
 */
function init(actionHandler) {
  barEl = document.getElementById('bulk-actions-bar');
  countEl = document.getElementById('bulk-count');
  onAction = actionHandler;

  if (!barEl) return;

  // Wire up action buttons
  barEl.querySelectorAll('.bulk-actions-bar__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'cancel') {
        clear();
        return;
      }
      if (onAction) {
        onAction(action, [...selectedIds]);
      }
    });
  });
}

/**
 * Update the selection
 * @param {string[]} ids - Currently selected task IDs
 */
function updateSelection(ids) {
  selectedIds = ids;

  if (ids.length > 0) {
    show(ids.length);
  } else {
    hide();
  }
}

/**
 * Add a task ID to selection
 */
function addToSelection(id) {
  if (!selectedIds.includes(id)) {
    selectedIds.push(id);
    show(selectedIds.length);
  }
}

/**
 * Remove a task ID from selection
 */
function removeFromSelection(id) {
  selectedIds = selectedIds.filter(i => i !== id);
  if (selectedIds.length === 0) {
    hide();
  } else {
    show(selectedIds.length);
  }
}

/**
 * Toggle a task ID in selection
 */
function toggleSelection(id) {
  if (selectedIds.includes(id)) {
    removeFromSelection(id);
  } else {
    addToSelection(id);
  }
}

function show(count) {
  if (!barEl) return;
  barEl.hidden = false;
  if (countEl) {
    countEl.textContent = `${count} selected`;
  }
}

function hide() {
  if (!barEl) return;
  barEl.hidden = true;
}

function clear() {
  selectedIds = [];
  hide();
  // Deselect all cards visually
  document.querySelectorAll('.task-card--selected').forEach(card => {
    card.classList.remove('task-card--selected');
    const checkbox = card.querySelector('.task-card__checkbox');
    if (checkbox) checkbox.checked = false;
  });
}

function getSelectedIds() {
  return [...selectedIds];
}

export const BulkActionsBar = {
  init, updateSelection, addToSelection, removeFromSelection,
  toggleSelection, clear, getSelectedIds, show, hide,
};
