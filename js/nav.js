// ============================================================
// 9. Page Navigation
// ============================================================
let _prevPage = 'page-menu';

function showPage(id) {
  log('[nav] showPage()', { id, prevPage: _prevPage });
  const target = document.getElementById(id);
  if (!target) { log('[nav] WARN: page element not found', { id }); return; }
  const current = document.querySelector('.page.active');
  if (current && current.id === id) return;
  document.querySelectorAll('.page.exit').forEach(p => p.classList.remove('exit'));
  if (!current) {
    _prevPage = id;
    target.classList.add('active');
    log('[nav] page shown (no previous)', { id });
    return;
  }
  _prevPage = current.id;
  current.classList.remove('active');
  current.classList.add('exit');
  target.classList.add('active');
  if (_prevPage === 'page-game' && id !== 'page-game' && state.timerRunning) {
    pauseTimer();
    document.getElementById('timerWrap')?.classList.toggle('paused', true);
    document.getElementById('page-game')?.classList.add('paused');
    if (id !== 'page-settings') {
      document.getElementById('pauseOverlay')?.classList.add('open');
    }
  }
  log('[nav] page transition', { from: _prevPage, to: id });
}

function goBack() {
  log('[nav] goBack()', { target: _prevPage });
  showPage(_prevPage);
}

function generateThumbnails() {
  const diffs = ['easy', 'medium', 'hard', 'impossible'];
  diffs.forEach(d => {
    const container = document.getElementById('diffThumb' + d.charAt(0).toUpperCase() + d.slice(1));
    if (!container || container.hasChildNodes()) return;
    generatePuzzleAsync(d).then(puzzle => {
      if (!puzzle || !puzzle.givens) return;
      const thumb = document.createElement('div');
      thumb.className = 'diff-thumb-grid';
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const cell = document.createElement('div');
          cell.className = 'diff-thumb-cell';
          if (puzzle.givens[r][c]) cell.classList.add('filled');
          thumb.appendChild(cell);
        }
      }
      container.appendChild(thumb);
    });
  });
}

function updateDiffBestTimes() {
  log('[nav] updateDiffBestTimes()');
  generateThumbnails();
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

function startNewGame(diff) {
  log('[nav] startNewGame()', { diff });
  state.difficulty = diff;
  const sel = document.querySelector('#countdownOptions .countdown-option.active');
  let cdTime = 0;
  if (sel) {
    if (sel.dataset.time === 'custom') {
      const inp = document.getElementById('countdownCustomInput');
      cdTime = (parseInt(inp?.value, 10) || 1) * 60;
    } else {
      cdTime = parseInt(sel.dataset.time, 10);
    }
  }
  state.countdownMode = cdTime > 0;
  state.countdownTime = cdTime;
  initNewGame(diff, false);
}

let _customDiffWired = false;
function wireCustomDiffModal() {
  log('[nav] wireCustomDiffModal()');
  if (_customDiffWired) return;
  _customDiffWired = true;

  const overlay = document.getElementById('customDiffOverlay');
  const tierOpts = document.querySelectorAll('#customTierOptions .custom-tier-opt');
  const minInput = document.getElementById('customMinClues');
  const maxInput = document.getElementById('customMaxClues');
  const cancel = document.getElementById('customDiffCancel');
  const start = document.getElementById('customDiffStart');

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  }

  tierOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      tierOpts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      opt.querySelector('input').checked = true;
    });
  });

  const presetBtns = document.querySelectorAll('.custom-clue-preset');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (minInput) minInput.value = btn.dataset.min;
      if (maxInput) maxInput.value = btn.dataset.max;
    });
  });

  if (cancel) cancel.addEventListener('click', () => overlay?.classList.remove('open'));
  if (start) start.addEventListener('click', () => {
    const activeTier = document.querySelector('#customTierOptions .custom-tier-opt.active');
    const tier = activeTier ? parseInt(activeTier.dataset.tier, 10) || 1 : 1;
    let min = parseInt(minInput?.value, 10) || 24;
    let max = parseInt(maxInput?.value, 10) || 36;
    min = Math.max(17, Math.min(46, min));
    max = Math.max(17, Math.min(46, max));
    if (min > max) { const t = min; min = max; max = t; }
    state._customOptions = { tier, minClues: min, maxClues: max };
    log('[nav] custom difficulty confirmed', state._customOptions);
    overlay?.classList.remove('open');
    startNewGame('custom');
  });
}

