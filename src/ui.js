// Status bar text, colours, tooltip and refresh behaviour. Makes no network requests itself.

const vscode = require('vscode');
const { fetchUsage } = require('./request');
const config = require('./config');

const ENV_VAR = 'OLLAMA_API_KEY';
const SECRET_NAME = 'llmMeter.ollama.apiKey';
const WARN_KEY = 'llmMeter.warnAtPercent';
const ERROR_KEY = 'llmMeter.errorAtPercent';

// "hsl(140, 75%, 58%)" -> "#...", so the bar can stay bright across the whole spectrum.
function hsl(h, s, l) {
  l = Math.max(0, Math.min(100, l));
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// Light themes need darker text to stay readable; dark themes use the stops as-is.
const lightnessDelta = () => {
  const kind = vscode.window.activeColorTheme.kind;
  return kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight
    ? config.lightThemeLightnessDelta
    : 0;
};

// Hue ramps green -> amber -> red while saturation and lightness stay pinned, so
// every step is vivid; blends are done in hue, not RGB (RGB passes through muddy olive).
function barColor(percent, warn, error) {
  const [h0, s0, l0] = config.colors.ok;
  const [h1, s1, l1] = config.colors.warn;
  const [h2, s2, l2] = config.colors.over;
  const d = lightnessDelta();
  const ramp = (a, b, t) => hsl(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + d);
  if (percent <= warn) return ramp([h0, s0, l0], [h1, s1, l1], Math.min(percent / Math.max(warn, 1), 1));
  if (percent <= error) return ramp([h1, s1, l1], [h2, s2, l2], (percent - warn) / Math.max(error - warn, 1));
  return hsl(h2, s2, l2 + d);
}

// "45m", "2h" or "3d": the largest unit, stepping down as the window closes.
function remaining(at) {
  const ms = (typeof at === 'number' ? at : Date.parse(at)) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

// "2h15m" or "6d3h": full detail for the tooltip.
function preciseRemaining(at) {
  const ms = (typeof at === 'number' ? at : Date.parse(at)) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}m`;
  return `${Math.floor(min / 1440)}d${Math.floor((min % 1440) / 60)}h`;
}

// e.g. "$(hubot) 43% 2h · 88% 3d"
const barText = (windows) =>
  '$(hubot) ' + windows.map((w) => `${w.percent}% ${remaining(w.resetsAt)}`.trim()).join(config.separator);

// e.g. "Session: 43% used, resets in 2h15m"
const details = (windows) =>
  windows.map((w) => {
    const left = preciseRemaining(w.resetsAt);
    return `${w.name}: ${w.percent}% used${left ? `, resets in ${left}` : ''}`;
  });

function tooltip(windows) {
  const refresh = '[$(refresh) Refresh](command:llmMeter.refresh "Reload usage now")';
  const gear = '[$(gear) Set alert percentages](command:llmMeter.setThresholds "Amber and red thresholds")';
  return [
    '### Ollama Cloud',
    '',
    details(windows).join('\n\n'),
    '',
    '---',
    '',
    `${refresh} · ${gear}`,
    '',
    `Updated ${new Date().toLocaleTimeString()}`,
  ].join('\n');
}

function activate(context) {
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  bar.show();

  const thresholds = () => ({
    warn: context.globalState.get(WARN_KEY, config.warnAtPercent),
    error: context.globalState.get(ERROR_KEY, config.errorAtPercent),
  });

  let lastRun = 0;

  function render(windows) {
    const tip = new vscode.MarkdownString(tooltip(windows), true);
    tip.isTrusted = true; // lets the tooltip run the Refresh and gear command links
    const { warn, error } = thresholds();
    const worst = Math.max(...windows.map((w) => w.percent));
    bar.text = barText(windows);
    bar.color = barColor(worst, warn, error);
    bar.tooltip = tip;
  }

  function message(text, tip) {
    bar.text = text;
    bar.color = undefined;
    bar.tooltip = new vscode.MarkdownString(tip, true);
  }

  async function refresh() {
    lastRun = Date.now();
    const key = ((await context.secrets.get(SECRET_NAME)) || process.env[ENV_VAR] || '').trim();
    if (!key) {
      message('Set API key', `Run "LLM Meter: Set API Key" from the Command Palette, or set ${ENV_VAR} and restart VS Code.`);
      return;
    }
    try {
      render(await fetchUsage(key));
    } catch (err) {
      message('Ollama: error', `Could not load usage: ${err.message}`);
    }
  }

  const timer = config.refreshSeconds > 0 && setInterval(refresh, Math.max(config.refreshSeconds, 15) * 1000);

  context.subscriptions.push(
    bar,
    { dispose: () => clearInterval(timer) },
    vscode.commands.registerCommand('llmMeter.refresh', refresh),
    vscode.commands.registerCommand('llmMeter.setApiKey', async () => {
      const key = await vscode.window.showInputBox({
        title: 'Ollama API key',
        prompt: 'Stored in the OS keychain via VS Code Secret Storage. Only ever sent to ollama.com.',
        password: true,
        ignoreFocusOut: true,
      });
      if (key && key.trim()) {
        await context.secrets.store(SECRET_NAME, key.trim());
        refresh();
      }
    }),
    vscode.commands.registerCommand('llmMeter.setThresholds', async () => {
      const { warn, error } = thresholds();
      const ask = (title, prompt, value) =>
        vscode.window.showInputBox({
          title,
          prompt,
          value: String(value),
          ignoreFocusOut: true,
          validateInput: (v) => (Number.isFinite(+v) && +v >= 0 && +v <= 100 ? '' : 'Enter a number between 0 and 100.'),
        });
      const w = await ask('Amber at percent', 'Where the status bar gradient turns amber.', warn);
      if (w === undefined) return;
      const e = await ask('Red at percent', 'Where the status bar gradient turns red.', error);
      if (e === undefined) return;
      await context.globalState.update(WARN_KEY, Number(w));
      await context.globalState.update(ERROR_KEY, Number(e));
      refresh();
    }),
    vscode.window.onDidChangeWindowState((w) => {
      if (w.focused && config.refreshOnWindowFocus && Date.now() - lastRun > 15000) refresh();
    }),
  );

  refresh();
}

function deactivate() { }

module.exports = { activate, deactivate };
