# Changelog

## 0.2.1

- Without an API key the status bar item turns red and reads "Set Ollama API key"; clicking it opens the key prompt.
- The status bar shows the time to reset in two units, e.g. `1h50m` instead of `1h`, `3d4h` instead of `3d`.
- New tooltip: buttons on top (Refresh, Thresholds, Interval, API key), then a table with a usage bar, percent, time left and the local reset time for each window.
- README explains how to get an API key from ollama.com.

## 0.2.0

- Renamed from "LLM Meter" to "Ollama Cloud Meter" for the Marketplace. The extension ID
  changed, so run **Ollama Cloud Meter: Set API Key** again and uninstall the old "LLM Meter".
- One build: `npm run package` creates `dist/ollama-cloud-meter.vsix`.

## 0.1.0

- First version: session and weekly Ollama Cloud usage in the status bar.
