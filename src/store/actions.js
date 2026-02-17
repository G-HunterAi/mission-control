/**
 * Mission Control v4 — Action Creators
 *
 * Pure functions that return action objects for dispatch.
 */

// ---------- Action Types ----------

export const ActionTypes = {
  // Tasks
  TASK_CREATE:    'task/create',
  TASK_UPDATE:    'task/update',
  TASK_MOVE:      'task/move',
  TASK_ARCHIVE:   'task/archive',
  TASK_RESTORE:   'task/restore',
  TASK_DELETE:     'task/delete',
  TASK_TRIAGE:    'task/triage',
  TASKS_LOAD:     'tasks/load',
  TASKS_BULK_UPDATE: 'tasks/bulkUpdate',

  // Projects
  PROJECT_CREATE: 'project/create',
  PROJECT_UPDATE: 'project/update',
  PROJECTS_LOAD:  'projects/load',

  // Comments
  COMMENT_ADD:    'comment/add',
  COMMENTS_LOAD:  'comments/load',

  // Outputs
  OUTPUT_ADD:     'output/add',
  OUTPUTS_LOAD:   'outputs/load',

  // Activity
  ACTIVITY_ADD:   'activity/add',
  ACTIVITY_LOAD:  'activity/load',

  // Agents
  AGENT_UPDATE:   'agent/update',
  AGENTS_LOAD:    'agents/load',

  // UI
  VIEW_SET:       'view/set',
  FILTER_SET:     'filter/set',
  FILTER_CLEAR:   'filter/clear',
  SELECTION_SET:  'selection/set',
  SELECTION_CLEAR:'selection/clear',

  // Notifications
  NOTIFICATION_ADD:    'notification/add',
  NOTIFICATION_DISMISS:'notification/dismiss',
};

// ---------- Task Actions ----------

export function createTask(task) {
  return { type: ActionTypes.TASK_CREATE, payload: task };
}

export function updateTask(id, changes) {
  return { type: ActionTypes.TASK_UPDATE, payload: { id, changes } };
}

export function moveTask(id, newStatus) {
  return { type: ActionTypes.TASK_MOVE, payload: { id, status: newStatus } };
}

export function archiveTask(id) {
  return { type: ActionTypes.TASK_ARCHIVE, payload: { id } };
}

export function restoreTask(id) {
  return { type: ActionTypes.TASK_RESTORE, payload: { id } };
}

export function deleteTask(id) {
  return { type: ActionTypes.TASK_DELETE, payload: { id } };
}

export function triageTask(id, triageData) {
  return { type: ActionTypes.TASK_TRIAGE, payload: { id, ...triageData } };
}

export function loadTasks(tasks) {
  return { type: ActionTypes.TASKS_LOAD, payload: tasks };
}

export function bulkUpdateTasks(ids, changes) {
  return { type: ActionTypes.TASKS_BULK_UPDATE, payload: { ids, changes } };
}

// ---------- Project Actions ----------

export function createProject(project) {
  return { type: ActionTypes.PROJECT_CREATE, payload: project };
}

export function updateProject(id, changes) {
  return { type: ActionTypes.PROJECT_UPDATE, payload: { id, changes } };
}

export function loadProjects(projects) {
  return { type: ActionTypes.PROJECTS_LOAD, payload: projects };
}

// ---------- Comment Actions ----------

export function addComment(comment) {
  return { type: ActionTypes.COMMENT_ADD, payload: comment };
}

export function loadComments(taskId, comments) {
  return { type: ActionTypes.COMMENTS_LOAD, payload: { taskId, comments } };
}

// ---------- Output Actions ----------

export function addOutput(output) {
  return { type: ActionTypes.OUTPUT_ADD, payload: output };
}

export function loadOutputs(taskId, outputs) {
  return { type: ActionTypes.OUTPUTS_LOAD, payload: { taskId, outputs } };
}

// ---------- Activity Actions ----------

export function addActivity(event) {
  return { type: ActionTypes.ACTIVITY_ADD, payload: event };
}

export function loadActivity(events) {
  return { type: ActionTypes.ACTIVITY_LOAD, payload: events };
}

// ---------- Agent Actions ----------

export function updateAgent(id, changes) {
  return { type: ActionTypes.AGENT_UPDATE, payload: { id, changes } };
}

export function loadAgents(agents) {
  return { type: ActionTypes.AGENTS_LOAD, payload: agents };
}

// ---------- UI Actions ----------

export function setView(viewName) {
  return { type: ActionTypes.VIEW_SET, payload: viewName };
}

export function setFilter(key, value) {
  return { type: ActionTypes.FILTER_SET, payload: { key, value } };
}

export function clearFilters() {
  return { type: ActionTypes.FILTER_CLEAR };
}

export function setSelection(ids) {
  return { type: ActionTypes.SELECTION_SET, payload: ids };
}

export function clearSelection() {
  return { type: ActionTypes.SELECTION_CLEAR };
}

// ---------- Notification Actions ----------

export function addNotification(notification) {
  return { type: ActionTypes.NOTIFICATION_ADD, payload: notification };
}

export function dismissNotification(id) {
  return { type: ActionTypes.NOTIFICATION_DISMISS, payload: { id } };
}
