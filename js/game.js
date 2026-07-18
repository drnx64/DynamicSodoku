// ============================================================
// 6. Game State
// ============================================================
function emptyGrid() {
  return Array.from({length: 9}, () => Array(9).fill(0));
}
function emptyNotes() {
  return Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
}

const state = {
  solution: emptyGrid(), givens: emptyGrid(), board: emptyGrid(), notes: emptyNotes(),
  history: [], historyIdx: -1,
  selectedCell: null, notesMode: false,
  timer: 0, timerRunning: false, timerInterval: null,
  mistakes: 0, hintsUsed: 0, started: false,
  difficulty: 'easy', gameOver: false, won: false,
  isDaily: false, gameMode: 'normal',
  currentLevel: 1,
  notesUsed: false,
  combo: 0, maxCombo: 0,
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

function redo() {
  log('[game] redo() called', { historyIdx: state.historyIdx, totalHistory: state.history.length, gameOver: state.gameOver, won: state.won });
  if (state.historyIdx >= state.history.length - 1) { log('[game] redo: nothing to redo'); return; }
  if (state.gameOver) { log('[game] redo: game over'); return; }
  if (state.won) { log('[game] redo: already won'); return; }
  state.historyIdx++;
  const move = state.history[state.historyIdx];
  const { row, col, prevVal, newVal, prevNotes, newNotes } = move;
  log('[game] redo: applying', { row, col, newVal, prevVal, moveType: move.type });
  state.board[row][col] = newVal;
  state.notes[row][col] = new Set(newNotes);
  if (move.type === 'mistake') state.mistakes++;
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
    haptic([30, 50, 30]);
    const boardWrap = document.getElementById('boardWrap');
    if (boardWrap) { boardWrap.classList.remove('mistake-shake'); void boardWrap.offsetWidth; boardWrap.classList.add('mistake-shake'); }
    const toast = document.getElementById('toast');
    if (toast) {
      toast.innerHTML = '<span style="color:#ef4444;font-weight:700;">✗ Wrongly placed!</span>';
      toast.classList.add('open');
      setTimeout(() => toast.classList.remove('open'), 2000);
    }
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
  const hint = findHint();
  if (!hint) { log('[game] giveHint: no hint found'); return; }
  const { row, col, technique, desc } = hint;

  if (state._hintCell && state._hintCell[0] === row && state._hintCell[1] === col) {
    log('[game] giveHint: second ask - revealing answer', { row, col, technique });
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
    state._hintCell = null;
    if (!state.started) { state.started = true; startTimer(); }
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    if (state.combo >= 2) showCombo(state.combo);
    render({ popCell: [row, col] }); saveGame(); playSound('place');
    checkWin();
  } else {
    log('[game] giveHint: first ask - showing technique', { technique, row, col });
    state._hintCell = [row, col];
    if (!state.selectedCell || state.selectedCell[0] !== row || state.selectedCell[1] !== col) {
      selectCell(row, col);
    }
    render({ hintHighlight: { row, col } });
    showHintToast(technique, desc);
    playSound('place');
  }
}

function showHintToast(technique, desc) {
  const existing = document.getElementById('hintToast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'hintToast';
  toast.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: var(--card-bg); color: var(--text);
    padding: 12px 20px; border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 200; font-size: 13px; font-weight: 500;
    text-align: center; max-width: 320px;
    animation: slideUp 0.25s ease;
    border: 1.5px solid var(--accent);`;
  toast.innerHTML = `<strong>${technique}</strong>: ${desc}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
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
  clearGame();
}

function startTimer() {
  if (state.timerRunning) { log('[game] startTimer: already running'); return; }
  log('[game] startTimer()');
  state.timerRunning = true;
  state.timerInterval = setInterval(() => {
    state.timer++;
    document.getElementById('timer').textContent = formatTime(state.timer);
    const tw = document.getElementById('timerWrap');
    if (tw) tw.classList.toggle('timer-warn', state.timer >= 300);
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
    retryLevel();
  };
}

function retryLevel() {
  log('[game] retryLevel()');
  state.board = state.solution.map((r, ri) => r.map((c, ci) => state.givens[ri][ci] ? state.solution[ri][ci] : 0));
  state.notes = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
  state.history = []; state.historyIdx = -1;
  state.selectedCell = null; state.notesMode = false;
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  state.timer = 0; state.timerRunning = false;
  state.mistakes = 0; state.hintsUsed = 0; state.started = false;
  state.gameOver = false; state.won = false;
  state._hintCell = null; state._lastMistakeCell = null;
  document.getElementById('timer').textContent = '00:00';
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
    const raw = localStorage.getItem(LS.game);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
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
      } catch(e) { log('[game] error parsing saved game', e); }
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
    state.timer = 0; state.timerRunning = false;
    state.mistakes = 0; state.hintsUsed = 0; state.started = false;
    state.gameOver = false; state.won = false; state.notesUsed = false;
    state.combo = 0; state.maxCombo = 0;
    state._retryData = null; state._lastMistakeCell = null;
    document.getElementById('timer').textContent = '00:00';
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

    setTimeout(() => {
      if (levelOverlay) levelOverlay.classList.remove('open');
      document.getElementById('gameHeader')?.classList.add('game-enter');
      document.getElementById('boardWrap')?.classList.add('game-enter');
      document.getElementById('numPad')?.classList.add('game-enter');
      state.started = true;
      startTimer();
    }, 1200);
  };

  setTimeout(puzzleReady, 50);
  if (levelNum) levelNum.textContent = state.currentLevel;
  if (levelOverlay) levelOverlay.classList.add('open');
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

  const boardWrap = document.getElementById('boardWrap');
  if (!boardWrap) return;
  const floater = document.createElement('div');
  floater.className = 'combo-floater';
  floater.textContent = 'x' + count;
  const left = 8 + Math.random() * 72;
  const top = 8 + Math.random() * 72;
  floater.style.left = left + '%';
  floater.style.top = top + '%';
  const colors = ['#ff6b35','#ffd700','#ff6b9d','#a855f7','#4d96ff','#6bcb77'];
  floater.style.color = colors[count % colors.length];
  boardWrap.appendChild(floater);
  setTimeout(() => { if (floater.parentNode) floater.remove(); }, 1200);
}

function hideCombo() {
  const wrap = document.getElementById('comboWrap');
  if (wrap) wrap.style.display = 'none';
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
