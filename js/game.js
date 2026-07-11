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
  isDaily: false,  // is this the daily challenge?
};
state.settings = {};

function pushHistory(type, row, col, prevVal, newVal, prevNotes, newNotes) {
  state.history = state.history.slice(0, state.historyIdx + 1);
  state.history.push({ type, row, col, prevVal, newVal, prevNotes, newNotes });
  state.historyIdx = state.history.length - 1;
  updateUndoRedo();
}

function undo() {
  if (state.historyIdx < 0 || state.gameOver || state.won) return;
  const move = state.history[state.historyIdx];
  state.historyIdx--;
  const { row, col, prevVal, newVal, prevNotes, newNotes } = move;
  state.board[row][col] = prevVal;
  state.notes[row][col] = new Set(prevNotes);
  if (move.type === 'mistake') state.mistakes--;
  updateUndoRedo();
  render();
  saveGame();
}

function redo() {
  if (state.historyIdx >= state.history.length - 1 || state.gameOver || state.won) return;
  state.historyIdx++;
  const move = state.history[state.historyIdx];
  const { row, col, prevVal, newVal, prevNotes, newNotes } = move;
  state.board[row][col] = newVal;
  state.notes[row][col] = new Set(newNotes);
  if (move.type === 'mistake') state.mistakes++;
  updateUndoRedo();
  render();
  saveGame();
}

function placeNumber(row, col, num) {
  if (state.gameOver || state.won || !state.selectedCell) return;
  if (state.givens[row][col]) return;
  if (state.notesMode) { toggleNote(row, col, num); return; }

  const prevVal = state.board[row][col];
  if (prevVal === num) return;

  if (num === 0) {
    const prevNotes = [...state.notes[row][col]];
    state.board[row][col] = 0;
    state.notes[row][col] = new Set();
    pushHistory('clear', row, col, prevVal, 0, prevNotes, []);
    if (!state.started) { state.started = true; startTimer(); }
    render(); saveGame(); playSound('place');
    return;
  }

  state.board[row][col] = num;
  const prevNotes = [...state.notes[row][col]];
  state.notes[row][col] = new Set();

  if (!isValidPlacement(state.board, row, col, num)) {
    state.mistakes++;
    pushHistory('mistake', row, col, prevVal, num, prevNotes, []);
    if (!state.started) { state.started = true; startTimer(); }
    render({ shakeCell: [row, col] }); saveGame(); playSound('error');
    haptic([30, 50, 30]);
    if (state.settings.mistakeLimit && state.mistakes >= 3) gameOver();
    return;
  }

  pushHistory('place', row, col, prevVal, num, prevNotes, []);
  if (!state.started) { state.started = true; startTimer(); }
  render({ popCell: [row, col] }); saveGame(); playSound('place');
  haptic(8);
  if (state.settings.autoClearNotes) autoClearNotes(row, col, num);
  checkWin();
}

function toggleNote(row, col, num) {
  if (state.givens[row][col] || state.board[row][col]) return;
  const prevNotes = [...state.notes[row][col]];
  if (state.notes[row][col].has(num)) state.notes[row][col].delete(num);
  else state.notes[row][col].add(num);
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

  // Naked Single
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c] === 0 && cands[r][c].size === 1)
        return { row: r, col: c, technique: 'Naked Single', desc: `Only ${[...cands[r][c]][0]} fits in row ${r+1}, column ${c+1}` };

  // Hidden Single
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
  if (state.gameOver || state.won) return;
  const hint = findHint();
  if (!hint) return;
  const { row, col, technique, desc } = hint;

  if (state._hintCell && state._hintCell[0] === row && state._hintCell[1] === col) {
    // Second ask — reveal the answer
    const prevVal = state.board[row][col];
    const correctVal = state.solution[row][col];
    const prevNotes = [...state.notes[row][col]];
    state.board[row][col] = correctVal;
    state.notes[row][col] = new Set();
    pushHistory('hint', row, col, prevVal, correctVal, prevNotes, []);
    state.hintsUsed++;
    state._hintCell = null;
    if (!state.started) { state.started = true; startTimer(); }
    render({ popCell: [row, col] }); saveGame(); playSound('place');
    checkWin();
  } else {
    // First ask — show technique
    state._hintCell = [row, col];
    if (!state.selectedCell || state.selectedCell[0] !== row || state.selectedCell[1] !== col) {
      selectCell(row, col);
    }
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
  state.won = true;
  state.timerRunning = false;
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  render(); playSound('win');
  showWinDialog();
}

function gameOver() {
  state.gameOver = true;
  state.timerRunning = false;
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  render();
  clearGame();
}

function startTimer() {
  if (state.timerRunning) return;
  state.timerRunning = true;
  state.timerInterval = setInterval(() => {
    state.timer++;
    document.getElementById('timer').textContent = formatTime(state.timer);
  }, 1000);
}

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function initNewGame(difficulty, isDaily) {
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  state.difficulty = difficulty || 'easy';
  state.isDaily = !!isDaily;

  document.getElementById('loadingOverlay').classList.add('open');

  setTimeout(() => {
    let puzzle;
    if (isDaily) {
      const today = new Date();
      const seed = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
      const rng = createSeededRng(seed);
      puzzle = generatePuzzle('medium', rng);
    } else {
      puzzle = generatePuzzle(state.difficulty);
    }

    console.log('[Sudoku] Game created successfully -', isDaily ? 'Daily' : state.difficulty, '-', puzzle.givens.flat().filter(Boolean).length, 'clues');

    state.solution = puzzle.solution.map(r => [...r]);
    state.board = puzzle.board.map(r => [...r]);
    state.givens = puzzle.givens.map(r => [...r]);
    state.notes = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
    state.history = []; state.historyIdx = -1;
    state.selectedCell = null; state.notesMode = false;
    state.timer = 0; state.timerRunning = false;
    state.mistakes = 0; state.hintsUsed = 0; state.started = false;
    state.gameOver = false; state.won = false;
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('mistakes').textContent = '0';
    document.getElementById('gameLabel').textContent = state.isDaily ? 'Daily Challenge' : capitalize(state.difficulty);
    document.getElementById('winOverlay').classList.remove('open');
    updateUndoRedo();
    render();
    saveGame();
    playSound('place');
    document.getElementById('loadingOverlay').classList.remove('open');
    showPage('page-game');
  }, 50);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

