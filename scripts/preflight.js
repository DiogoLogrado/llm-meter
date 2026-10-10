// Fails fast with a readable message when the installed Node.js is too old for
// the build tooling, instead of a cryptic stack trace from vsce.

const REQUIRED_MAJOR = 18;
const current = process.versions.node;
const major = Number(current.split('.')[0]);

if (major < REQUIRED_MAJOR) {
  const line = '-'.repeat(60);
  console.error('');
  console.error(line);
  console.error('  llm-meter: unsupported Node.js version');
  console.error(line);
  console.error('  required : Node.js >= ' + REQUIRED_MAJOR);
  console.error('  current  : Node.js ' + current);
  console.error('  binary   : ' + process.execPath);
  console.error('');
  console.error('  Install a newer Node.js from https://nodejs.org');
  console.error('  Or, with nvm:  nvm install && nvm use   (reads .nvmrc)');
  console.error(line);
  console.error('');
  process.exit(1);
}
