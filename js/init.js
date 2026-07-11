// ============================================================
// 15. Initialization
// ============================================================
function init() {
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

  // Load saved game into state (for resume potential) but always show menu on page load
  const loaded = loadGame();
  if (loaded && state.solution && state.solution.length === 9 && (state.won || state.gameOver || state.mistakes >= 3)) {
    clearGame();
  }
  showPage('page-menu');
  updateMenuUI();
}

document.addEventListener('DOMContentLoaded', init);
