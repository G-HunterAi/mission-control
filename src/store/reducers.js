/**
 * Mission Control v4 — Reducers
 *
 * Pure functions: (state, action) → newState
 * Computes priorityScore and isBlocked on task changes.
 */

import { ActionTypes } from './actions.js';

// ---------- Initial State ----------

export const INITIAL_STATE = {
  tasks: {},          // { [id]: Task }
  projects: {},       // { [id]: Project }
  comments: {},       // { [taskId]: Comment[] }
  outputs: {},        // { [taskId]: Output[] }
  activity: [],       // Activity[] (most recent first)
  agents: [],         // Agent[]

  // UI state
  activeView: 'kanban',
  filters: {},        // { status, projectId, assignedTo, q, triaged, blocked, ... }
  selectedIds: [],    // Task IDs currently selected for bulk actions
  notifications: [],  // In-app notification objects
};

// ---------- Computed Fields ----------

function computePriorityScore(task) {
  let score = 0;

  // Priority weight
  if (task.priority === 'P1') score += 1000;
  else if (task.priority === 'P2') score += 500;
  else if (task.priority === 'P3') score += 100;

  // Deadline urgency (closer = higher score)
  if (task.deadlineAt) {
    const daysUntil = (new Date(task.deadlineAt) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysUntil < 0) score += 2000;       // overdue
    else if (daysUntil < 1) score += 800;    // today
    else if (daysUntil < 3) score += 400;    // within 3 days
    else if (daysUntil < 7) score += 200;    // within a week
  }

  // Revenue potential
  if (task.revenuePotential) {
    score += Math.min(task.revenuePotential / 100, 500);
  }

  return Math.round(score);
}

function computeIsBlocked(task, allTasks) {
  if (!task.blockedBy || task.blockedBy.length === 0) return false;
  return task.blockedBy.some(depId => {
    const dep = allTasks[depId];
    return dep && dep.status !== 'done' && !dep.archivedAt;
  });
}

function enrichTask(task, allTasks) {
  return {
    ...task,
    priorityScore: computePriorityScore(task),
    isBlocked: computeIsBlocked(task, allTasks),
  };
}

// ---------- Task Reducer ----------

