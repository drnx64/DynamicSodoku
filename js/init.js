// ============================================================
// 15. Initialization
// ============================================================
function init() {
  loadSettings();
  state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings);
  applySettings();

  loadStats();
  loadStreak();
  checkStreak();

  setupSettings();
  setupInput();
  setupNavigation();
  setupDialogs();

  const loaded = loadGame();
  if (loaded && state.solution && state.solution.length === 9 && !state.won && !state.gameOver) {
    if (state.timer > 0) startTimer();
    document.getElementById('gameLabel').textContent = state.isDaily ? 'Daily Challenge' : capitalize(state.difficulty);
    updateUndoRedo();
    showPage('page-game');
    render();
  } else {
    if (loaded) clearGame();
    showPage('page-menu');
  }
  updateMenuUI();
}

document.addEventListener('DOMContentLoaded', init);
