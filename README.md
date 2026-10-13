# LLM Meter

A small status bar meter for Ollama Cloud usage limits:

```
$(hubot) 43% 2h · 88% 3d
```

One status bar item showing session and weekly usage, tinted green-to-red by the
higher of the two, with the time until each window resets (hours for the session,
days for the week, dropping to minutes as a window closes). Hover for the details;
the tooltip also has Refresh and a gear to set the alert percentages. Local install only: no marketplace, no telemetry, no auto-update, no dependencies.

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
npm run package            # checks Node, then creates dist/llm-meter-ollama.vsix
npm run package:ollama     # the same, spelled out per provider
```

Providers are plain npm scripts in `package.json`; Ollama is the only one today,
others are TBD. Adding one is a new `package:<provider>` line.

Then in VS Code:

1. Press `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS) to open the Command Palette.
2. Run **Extensions: Install from VSIX...**
3. Pick `dist/llm-meter-ollama.vsix`.
4. Reload the window if asked.

Command line alternative: `code --install-extension dist/llm-meter-ollama.vsix`.

To update, rebuild and install again. To remove, uninstall "LLM Meter" in the Extensions view.

A `.vsix` is a zip file. Rename a copy to `.zip` and look inside before trusting it: it holds only `src/request.js`, `src/ui.js`, `src/config.js` and `package.json`, readable and not minified.

## Use

1. Run **LLM Meter: Set API Key** from the Command Palette.
2. The meter appears in the status bar.

Refresh interval and the rest are in [src/config.js](src/config.js) (edit, rebuild, reinstall).
The two alert percentages are also editable at runtime with **LLM Meter: Set Alert Percentages**.

VS Code cannot tell an extension when a chat response finishes, so `refreshOnWindowFocus` is the closest to "refresh after a prompt".

## Change how it looks

Edit `src/config.js` for the gradient colours and refresh behaviour, or `src/ui.js` for the status bar text and tooltip. Rebuild and reinstall afterwards.

## Icon and packaging

The extension icon is the `icon` field in `package.json`, a 128x128 (or larger) PNG
shipped inside the VSIX. See [images/README.md](images/README.md). Each provider
script writes `dist/llm-meter-<provider>.vsix`; the extension id and display name
always come from `package.json`.
