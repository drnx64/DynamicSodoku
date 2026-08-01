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
  isChallenge: false, challengeSeed: null, challengeTarget: null,
  currentLevel: 1,
  notesUsed: false,
  combo: 0, maxCombo: 0,
  countdownMode: false, countdownTime: 0,
  secondChanceUsed: false,
  _retryData: null,
  _freeUndos: 0,
  _freeAuto: 0,
  _autoCandidatesPaid: false,
  _devMode: false,
  _unlimitedHintsUntil: 0,
  _archivedSeed: null,
  _seed: null,
  _customOptions: null,
  _customTier: null,
  completed: { rows: new Set(), cols: new Set(), boxes: new Set() },
  completedAnimated: { rows: new Set(), cols: new Set(), boxes: new Set() },
};
state.settings = {};

const MAX_HISTORY = 500;

function pushHistory(type, row, col, prevVal, newVal, prevNotes, newNotes) {
  log('[game] pushHistory()', { type, row, col, prevVal, newVal, historyIdx: state.historyIdx });
  state.history = state.history.slice(0, state.historyIdx + 1);
  state.history.push({ type, row, col, prevVal, newVal, prevNotes, newNotes });
  if (state.history.length > MAX_HISTORY) {
    state.history.shift();
  }
  state.historyIdx = state.history.length - 1;
  updateUndoRedo();
}

