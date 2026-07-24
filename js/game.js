// ============================================================
// 6. Game State
// ============================================================
function emptyGrid() {
  return Array.from({length: 9}, () => Array(9).fill(0));
}
function emptyNotes() {
  return Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
}
function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const romans = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let r = '';
  for (let i = 0; i < vals.length; i++) while (n >= vals[i]) { r += romans[i]; n -= vals[i]; }
  return r;
}

const state = {
  solution: emptyGrid(), givens: emptyGrid(), board: emptyGrid(), notes: emptyNotes(),
  history: [], historyIdx: -1,
  selectedCell: null, notesMode: false,
  timer: 0, timerRunning: false, timerInterval: null,
  mistakes: 0, hintsUsed: 0, hintsRemaining: 3, started: false,
  difficulty: 'easy', gameOver: false, won: false,
  isDaily: false, gameMode: 'normal',
  currentLevel: 1,
  notesUsed: false,
  combo: 0, maxCombo: 0,
  countdownMode: false, countdownTime: 0,
  secondChanceUsed: false,
  _retryData: null,
};
state.settings = {};

function pushHistory(type, row, col, prevVal, newVal, prevNotes, newNotes) {
  log('[game] pushHistory()', { type, row, col, prevVal, newVal, historyIdx: state.historyIdx });
  state.history = state.history.slice(0, state.historyIdx + 1);
  state.history.push({ type, row, col, prevVal, newVal, prevNotes, newNotes });
  state.historyIdx = state.history.length - 1;
  updateUndoRedo();
}

function undo() {
  log('[game] undo() called', { historyIdx: state.historyIdx, gameOver: state.gameOver, won: state.won });
  if (state.historyIdx < 0) { log('[game] undo: nothing to undo'); return; }
  if (state.gameOver) { log('[game] undo: game over'); return; }
  if (state.won) { log('[game] undo: already won'); return; }
  const cost = 5;
  if (stats.totalXp < cost) { showToast('Not enough XP to undo!'); return; }
  stats.totalXp -= cost;
  const move = state.history[state.historyIdx];
  state.historyIdx--;
  const { row, col, prevVal, newVal, prevNotes, newNotes } = move;
  log('[game] undo: applying', { row, col, prevVal, newVal, moveType: move.type });
  state.board[row][col] = prevVal;
  state.notes[row][col] = new Set(prevNotes);
  if (move.type === 'mistake') state.mistakes--;
  stats.totalUndosUsed = (stats.totalUndosUsed || 0) + 1;
  saveStats();
  updateUndoRedo();
  render();
  saveGame();
}

function placeNumber(row, col, num) {
  log('[game] placeNumber()', { row, col, num, gameOver: state.gameOver, won: state.won, hasSelectedCell: !!state.selectedCell });
  if (state.gameOver) { log('[game] placeNumber: blocked - game over'); return; }
  if (state.won) { log('[game] placeNumber: blocked - already won'); return; }
  if (!state.selectedCell) { log('[game] placeNumber: blocked - no cell selected'); return; }
  if (state.givens[row][col]) { log('[game] placeNumber: blocked - cell is given'); return; }
  if (state.notesMode) { log('[game] placeNumber: delegating to toggleNote'); toggleNote(row, col, num); return; }

  const prevVal = state.board[row][col];
  if (prevVal === num) { log('[game] placeNumber: blocked - same value'); return; }

  if (num === 0) {
    log('[game] placeNumber: clearing cell');
    const prevNotes = [...state.notes[row][col]];
    state.board[row][col] = 0;
    state.notes[row][col] = new Set();
    state._lastMistakeCell = null;
    pushHistory('clear', row, col, prevVal, 0, prevNotes, []);
    if (!state.started) { state.started = true; startTimer(); }
    render(); saveGame(); playSound('place');
    return;
  }

  state.board[row][col] = num;
  const prevNotes = [...state.notes[row][col]];
  state.notes[row][col] = new Set();

  if (num !== state.solution[row][col]) {
    log('[game] placeNumber: invalid placement - mistake');
    state.combo = 0;
    hideCombo();
    state.mistakes++;
    state._lastMistakeCell = [row, col];
    pushHistory('mistake', row, col, prevVal, num, prevNotes, []);
    if (!state.started) { state.started = true; startTimer(); }
    render({ shakeCell: [row, col], mistakeCell: [row, col] });
    saveGame(); playSound('error');
    haptic([30, 50, 30, 60, 40]);
    const boardWrap = document.getElementById('boardWrap');
    if (boardWrap) { boardWrap.classList.remove('mistake-shake'); void boardWrap.offsetWidth; boardWrap.classList.add('mistake-shake'); }
    document.body.classList.remove('body-shake'); void document.body.offsetWidth; document.body.classList.add('body-shake');
    const mo = document.getElementById('mistakeOverlay');
    if (mo) { mo.classList.remove('open'); void mo.offsetWidth; mo.classList.add('open'); setTimeout(() => { mo.classList.remove('open'); document.body.classList.remove('body-shake'); }, 900); }
    if (state.mistakes >= 3) {
      log('[game] placeNumber: 3 mistakes reached');
      gameOver();
      showRetryOverlay();
    }
    return;
  }

  log('[game] placeNumber: valid placement');
  state._lastMistakeCell = null;
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  if (state.combo >= 2) showCombo(state.combo);
  pushHistory('place', row, col, prevVal, num, prevNotes, []);
  if (!state.started) { state.started = true; startTimer(); }
  render({ popCell: [row, col] }); saveGame(); playSound('place');
  haptic(8);
  if (state.settings.autoClearNotes) autoClearNotes(row, col, num);
  checkWin();
}

