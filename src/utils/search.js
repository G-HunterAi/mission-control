/**
 * Mission Control v4 — Search (Fuse.js wrapper)
 *
 * Fuzzy search across tasks, with configurable keys and thresholds.
 * Falls back to simple substring matching if Fuse.js is not loaded.
 */

const SEARCH_KEYS = [
  { name: 'title', weight: 3 },
  { name: 'description', weight: 1 },
  { name: 'key', weight: 2 },
  { name: 'tags', weight: 1.5 },
  { name: 'assignedTo', weight: 1 },
  { name: 'definitionOfDone', weight: 0.5 },
  { name: 'handoff.summary', weight: 0.5 },
];

const FUSE_OPTIONS = {
  keys: SEARCH_KEYS,
  threshold: 0.3,      // 0 = exact, 1 = anything
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
};

let fuseInstance = null;

/**
 * Initialize or update the search index with new task data
 * @param {Array} tasks - Array of task objects
 */
export function updateSearchIndex(tasks) {
  if (typeof Fuse === 'undefined') {
    console.warn('[Search] Fuse.js not loaded, using fallback search');
    fuseInstance = null;
    return;
  }

  fuseInstance = new Fuse(tasks, FUSE_OPTIONS);
}

/**
 * Search tasks by query string
 * @param {string} query - Search query
 * @param {Array} tasks - Tasks to search (used for fallback)
 * @returns {Array} Matching tasks sorted by relevance
 */
export function searchTasks(query, tasks = []) {
  if (!query || query.trim().length < 2) return tasks;

  const q = query.trim().toLowerCase();

  // Use Fuse.js if available
  if (fuseInstance) {
    return fuseInstance.search(q).map(result => result.item);
  }

  // Fallback: simple substring search
  return tasks.filter(task => {
    const searchable = [
      task.title,
      task.description,
      task.key,
      ...(task.tags || []),
      task.assignedTo,
      task.definitionOfDone,
      task.handoff?.summary,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(q);
  });
}

/**
 * Search commands/actions for command palette
 * @param {string} query
 * @param {Array} commands - Array of {label, action, shortcut}
 * @returns {Array}
 */
export function searchCommands(query, commands) {
  if (!query || query.trim().length === 0) return commands;

  const q = query.trim().toLowerCase();

  if (typeof Fuse !== 'undefined') {
    const fuse = new Fuse(commands, {
      keys: ['label'],
      threshold: 0.4,
    });
    return fuse.search(q).map(r => r.item);
  }

  return commands.filter(c => c.label.toLowerCase().includes(q));
}