function undo() {
  log('[game] undo() called', { historyIdx: state.historyIdx, gameOver: state.gameOver, won: state.won });
  if (state.historyIdx < 0) { log('[game] undo: nothing to undo'); return; }
  if (state.gameOver) { log('[game] undo: game over'); return; }
  if (state.won) { log('[game] undo: already won'); return; }
  const move = state.history[state.historyIdx];
  const cost = (state._freeUndos > 0) ? 0 : (state._devMode ? 0 : 5);
  if (cost > 0 && stats.totalXp < cost) { showToast('Not enough XP to undo!'); return; }
  if (cost > 0) stats.totalXp -= cost;
  else { state._freeUndos--; }
  state.historyIdx--;
  const { row, col, prevVal, newVal, prevNotes, newNotes } = move;
  log('[game] undo: applying', { row, col, prevVal, newVal, moveType: move.type, cost });
  state.board[row][col] = prevVal;
  state.notes[row][col] = new Set(prevNotes);
  if (move.type === 'mistake') state.mistakes--;
  stats.totalUndosUsed = (stats.totalUndosUsed || 0) + 1;
  saveStats();
  updateUndoRedo();
  requestRender();
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
    state.completed.rows.delete(row);
    state.completed.cols.delete(col);
    state.completed.boxes.delete(boxIndexOf(row, col));
    state.completedAnimated.rows.delete(row);
    state.completedAnimated.cols.delete(col);
    state.completedAnimated.boxes.delete(boxIndexOf(row, col));
    pushHistory('clear', row, col, prevVal, 0, prevNotes, []);
    if (!state.started) { state.started = true; startTimer(); }
    requestRender(); saveGame(); playSound('place');
    return;
  }

  state.board[row][col] = num;
  const prevNotes = [...state.notes[row][col]];
  state.notes[row][col] = new Set();

  if (num !== state.solution[row][col]) {
    log('[game] placeNumber: invalid placement - mistake');
    showToast('Wrong!');
    state.combo = 0;
    hideCombo();
    state.mistakes++;
    state._lastMistakeCell = [row, col];
    pushHistory('mistake', row, col, prevVal, num, prevNotes, []);
    if (!state.started) { state.started = true; startTimer(); }
    requestRender({ shakeCell: [row, col], mistakeCell: [row, col] });
    saveGame(); playSound('error');
    haptic([80, 30, 100, 30, 120, 30, 150]);
    if (!state.settings.reducedAnimations) {
      const boardWrap = document.getElementById('boardWrap');
      if (boardWrap) { boardWrap.classList.remove('mistake-shake'); void boardWrap.offsetWidth; boardWrap.classList.add('mistake-shake'); }
      document.body.classList.remove('body-shake'); void document.body.offsetWidth; document.body.classList.add('body-shake');
    }
    const mo = document.getElementById('mistakeOverlay');
    if (mo) { mo.classList.remove('open'); void mo.offsetWidth; mo.classList.add('open'); setTimeout(() => { mo.classList.remove('open'); document.body.classList.remove('body-shake'); }, 1100); }
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
  requestRender({ popCell: [row, col] }); saveGame(); playSound('place');
  haptic(8);
  if (state.settings.autoClearNotes) autoClearNotes(row, col, num);
  checkCompleted(row, col);
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
  requestRender(); saveGame(); playSound('place');
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
  const unlimited = Date.now() < state._unlimitedHintsUntil;
  if (state.hintsRemaining <= 0 && !unlimited && (stats._freeHints || 0) <= 0) {
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
  if (!unlimited) {
    if ((stats._freeHints || 0) > 0) {
      stats._freeHints--;
      saveStats();
      log('[game] giveHint: used free hint', { remaining: stats._freeHints });
    } else if ((bonusChallenge.bonusHints || 0) > 0) {
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
  } else {
    log('[game] giveHint: unlimited hints active, not consuming');
  }
  updateBadges();
  if (!state.started) { state.started = true; startTimer(); }
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  if (state.combo >= 2) showCombo(state.combo);
  requestRender({ popCell: [row, col] }); saveGame(); playSound('place');
  checkCompleted(row, col);
  checkWin();
}

function showHintShopModal() {
  log('[game] showHintShopModal()');
  const modal = document.getElementById('hintShopOverlay');
  if (!modal) return;
  const buyBtn = document.getElementById('hintShopBuy');
  const cancelBtn = document.getElementById('hintShopCancel');
  const xpDisplay = document.getElementById('hintShopXp');
  const buyCost = state._devMode ? 0 : 50;
  if (xpDisplay) xpDisplay.textContent = String(stats.totalXp);
  modal.classList.add('open');
  if (buyBtn) {
    buyBtn.onclick = () => {
      if (stats.totalXp >= buyCost || state._devMode) {
        const prevXp = stats.totalXp;
        if (!state._devMode) stats.totalXp -= buyCost;
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

function isHouseCompleted(type, index) {
  const cells = type === 'row' ? getHouseCells('row', index)
    : type === 'col' ? getHouseCells('col', index)
    : getHouseCells('box', index);
  return cells.every(([r, c]) => state.board[r][c] !== 0);
}

function checkCompleted(row, col) {
  if (!state.settings.showCompleted) return;
  const newCompleted = [];
  if (!state.completed.rows.has(row) && isHouseCompleted('row', row)) {
    state.completed.rows.add(row);
    state.completedAnimated.rows.add(row);
    newCompleted.push({ type: 'row', index: row });
  }
  if (!state.completed.cols.has(col) && isHouseCompleted('col', col)) {
    state.completed.cols.add(col);
    state.completedAnimated.cols.add(col);
    newCompleted.push({ type: 'col', index: col });
  }
  const bi = boxIndexOf(row, col);
  if (!state.completed.boxes.has(bi) && isHouseCompleted('box', bi)) {
    state.completed.boxes.add(bi);
    state.completedAnimated.boxes.add(bi);
    newCompleted.push({ type: 'box', index: bi });
  }
  if (newCompleted.length > 0) {
    log('[game] completed:', newCompleted.map(h => h.type + ' ' + h.index).join(', '));
    log('[game] completedAnimated rows:', [...state.completedAnimated.rows]);
    log('[game] completedAnimated cols:', [...state.completedAnimated.cols]);
    log('[game] completedAnimated boxes:', [...state.completedAnimated.boxes]);
    requestRender();
    setTimeout(() => {
      newCompleted.forEach(h => {
        if (h.type === 'row') state.completedAnimated.rows.delete(h.index);
        else if (h.type === 'col') state.completedAnimated.cols.delete(h.index);
        else state.completedAnimated.boxes.delete(h.index);
      });
    }, 1200);
  }
}

function activateUnlimitedHints(durationMin) {
  state._unlimitedHintsUntil = Date.now() + durationMin * 60 * 1000;
  saveGame();
  const timeStr = durationMin >= 60 ? (durationMin/60) + ' HOURS' : durationMin + ' MINUTES';
  showToast('<div style="background:linear-gradient(135deg,#7c3aed,#2563eb);border:2px solid #fbbf24;border-radius:12px;padding:12px 16px;text-align:center;box-shadow:0 8px 32px rgba(251,191,36,0.4);">' +
    '<div style="font-size:20px;margin-bottom:2px;">&#129323; EASTER EGG UNLOCKED!</div>' +
    '<div style="font-size:14px;">UNLIMITED HINTS for <strong>' + timeStr + '</strong></div>' +
    '</div>', true);
  log('[game] UNLIMITED HINTS ACTIVATED', { durationMin, until: new Date(state._unlimitedHintsUntil).toISOString() });
}

function checkEasterEgg() {
  if (resolveCustomDifficulty() !== 'impossible') return;
  const prevUnlimited = state._unlimitedHintsUntil;
  if (state.timer < 180) {
    activateUnlimitedHints(60);
  } else if (state.timer < 300) {
    activateUnlimitedHints(15);
  }
}

function checkWin() {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c] !== state.solution[r][c]) return;
  log('[game] checkWin: puzzle solved!');
  checkEasterEgg();
  checkDailyTasks(resolveCustomDifficulty(), state.timer, state.mistakes, state.hintsUsed, state.maxCombo);
  state.won = true;
  state.timerRunning = false;
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  requestRender(); playSound('win');
  triggerWinExplosion(() => showWinDialog());
}

function gameOver() {
  log('[game] gameOver()');
  state.gameOver = true;
  state.timerRunning = false;
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  requestRender();
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
  requestRender();
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
      const cost = state._devMode ? 0 : 150;
      scBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:4px;"><use href="#ico-gift"/></svg> Buy 3 for ' + cost + ' XP (' + stats.totalXp + ' XP)';
      scInfo.textContent = state._devMode ? 'Dev mode — free' : 'No daily second chances left';
      scBtn.disabled = !state._devMode && stats.totalXp < cost;
      scBtn.onclick = () => {
        log('[game] buy second chance clicked');
        if (stats.totalXp >= cost || state._devMode) {
          const prevXp = stats.totalXp;
          if (!state._devMode) stats.totalXp -= cost;
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
  state._freeUndos = state._freeUndos || 0;
  state._freeAuto = state._freeAuto || 0;
state.completed = { rows: new Set(), cols: new Set(), boxes: new Set() };
  state.completedAnimated = { rows: new Set(), cols: new Set(), boxes: new Set() };
  state._hintCell = null; state._lastMistakeCell = null;
  document.getElementById('timer').textContent = formatTime(state.timer);
  document.getElementById('mistakes').textContent = '0';
  updateUndoRedo();
  requestRender({ entering: true });
  saveGame();
  playSound('place');
  if (!state.isDaily && !state.isChallenge) showLevelAnimation(state.currentLevel);
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

function initNewGame(difficulty, isDaily, startLevel, seedDate, challengeData) {
  log('[game] initNewGame()', { difficulty, isDaily, startLevel, seedDate, challengeData });
  document.getElementById('page-game')?.classList.remove('paused');
  document.getElementById('pauseOverlay')?.classList.remove('open');
  document.getElementById('timerWrap')?.classList.remove('paused');
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  state.difficulty = difficulty || 'easy';
  state.isDaily = !!isDaily;
  state.isChallenge = !!challengeData;
  state.challengeSeed = challengeData ? challengeData.seed : null;
  state.challengeTarget = challengeData ? { name: challengeData.name, time: challengeData.time } : null;
  state.gameMode = isDaily ? 'daily' : (challengeData ? 'challenge' : 'normal');
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

  if (!isDaily && !challengeData) {
    const saved = loadWithVault(LS.game, 'game', null);
    if (saved) {
      if (saved.difficulty === difficulty && !saved.won && !saved.gameOver && saved.mistakes < 3 && !saved.isChallenge) {
        log('[game] restoring saved game', { difficulty, mistakes: saved.mistakes });
        loadGame();
        state.isDaily = false;
        state.gameMode = 'normal';
        document.getElementById('gameLabel').textContent = difficulty === 'custom' ? 'Custom' : capitalize(difficulty);
        document.getElementById('winOverlay').classList.remove('open');
        const gameBadge = document.getElementById('gameLevelBadge');
        if (gameBadge) gameBadge.style.display = 'inline-flex';
        const numBadge = document.getElementById('gameLevelNum');
        if (numBadge) numBadge.textContent = state.currentLevel;
        updateUndoRedo();
        requestRender({ entering: true });
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
  requestRender();

  const seed = isDaily
    ? (seedDate || (new Date().getFullYear() + '-' + String(new Date().getMonth()+1).padStart(2,'0') + '-' + String(new Date().getDate()).padStart(2,'0')))
    : (challengeData ? challengeData.seed : ('r' + Math.random().toString(36).slice(2) + Date.now().toString(36)));
  if (seed) state._archivedSeed = seedDate || null;
  state._seed = seed;

  const genPromise = isDaily
    ? generatePuzzleAsync('medium', seed)
    : generatePuzzleAsync(state.difficulty, seed, (state.difficulty === 'custom' && state._customOptions) ? state._customOptions : undefined);

  genPromise.then(puzzle => {
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
    if (state.difficulty === 'custom') {
      state._customTier = puzzle.tier || state._customOptions?.tier || null;
      log('[game] custom puzzle tier', { tier: state._customTier });
    }
    state.notes = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
    state.history = []; state.historyIdx = -1;
  state.selectedCell = null; state.notesMode = false;
  state.timer = state.countdownMode ? state.countdownTime : 0; state.timerRunning = false;
  state.mistakes = 0; state.hintsUsed = 0; state.hintsRemaining = 3; state.started = false;
  state.gameOver = false; state.won = false; state.notesUsed = false;
    state.combo = 0; state.maxCombo = 0;
    state.secondChanceUsed = false;
    state._retryData = null; state._lastMistakeCell = null;
    state._freeUndos = state._freeUndos || 0;
    state._freeAuto = state._freeAuto || 0;
    state._autoCandidatesPaid = false;
    state._analyzerUnlocked = false;
    if (state.difficulty !== 'custom') state._customTier = null;
    if (state.difficulty !== 'custom') state._customOptions = null;
state.completed = { rows: new Set(), cols: new Set(), boxes: new Set() };
  state.completedAnimated = { rows: new Set(), cols: new Set(), boxes: new Set() };
    document.getElementById('timer').textContent = formatTime(state.countdownMode ? state.countdownTime : 0);
    document.getElementById('mistakes').textContent = '0';
    document.getElementById('gameLabel').textContent = state.isDaily ? (state._archivedSeed ? 'Archive ' + state._archivedSeed : 'Daily Challenge') : (state.isChallenge ? 'Challenge' : (state.difficulty === 'custom' ? 'Custom' : capitalize(state.difficulty)));
    document.getElementById('winOverlay').classList.remove('open');
    const gameBadge = document.getElementById('gameLevelBadge');
    if (gameBadge) gameBadge.style.display = state.isDaily || state.isChallenge ? 'none' : 'inline-flex';
    const numBadge = document.getElementById('gameLevelNum');
    if (numBadge) numBadge.textContent = state.currentLevel;
    updateUndoRedo();

    if (boardEl) boardEl.classList.remove('blurred');
    requestRender({ entering: true });
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
  }).catch(err => {
    log('[game] ERROR: puzzle generation failed', err);
    showToast('Failed to generate puzzle. Retrying...');
    if (boardEl) boardEl.classList.remove('blurred');
    if (levelOverlay) levelOverlay.classList.remove('open');
  });

  if (levelNum) levelNum.textContent = state.currentLevel;
  if (!state.isDaily && !state.isChallenge && levelOverlay) levelOverlay.classList.add('open');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function showCombo(count) {
  const wrap = document.getElementById('comboWrap');
  const text = document.getElementById('comboText');
  if (!wrap || !text) return;
  text.textContent = 'x' + count;
  wrap.style.display = 'inline-flex';
  if (!state.settings.reducedAnimations) {
    wrap.classList.remove('combo-pop');
    void wrap.offsetWidth;
    wrap.classList.add('combo-pop');
  }
  if (count % 5 === 0) playSound('combo');

  if (state.settings.reducedAnimations) return;
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

function showToast(msg, isHtml) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (isHtml) toast.innerHTML = msg;
  else toast.textContent = msg;
  toast.classList.add('open');
  setTimeout(() => toast.classList.remove('open'), 3000);
}