function toggleNote(row, col, num) {
  log('[game] toggleNote()', { row, col, num });
  if (state.givens[row][col]) { log('[game] toggleNote: blocked - cell is given'); return; }
  if (state.board[row][col]) { log('[game] toggleNote: blocked - cell has value'); return; }
  state.notesUsed = true;
  const prevNotes = [...state.notes[row][col]];
  if (state.notes[row][col].has(num)) state.notes[row][col].delete(num);
  else {
    state.notes[row][col].add(num);
    stats.totalNotesPlaced = (stats.totalNotesPlaced || 0) + 1;
  }
  pushHistory('note', row, col, 0, 0, prevNotes, [...state.notes[row][col]]);
  if (!state.started) { state.started = true; startTimer(); }
  render(); saveGame(); playSound('place');
}

function autoClearNotes(row, col, num) {
  for (let i = 0; i < 9; i++) { state.notes[row][i].delete(num); state.notes[i][col].delete(num); }
  const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      state.notes[r][c].delete(num);
}

function findHint() {
  const cands = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c] === 0) cands[r][c] = getCandidates(state.board, r, c);

  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c] === 0 && cands[r][c].size === 1)
        return { row: r, col: c, technique: 'Naked Single', desc: `Only ${[...cands[r][c]][0]} fits in row ${r+1}, column ${c+1}` };

  for (let n = 1; n <= 9; n++) {
    for (let row = 0; row < 9; row++) {
      const cells = [];
      for (let c = 0; c < 9; c++) if (state.board[row][c] === 0 && cands[row][c].has(n)) cells.push(c);
      if (cells.length === 1) return { row, col: cells[0], technique: 'Hidden Single', desc: `${n} can only go in row ${row+1}` };
    }
    for (let col = 0; col < 9; col++) {
      const cells = [];
      for (let r = 0; r < 9; r++) if (state.board[r][col] === 0 && cands[r][col].has(n)) cells.push(r);
      if (cells.length === 1) return { row: cells[0], col, technique: 'Hidden Single', desc: `${n} can only go in column ${col+1}` };
    }
    for (let br = 0; br < 9; br += 3)
      for (let bc = 0; bc < 9; bc += 3) {
        const cells = [];
        for (let r = br; r < br+3; r++)
          for (let c = bc; c < bc+3; c++)
            if (state.board[r][c] === 0 && cands[r][c].has(n)) cells.push([r, c]);
        if (cells.length === 1) return { row: cells[0][0], col: cells[0][1], technique: 'Hidden Single', desc: `${n} can only go in box ${br/3*3+bc/3+1}` };
      }
  }

  return null;
}

