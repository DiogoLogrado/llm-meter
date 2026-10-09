// Status bar text, colours, tooltip and refresh behaviour. Makes no network requests itself.

const vscode = require('vscode');
const { fetchUsage } = require('./request');
const config = require('./config');

const ENV_VAR = 'OLLAMA_API_KEY';
const SECRET_NAME = 'llmMeter.ollama.apiKey';

// e.g. "$(dashboard) 5h 43% · wk 10%"
const barText = (windows) => config.icon + ' ' + windows.map((w) => `${w.label} ${w.percent}%`).join(config.separator);

const tooltip = (windows) =>
  '**Ollama Cloud**\n\n' +
  windows.map((w) => `${w.name}: **${w.percent}%** used`).join('\n\n') +
  `\n\nUpdated ${new Date().toLocaleTimeString()}. Click to refresh.`;

function activate(context) {
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  bar.command = 'llmMeter.refresh';
  bar.show();

  let lastRun = 0;

  function show(text, tip, level) {
    bar.text = text;
    bar.tooltip = new vscode.MarkdownString(tip, true);
    bar.backgroundColor = level && new vscode.ThemeColor(`statusBarItem.${level}Background`);
  }

  async function refresh() {
    lastRun = Date.now();
    const key = ((await context.secrets.get(SECRET_NAME)) || process.env[ENV_VAR] || '').trim();
    if (!key) {
      show('$(key) Set API key', `Run "LLM Meter: Set API Key" from the Command Palette, or set ${ENV_VAR} and restart VS Code.`, 'error');
      return;
    }
    try {
      const windows = await fetchUsage(key);
      const worst = Math.max(...windows.map((w) => w.percent));
      const level = worst >= config.errorAtPercent ? 'error' : worst >= config.warnAtPercent ? 'warning' : undefined;
      show(barText(windows), tooltip(windows), level);
    } catch (err) {
      show('$(warning) Ollama', `Could not load usage: ${err.message}`, 'error');
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
    vscode.window.onDidChangeWindowState((w) => {
      if (w.focused && config.refreshOnWindowFocus && Date.now() - lastRun > 15000) refresh();
    }),
  );

  refresh();
}

function deactivate() {}

module.exports = { activate, deactivate };
