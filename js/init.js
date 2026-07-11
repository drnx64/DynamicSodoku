// ============================================================
// 15. Initialization
// ============================================================
function init() {
  loadSettings();
  state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings);
  applySettings();
  if (state.settings.darkTheme) document.body.classList.add('dark');

  loadStats();
  loadStreak();
  checkStreak();

  setupSettings();
  setupInput();
  setupNavigation();
  setupDialogs();

  const loaded = loadGame();
  if (loaded && state.solution && state.solution.length === 9) {
    if (state.timer > 0 && !state.won && !state.gameOver) startTimer();
    document.getElementById('gameLabel').textContent = state.isDaily ? 'Daily Challenge' : capitalize(state.difficulty);
    updateUndoRedo();
    showPage('page-game');
    render();
  } else {
    showPage('page-menu');
  }
  updateMenuUI();
}

document.addEventListener('DOMContentLoaded', init);
