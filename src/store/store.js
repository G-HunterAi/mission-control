/**
 * Mission Control v4 — Central Store
 *
 * Minimal pub/sub state management (no framework dependency).
 * Single state tree, dispatch → reducer → notify pattern.
 */

import { rootReducer, INITIAL_STATE } from './reducers.js';

function createStore(reducer, initialState) {
  let state = structuredClone(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function dispatch(action) {
    if (!action || !action.type) {
      console.warn('[Store] dispatch called without valid action:', action);
      return;
    }

    const prevState = state;
    state = reducer(state, action);

    // Only notify if state actually changed
    if (state !== prevState) {
      listeners.forEach(listener => {
        try {
          listener(state, prevState, action);
        } catch (err) {
          console.error('[Store] Listener error:', err);
        }
      });
    }

    return action;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }
    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  }

  function getListenerCount() {
    return listeners.size;
  }

  // Dispatch init action to set up state
  dispatch({ type: '@@INIT' });

  return {
    getState,
    dispatch,
    subscribe,
    getListenerCount,
  };
}

// Singleton store instance
export const store = createStore(rootReducer, INITIAL_STATE);

export { createStore };
