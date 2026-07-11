// ============================================================
// 9. Page Navigation
// ============================================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateDiffBestTimes() {
  const diffs = ['easy', 'medium', 'hard', 'impossible'];
  diffs.forEach(d => {
    const el = document.getElementById('diffBest' + d.charAt(0).toUpperCase() + d.slice(1));
    const time = stats.bestTimes && stats.bestTimes[d];
    if (time && time < Infinity) {
      el.textContent = 'Best: ' + formatTime(time);
      el.classList.add('has-best');
    } else {
      el.textContent = 'Best: --';
      el.classList.remove('has-best');
    }
  });
}

function setupNavigation() {
  document.getElementById('playCard').addEventListener('click', () => { updateDiffBestTimes(); showPage('page-difficulty'); });
  document.getElementById('diffBack').addEventListener('click', () => showPage('page-menu'));

  document.getElementById('gameBack').addEventListener('click', () => {
    if (state.started && !state.won && !state.gameOver) {
      showConfirm('Abandon current game?', () => { clearGame(); showPage('page-menu'); });
    } else {
      showPage('page-menu');
    }
  });

  document.getElementById('gameSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('open');
    rebuildSettingsUI();
  });

  document.getElementById('settingsCard').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('open');
    rebuildSettingsUI();
  });

  document.querySelectorAll('#diffCards .diff-card').forEach(card => {
    card.addEventListener('click', () => {
      const diff = card.dataset.diff;
      state.difficulty = diff;
      initNewGame(diff, false);
    });
  });

  document.getElementById('dailyCard').addEventListener('click', () => {
    if (isDailyDoneToday()) {
      showDailyToast();
      return;
    }
    initNewGame('medium', true);
  });

  document.getElementById('winMenu').addEventListener('click', () => {
    document.getElementById('winOverlay').classList.remove('open');
    showPage('page-menu');
    updateMenuUI();
  });

  document.getElementById('winNext').addEventListener('click', () => {
    document.getElementById('winOverlay').classList.remove('open');
    if (state.isDaily) {
      showPage('page-menu');
      updateMenuUI();
    } else {
      initNewGame(state.difficulty, false);
    }
  });
}

function showConfirm(msg, callback) {
  const overlay = document.getElementById('confirmOverlay');
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmIcon').textContent = '\u26A0';
  overlay.classList.add('open');
  document.getElementById('confirmOk').onclick = () => { overlay.classList.remove('open'); callback(); };
  document.getElementById('confirmCancel').onclick = () => overlay.classList.remove('open');
}

