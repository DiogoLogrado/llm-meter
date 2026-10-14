/**
 * Claude (Pro/Max subscription): reads one local file. No network request, no key, no token.
 *
 * After each reply, Claude Code passes its status line command the rate limits it got from
 * Anthropic (https://code.claude.com/docs/en/statusline). The status line command in the README
 * saves only that part to ~/.claude/llm-meter-usage.json:
 *   { five_hour: { used_percentage, resets_at }, seven_day: { used_percentage, resets_at } }
 * used_percentage is 0-100 and resets_at is Unix seconds. Claude Code drops a window once it
 * resets, so a missing or past window counts as 0%.
 * The numbers are as fresh as Claude Code's last reply; use on claude.ai shows up after the next one.
 *
 * @typedef {Object} Window
 * @property {string} name Session or Weekly.
 * @property {number} percent Used percent, 0-100.
 * @property {number|string} resetsAt When the window resets, in ms, or '' if unknown.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const USAGE_FILE = path.join(os.homedir(), '.claude', 'llm-meter-usage.json');

/**
 * @returns {Window[]} Throws on any failure.
 */
function readClaudeUsage() {
  let text;
  try {
    text = fs.readFileSync(USAGE_FILE, 'utf8');
  } catch {
    throw new Error(`No ${USAGE_FILE} yet. Add the status line from the README, then send Claude Code a message.`);
  }
  const limits = JSON.parse(text);
  const parseWindow = (name, w) => {
    const resetsAt = w ? w.resets_at * 1000 : 0;
    if (!(resetsAt > Date.now())) return { name, percent: 0, resetsAt: '' };
    return { name, percent: Math.round(w.used_percentage * 10) / 10, resetsAt };
  };
  return [parseWindow('Session', limits.five_hour), parseWindow('Weekly', limits.seven_day)];
}

module.exports = { readClaudeUsage, USAGE_FILE };
