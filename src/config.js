/**
 * Everything you might want to manually tweak. Edit, then rebuild and reinstall the .vsix.
 * The two thresholds and the refresh interval are changed at runtime instead, from the Command Palette.
 *
 * @typedef {Object} Config
 * @property {number} warnAtPercent Used percent where the gradient reaches colors.warn (default 80). Also editable at runtime with "Ollama Cloud Meter: Set Threshold Percentages".
 * @property {number} errorAtPercent Used percent where the gradient reaches colors.over (default 95) and stays there.
 * @property {number} refreshSeconds Seconds between polls; 0 = no timer (default 60). Also editable at runtime with "Ollama Cloud Meter: Set Refresh Interval".
 * @property {boolean} refreshOnWindowFocus Also refresh when VS Code regains focus (default true).
 * @property {[number, number, number]} colors.ok [hue, saturation, lightness] where the gradient starts (default green).
 * @property {[number, number, number]} colors.warn Middle stop (default amber).
 * @property {[number, number, number]} colors.over End stop (default red).
 * @property {number} lightThemeLightnessDelta Added to lightness on light themes; negative darkens (default -24).
 * @property {number} tooltipBarCells Width of the tooltip usage bars in characters; 20 means one per 5% (default 20).
 * @property {[string, string]} tooltipBarChars [used, unused] characters of the tooltip bars (default ['▰', '▱']; ['●', '○'] for circles).
 */

/** @type {Config} */
module.exports = {
  warnAtPercent: 80,
  errorAtPercent: 95,
  refreshSeconds: 60,
  refreshOnWindowFocus: true,
  colors: { ok: [140, 75, 58], warn: [45, 85, 58], over: [0, 80, 60] },
  lightThemeLightnessDelta: -24,
  tooltipBarCells: 20,
  tooltipBarChars: ['▰', '▱'],
};
