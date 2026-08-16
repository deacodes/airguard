/**
 * AIRGUARD — AI Explanation Module (frontend client, v3)
 * -----------------------------------------------------------------------
 * Thin wrapper around the Flask backend's POST /ai/chat route. The Grok
 * API key lives server-side only (see ai_explainer.py / app.py) — this
 * file never touches it, which fixes the "key visible in browser" issue
 * from the earlier client-only draft.
 *
 * Sends only already-aggregated data: window.AIRGUARD.PATTERNS (converted
 * to an array), window.AIRGUARD.BASELINE, and current environmental
 * conditions. Never sends raw check-in logs, symptoms lists, or notes.
 * -----------------------------------------------------------------------
 */

/**
 * Base URL of the Flask backend. Reuses the same global main.js already
 * uses for environment history (window.AIRGUARD_ENV_API) — set that once
 * (e.g. in index.html before main.js loads) and both features share it.
 * Falls back to localhost:5001 for local dev.
 */
function getApiBase() {
  return window.AIRGUARD_ENV_API || "http://localhost:5001";
}

/**
 * Ask AIRGUARD AI a free-text question, grounded in the current patterns
 * and environment data.
 *
 * @param {string} question
 * @param {Object} opts
 * @param {Object} opts.patterns - window.AIRGUARD.PATTERNS (object keyed by pattern id)
 * @param {Object} opts.baseline - window.AIRGUARD.BASELINE
 * @param {Object} [opts.currentConditions] - latest fetchCurrentConditions() result, if available
 * @returns {Promise<string>} HTML-safe reply text for the chat bubble
 */
export async function askAirguardAI(question, { patterns, baseline, currentConditions } = {}) {
  const response = await fetch(`${getApiBase()}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      patterns: Object.values(patterns || {}),
      baseline: baseline || {},
      current_conditions: currentConditions || {}
    })
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `AI request failed (${response.status})`);
  }

  const result = await response.json();
  if (result.error) {
    console.warn("AIRGUARD AI fell back to template reply:", result.error);
  }
  return result.reply;
}