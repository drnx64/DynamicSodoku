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

  const challenge = window.AscendokuChallenge ? AscendokuChallenge.parse() : null;
  if (challenge) {
    const resumeMatch = state.isChallenge && state.challengeSeed === challenge.seed && !state.won && !state.gameOver;
    log('[init] challenge link detected', { challenge, resumeMatch });
    if (!resumeMatch) { window.AscendokuChallenge.start(challenge); }
    else {
      document.getElementById('gameLabel').textContent = 'Challenge';
      document.getElementById('winOverlay').classList.remove('open');
      const gameBadge = document.getElementById('gameLevelBadge');
      if (gameBadge) gameBadge.style.display = 'none';
      updateUndoRedo();
      requestRender({ entering: true });
      if (state.timer > 0 && !state.won && !state.gameOver) startTimer();
      showPage('page-game');
    }
    log('[init] init() complete (challenge)');
    var sk = document.getElementById('skeleton');
    if (sk) { sk.classList.add('hide'); setTimeout(function () { sk.style.display = 'none'; }, 500); }
    return;
  }

  showPage('page-menu');
  updateMenuUI();
  log('[init] init() complete');
  var sk = document.getElementById('skeleton');
  if (sk) { sk.classList.add('hide'); setTimeout(function () { sk.style.display = 'none'; }, 500); }
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
