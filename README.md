# LLM Meter

A small status bar meter for Ollama Cloud usage limits:

```
$(dashboard) 5h 43% · wk 10%
```

Hover for per-model details, click to refresh. Local install only: no marketplace, no telemetry, no auto-update, no dependencies.

## The whole thing

Three small files:

- [src/request.js](src/request.js): the network request, and nothing else.
- [src/ui.js](src/ui.js): the status bar text, colours, tooltip and refresh behaviour.
- [src/config.js](src/config.js): the numbers and switches you might change.

The request:

```
GET https://ollama.com/api/balance
Authorization: Bearer <your Ollama API key>
```

- Redirects are refused, so the key cannot be forwarded to another host.
- Nothing is logged.
- The key is stored in VS Code Secret Storage (OS keychain), or read from the `OLLAMA_API_KEY` environment variable.

The balance endpoint is undocumented, so it may change or behave differently from what is assumed here.

## Build and install

You need [Node.js](https://nodejs.org) 18 or newer. If the version is too old the
build stops with a clear message instead of a stack trace. With
[nvm](https://github.com/nvm-sh/nvm) (or nvm-windows) run `nvm install` first to
pick up the version in `.nvmrc`.

```powershell
git clone <this repo>
cd llm-meter
npm run package      # checks Node, then creates dist/llm-meter.vsix
```

Then in VS Code:

1. Press `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS) to open the Command Palette.
2. Run **Extensions: Install from VSIX...**
3. Pick `dist/llm-meter.vsix`.
4. Reload the window if asked.

Command line alternative: `code --install-extension dist/llm-meter.vsix`.

To update, rebuild and install again. To remove, uninstall "LLM Meter" in the Extensions view.

A `.vsix` is a zip file. Rename a copy to `.zip` and look inside before trusting it: it holds only `src/request.js`, `src/ui.js`, `src/config.js` and `package.json`, readable and not minified.

## Use

1. Run **LLM Meter: Set API Key** from the Command Palette.
2. The meter appears in the status bar.

Refresh interval, colour thresholds and the rest are in [src/config.js](src/config.js) (edit, rebuild, reinstall). They are not VS Code settings.

VS Code cannot tell an extension when a chat response finishes, so `refreshOnWindowFocus` is the closest to "refresh after a prompt".

## Change how it looks

Edit `src/config.js` for thresholds, icon and separator, or `src/ui.js` for the status bar text and tooltip. Rebuild and reinstall afterwards.
