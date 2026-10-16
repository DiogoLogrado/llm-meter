// Status bar text, colours, tooltip and refresh behaviour. Makes no network requests itself.

const vscode = require('vscode');
const { fetchUsage } = require('./request');
const config = require('./config');

const ENV_VAR = 'OLLAMA_API_KEY';
const SECRET_NAME = 'ollamaCloudMeter.ollama.apiKey';
const WARN_KEY = 'ollamaCloudMeter.warnAtPercent';
const ERROR_KEY = 'ollamaCloudMeter.errorAtPercent';
const REFRESH_KEY = 'ollamaCloudMeter.refreshSeconds';

// HSL -> hex; HSL keeps good contrast on light and dark themes.
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

// Ramps the hue between the stops (default green -> amber -> red); saturation and
// lightness stay pinned, so every step is vivid.
function textColor(percent, warn, error) {
  const [h0, s0, l0] = config.colors.ok;
  const [h1, s1, l1] = config.colors.warn;
  const [h2, s2, l2] = config.colors.over;
  const d = lightnessDelta();
  const ramp = (a, b, t) => hsl(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + d);
  if (percent <= warn) return ramp([h0, s0, l0], [h1, s1, l1], Math.min(percent / Math.max(warn, 1), 1));
  if (percent <= error) return ramp([h1, s1, l1], [h2, s2, l2], (percent - warn) / Math.max(error - warn, 1));
  return hsl(h2, s2, l2 + d);
}

// "45m", "2h15m" or "6d3h": the two largest units, for the status bar and tooltip.
function remaining(at) {
  const ms = (typeof at === 'number' ? at : Date.parse(at)) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}m`;
  return `${Math.floor(min / 1440)}d${Math.floor((min % 1440) / 60)}h`;
}

// e.g. "$(hubot) 43% 1h50m · 88% 3d4h"
const barText = (windows) =>
  '$(hubot) ' + windows.map((w) => `${w.percent}% ${remaining(w.resetsAt)}`.trim()).join(' · ');

// e.g. "▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱" for 40%: one cell per 100 / tooltipBarCells percent.
function meter(percent) {
  const { tooltipBarCells: cells, tooltipBarChars: [on, off] } = config;
  const full = Math.round((Math.max(0, Math.min(100, percent)) / 100) * cells);
  return on.repeat(full) + off.repeat(cells - full);
}

// Local clock time of the reset, same format in every language: "15:00" today, "Mon 00:00" further out.
function clock(at) {
  const d = new Date(typeof at === 'number' ? at : Date.parse(at));
  if (!Number.isFinite(d.getTime())) return '';
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return d.toDateString() === new Date().toDateString() ? time : `${day} ${time}`;
}

// e.g. "| **Session** | `████████░░░░` | 43% | 1h50m · 15:00 |"
const row = (w) => {
  const left = remaining(w.resetsAt);
  return `| **${w.name}** | \`${meter(w.percent)}\` | ${w.percent}% | ${left ? `${left} · ${clock(w.resetsAt)}` : ''} |`;
};

function tooltip(windows) {
  const buttons = [
    '[$(refresh) Refresh](command:ollamaCloudMeter.refresh "Reload usage now")',
    '[$(gear) Thresholds](command:ollamaCloudMeter.setThresholds "Percentages where the gradient switches")',
    '[$(clock) Interval](command:ollamaCloudMeter.setInterval "How often usage is checked")',
    '[$(key) API key](command:ollamaCloudMeter.setApiKey "Replace the stored Ollama API key")',
  ];
  return [
    '### Ollama Cloud',
    '',
    buttons.join(' · '),
    '',
    '---',
    '',
    '| | Used | | Resets in |',
    '|---|---|--:|---|',
    ...windows.map(row),
    '',
    `Updated ${clock(Date.now())}`,
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
    bar.color = textColor(worst, warn, error);
    bar.backgroundColor = undefined;
    bar.command = undefined;
    bar.tooltip = tip;
  }

  function message(text, tip) {
    bar.text = text;
    bar.color = undefined;
    bar.backgroundColor = undefined;
    bar.command = undefined;
    bar.tooltip = new vscode.MarkdownString(tip, true);
  }

  async function refresh() {
    lastRun = Date.now();
    const key = ((await context.secrets.get(SECRET_NAME)) || process.env[ENV_VAR] || '').trim();
    if (!key) {
      message('$(key) Set Ollama API key', `Click to enter your Ollama API key, or set ${ENV_VAR} and restart VS Code.`);
      // Red background so a fresh install is noticed; clicking opens the key prompt.
      bar.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      bar.command = 'ollamaCloudMeter.setApiKey';
      return;
    }
    try {
      render(await fetchUsage(key));
    } catch (err) {
      message('Ollama: error', `Could not load usage: ${err.message}`);
    }
  }

  let timer = null;
  const startTimer = (seconds) => {
    clearInterval(timer);
    timer = seconds > 0 ? setInterval(refresh, Math.max(seconds, 15) * 1000) : null;
  };
  startTimer(context.globalState.get(REFRESH_KEY, config.refreshSeconds));

  context.subscriptions.push(
    bar,
    { dispose: () => clearInterval(timer) },
    vscode.commands.registerCommand('ollamaCloudMeter.refresh', refresh),
    vscode.commands.registerCommand('ollamaCloudMeter.setApiKey', async () => {
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
    vscode.commands.registerCommand('ollamaCloudMeter.setThresholds', async () => {
      const { warn, error } = thresholds();
      const validate = (value, minimum) => {
        if (value.trim() === '' || !Number.isFinite(+value) || +value < 0 || +value > 100) return 'Enter a number between 0 and 100.';
        if (minimum !== undefined && +value < minimum) return `Enter a number ${minimum} or above.`;
        return '';
      };
      const ask = (title, prompt, value, minimum) =>
        vscode.window.showInputBox({
          title,
          prompt,
          value: String(value),
          ignoreFocusOut: true,
          validateInput: (v) => validate(v, minimum),
        });
      const w = await ask('Middle stop at percent', 'Where the gradient reaches the middle stop.', warn);
      if (w === undefined) return;
      const e = await ask('End stop at percent', 'Where the gradient reaches the end stop.', error, Number(w));
      if (e === undefined) return;
      await context.globalState.update(WARN_KEY, Number(w));
      await context.globalState.update(ERROR_KEY, Number(e));
      refresh();
    }),
    vscode.commands.registerCommand('ollamaCloudMeter.setInterval', async () => {
      const current = context.globalState.get(REFRESH_KEY, config.refreshSeconds);
      const value = await vscode.window.showInputBox({
        title: 'Refresh interval in seconds',
        prompt: 'How often to check usage. 0 turns the timer off; any other value is treated as at least 15.',
        value: String(current),
        ignoreFocusOut: true,
        validateInput: (v) => (v.trim() !== '' && Number.isFinite(+v) && +v >= 0 ? '' : 'Enter 0 to turn the timer off, or a number of seconds.'),
      });
      if (value === undefined) return;
      const seconds = Math.round(Number(value));
      await context.globalState.update(REFRESH_KEY, seconds);
      startTimer(seconds);
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
