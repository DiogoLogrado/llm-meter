/**
 * Ollama Cloud: the only network request in the Ollama .vsix.
 *
 * Not in Ollama's public API docs; it backs ollama.com/settings/usage, so it may change.
 *   GET https://ollama.com/api/balance
 *   Authorization: Bearer <your API key>
 *   Accept: application/json
 *
 * Returns { included: { session: { remaining_percent, resets_at },
 *                       weekly:  { remaining_percent, resets_at } } }.
 * remaining_percent is what is left, so used percent is 100 - it.
 * Redirects are refused, so the key cannot be forwarded to any other host.
 *
 * @typedef {Object} Window
 * @property {string} name Session or Weekly.
 * @property {number} percent Used percent, 0-100.
 * @property {string} resetsAt When the window resets.
 */

const BALANCE_URL = 'https://ollama.com/api/balance';

/**
 * @param {string} key Ollama API key.
 * @returns {Promise<Window[]>} Throws on any failure.
 */
async function fetchOllamaUsage(key) {
  const res = await fetch(BALANCE_URL, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);

  const { session, weekly } = (await res.json()).included ?? {};
  if (!session || !weekly) throw new Error('Unexpected balance response');
  const parseWindow = (name, w) => ({ name, percent: Math.round((100 - w.remaining_percent) * 10) / 10, resetsAt: w.resets_at });
  return [parseWindow('Session', session), parseWindow('Weekly', weekly)];
}

module.exports = { fetchOllamaUsage };
