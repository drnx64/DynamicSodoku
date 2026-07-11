// ============================================================
// 7. Rendering
// ============================================================
function render(opts) {
  opts = opts || {};
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  const conflicts = state.settings.highlightConflicts ? findConflicts(state.board) : new Set();
  const selectedVal = state.selectedCell ? state.board[state.selectedCell[0]][state.selectedCell[1]] : 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r; cell.dataset.col = c;
      if (state.givens[r][c]) cell.classList.add('given');
      else if (state.board[r][c]) cell.classList.add('user');
      if (state.selectedCell && state.selectedCell[0] === r && state.selectedCell[1] === c) cell.classList.add('selected');

      if (state.settings.highlightPeers && state.selectedCell) {
        const [sr, sc] = state.selectedCell;
        if ((r === sr || c === sc || (Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3))) && !(r === sr && c === sc))
          cell.classList.add('peer');
      }
      if (state.settings.highlightSame && selectedVal && state.board[r][c] === selectedVal && !(state.selectedCell && state.selectedCell[0] === r && state.selectedCell[1] === c))
        cell.classList.add('same-num');
      if (conflicts.has(r+','+c)) cell.classList.add('conflict');

      if (opts.popCell && opts.popCell[0] === r && opts.popCell[1] === c) cell.classList.add('pop');
      if (opts.shakeCell && opts.shakeCell[0] === r && opts.shakeCell[1] === c) cell.classList.add('shake');

      const valSpan = document.createElement('span');
      valSpan.className = 'cell-value';
      if (state.board[r][c]) valSpan.textContent = state.board[r][c];
      cell.appendChild(valSpan);

      if (!state.board[r][c]) {
        const notesGrid = document.createElement('div');
        notesGrid.className = 'notes-grid';
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement('span');
          if (state.settings.autoCandidates && !state.givens[r][c]) {
            if (getCandidates(state.board, r, c).has(n)) span.textContent = n;
          } else {
            if (state.notes[r][c].has(n)) span.textContent = n;
          }
          notesGrid.appendChild(span);
        }
        cell.appendChild(notesGrid);
      }
      cell.addEventListener('click', () => selectCell(r, c));
      boardEl.appendChild(cell);
    }
  }
  document.getElementById('timer').textContent = formatTime(state.timer);
  document.getElementById('mistakes').textContent = String(state.mistakes);
  updateNumPad();
  updateNotesBtn();
}

function selectCell(row, col) {
  state.selectedCell = [row, col];
  render();
  saveGame();
}

function updateNumPad() {
  const counts = Array(10).fill(9);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c]) counts[state.board[r][c]]--;
  document.getElementById('numPad').querySelectorAll('button').forEach((btn, i) => {
    const n = i + 1;
    const rem = btn.querySelector('.remaining');
    if (rem) {
      rem.textContent = counts[n];
      rem.classList.toggle('zero', counts[n] <= 0);
    }
    btn.classList.toggle('placed', counts[n] <= 0);
    if (!state.settings.showRemaining && rem) rem.remove();
  });
}

function updateNotesBtn() {
  document.getElementById('notesBtn').classList.toggle('active', state.notesMode);
  document.getElementById('autoBtn').classList.toggle('active', state.settings.autoCandidates);
}

function updateUndoRedo() {
  document.getElementById('undoBtn').disabled = state.historyIdx < 0;
  document.getElementById('redoBtn').disabled = state.historyIdx >= state.history.length - 1;
}

// ============================================================
// 8. Input Handling
// ============================================================
function setupInput() {
  const numPad = document.getElementById('numPad');
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.textContent = n;
    const rem = document.createElement('span');
    rem.className = 'remaining';
    btn.appendChild(rem);
    btn.addEventListener('click', () => {
      if (state.selectedCell) placeNumber(state.selectedCell[0], state.selectedCell[1], n);
    });
    numPad.appendChild(btn);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9' && state.selectedCell)
      placeNumber(state.selectedCell[0], state.selectedCell[1], parseInt(e.key));
    if ((e.key === 'Backspace' || e.key === 'Delete') && state.selectedCell)
      placeNumber(state.selectedCell[0], state.selectedCell[1], 0);
    if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey)
      { state.notesMode = !state.notesMode; updateNotesBtn(); }
    if (e.key === 'ArrowUp' && state.selectedCell) { e.preventDefault(); selectCell(Math.max(0, state.selectedCell[0] - 1), state.selectedCell[1]); }
    if (e.key === 'ArrowDown' && state.selectedCell) { e.preventDefault(); selectCell(Math.min(8, state.selectedCell[0] + 1), state.selectedCell[1]); }
    if (e.key === 'ArrowLeft' && state.selectedCell) { e.preventDefault(); selectCell(state.selectedCell[0], Math.max(0, state.selectedCell[1] - 1)); }
    if (e.key === 'ArrowRight' && state.selectedCell) { e.preventDefault(); selectCell(state.selectedCell[0], Math.min(8, state.selectedCell[1] + 1)); }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); redo(); }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
  });

  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.getElementById('notesBtn').addEventListener('click', () => { state.notesMode = !state.notesMode; updateNotesBtn(); });
  document.getElementById('hintBtn').addEventListener('click', giveHint);
  document.getElementById('autoBtn').addEventListener('click', () => {
    state.settings.autoCandidates = !state.settings.autoCandidates;
    render();
    saveSettings();
  });

  document.getElementById('timerWrap').addEventListener('click', () => {
    if (!state.started) return;
    state.timerRunning = !state.timerRunning;
    if (state.timerRunning) {
      state.timerInterval = setInterval(() => {
        state.timer++;
        document.getElementById('timer').textContent = formatTime(state.timer);
      }, 1000);
    } else {
      if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
    }
    document.getElementById('timerWrap').classList.toggle('paused', !state.timerRunning);
  });
}

