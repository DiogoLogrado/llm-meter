// Everything you might want to tweak. Edit, then rebuild and reinstall the .vsix.

module.exports = {
  warnAtPercent: 80, // status bar turns yellow
  errorAtPercent: 95, // status bar turns red
  refreshSeconds: 60, // 0 = no timer; otherwise at least 15
  refreshOnWindowFocus: true, // also refresh when you switch back to VS Code
  icon: '$(dashboard)', // https://code.visualstudio.com/api/references/icons-in-labels
  separator: ' · ',
};