function tasksReducer(state = {}, action) {
  switch (action.type) {
    case ActionTypes.TASKS_LOAD: {
      const tasks = {};
      const taskArray = Array.isArray(action.payload) ? action.payload : Object.values(action.payload);
      taskArray.forEach(t => { tasks[t.id] = t; });
      // Enrich all tasks
      Object.keys(tasks).forEach(id => {
        tasks[id] = enrichTask(tasks[id], tasks);
      });
      return tasks;
    }

    case ActionTypes.TASK_CREATE: {
      const newTasks = { ...state };
      const task = enrichTask(action.payload, newTasks);
      newTasks[task.id] = task;
      return newTasks;
    }

    case ActionTypes.TASK_UPDATE: {
      const { id, changes } = action.payload;
      if (!state[id]) return state;
      const newTasks = { ...state };
      newTasks[id] = enrichTask(
        { ...state[id], ...changes, updatedAt: new Date().toISOString() },
        newTasks
      );
      return newTasks;
    }

    case ActionTypes.TASK_MOVE: {
      const { id, status } = action.payload;
      if (!state[id]) return state;
      const newTasks = { ...state };
      const now = new Date().toISOString();
      const updates = { status, updatedAt: now };
      if (status === 'done') updates.completedAt = now;
      newTasks[id] = enrichTask({ ...state[id], ...updates }, newTasks);
      return newTasks;
    }

    case ActionTypes.TASK_ARCHIVE: {
      const { id } = action.payload;
      if (!state[id]) return state;
      const newTasks = { ...state };
      newTasks[id] = {
        ...state[id],
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newTasks;
    }

    case ActionTypes.TASK_RESTORE: {
      const { id } = action.payload;
      if (!state[id]) return state;
      const newTasks = { ...state };
      newTasks[id] = enrichTask(
        { ...state[id], archivedAt: null, updatedAt: new Date().toISOString() },
        newTasks
      );
      return newTasks;
    }

    case ActionTypes.TASK_DELETE: {
      const { id } = action.payload;
      if (!state[id]) return state;
      const newTasks = { ...state };
      newTasks[id] = {
        ...state[id],
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return newTasks;
    }

    case ActionTypes.TASK_TRIAGE: {
      const { id, ...triageData } = action.payload;
      if (!state[id]) return state;
      const newTasks = { ...state };
      newTasks[id] = enrichTask(
        { ...state[id], ...triageData, triaged: true, updatedAt: new Date().toISOString() },
        newTasks
      );
      return newTasks;
    }

    case ActionTypes.TASKS_BULK_UPDATE: {
      const { ids, changes } = action.payload;
      const newTasks = { ...state };
      const now = new Date().toISOString();
      ids.forEach(id => {
        if (newTasks[id]) {
          newTasks[id] = enrichTask(
            { ...newTasks[id], ...changes, updatedAt: now },
            newTasks
          );
        }
      });
      return newTasks;
    }

    default:
      return state;
  }
}

// ---------- Projects Reducer ----------

function projectsReducer(state = {}, action) {
  switch (action.type) {
    case ActionTypes.PROJECTS_LOAD: {
      const projects = {};
      const arr = Array.isArray(action.payload) ? action.payload : Object.values(action.payload);
      arr.forEach(p => { projects[p.id] = p; });
      return projects;
    }

    case ActionTypes.PROJECT_CREATE: {
      return { ...state, [action.payload.id]: action.payload };
    }

    case ActionTypes.PROJECT_UPDATE: {
      const { id, changes } = action.payload;
      if (!state[id]) return state;
      return {
        ...state,
        [id]: { ...state[id], ...changes, updatedAt: new Date().toISOString() },
      };
    }

    default:
      return state;
  }
}

// ---------- Comments Reducer ----------

function commentsReducer(state = {}, action) {
  switch (action.type) {
    case ActionTypes.COMMENTS_LOAD: {
      const { taskId, comments } = action.payload;
      return { ...state, [taskId]: comments };
    }

    case ActionTypes.COMMENT_ADD: {
      const comment = action.payload;
      const existing = state[comment.taskId] || [];
      return { ...state, [comment.taskId]: [...existing, comment] };
    }

    default:
      return state;
  }
}

// ---------- Outputs Reducer ----------

function outputsReducer(state = {}, action) {
  switch (action.type) {
    case ActionTypes.OUTPUTS_LOAD: {
      const { taskId, outputs } = action.payload;
      return { ...state, [taskId]: outputs };
    }

    case ActionTypes.OUTPUT_ADD: {
      const output = action.payload;
      const existing = state[output.taskId] || [];
      return { ...state, [output.taskId]: [...existing, output] };
    }

    default:
      return state;
  }
}

// ---------- Activity Reducer ----------

function activityReducer(state = [], action) {
  switch (action.type) {
    case ActionTypes.ACTIVITY_LOAD:
      return action.payload;

    case ActionTypes.ACTIVITY_ADD:
      return [action.payload, ...state];

    default:
      return state;
  }
}

// ---------- Agents Reducer ----------

function agentsReducer(state = [], action) {
  switch (action.type) {
    case ActionTypes.AGENTS_LOAD:
      return action.payload;

    case ActionTypes.AGENT_UPDATE: {
      const { id, changes } = action.payload;
      return state.map(a => a.id === id ? { ...a, ...changes } : a);
    }

    default:
      return state;
  }
}

// ---------- UI Reducers ----------

function activeViewReducer(state = 'kanban', action) {
  if (action.type === ActionTypes.VIEW_SET) return action.payload;
  return state;
}

function filtersReducer(state = {}, action) {
  switch (action.type) {
    case ActionTypes.FILTER_SET: {
      const { key, value } = action.payload;
      if (value === null || value === undefined || value === '') {
        const next = { ...state };
        delete next[key];
        return next;
      }
      return { ...state, [key]: value };
    }
    case ActionTypes.FILTER_CLEAR:
      return {};
    default:
      return state;
  }
}

function selectedIdsReducer(state = [], action) {
  switch (action.type) {
    case ActionTypes.SELECTION_SET:
      return action.payload;
    case ActionTypes.SELECTION_CLEAR:
      return [];
    default:
      return state;
  }
}

function notificationsReducer(state = [], action) {
  switch (action.type) {
    case ActionTypes.NOTIFICATION_ADD:
      return [...state, action.payload];
    case ActionTypes.NOTIFICATION_DISMISS:
      return state.filter(n => n.id !== action.payload.id);
    default:
      return state;
  }
}

// ---------- Root Reducer ----------

export function rootReducer(state, action) {
  return {
    tasks:         tasksReducer(state.tasks, action),
    projects:      projectsReducer(state.projects, action),
    comments:      commentsReducer(state.comments, action),
    outputs:       outputsReducer(state.outputs, action),
    activity:      activityReducer(state.activity, action),
    agents:        agentsReducer(state.agents, action),
    activeView:    activeViewReducer(state.activeView, action),
    filters:       filtersReducer(state.filters, action),
    selectedIds:   selectedIdsReducer(state.selectedIds, action),
    notifications: notificationsReducer(state.notifications, action),
  };
}
