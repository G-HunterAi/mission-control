/**
 * Mission Control v4 — Agents View
 *
 * Agent cards with real-time status indicators, WIP tracking,
 * SENTINEL health, progress bars, and time estimates.
 */

import { getAgentWorkload, getAgentTasks } from '../store/selectors.js';
import { getSentinelClient } from '../api/sentinelClient.js';
import { relativeTime } from '../utils/dates.js';

const DEFAULT_AGENTS = [
  { id: 'hunter', name: 'Hunter', role: 'owner', wipLimit: 5, status: 'active' },
  { id: 'opus',   name: 'Opus',   role: 'agent', wipLimit: 3, status: 'active' },
  { id: 'claude-code', name: 'Claude Code', role: 'agent', wipLimit: 3, status: 'active' },
  { id: 'codex',  name: 'Codex',  role: 'agent', wipLimit: 3, status: 'active' },
];

const STATUS_COLORS = {
  active:   { bg: 'var(--color-done-bg)', color: 'var(--color-done)', label: 'Active' },
  idle:     { bg: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', label: 'Idle' },
  blocked:  { bg: 'var(--color-blocked-bg)', color: 'var(--color-blocked)', label: 'Blocked' },
  unknown:  { bg: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)', label: 'Unknown' },
  error:    { bg: 'var(--color-p1-bg)', color: 'var(--color-p1)', label: 'Error' },
};

const HEALTH_COLORS = {
  healthy:      { dot: 'var(--color-done)', label: 'Healthy' },
  stale:        { dot: 'var(--color-p2)', label: 'Stale' },
  warning:      { dot: 'var(--color-p1)', label: 'Warning' },
  unresponsive: { dot: 'var(--color-blocked)', label: 'Unresponsive' },
  unknown:      { dot: 'var(--color-text-muted)', label: 'No Data' },
};

let store = null;
let container = null;
let sentinelData = null;

function init(el, storeRef) {
  container = el;
  store = storeRef;
}

function mount(el, storeRef) {
  container = el;
  store = storeRef;
  sentinelData = null;

  render();
  fetchSentinelStatus();
}

async function fetchSentinelStatus() {
  const sentinel = getSentinelClient();
  if (!sentinel.apiBaseUrl) return;

  try {
    const res = await fetch(`${sentinel.apiBaseUrl}/api/v1/sentinel/status`, {
      headers: { 'Authorization': `Bearer ${sentinel.authToken}` },
    });
    if (res.ok) {
      sentinelData = await res.json();
      render(); // Re-render with SENTINEL data
    }
  } catch {
    // Silently fail — SENTINEL data is optional enrichment
  }
}

function render() {
  if (!container || !store) return;

  const state = store.getState();
  const agents = state.agents.length > 0 ? getAgentWorkload(state) : DEFAULT_AGENTS.map(a => ({
    ...a,
    currentWip: getAgentTasks(state, a.name).filter(t => t.status === 'in_progress').length,
    totalAssigned: getAgentTasks(state, a.name).length,
    isOverloaded: false,
  }));

  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.style.marginBottom = 'var(--space-xl)';
  header.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div>
        <span style="font-size: var(--text-md); font-weight: var(--font-weight-bold);">Agent Dashboard</span>
        <p style="color: var(--color-text-secondary); font-size: var(--text-sm); margin-top: var(--space-sm);">
          Monitor agent workloads, WIP limits, status, and SENTINEL health.
        </p>
      </div>
      ${sentinelData ? `
        <div style="display: flex; align-items: center; gap: var(--space-sm); font-size: var(--text-xs); color: var(--color-text-muted);">
          <span style="width:8px; height:8px; border-radius:50%; background:var(--color-done);"></span>
          SENTINEL Online
        </div>
      ` : ''}
    </div>
  `;
  container.appendChild(header);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'agent-grid';

  agents.forEach(agent => {
    grid.appendChild(createAgentCard(agent, state));
  });

  container.appendChild(grid);
}

function getSentinelAgentData(agentId) {
  if (!sentinelData?.agents) return null;
  return sentinelData.agents.find(a => a.agent_id === agentId);
}

function createAgentCard(agent, state) {
  const card = document.createElement('div');
  card.className = 'agent-card';

  const initials = agent.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  const tasks = getAgentTasks(state, agent.name);
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const inReview = tasks.filter(t => t.status === 'review');
  const wipPct = agent.wipLimit ? Math.min((inProgress.length / agent.wipLimit) * 100, 100) : 0;
  const isOver = inProgress.length > (agent.wipLimit || Infinity);

  // Get SENTINEL data for this agent
  const sentinel = getSentinelAgentData(agent.id);
  const health = sentinel ? HEALTH_COLORS[sentinel.health] || HEALTH_COLORS.unknown : HEALTH_COLORS.unknown;

  // Determine live status
  let liveStatus = agent.status || 'unknown';
  if (sentinel) {
    liveStatus = sentinel.status || liveStatus;
  }
  if (inProgress.length > 0 && liveStatus === 'unknown') liveStatus = 'active';
  if (inProgress.length === 0 && liveStatus === 'active') liveStatus = 'idle';

  const statusStyle = STATUS_COLORS[liveStatus] || STATUS_COLORS.unknown;

  card.innerHTML = `
    <div class="agent-card__header">
      <div class="agent-card__avatar">${initials}</div>
      <div style="flex:1;">
        <div style="display:flex; align-items:center; gap:var(--space-sm);">
          <span class="agent-card__name">${agent.name}</span>
          <span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:var(--radius-full); font-size:var(--text-xs); font-weight:var(--font-weight-medium); background:${statusStyle.bg}; color:${statusStyle.color};">
            <span style="width:6px; height:6px; border-radius:50%; background:${statusStyle.color};"></span>
            ${statusStyle.label}
          </span>
        </div>
        <div style="font-size: var(--text-xs); color: var(--color-text-muted); margin-top:2px;">${agent.role}${sentinel ? ` • SENTINEL: ${health.label}` : ''}</div>
      </div>
    </div>

    <div class="agent-card__wip">
      <span>WIP</span>
      <div class="agent-card__wip-bar">
        <div class="agent-card__wip-fill ${isOver ? 'agent-card__wip-fill--over' : ''}" style="width: ${wipPct}%"></div>
      </div>
      <span>${inProgress.length}/${agent.wipLimit || '~'}</span>
    </div>

    ${sentinel?.progress > 0 ? `
    <div style="margin-top: var(--space-sm);">
      <div style="display:flex; justify-content:space-between; font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:2px;">
        <span>Task Progress</span>
        <span>${sentinel.progress}%</span>
      </div>
      <div style="height:4px; background:var(--color-border); border-radius:var(--radius-full); overflow:hidden;">
        <div style="height:100%; width:${sentinel.progress}%; background:var(--color-teal); border-radius:var(--radius-full);"></div>
      </div>
    </div>` : ''}

    ${sentinel?.time_spent ? `
    <div style="font-size:var(--text-xs); color:var(--color-text-muted); margin-top:var(--space-xs);">
      Time on task: ${formatTimeSpent(sentinel.time_spent)}
    </div>` : ''}

    <div style="margin-top: var(--space-md); font-size: var(--text-sm); color: var(--color-text-secondary);">
      <div style="display: flex; justify-content: space-between;">
        <span>Total assigned</span>
        <span>${tasks.length}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>In progress</span>
        <span>${inProgress.length}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>In review</span>
        <span>${inReview.length}</span>
      </div>
    </div>

    ${sentinel?.last_action ? `
    <div style="margin-top:var(--space-sm); font-size:var(--text-xs); color:var(--color-text-muted); border-top:1px solid var(--color-border-light); padding-top:var(--space-sm);">
      <strong>Last action:</strong> ${escapeHtml(sentinel.last_action)}
      ${sentinel.last_heartbeat ? `<br>Last heartbeat: ${relativeTime(sentinel.last_heartbeat)}` : ''}
    </div>` : ''}

    ${sentinel?.alerts?.length > 0 ? `
    <div style="margin-top:var(--space-sm); padding:var(--space-sm); background:var(--color-p1-bg); border-radius:var(--radius-md); font-size:var(--text-xs); color:var(--color-p1);">
      ${sentinel.alerts.map(a => `<div>⚠ ${escapeHtml(a)}</div>`).join('')}
    </div>` : ''}
  `;

  // Task list preview
  if (tasks.length > 0) {
    const taskList = document.createElement('div');
    taskList.style.cssText = 'margin-top: var(--space-md); border-top: 1px solid var(--color-border-light); padding-top: var(--space-md);';

    tasks.slice(0, 5).forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.style.cssText = 'display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-xs) 0; font-size: var(--text-sm);';
      taskEl.innerHTML = `
        <span class="task-card__key">${task.key}</span>
        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(task.title)}</span>
        <span class="badge badge--tag" style="font-size: 10px;">${task.status.replace('_', ' ')}</span>
      `;
      taskList.appendChild(taskEl);
    });

    if (tasks.length > 5) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--space-xs);';
      more.textContent = `+${tasks.length - 5} more tasks`;
      taskList.appendChild(more);
    }

    card.appendChild(taskList);
  }

  return card;
}

function formatTimeSpent(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export const AgentsView = { init, mount };
