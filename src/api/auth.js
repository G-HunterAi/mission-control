/**
 * Mission Control v4 — Auth Module
 *
 * Simple token-based authentication.
 * Role extracted from token payload (owner vs agent).
 */

const TOKEN_KEY = 'mc4_auth_token';
const ROLE_KEY = 'mc4_auth_role';

// ---------- Token Management ----------

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

// ---------- Role Management ----------

export function getRole() {
  return localStorage.getItem(ROLE_KEY) || 'owner'; // default to owner in local mode
}

export function setRole(role) {
  localStorage.setItem(ROLE_KEY, role);
}

export function isOwner() {
  return getRole() === 'owner';
}

export function isAgent() {
  return getRole() === 'agent';
}

// ---------- Permission Checks ----------

/**
 * Agent constraints from blueprint section 5.2:
 * - Cannot mark Done
 * - Cannot delete
 * - Cannot edit revenuePotential or project financial fields
 * - Cannot override blocked rules
 *
 * Agent can:
 * - Create tasks
 * - Update tasks assigned to them
 * - Add comments/handoffs
 * - Move tasks to Review
 */

const AGENT_BLOCKED_ACTIONS = new Set([
  'task.markDone',
  'task.delete',
  'task.editRevenue',
  'task.overrideBlocked',
  'project.editFinancials',
  'agent.updateConfig',
]);

const AGENT_BLOCKED_FIELDS = new Set([
  'revenuePotential',
  'deletedAt',
]);

export function canPerformAction(action, context = {}) {
  if (isOwner()) return true;

  // Agent role restrictions
  if (AGENT_BLOCKED_ACTIONS.has(action)) return false;

  // Agent can only update tasks assigned to them
  if (action === 'task.update' && context.task) {
    const role = getRole();
    const agentName = localStorage.getItem('mc4_agent_name');
    if (context.task.assignedTo !== agentName) return false;
  }

  return true;
}

/**
 * Check if an agent can modify specific fields
 */
export function canEditField(fieldName) {
  if (isOwner()) return true;
  return !AGENT_BLOCKED_FIELDS.has(fieldName);
}

/**
 * Check if status transition is allowed
 */
export function canTransitionTo(newStatus, task) {
  if (isOwner()) return true;

  // Agents can move to review but not to done
  if (newStatus === 'done') return false;

  // Cannot move blocked tasks to in_progress
  if (newStatus === 'in_progress' && task.isBlocked) return false;

  return true;
}