function openCustomDiffModal() {
  log('[nav] openCustomDiffModal()');
  const overlay = document.getElementById('customDiffOverlay');
  if (!overlay) return;
  const last = state._customOptions;
  if (last) {
    const tierOpt = document.querySelector('#customTierOptions .custom-tier-opt[data-tier="' + last.tier + '"]');
    if (tierOpt) {
      document.querySelectorAll('#customTierOptions .custom-tier-opt').forEach(o => o.classList.remove('active'));
      tierOpt.classList.add('active');
      tierOpt.querySelector('input').checked = true;
    }
    const minInput = document.getElementById('customMinClues');
    const maxInput = document.getElementById('customMaxClues');
    if (minInput) minInput.value = last.minClues;
    if (maxInput) maxInput.value = last.maxClues;
  }
  overlay.classList.add('open');
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
        showGameExitConfirm();
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
      const overlay = document.getElementById('gameSettingsOverlay');
      if (overlay) {
        setupGameSettings();
        overlay.classList.add('open');
      }
    });
  }

  const gameAnalyzeBtn = document.getElementById('gameAnalyzeBtn');
  if (gameAnalyzeBtn) {
    gameAnalyzeBtn.addEventListener('click', () => {
      log('[nav] click: gameAnalyzeBtn');
      if (!state.started || state.won || state.gameOver) { showToast('Start a game first!'); return; }
      if ((state.size || 9) !== 9) { showToast('Analyzer is for 9\u00d79 boards'); return; }
      if (!state._analyzerUnlocked) {
        showAnalyzerUnlock();
      } else {
        analyzePuzzle();
      }
    });
    document.getElementById('analyzerClose')?.addEventListener('click', () => {
      document.getElementById('analyzerOverlay')?.classList.remove('open');
    });
    document.getElementById('analyzerOverlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) document.getElementById('analyzerOverlay')?.classList.remove('open');
    });
  }

  document.getElementById('gameSettingsClose')?.addEventListener('click', () => {
    document.getElementById('gameSettingsOverlay')?.classList.remove('open');
  });

  document.getElementById('gameSettingsOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('gameSettingsOverlay')?.classList.remove('open');
    }
  });

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
        if (diff === 'custom') {
          openCustomDiffModal();
          return;
        }
        startNewGame(diff);
      });
    });
  } else { log('[nav] WARN: no .diff-card elements found'); }

  wireCustomDiffModal();

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

  const winReplay = document.getElementById('winReplay');
  if (winReplay) {
    winReplay.addEventListener('click', () => {
      log('[nav] click: winReplay');
      document.getElementById('winOverlay').classList.remove('open');
      if (state.solution && state.solution.length === (state.size || 9)) {
        retryLevel();
      } else {
        initNewGame(state.difficulty || 'easy', false, state.currentLevel || 1);
      }
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

  const docsCard = document.getElementById('docsCard');
  if (docsCard) {
    docsCard.addEventListener('click', () => { log('[nav] click: docsCard'); window.open('docs/index.html', '_blank'); });
  } else { log('[nav] WARN: #docsCard not found'); }

  const settingsBack = document.getElementById('settingsBack');
  if (settingsBack) settingsBack.addEventListener('click', () => { log('[nav] click: settingsBack'); goBack(); });
  const statsBack = document.getElementById('statsBack');
  if (statsBack) statsBack.addEventListener('click', () => { log('[nav] click: statsBack'); goBack(); });
  const statsShareBtn = document.getElementById('statsShareBtn');
  if (statsShareBtn) statsShareBtn.addEventListener('click', () => { log('[nav] click: statsShareBtn'); showStatsCard(); });
  document.getElementById('statsCardClose')?.addEventListener('click', () => {
    document.getElementById('statsCardOverlay')?.classList.remove('open');
  });
  document.getElementById('statsCardOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('statsCardOverlay')?.classList.remove('open');
  });
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

  const leaderDailyBtn = document.getElementById('leaderDailyBtn');
  if (leaderDailyBtn) {
    leaderDailyBtn.addEventListener('click', () => { log('[nav] click: leaderDailyBtn'); showDailyLeaderboard(); });
  }
  document.getElementById('dailyLbClose')?.addEventListener('click', () => {
    document.getElementById('dailyLeaderboardOverlay')?.classList.remove('open');
  });
  document.getElementById('dailyLeaderboardOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('dailyLeaderboardOverlay')?.classList.remove('open');
  });

  const winNext = document.getElementById('winNext');
  if (winNext) {
    winNext.addEventListener('click', () => {
      log('[nav] click: winNext', { isDaily: state.isDaily, isChallenge: state.isChallenge, nextLevel: state.currentLevel });
      document.getElementById('winOverlay').classList.remove('open');
      if (state.isDaily || state.isChallenge) {
        showPage('page-menu');
        updateMenuUI();
      } else {
        saveLevelProgress(state.difficulty, state.currentLevel);
        initNewGame(state.difficulty, false, state.currentLevel);
      }
    });
  }

  const cdOptions = document.querySelectorAll('#countdownOptions .countdown-option');
  cdOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      cdOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      opt.querySelector('input').checked = true;
      const customWrap = document.getElementById('countdownCustom');
      if (customWrap) customWrap.style.display = opt.dataset.time === 'custom' ? 'flex' : 'none';
    });
  });

  const bsOptions = document.querySelectorAll('#boardSizeOptions .countdown-option');
  if (bsOptions.length > 0) {
    const sync = () => {
      const sel = parseInt(state.settings.gridSize, 10) || 9;
      bsOptions.forEach(o => {
        const active = parseInt(o.dataset.size, 10) === sel;
        o.classList.toggle('active', active);
        const input = o.querySelector('input');
        if (input) input.checked = active;
      });
    };
    bsOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        state.settings.gridSize = parseInt(opt.dataset.size, 10) || 9;
        saveSettings();
        sync();
        log('[nav] board size selected', { size: state.settings.gridSize });
      });
    });
    sync();
  }

  document.getElementById('countdownCustomInput')?.addEventListener('input', function () {
    const v = parseInt(this.value, 10);
    if (v < 1) this.value = 1;
    if (v > 180) this.value = 180;
  });
}

