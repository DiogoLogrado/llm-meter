// Everything you might want to tweak. Edit, then rebuild and reinstall the .vsix.

module.exports = {
  warnAtPercent: 80, // gradient is amber here (runtime: Command Palette > LLM Meter: Set Alert Percentages)
  errorAtPercent: 95, // gradient is red here
  refreshSeconds: 60, // 0 = no timer; otherwise at least 15
  refreshOnWindowFocus: true, // also refresh when you switch back to VS Code
  colors: { ok: [140, 75, 58], warn: [45, 85, 58], over: [0, 80, 60] }, // [hue, saturation, lightness] green -> amber -> red
  lightThemeLightnessDelta: -24, // darken the gradient on light themes so it stays readable
  separator: ' · ',
};
