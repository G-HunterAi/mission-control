/**
 * Mission Control v4 — Selectors
 *
 * Derived data from state. All selectors take the full state object.
 */

// ---------- Task Selectors ----------

/** All active (non-deleted, non-archived) tasks as an array */
export function getActiveTasks(state) {
  return Object.values(state.tasks).filter(
    t => !t.deletedAt && !t.archivedAt
  );
}

/** Tasks grouped by status column */
export function getTasksByStatus(state) {
  const tasks = getActiveTasks(state);
  return {
    backlog:     tasks.filter(t => t.status === 'backlog'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review:      tasks.filter(t => t.status === 'review'),
    done:        tasks.filter(t => t.status === 'done'),
  };
}

/** Inbox: untriaged tasks */
export function getInboxTasks(state) {
  return getActiveTasks(state).filter(t => !t.triaged);
}

/** Blocked tasks */
export function getBlockedTasks(state) {
  return getActiveTasks(state).filter(t => t.isBlocked);
}

/** Overdue tasks (deadline passed, not done) */
export function getOverdueTasks(state) {
  const now = new Date();
  return getActiveTasks(state).filter(
    t => t.deadlineAt && new Date(t.deadlineAt) < now && t.status !== 'done'
  );
}

/** Tasks needing review */
export function getReviewTasks(state) {
  return getActiveTasks(state).filter(t => t.status === 'review');
}

/** Tasks for a specific project */
export function getProjectTasks(state, projectId) {
  return getActiveTasks(state).filter(t => t.projectId === projectId);
}

/** Tasks assigned to a specific agent */
export function getAgentTasks(state, agentName) {
  return getActiveTasks(state).filter(t => t.assignedTo === agentName);
}

/** Apply current filters to tasks */
export function getFilteredTasks(state) {
  let tasks = getActiveTasks(state);
  const f = state.filters;

  if (f.status)     tasks = tasks.filter(t => t.status === f.status);
  if (f.projectId)  tasks = tasks.filter(t => t.projectId === f.projectId);
  if (f.assignedTo) tasks = tasks.filter(t => t.assignedTo === f.assignedTo);
  if (f.priority)   tasks = tasks.filter(t => t.priority === f.priority);
  if (f.triaged !== undefined) tasks = tasks.filter(t => t.triaged === f.triaged);
  if (f.blocked)    tasks = tasks.filter(t => t.isBlocked);

  if (f.deadlineBefore) {
    const before = new Date(f.deadlineBefore);
    tasks = tasks.filter(t => t.deadlineAt && new Date(t.deadlineAt) <= before);
  }
  if (f.deadlineAfter) {
    const after = new Date(f.deadlineAfter);
    tasks = tasks.filter(t => t.deadlineAt && new Date(t.deadlineAt) >= after);
  }

  // Sort by priority score descending
  tasks.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  return tasks;
}

// ---------- Saved Views ----------

const SAVED_VIEWS = {
  inbox:           (state) => getInboxTasks(state),
  needsReview:     (state) => getReviewTasks(state),
  myWork:          (state) => getAgentTasks(state, 'Hunter'),
  highPriority:    (state) => getActiveTasks(state).filter(t => t.priority === 'P1' || t.priority === 'P2'),
  revenuePipeline: (state) => getActiveTasks(state).filter(t => t.revenuePotential != null),
  blocked:         (state) => getBlockedTasks(state),
  overdue:         (state) => getOverdueTasks(state),
};

export function getSavedView(state, name) {
  const fn = SAVED_VIEWS[name];
  return fn ? fn(state) : [];
}

export function getSavedViewNames() {
  return Object.keys(SAVED_VIEWS);
}

// ---------- Project Selectors ----------

export function getActiveProjects(state) {
  return Object.values(state.projects).filter(p => p.status === 'active');
}

export function getProjectById(state, id) {
  return state.projects[id] || null;
}

// ---------- Agent Selectors ----------

export function getAgentWorkload(state) {
  return state.agents.map(agent => {
    const tasks = getAgentTasks(state, agent.name);
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    return {
      ...agent,
      currentWip: inProgress.length,
      totalAssigned: tasks.length,
      isOverloaded: agent.wipLimit ? inProgress.length > agent.wipLimit : false,
    };
  });
}

// ---------- Analytics Selectors ----------

/** Revenue potential grouped by project */
export function getRevenueByProject(state) {
  const revenue = {};
  getActiveTasks(state).forEach(task => {
    if (task.revenuePotential && task.projectId) {
      const project = state.projects[task.projectId];
      const name = project ? project.name : task.projectId;
      revenue[name] = (revenue[name] || 0) + task.revenuePotential;
    }
  });
  return revenue;
}

/** Revenue potential grouped by status */
export function getRevenueByStatus(state) {
  const revenue = { backlog: 0, in_progress: 0, review: 0, done: 0 };
  getActiveTasks(state).forEach(task => {
    if (task.revenuePotential) {
      revenue[task.status] = (revenue[task.status] || 0) + task.revenuePotential;
    }
  });
  return revenue;
}

// ---------- Notification Selectors ----------

export function getNotificationCounts(state) {
  return {
    review:  getReviewTasks(state).length,
    overdue: getOverdueTasks(state).length,
    blocked: getBlockedTasks(state).length,
    inbox:   getInboxTasks(state).length,
  };
}