function giveHint() {
  log('[game] giveHint() called', { gameOver: state.gameOver, won: state.won });
  if (state.gameOver) { log('[game] giveHint: blocked - game over'); return; }
  if (state.won) { log('[game] giveHint: blocked - already won'); return; }
  if (state.hintsRemaining <= 0) {
    showHintShopModal();
    return;
  }
  const hint = findHint();
  if (!hint) { log('[game] giveHint: no hint found'); return; }
  const { row, col, technique, desc } = hint;

  log('[game] giveHint: revealing answer', { row, col, technique });
  const prevVal = state.board[row][col];
  const correctVal = state.solution[row][col];
  const prevNotes = [...state.notes[row][col]];
  state.board[row][col] = correctVal;
  state.notes[row][col] = new Set();
  pushHistory('hint', row, col, prevVal, correctVal, prevNotes, []);
  if ((bonusChallenge.bonusHints || 0) > 0) {
    bonusChallenge.bonusHints--;
    saveBonus();
    log('[game] giveHint: used bonus hint', { remaining: bonusChallenge.bonusHints });
  } else {
    state.hintsUsed++;
    stats.totalHintsUsedAll = (stats.totalHintsUsedAll || 0) + 1;
    saveStats();
    log('[game] giveHint: hint counted', { totalHints: state.hintsUsed });
  }
  state.hintsRemaining--;
  updateBadges();
  if (!state.started) { state.started = true; startTimer(); }
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  if (state.combo >= 2) showCombo(state.combo);
  render({ popCell: [row, col] }); saveGame(); playSound('place');
  checkWin();
}

function showHintShopModal() {
  log('[game] showHintShopModal()');
  const modal = document.getElementById('hintShopOverlay');
  if (!modal) return;
  const buyBtn = document.getElementById('hintShopBuy');
  const cancelBtn = document.getElementById('hintShopCancel');
  const xpDisplay = document.getElementById('hintShopXp');
  const buyCost = 50;
  if (xpDisplay) xpDisplay.textContent = String(stats.totalXp);
  modal.classList.add('open');
  if (buyBtn) {
    buyBtn.onclick = () => {
      if (stats.totalXp >= buyCost) {
        const prevXp = stats.totalXp;
        stats.totalXp -= buyCost;
        state.hintsRemaining += 3;
        stats.hintsBought = (stats.hintsBought || 0) + 3;
        saveStats();
        checkRankDown(prevXp);
        modal.classList.remove('open');
        updateBadges();
        playSound('place');
        giveHint();
      } else {
        showToast('Not enough XP!');
      }
    };
  }
  if (cancelBtn) cancelBtn.onclick = () => modal.classList.remove('open');
}

function checkWin() {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c] !== state.solution[r][c]) return;
  log('[game] checkWin: puzzle solved!');
  state.won = true;
  state.timerRunning = false;
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  render(); playSound('win');
  triggerWinExplosion(() => showWinDialog());
}

function gameOver() {
  log('[game] gameOver()');
  state.gameOver = true;
  state.timerRunning = false;
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  render();
}

function useSecondChance() {
  log('[game] useSecondChance()');
  state.mistakes = 0;
  state.gameOver = false;
  state.secondChanceUsed = true;
  document.getElementById('mistakes').textContent = '0';
  document.getElementById('retryOverlay')?.classList.remove('open');
  if (state.countdownMode && state.timer <= 0) {
    state.timer = state.countdownTime;
  }
  if (state.countdownMode && state.timer <= 0) return;
  document.getElementById('timer').textContent = formatTime(state.timer);
  render();
  startTimer();
}

function getSecondChancesLeft() {
  const today = todayStr();
  const data = loadWithVault('sudoku_second_chances', 'secondChances', { date: today, used: 0 });
  if (data.date !== today) return 3;
  return Math.max(0, 3 - (data.used || 0));
}

function useSecondChanceSlot() {
  const today = todayStr();
  const data = loadWithVault('sudoku_second_chances', 'secondChances', { date: today, used: 0 });
  if (data.date !== today) { data.date = today; data.used = 0; }
  data.used = (data.used || 0) + 1;
  saveWithVault('sudoku_second_chances', data, 'secondChances');
}

function earnSecondChance() {
  const today = todayStr();
  const data = loadWithVault('sudoku_second_chances', 'secondChances', { date: today, used: 0 });
  if (data.date !== today) { data.date = today; data.used = 0; }
  data.used = Math.max(0, (data.used || 0) - 1);
  saveWithVault('sudoku_second_chances', data, 'secondChances');
}

