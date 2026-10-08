// The only file that touches the network: one request, no vscode import.
//
//   GET https://ollama.com/api/usage
//   Authorization: <your API key>      (bare key, no "Bearer"; learned from another extension, unverified)
//   Accept: application/json
//
// Response used (undocumented endpoint, may change):
//   { "limits": { "session": { "usage": 0.42, "models": [{ "name": "...", "request_count": 3 }] },
//                 "weekly":  { "usage": 0.10, "models": [ ... ] } } }
// "usage" is treated as a fraction: 0.42 = 42%.

const USAGE_URL = 'https://ollama.com/api/usage';

// Returns [{ label, percent, models: [{ name, requests }] }]; throws on any failure.
async function fetchUsage(key) {
  // redirect:'error' stops the key from being forwarded to any other host.
  const res = await fetch(USAGE_URL, {
    headers: { Accept: 'application/json', Authorization: key },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);

  const { session, weekly } = (await res.json()).limits;
  const window = (label, w) => ({
    label,
    percent: Math.round(w.usage * 100),
    models: w.models.map((m) => ({ name: m.name, requests: m.request_count })),
  });
  return [window('5h', session), window('wk', weekly)];
}

module.exports = { fetchUsage };
