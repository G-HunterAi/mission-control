/**
 * Mission Control v4 — Natural Language Date Parser
 *
 * Wraps chrono-node (loaded via CDN) for parsing natural language dates.
 * Falls back to simple keyword parsing if chrono is not available.
 */

/**
 * Parse a natural language date string into a Date object
 * @param {string} text - e.g., "tomorrow at 3pm", "next Friday", "in 2 hours"
 * @returns {{ date: Date|null, text: string }} Parsed date and remaining text
 */
export function parseNaturalDate(text) {
  if (!text) return { date: null, text: '' };

  // Try chrono-node if loaded
  if (typeof chrono !== 'undefined') {
    const results = chrono.parse(text);
    if (results.length > 0) {
      const parsed = results[0];
      const remainingText = text.replace(parsed.text, '').trim();
      return {
        date: parsed.start.date(),
        text: remainingText,
      };
    }
  }

  // Fallback: simple keyword parsing
  return fallbackParse(text);
}

/**
 * Simple keyword-based date parsing (no dependency required)
 */
function fallbackParse(text) {
  const lower = text.toLowerCase().trim();
  const now = new Date();

  const patterns = [
    {
      match: /^today$/i,
      getDate: () => {
        const d = new Date(now);
        d.setHours(17, 0, 0, 0); // default to 5pm
        return d;
      },
    },
    {
      match: /^tomorrow$/i,
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(17, 0, 0, 0);
        return d;
      },
    },
    {
      match: /^next week$/i,
      getDate: () => {
        const d = new Date(now);
        d.setDate(d.getDate() + 7);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    {
      match: /^in (\d+) days?$/i,
      getDate: (m) => {
        const d = new Date(now);
        d.setDate(d.getDate() + parseInt(m[1]));
        d.setHours(17, 0, 0, 0);
        return d;
      },
    },
    {
      match: /^in (\d+) hours?$/i,
      getDate: (m) => {
        const d = new Date(now);
        d.setHours(d.getHours() + parseInt(m[1]));
        return d;
      },
    },
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern.match);
    if (match) {
      return {
        date: pattern.getDate(match),
        text: text.replace(match[0], '').trim(),
      };
    }
  }

  return { date: null, text };
}

/**
 * Format a date suggestion for display
 * @param {string} text - Input text being typed
 * @returns {string|null} Suggested date display string
 */
export function getDateSuggestion(text) {
  const { date } = parseNaturalDate(text);
  if (!date) return null;

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
