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
  verifyStatsIntegrity();
  loadWithVault(LS.settings, 'settings', {});
  loadWithVault(LS.streak, 'streak', {});
  loadWithVault(BONUS_KEY, 'bonus', {});
  loadWithVault(LS.daily, 'daily', {});
  loadWithVault(LEVEL_PROGRESS_KEY, 'levelProgress', {});
}, 30000);

document.addEventListener('DOMContentLoaded', () => {
  log('[init] DOMContentLoaded fired');
  init();
});
