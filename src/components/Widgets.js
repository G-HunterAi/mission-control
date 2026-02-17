/**
 * Mission Control v4 — Analytics Widgets
 *
 * Stub implementations for portfolio intelligence dashboard.
 * - Velocity (tasks done/week)
 * - Lead time (created -> done)
 * - Cycle time (in_progress -> done)
 * - Revenue pipeline
 * - Agent utilization
 */

import { getRevenueByStatus, getAgentWorkload } from '../store/selectors.js';

/**
 * Render a simple metric widget
 * @param {string} label
 * @param {string|number} value
 * @param {string} sublabel
 * @returns {HTMLElement}
 */
function createMetricWidget(label, value, sublabel = '') {
  const widget = document.createElement('div');
  widget.className = 'widget widget--metric';
  widget.innerHTML = `
    <div class="widget__label">${label}</div>
    <div class="widget__value">${value}</div>
    ${sublabel ? `<div class="widget__sublabel">${sublabel}</div>` : ''}
  `;
  return widget;
}

/**
 * Render a horizontal bar widget (for agent WIP)
 * @param {string} label
 * @param {number} current
 * @param {number} max
 * @returns {HTMLElement}
 */
function createBarWidget(label, current, max) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isOver = current > max;

  const widget = document.createElement('div');
  widget.className = 'widget widget--bar';
  widget.innerHTML = `
    <div class="widget__label">${label}</div>
    <div class="widget__bar-track">
      <div class="widget__bar-fill ${isOver ? 'widget__bar-fill--over' : ''}" style="width: ${pct}%"></div>
    </div>
    <div class="widget__bar-text">${current} / ${max}</div>
  `;
  return widget;
}

/**
 * Render velocity widget (tasks completed per week)
 */
function createVelocityWidget(tasks) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const completedThisWeek = tasks.filter(t =>
    t.completedAt && new Date(t.completedAt) >= weekAgo
  ).length;

  return createMetricWidget('Velocity', completedThisWeek, 'tasks / week');
}

/**
 * Render revenue pipeline widget
 */
function createRevenuePipelineWidget(state) {
  const revenue = getRevenueByStatus(state);
  const total = Object.values(revenue).reduce((sum, v) => sum + v, 0);

  const widget = document.createElement('div');
  widget.className = 'widget widget--pipeline';
  widget.innerHTML = `
    <div class="widget__label">Revenue Pipeline</div>
    <div class="widget__value">$${total.toLocaleString()}</div>
    <div class="widget__breakdown">
      <span>Backlog: $${revenue.backlog.toLocaleString()}</span>
      <span>Active: $${revenue.in_progress.toLocaleString()}</span>
      <span>Review: $${revenue.review.toLocaleString()}</span>
      <span>Done: $${revenue.done.toLocaleString()}</span>
    </div>
  `;
  return widget;
}

/**
 * Render agent utilization widgets
 */
function createAgentUtilizationWidgets(state) {
  const agents = getAgentWorkload(state);
  const container = document.createElement('div');
  container.className = 'widget-group';

  agents.forEach(agent => {
    container.appendChild(
      createBarWidget(agent.name, agent.currentWip, agent.wipLimit || 3)
    );
  });

  return container;
}

/**
 * Render lead time widget (created -> done, in days)
 * Lead time = average time from task creation to completion
 */
function createLeadTimeWidget(tasks) {
  const doneTasks = tasks.filter(t => t.completedAt && t.createdAt);
  if (doneTasks.length === 0) {
    return createMetricWidget('Lead Time', '--', 'no completed tasks');
  }

  const totalDays = doneTasks.reduce((sum, t) => {
    const created = new Date(t.createdAt).getTime();
    const completed = new Date(t.completedAt).getTime();
    return sum + (completed - created) / (1000 * 60 * 60 * 24);
  }, 0);

  const avgDays = (totalDays / doneTasks.length).toFixed(1);
  return createMetricWidget('Lead Time', `${avgDays}d`, `avg over ${doneTasks.length} tasks`);
}

/**
 * Render cycle time widget (in_progress -> done, in days)
 * Uses activity log or estimate from status timestamps
 */
function createCycleTimeWidget(tasks) {
  // Cycle time: tasks that have both a completedAt and were in_progress
  // Approximate: use updatedAt as "started" for done tasks without explicit start tracking
  const doneTasks = tasks.filter(t => t.completedAt && t.createdAt);
  if (doneTasks.length === 0) {
    return createMetricWidget('Cycle Time', '--', 'no completed tasks');
  }

  // Approximate cycle time: if estimateMins exists use that, otherwise use 60% of lead time
  const tasksWithEstimate = doneTasks.filter(t => t.actualMins || t.estimateMins);
  if (tasksWithEstimate.length > 0) {
    const avgMins = tasksWithEstimate.reduce((sum, t) => sum + (t.actualMins || t.estimateMins || 0), 0) / tasksWithEstimate.length;
    const avgHours = (avgMins / 60).toFixed(1);
    return createMetricWidget('Cycle Time', `${avgHours}h`, `avg over ${tasksWithEstimate.length} tasks`);
  }

  // Fallback: use 60% of lead time as approximation
  const totalDays = doneTasks.reduce((sum, t) => {
    const created = new Date(t.createdAt).getTime();
    const completed = new Date(t.completedAt).getTime();
    return sum + (completed - created) / (1000 * 60 * 60 * 24);
  }, 0);

  const avgDays = ((totalDays / doneTasks.length) * 0.6).toFixed(1);
  return createMetricWidget('Cycle Time', `~${avgDays}d`, `est. over ${doneTasks.length} tasks`);
}

/**
 * Render all widgets into a container
 */
function renderDashboard(container, state, tasks) {
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'widgets-grid';

  grid.appendChild(createVelocityWidget(tasks));
  grid.appendChild(createLeadTimeWidget(tasks));
  grid.appendChild(createCycleTimeWidget(tasks));
  grid.appendChild(createRevenuePipelineWidget(state));
  grid.appendChild(createAgentUtilizationWidgets(state));

  container.appendChild(grid);
}

export const Widgets = {
  createMetricWidget,
  createBarWidget,
  createVelocityWidget,
  createLeadTimeWidget,
  createCycleTimeWidget,
  createRevenuePipelineWidget,
  createAgentUtilizationWidgets,
  renderDashboard,
};