function startTimer() {
  if (state.timerRunning) { log('[game] startTimer: already running'); return; }
  log('[game] startTimer()');
  state.timerRunning = true;
  state.timerInterval = setInterval(() => {
    if (state.countdownMode) {
      state.timer--;
      if (state.timer <= 0) {
        state.timer = 0;
        document.getElementById('timer').textContent = formatTime(0);
        clearInterval(state.timerInterval); state.timerInterval = null;
        state.timerRunning = false;
        gameOver();
        showRetryOverlay();
        return;
      }
    } else {
      state.timer++;
    }
    document.getElementById('timer').textContent = formatTime(state.timer);
    const tw = document.getElementById('timerWrap');
    if (tw) tw.classList.toggle('timer-warn', state.countdownMode ? state.timer <= 300 : state.timer >= 300);
  }, 1000);
}

function pauseTimer() {
  if (!state.timerRunning) { log('[game] pauseTimer: already paused'); return; }
  log('[game] pauseTimer()');
  state.timerRunning = false;
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function showRetryOverlay() {
  log('[game] showRetryOverlay()');
  const retryOverlay = document.getElementById('retryOverlay');
  if (!retryOverlay) { log('[game] WARN: #retryOverlay not found'); return; }
  retryOverlay.classList.add('open');
  const retryBtn = document.getElementById('retryBtn');
  if (!retryBtn) { log('[game] WARN: #retryBtn not found'); return; }
  retryBtn.onclick = () => {
    log('[game] retryBtn clicked');
    retryOverlay.classList.remove('open');
    clearGame();
    retryLevel();
  };

  const scBtn = document.getElementById('retrySecondChance');
  const scInfo = document.getElementById('retrySecondChanceInfo');
  if (scBtn && scInfo) {
    const left = getSecondChancesLeft();
    if (left > 0) {
      scBtn.disabled = false;
      scBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:4px;"><use href="#ico-refresh"/></svg> Use Second Chance (' + left + ' left)';
      scInfo.textContent = 'Continue playing without losing progress';
      scBtn.onclick = () => {
        log('[game] second chance clicked');
        useSecondChanceSlot();
        useSecondChance();
      };
    } else {
      const cost = 150;
      scBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:4px;"><use href="#ico-gift"/></svg> Buy 3 for ' + cost + ' XP (' + stats.totalXp + ' XP)';
      scInfo.textContent = 'No daily second chances left';
      scBtn.disabled = stats.totalXp < cost;
      scBtn.onclick = () => {
        log('[game] buy second chance clicked');
        if (stats.totalXp >= cost) {
          const prevXp = stats.totalXp;
          stats.totalXp -= cost;
          saveStats();
          checkRankDown(prevXp);
          useSecondChance();
        } else {
          showToast('Not enough XP!');
        }
      };
    }
  }
}

function retryLevel() {
  log('[game] retryLevel()');
  state.board = state.solution.map((r, ri) => r.map((c, ci) => state.givens[ri][ci] ? state.solution[ri][ci] : 0));
  state.notes = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
  state.history = []; state.historyIdx = -1;
  state.selectedCell = null; state.notesMode = false;
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  state.timer = state.countdownMode ? state.countdownTime : 0; state.timerRunning = false;
  state.mistakes = 0; state.hintsUsed = 0; state.hintsRemaining = 3; state.started = false;
  state.gameOver = false; state.won = false;
  state.combo = 0; state.maxCombo = 0;
  state.secondChanceUsed = false;
  state._hintCell = null; state._lastMistakeCell = null;
  document.getElementById('timer').textContent = formatTime(state.timer);
  document.getElementById('mistakes').textContent = '0';
  updateUndoRedo();
  render({ entering: true });
  saveGame();
  playSound('place');
  if (!state.isDaily) showLevelAnimation(state.currentLevel);
}

function showLevelAnimation(level) {
  log('[game] showLevelAnimation()', { level });
  const overlay = document.getElementById('levelOverlay');
  if (!overlay) { log('[game] WARN: #levelOverlay not found'); return; }
  const numEl = document.getElementById('levelNumber');
  if (!numEl) { log('[game] WARN: #levelNumber not found'); return; }
  numEl.textContent = level;
  overlay.classList.add('open');
  const badge = document.getElementById('gameLevelBadge');
  const numBadge = document.getElementById('gameLevelNum');
  if (badge) { badge.style.display = 'inline-flex'; numBadge.textContent = level; }
  setTimeout(() => {
    overlay.classList.remove('open');
  }, 1200);
}

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function initNewGame(difficulty, isDaily, startLevel) {
  log('[game] initNewGame()', { difficulty, isDaily, startLevel });
  document.getElementById('page-game')?.classList.remove('paused');
  document.getElementById('pauseOverlay')?.classList.remove('open');
  document.getElementById('timerWrap')?.classList.remove('paused');
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  state.difficulty = difficulty || 'easy';
  state.isDaily = !!isDaily;
  state.gameMode = isDaily ? 'daily' : 'normal';
  state.currentLevel = startLevel || loadLevelProgress(difficulty) || 1;

  const boardEl = document.getElementById('board');
  const levelOverlay = document.getElementById('levelOverlay');
  const levelNum = document.getElementById('levelNumber');

  if (isDaily && loadDailyGame()) {
    log('[game] restoring daily game from cache');
    state.difficulty = 'medium';
    state.isDaily = true;
    state.gameMode = 'daily';
    document.getElementById('timer').textContent = formatTime(state.timer);
    document.getElementById('mistakes').textContent = String(state.mistakes);
    document.getElementById('gameLabel').textContent = 'Daily Challenge';
    document.getElementById('winOverlay').classList.remove('open');
    const gameBadge = document.getElementById('gameLevelBadge');
    if (gameBadge) gameBadge.style.display = 'none';
    updateUndoRedo();
    render({ entering: true });
    if (state.timer > 0 && !state.won && !state.gameOver) startTimer();
    showPage('page-game');
    return;
  }

  if (!isDaily) {
    const saved = loadWithVault(LS.game, 'game', null);
    if (saved) {
      if (saved.difficulty === difficulty && !saved.won && !saved.gameOver && saved.mistakes < 3) {
        log('[game] restoring saved game', { difficulty, mistakes: saved.mistakes });
        loadGame();
        state.isDaily = false;
        state.gameMode = 'normal';
        document.getElementById('gameLabel').textContent = capitalize(difficulty);
        document.getElementById('winOverlay').classList.remove('open');
        const gameBadge = document.getElementById('gameLevelBadge');
        if (gameBadge) gameBadge.style.display = 'inline-flex';
        const numBadge = document.getElementById('gameLevelNum');
        if (numBadge) numBadge.textContent = state.currentLevel;
        updateUndoRedo();
        render({ entering: true });
        if (state.timer > 0 && !state.won && !state.gameOver) startTimer();
        showPage('page-game');
        return;
      } else {
        log('[game] saved game does not match or is finished, generating new', { savedDiff: saved.difficulty, savedWon: saved.won, savedGameOver: saved.gameOver });
      }
    }
  }

  showPage('page-game');
  if (boardEl) boardEl.classList.add('blurred');
  render();

  const puzzleReady = () => {
    let puzzle;
    if (isDaily) {
      const today = new Date();
      const seed = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
      const rng = createSeededRng(seed);
      puzzle = generatePuzzle('medium', rng);
      log('[game] generated daily puzzle with seed', { seed });
    } else {
      puzzle = generatePuzzle(state.difficulty);
    }

    if (!puzzle || !puzzle.solution) {
      log('[game] ERROR: puzzle generation failed');
      if (boardEl) boardEl.classList.remove('blurred');
      if (levelOverlay) levelOverlay.classList.remove('open');
      return;
    }

    log('[game] puzzle generated', { clues: puzzle.givens.flat().filter(Boolean).length });

    state.solution = puzzle.solution.map(r => [...r]);
    state.board = puzzle.board.map(r => [...r]);
    state.givens = puzzle.givens.map(r => [...r]);
    state.notes = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
    state.history = []; state.historyIdx = -1;
    state.selectedCell = null; state.notesMode = false;
    state.timer = state.countdownMode ? state.countdownTime : 0; state.timerRunning = false;
    state.mistakes = 0; state.hintsUsed = 0; state.hintsRemaining = 3; state.started = false;
    state.gameOver = false; state.won = false; state.notesUsed = false;
    state.combo = 0; state.maxCombo = 0;
    state.secondChanceUsed = false;
    state._retryData = null; state._lastMistakeCell = null;
    document.getElementById('timer').textContent = formatTime(state.countdownMode ? state.countdownTime : 0);
    document.getElementById('mistakes').textContent = '0';
    document.getElementById('gameLabel').textContent = state.isDaily ? 'Daily Challenge' : capitalize(state.difficulty);
    document.getElementById('winOverlay').classList.remove('open');
    const gameBadge = document.getElementById('gameLevelBadge');
    if (gameBadge) gameBadge.style.display = state.isDaily ? 'none' : 'inline-flex';
    const numBadge = document.getElementById('gameLevelNum');
    if (numBadge) numBadge.textContent = state.currentLevel;
    updateUndoRedo();

    if (boardEl) boardEl.classList.remove('blurred');
    render({ entering: true });
    saveGame();
    playSound('place');

    if (isDaily) {
      const dailyOverlay = document.getElementById('dailyEntryOverlay');
      const dayEl = document.getElementById('dailyEntryDay');
      if (dayEl) {
        const dailiesDone = stats.gamesByMode?.daily || 0;
        dayEl.textContent = 'DAY ' + toRoman(dailiesDone + 1);
      }
      if (dailyOverlay) dailyOverlay.classList.add('open');
    }

    setTimeout(() => {
      if (levelOverlay) levelOverlay.classList.remove('open');
      document.getElementById('dailyEntryOverlay')?.classList.remove('open');
      document.getElementById('gameHeader')?.classList.add('game-enter');
      document.getElementById('boardWrap')?.classList.add('game-enter');
      document.getElementById('numPad')?.classList.add('game-enter');
      state.started = true;
      startTimer();
    }, 1200);
  };

  setTimeout(puzzleReady, 50);
  if (levelNum) levelNum.textContent = state.currentLevel;
  if (!state.isDaily && levelOverlay) levelOverlay.classList.add('open');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function showCombo(count) {
  const wrap = document.getElementById('comboWrap');
  const text = document.getElementById('comboText');
  if (!wrap || !text) return;
  text.textContent = 'x' + count;
  wrap.style.display = 'inline-flex';
  wrap.classList.remove('combo-pop');
  void wrap.offsetWidth;
  wrap.classList.add('combo-pop');
  if (count % 5 === 0) playSound('combo');

  const boardWrap = document.getElementById('boardWrap');
  if (!boardWrap) return;
  const floater = document.createElement('div');
  floater.className = 'combo-floater';
  floater.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24"><use href="#ico-fire"/></svg> x' + count + ' Combo!';
  const left = 8 + Math.random() * 72;
  const top = 8 + Math.random() * 72;
  floater.style.left = left + '%';
  floater.style.top = top + '%';
  const colors = ['#ff6b35','#ffd700','#ff6b9d','#a855f7','#4d96ff','#6bcb77'];
  floater.style.color = colors[count % colors.length];
  boardWrap.appendChild(floater);
  setTimeout(() => { if (floater.parentNode) floater.remove(); }, 3000);
}

function hideCombo() {
  const wrap = document.getElementById('comboWrap');
  if (wrap) wrap.style.display = 'none';
}

function checkRankDown(prevXp) {
  const prevRank = getRank(prevXp);
  const newRank = getRank(stats.totalXp);
  if (newRank.name !== prevRank.name) {
    showRankDownNotification(prevRank.name, newRank.name);
  }
}

function showRankDownNotification(oldRank, newRank) {
  const overlay = document.createElement('div');
  overlay.className = 'rank-down-overlay';
  overlay.innerHTML =
    '<div class="rank-down-card">' +
      '<div class="rank-down-icon"><svg width="48" height="48" viewBox="0 0 24 24"><use href="#ico-sad"/></svg></div>' +
      '<h2>Rank Down!</h2>' +
      '<p>You dropped from <strong>' + oldRank + '</strong> to <strong>' + newRank + '</strong></p>' +
      '<button class="rank-down-ok" onclick="this.parentElement.parentElement.remove()">OK</button>' +
    '</div>';
  document.body.appendChild(overlay);
}

function triggerWinExplosion(callback) {
  const overlay = document.getElementById('explosionOverlay');
  if (!overlay) { callback(); return; }
  overlay.classList.add('open');
  document.body.classList.add('body-shake');
  setTimeout(() => {
    overlay.classList.remove('open');
    document.body.classList.remove('body-shake');
    callback();
  }, 1000);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('open');
  setTimeout(() => toast.classList.remove('open'), 2000);
}
