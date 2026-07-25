(function() {
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;

  const _accent = '#7c5cfc', _green = '#22c55e', _red = '#ef4444', _dim = '#888';
  function log(msg, c) { console.log('%c[dev] ' + msg, 'color:' + c); }

  log('Dev mode active — type `autocomplete`, `toggle`, `rankup`, or `complete` (no parens)', _accent);

  let _achievementsDisabled = false;

  Object.defineProperty(window, 'autocomplete', {
    get() {
      if (!state || !state.solution) { log('No active puzzle', _red); return; }
      state.board = state.solution.map(r => [...r]);
      state.notes = state.notes.map(r => r.map(() => new Set()));
      state.history = []; state.historyIdx = -1;
      render(); saveGame(); checkWin();
      log('Puzzle autocompleted!', _green);
    },
    configurable: true
  });

  Object.defineProperty(window, 'toggle', {
    get() {
      _achievementsDisabled = !_achievementsDisabled;
      log('Achievements ' + (_achievementsDisabled ? 'DISABLED' : 'ENABLED'), _achievementsDisabled ? _red : _green);
    },
    configurable: true
  });

  Object.defineProperty(window, 'rankup', {
    get() {
      const overlay = document.getElementById('rankupOverlay');
      if (!overlay) return log('rankupOverlay not found', _red);
      const prevN = 'Wood IV', newN = 'Wood III';
      document.getElementById('rankupOldIcon').innerHTML = rankSvgImg(prevN, 80);
      document.getElementById('rankupNewIcon').innerHTML = rankSvgImg(newN, 80);
      document.getElementById('rankupOldName').textContent = prevN;
      document.getElementById('rankupNewName').textContent = newN;
      document.getElementById('rankupEarnedXp').textContent = '32';
      overlay.classList.add('open');
      setTimeout(() => overlay.classList.remove('open'), 3000);
      log('Rank-up preview: ' + prevN + ' -> ' + newN + ' (+32 XP)', _green);
    },
    configurable: true
  });

  Object.defineProperty(window, 'complete', {
    get() {
      if (!state || !state.solution) { log('No active puzzle', _red); return; }
      if (!state.settings.showCompleted) {
        state.settings.showCompleted = true;
        saveSettings();
      }
      state.completed = { rows: new Set(), cols: new Set(), boxes: new Set() };
      const pick = Math.floor(Math.random() * 3);
      if (pick === 0) {
        const r = Math.floor(Math.random() * 9);
        for (let c = 0; c < 9; c++) {
          if (state.givens[r][c]) continue;
          state.board[r][c] = state.solution[r][c];
          state.notes[r][c] = new Set();
        }
        state.completed.rows.add(r);
        log('Completed row ' + r, _green);
      } else if (pick === 1) {
        const c = Math.floor(Math.random() * 9);
        for (let r = 0; r < 9; r++) {
          if (state.givens[r][c]) continue;
          state.board[r][c] = state.solution[r][c];
          state.notes[r][c] = new Set();
        }
        state.completed.cols.add(c);
        log('Completed col ' + c, _green);
      } else {
        const bi = Math.floor(Math.random() * 9);
        const sr = Math.floor(bi / 3) * 3, sc = (bi % 3) * 3;
        for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
          const r = sr + dr, c = sc + dc;
          if (state.givens[r][c]) continue;
          state.board[r][c] = state.solution[r][c];
          state.notes[r][c] = new Set();
        }
        state.completed.boxes.add(bi);
        log('Completed box ' + bi, _green);
      }
      render();
    },
    configurable: true
  });

  if (typeof checkAchievements === 'function') {
    const orig = checkAchievements;
    checkAchievements = function(...args) {
      if (_achievementsDisabled) { log('Achievements blocked', _dim); return; }
      return orig.apply(this, args);
    };
    log('Achievements wrapped', _dim);
  }
})();