function showGameExitConfirm() {
  log('[nav] showGameExitConfirm()');
  const overlay = document.getElementById('confirmOverlay');
  if (!overlay) { log('[nav] WARN: #confirmOverlay not found'); return; }
  document.getElementById('confirmMsg').textContent = 'Save your game and come back later, or quit without saving?';
  overlay.classList.add('open');

  const saveQuitBtn = document.getElementById('confirmSaveQuit');
  const quitBtn = document.getElementById('confirmQuit');
  const cancelBtn = document.getElementById('confirmCancel');

  const pauseOverlay = document.getElementById('pauseOverlay');

  const cleanup = () => {
    overlay.classList.remove('open');
    saveQuitBtn.onclick = null;
    quitBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  saveQuitBtn.onclick = () => {
    log('[nav] saveQuit clicked');
    if (pauseOverlay) pauseOverlay.classList.remove('open');
    document.getElementById('page-game')?.classList.remove('paused');
    document.getElementById('timerWrap')?.classList.remove('paused');
    pauseTimer();
    saveGame();
    cleanup();
    showPage('page-menu');
    updateMenuUI();
  };

  quitBtn.onclick = () => {
    log('[nav] quit clicked');
    if (pauseOverlay) pauseOverlay.classList.remove('open');
    document.getElementById('page-game')?.classList.remove('paused');
    document.getElementById('timerWrap')?.classList.remove('paused');
    pauseTimer();
    clearGame();
    cleanup();
    showPage('page-menu');
    updateMenuUI();
  };

  cancelBtn.onclick = () => {
    log('[nav] cancel clicked');
    cleanup();
  };
}
