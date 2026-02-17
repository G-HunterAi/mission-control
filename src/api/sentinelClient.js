/**
 * Mission Control v4 — SENTINEL Client
 *
 * Sends periodic heartbeats, logs context switches and actions.
 * Integrates with the SENTINEL API endpoints.
 *
 * Usage:
 *   import { SentinelClient } from './sentinelClient.js';
 *   const sentinel = new SentinelClient(apiBaseUrl, authToken);
 *   sentinel.startHeartbeat('claude-code', 'MC-042');
 *   sentinel.logAction('claude-code', 'MC-042', 'Created file src/api/sentinelClient.js');
 *   sentinel.logContextSwitch('claude-code', 'MC-042', 'MC-043', 'Blocked on dependency');
 *   sentinel.stopHeartbeat();
 */

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export class SentinelClient {
  constructor(apiBaseUrl, authToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.authToken = authToken;
    this.heartbeatTimer = null;
    this.agentId = null;
    this.taskId = null;
    this.status = 'idle';
    this.progress = 0;
    this.timeStarted = null;
    this.lastAction = null;
    this.blockers = null;
  }

  // ---------- Configuration ----------

  setApiBase(url) {
    this.apiBaseUrl = url;
  }

  setAuthToken(token) {
    this.authToken = token;
  }

  // ---------- Heartbeat ----------

  /**
   * Start sending heartbeats for an agent working on a task
   * @param {string} agentId
   * @param {string} taskId
   */
  startHeartbeat(agentId, taskId) {
    this.stopHeartbeat(); // Clear any existing timer

    this.agentId = agentId;
    this.taskId = taskId;
    this.status = 'active';
    this.timeStarted = Date.now();
    this.progress = 0;
    this.blockers = null;
    this.lastAction = 'Task started';

    // Send initial heartbeat immediately
    this._sendHeartbeat();

    // Then every 5 minutes
    this.heartbeatTimer = setInterval(() => {
      this._sendHeartbeat();
    }, HEARTBEAT_INTERVAL);

    console.log(`[SENTINEL] Heartbeat started for ${agentId} on ${taskId}`);
  }

  /**
   * Stop sending heartbeats
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.agentId && this.taskId) {
      this.status = 'idle';
      this._sendHeartbeat(); // Send final heartbeat
      console.log(`[SENTINEL] Heartbeat stopped for ${this.agentId}`);
    }

    this.agentId = null;
    this.taskId = null;
    this.timeStarted = null;
  }

  /**
   * Update progress for current heartbeat
   * @param {number} progress - 0-100
   */
  setProgress(progress) {
    this.progress = Math.min(100, Math.max(0, progress));
  }

  /**
   * Set blockers for current task
   * @param {string|null} blockers
   */
  setBlockers(blockers) {
    this.blockers = blockers;
    if (blockers) {
      this.status = 'blocked';
    } else {
      this.status = 'active';
    }
  }

  /**
   * Set last action description
   * @param {string} action
   */
  setLastAction(action) {
    this.lastAction = action;
  }

  async _sendHeartbeat() {
    if (!this.apiBaseUrl || !this.agentId) return;

    const timeSpent = this.timeStarted
      ? Math.round((Date.now() - this.timeStarted) / 1000)
      : 0;

    const payload = {
      agent_id: this.agentId,
      task_id: this.taskId || 'idle',
      status: this.status,
      progress: this.progress,
      time_spent: timeSpent,
      blockers: this.blockers,
      last_action: this.lastAction,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${this.apiBaseUrl}/api/v1/sentinel/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn(`[SENTINEL] Heartbeat failed: ${res.status}`);
      }
    } catch (err) {
      console.warn(`[SENTINEL] Heartbeat error: ${err.message}`);
    }
  }

  // ---------- Action Logging ----------

  /**
   * Log an action performed by an agent
   * @param {string} agentId
   * @param {string} taskId
   * @param {string} action - Description of what was done
   */
  async logAction(agentId, taskId, action) {
    this.lastAction = action;

    if (!this.apiBaseUrl) return;

    const payload = {
      agent_id: agentId,
      task_id: taskId,
      action,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(`${this.apiBaseUrl}/api/v1/sentinel/action-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`[SENTINEL] Action log error: ${err.message}`);
    }
  }

  // ---------- Context Switching ----------

  /**
   * Log a context switch between tasks
   * @param {string} agentId
   * @param {string} fromTask
   * @param {string} toTask
   * @param {string} reason
   */
  async logContextSwitch(agentId, fromTask, toTask, reason) {
    if (!this.apiBaseUrl) return;

    const payload = {
      agent_id: agentId,
      from_task: fromTask,
      to_task: toTask,
      reason,
      timestamp: new Date().toISOString(),
    };

    try {
      await fetch(`${this.apiBaseUrl}/api/v1/sentinel/context-switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`[SENTINEL] Context switch log error: ${err.message}`);
    }

    // Update heartbeat to new task
    if (this.heartbeatTimer) {
      this.taskId = toTask;
      this.progress = 0;
      this.timeStarted = Date.now();
      this.lastAction = `Switched from ${fromTask}: ${reason}`;
    }
  }

  // ---------- Status Query ----------

  /**
   * Get SENTINEL status for an agent
   * @param {string} agentId
   * @returns {Promise<object|null>}
   */
  async getStatus(agentId) {
    if (!this.apiBaseUrl) return null;

    try {
      const res = await fetch(`${this.apiBaseUrl}/api/v1/sentinel/status/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`[SENTINEL] Status query error: ${err.message}`);
    }

    return null;
  }
}

// Singleton instance
let instance = null;

export function getSentinelClient() {
  if (!instance) {
    instance = new SentinelClient('', '');
  }
  return instance;
}
