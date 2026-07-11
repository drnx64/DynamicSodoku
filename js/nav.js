// ============================================================
// 9. Page Navigation
// ============================================================
let _prevPage = 'page-menu';

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    if (p.classList.contains('active')) _prevPage = p.id;
    p.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

function goBack() {
  showPage(_prevPage);
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
    // Show highest level
    const levelEl = el.parentElement.querySelector('.diff-level');
    const hl = stats.highestLevelByDifficulty?.[d] || 0;
    if (hl > 0) {
      if (!levelEl) {
        const lvl = document.createElement('div');
        lvl.className = 'diff-level';
        lvl.textContent = 'Lv. ' + hl;
        el.parentElement.insertBefore(lvl, el.nextSibling);
      } else {
        levelEl.textContent = 'Lv. ' + hl;
      }
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
      clearGame();
      showPage('page-menu');
    }
  });

  document.getElementById('gameSettingsBtn').addEventListener('click', () => {
    showPage('page-settings');
    setupSettings();
  });

  document.getElementById('settingsCard').addEventListener('click', () => {
    showPage('page-settings');
    setupSettings();
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

  document.getElementById('leaderboardCard').addEventListener('click', () => { renderLeaderboard('top'); showPage('page-leaderboard'); });
  document.getElementById('leaderBack').addEventListener('click', goBack);
  document.querySelectorAll('.leader-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.leader-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderLeaderboard(tab.dataset.lbview);
    });
  });

  document.getElementById('settingsBack').addEventListener('click', goBack);
  document.getElementById('statsBack').addEventListener('click', goBack);
  document.getElementById('archiveBack').addEventListener('click', goBack);
  document.getElementById('achieveBack').addEventListener('click', goBack);

  document.getElementById('winNext').addEventListener('click', () => {
    document.getElementById('winOverlay').classList.remove('open');
    if (state.isDaily) {
      showPage('page-menu');
      updateMenuUI();
    } else {
      const nextLevel = state.currentLevel + 1;
      initNewGame(state.difficulty, false, nextLevel);
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

