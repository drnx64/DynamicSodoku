// ============================================================
// 9. Page Navigation
// ============================================================
let _prevPage = 'page-menu';

function showPage(id) {
  log('[nav] showPage()', { id, prevPage: _prevPage });
  const target = document.getElementById(id);
  if (!target) { log('[nav] WARN: page element not found', { id }); return; }
  document.querySelectorAll('.page').forEach(p => {
    if (p.classList.contains('active')) _prevPage = p.id;
    p.classList.remove('active');
  });
  target.classList.add('active');
  log('[nav] page shown', { id });
}

function goBack() {
  log('[nav] goBack()', { target: _prevPage });
  showPage(_prevPage);
}

function updateDiffBestTimes() {
  log('[nav] updateDiffBestTimes()');
  const diffs = ['easy', 'medium', 'hard', 'impossible'];
  diffs.forEach(d => {
    const el = document.getElementById('diffBest' + d.charAt(0).toUpperCase() + d.slice(1));
    if (!el) { log('[nav] WARN: diff best element not found', { d }); return; }
    const time = stats.bestTimes && stats.bestTimes[d];
    if (time && time < Infinity) {
      el.textContent = 'Best: ' + formatTime(time);
      el.classList.add('has-best');
    } else {
      el.textContent = 'Best: --';
      el.classList.remove('has-best');
    }
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.open').forEach(el => el.classList.remove('open'));
  }
});

function setupNavigation() {
  log('[nav] setupNavigation()');
  const playCard = document.getElementById('playCard');
  if (playCard) {
    playCard.addEventListener('click', () => { log('[nav] click: playCard'); updateDiffBestTimes(); showPage('page-difficulty'); });
  } else { log('[nav] WARN: #playCard not found'); }

  const diffBack = document.getElementById('diffBack');
  if (diffBack) diffBack.addEventListener('click', () => { log('[nav] click: diffBack'); showPage('page-menu'); });

  const gameBack = document.getElementById('gameBack');
  if (gameBack) {
    gameBack.addEventListener('click', () => {
      log('[nav] click: gameBack', { started: state.started, won: state.won, gameOver: state.gameOver });
      if (state.started && !state.won && !state.gameOver) {
        saveGame();
        showPage('page-menu');
      } else {
        clearGame();
        showPage('page-menu');
      }
    });
  } else { log('[nav] WARN: #gameBack not found'); }

  const gameSettingsBtn = document.getElementById('gameSettingsBtn');
  if (gameSettingsBtn) {
    gameSettingsBtn.addEventListener('click', () => {
      log('[nav] click: gameSettingsBtn');
      showPage('page-settings');
      setupSettings();
    });
  }

  const settingsCard = document.getElementById('settingsCard');
  if (settingsCard) {
    settingsCard.addEventListener('click', () => {
      log('[nav] click: settingsCard');
      showPage('page-settings');
      setupSettings();
    });
  } else { log('[nav] WARN: #settingsCard not found'); }

  const diffCards = document.querySelectorAll('#diffCards .diff-card');
  if (diffCards.length > 0) {
    diffCards.forEach(card => {
      card.addEventListener('click', () => {
        const diff = card.dataset.diff;
        log('[nav] click: diffCard', { diff });
        if (!diff) { log('[nav] WARN: diff card missing data-diff'); return; }
        state.difficulty = diff;
        initNewGame(diff, false);
      });
    });
  } else { log('[nav] WARN: no .diff-card elements found'); }

  const dailyCard = document.getElementById('dailyCard');
  if (dailyCard) {
    dailyCard.addEventListener('click', () => {
      log('[nav] click: dailyCard');
      if (isDailyDoneToday()) {
        log('[nav] daily already done today, showing toast');
        showDailyToast();
        return;
      }
      initNewGame('medium', true);
    });
  } else { log('[nav] WARN: #dailyCard not found'); }

  const winMenu = document.getElementById('winMenu');
  if (winMenu) {
    winMenu.addEventListener('click', () => {
      log('[nav] click: winMenu');
      document.getElementById('winOverlay').classList.remove('open');
      showPage('page-menu');
      updateMenuUI();
    });
  }

  const leaderboardCard = document.getElementById('leaderboardCard');
  if (leaderboardCard) {
    leaderboardCard.addEventListener('click', () => { log('[nav] click: leaderboardCard'); renderLeaderboard('top'); showPage('page-leaderboard'); });
  } else { log('[nav] WARN: #leaderboardCard not found'); }

  const leaderBack = document.getElementById('leaderBack');
  if (leaderBack) leaderBack.addEventListener('click', () => { log('[nav] click: leaderBack'); showPage('page-menu'); updateMenuUI(); });

  const leaderTabs = document.querySelectorAll('.leader-tab');
  if (leaderTabs.length > 0) {
    leaderTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        log('[nav] click: leaderTab', { view: tab.dataset.lbview });
        document.querySelectorAll('.leader-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderLeaderboard(tab.dataset.lbview);
      });
    });
  }

  const settingsBack = document.getElementById('settingsBack');
  if (settingsBack) settingsBack.addEventListener('click', () => { log('[nav] click: settingsBack'); goBack(); });
  const statsBack = document.getElementById('statsBack');
  if (statsBack) statsBack.addEventListener('click', () => { log('[nav] click: statsBack'); goBack(); });
  const archiveBack = document.getElementById('archiveBack');
  if (archiveBack) archiveBack.addEventListener('click', () => { log('[nav] click: archiveBack'); goBack(); });
  const achieveBack = document.getElementById('achieveBack');
  if (achieveBack) achieveBack.addEventListener('click', () => { log('[nav] click: achieveBack'); showPage('page-menu'); updateMenuUI(); });

  const leaderShareBtn = document.getElementById('leaderShareBtn');
  if (leaderShareBtn) leaderShareBtn.addEventListener('click', () => { log('[nav] click: leaderShareBtn'); shareLeaderboard(); });
  const leaderImportBtn = document.getElementById('leaderImportBtn');
  if (leaderImportBtn) {
    leaderImportBtn.addEventListener('click', () => {
      log('[nav] click: leaderImportBtn');
      const code = prompt('Paste leaderboard code:');
      if (code) importLeaderboard(code);
    });
  }

  const winNext = document.getElementById('winNext');
  if (winNext) {
    winNext.addEventListener('click', () => {
      log('[nav] click: winNext', { isDaily: state.isDaily, nextLevel: state.currentLevel + 1 });
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
}

function showConfirm(msg, callback) {
  log('[nav] showConfirm()', { msg });
  const overlay = document.getElementById('confirmOverlay');
  if (!overlay) { log('[nav] WARN: #confirmOverlay not found'); return; }
  const confirmMsg = document.getElementById('confirmMsg');
  const confirmIcon = document.getElementById('confirmIcon');
  if (!confirmMsg || !confirmIcon) { log('[nav] WARN: confirm dialog elements missing'); return; }
  confirmMsg.textContent = msg;
  overlay.classList.add('open');
  document.getElementById('confirmOk').onclick = () => { log('[nav] confirmOk clicked'); overlay.classList.remove('open'); callback(); };
  document.getElementById('confirmCancel').onclick = () => { log('[nav] confirmCancel clicked'); overlay.classList.remove('open'); };
}
