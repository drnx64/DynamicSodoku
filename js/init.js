// ============================================================
// 15. Initialization
// ============================================================
function init() {
  log('[init] init() starting');
  loadSettings();
  state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings);
  applySettings();

  loadStats();
  loadStreak();
  loadBonus();
  checkStreak();

  setupSettings();
  setupInput();
  setupNavigation();
  setupDialogs();
  requestNotificationPermission();

  const loaded = loadGame();
  if (loaded && state.solution && state.solution.length === 9) {
    if (state.won || state.gameOver || state.mistakes >= 3) {
      log('[init] clearing finished/unplayable game', { won: state.won, gameOver: state.gameOver, mistakes: state.mistakes });
      clearGame();
    }
  }
  showPage('page-menu');
  updateMenuUI();
  log('[init] init() complete');
}

setInterval(() => {
  if (stats && stats._vault) verifyStatsIntegrity();
}, 30000);

document.addEventListener('DOMContentLoaded', () => {
  log('[init] DOMContentLoaded fired');
  init();
});
