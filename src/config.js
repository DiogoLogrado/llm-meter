// Everything you might want to tweak. Edit, then rebuild and reinstall the .vsix.

module.exports = {
  warnAtPercent: 80, // gradient is amber here (runtime: Command Palette > LLM Meter: Set Alert Percentages)
  errorAtPercent: 95, // gradient is red here
  refreshSeconds: 60, // 0 = no timer; otherwise at least 15
  refreshOnWindowFocus: true, // also refresh when you switch back to VS Code
  colors: { ok: '#3fb950', warn: '#d29922', over: '#f85149' }, // green -> amber -> red
  separator: ' · ',
};
