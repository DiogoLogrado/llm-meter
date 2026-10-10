// The only file that touches the network: one request, no vscode import.
//
//   GET https://ollama.com/api/balance
//   Authorization: Bearer <your API key>
//   Accept: application/json
//
// Response (undocumented endpoint, may change):
//   { "included": { "session": { "remaining_percent": 75, "resets_at": "..." },
//                   "weekly":  { "remaining_percent": 40, "resets_at": "..." } } }
// "remaining_percent" is what is left, so the used percent is 100 - it.
//
// TODO(development): Ollama only for now. Other providers (Claude, DeepSeek, ...)
// would each get their own fetch here and return the same [{ label, percent }] shape.

const BALANCE_URL = 'https://ollama.com/api/balance';

// Returns [{ label, name, percent }]; percent is used, 0-100. Throws on any failure.
async function fetchUsage(key) {
  // redirect:'error' stops the key from being forwarded to any other host.
  const res = await fetch(BALANCE_URL, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);

  const { session, weekly } = (await res.json()).included ?? {};
  if (!session || !weekly) throw new Error('Unexpected balance response');
  // label = compact for the status bar, name = readable for the tooltip.
  const window = (label, name, w) => ({ label, name, percent: Math.round((100 - w.remaining_percent) * 10) / 10 });
  return [window('5h', 'Session', session), window('wk', 'Weekly', weekly)];
}

module.exports = { fetchUsage };
