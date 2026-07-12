// ============================================================
// 7. Rendering
// ============================================================
function render(opts) {
  opts = opts || {};
  const boardEl = document.getElementById('board');
  if (!boardEl) { log('[ui] render: WARN #board not found'); return; }
  boardEl.innerHTML = '';
  const conflicts = state.settings.highlightConflicts ? findConflicts(state.board) : new Set();
  const selectedVal = state.selectedCell ? state.board[state.selectedCell[0]][state.selectedCell[1]] : 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (opts.entering) {
        cell.classList.add('entering');
        cell.style.animationDelay = ((r * 9 + c) * 12) + 'ms';
      }
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

      if (opts.hintHighlight && opts.hintHighlight.row === r && opts.hintHighlight.col === c) cell.classList.add('hint-cell');
      if (opts.hintHighlight && (r === opts.hintHighlight.row || c === opts.hintHighlight.col || (Math.floor(r/3) === Math.floor(opts.hintHighlight.row/3) && Math.floor(c/3) === Math.floor(opts.hintHighlight.col/3)))) {
        if (!(r === opts.hintHighlight.row && c === opts.hintHighlight.col)) cell.classList.add('hint-peer');
      }
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
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = formatTime(state.timer);
  const mistakesEl = document.getElementById('mistakes');
  if (mistakesEl) mistakesEl.textContent = String(state.mistakes);
  updateNumPad();
  updateNotesBtn();
  updateUndoRedo();
}

function selectCell(row, col) {
  log('[ui] selectCell()', { row, col, prevSelected: state.selectedCell });
  state.selectedCell = [row, col];
  render();
  saveGame();
}

function updateNumPad() {
  const counts = Array(10).fill(9);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c]) counts[state.board[r][c]]--;
  const numPad = document.getElementById('numPad');
  if (!numPad) return;
  numPad.querySelectorAll('button').forEach((btn, i) => {
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
  const notesBtn = document.getElementById('notesBtn');
  if (notesBtn) notesBtn.classList.toggle('active', state.notesMode);
  const autoBtn = document.getElementById('autoBtn');
  if (autoBtn) autoBtn.classList.toggle('active', state.settings.autoCandidates);
}

function updateUndoRedo() {
  const undo = document.getElementById('undoBtn');
  const redo = document.getElementById('redoBtn');
  const hint = document.getElementById('hintBtn');
  if (!undo || !redo || !hint) return;
  const undoCount = state.historyIdx + 1;
  const redoCount = state.history.length - state.historyIdx - 1;

  undo.disabled = state.historyIdx < 0;
  redo.disabled = state.historyIdx >= state.history.length - 1;

  let undoBadge = undo.querySelector('.action-badge');
  let redoBadge = redo.querySelector('.action-badge');

  if (undoCount > 0 && !undo.disabled) {
    if (!undoBadge) { undoBadge = document.createElement('span'); undoBadge.className = 'action-badge'; undo.appendChild(undoBadge); }
    undoBadge.textContent = undoCount;
    undoBadge.style.display = '';
  } else if (undoBadge) { undoBadge.style.display = 'none'; }

  if (redoCount > 0 && !redo.disabled) {
    if (!redoBadge) { redoBadge = document.createElement('span'); redoBadge.className = 'action-badge'; redo.appendChild(redoBadge); }
    redoBadge.textContent = redoCount;
    redoBadge.style.display = '';
  } else if (redoBadge) { redoBadge.style.display = 'none'; }

  let hintBadge = hint.querySelector('.action-badge');
  if (state.hintsUsed > 0) {
    if (!hintBadge) { hintBadge = document.createElement('span'); hintBadge.className = 'action-badge'; hint.appendChild(hintBadge); }
    hintBadge.textContent = state.hintsUsed;
    hintBadge.style.display = '';
  } else if (hintBadge) { hintBadge.style.display = 'none'; }
}

// ============================================================
// 8. Input Handling
// ============================================================
function setupInput() {
  log('[ui] setupInput()');
  const numPad = document.getElementById('numPad');
  if (!numPad) { log('[ui] WARN: #numPad not found'); return; }
  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement('button');
    btn.textContent = n;
    const rem = document.createElement('span');
    rem.className = 'remaining';
    btn.appendChild(rem);
    btn.addEventListener('click', () => {
      log('[ui] numPad click', { n, selectedCell: state.selectedCell });
      if (state.selectedCell) placeNumber(state.selectedCell[0], state.selectedCell[1], n);
      else log('[ui] numPad: no cell selected, ignoring');
    });
    numPad.appendChild(btn);
  }

  document.addEventListener('keydown', (e) => {
    if (!state.settings.keyboardShortcuts) return;
    if (e.key >= '1' && e.key <= '9' && state.selectedCell)
      placeNumber(state.selectedCell[0], state.selectedCell[1], parseInt(e.key));
    if ((e.key === 'Backspace' || e.key === 'Delete') && state.selectedCell)
      placeNumber(state.selectedCell[0], state.selectedCell[1], 0);
    if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey)
      { state.notesMode = !state.notesMode; log('[ui] keyboard: toggle notes mode', { notesMode: state.notesMode }); updateNotesBtn(); }
    if (e.key === 'ArrowUp' && state.selectedCell) { e.preventDefault(); selectCell(Math.max(0, state.selectedCell[0] - 1), state.selectedCell[1]); }
    if (e.key === 'ArrowDown' && state.selectedCell) { e.preventDefault(); selectCell(Math.min(8, state.selectedCell[0] + 1), state.selectedCell[1]); }
    if (e.key === 'ArrowLeft' && state.selectedCell) { e.preventDefault(); selectCell(state.selectedCell[0], Math.max(0, state.selectedCell[1] - 1)); }
    if (e.key === 'ArrowRight' && state.selectedCell) { e.preventDefault(); selectCell(state.selectedCell[0], Math.min(8, state.selectedCell[1] + 1)); }
    if (e.key === 'Home') { e.preventDefault(); selectCell(0, 0); }
    if (e.key === 'End') { e.preventDefault(); selectCell(8, 8); }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!state.selectedCell) { selectCell(0, 0); return; }
      const sr = state.selectedCell[0], sc = state.selectedCell[1];
      const dir = e.shiftKey ? -1 : 1;
      for (let i = 1; i <= 81; i++) {
        const idx = ((sr * 9 + sc + i * dir) % 81 + 81) % 81;
        const r = Math.floor(idx / 9), c = idx % 9;
        if (state.board[r][c] === 0) { selectCell(r, c); break; }
      }
    }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); log('[ui] keyboard: redo'); redo(); }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); log('[ui] keyboard: undo'); undo(); }
  });

  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) undoBtn.addEventListener('click', () => { log('[ui] click: undoBtn'); undo(); });
  const redoBtn = document.getElementById('redoBtn');
  if (redoBtn) redoBtn.addEventListener('click', () => { log('[ui] click: redoBtn'); redo(); });
  const notesBtn = document.getElementById('notesBtn');
  if (notesBtn) {
    notesBtn.addEventListener('click', () => { state.notesMode = !state.notesMode; log('[ui] click: notesBtn', { notesMode: state.notesMode }); updateNotesBtn(); });
  }
  const hintBtn = document.getElementById('hintBtn');
  if (hintBtn) hintBtn.addEventListener('click', () => { log('[ui] click: hintBtn'); giveHint(); });
  const autoBtn = document.getElementById('autoBtn');
  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      state.settings.autoCandidates = !state.settings.autoCandidates;
      log('[ui] click: autoBtn', { autoCandidates: state.settings.autoCandidates });
      render();
      saveSettings();
    });
  }

  const timerWrap = document.getElementById('timerWrap');
  if (timerWrap) {
    timerWrap.addEventListener('click', () => {
      if (!state.started || state.won || state.gameOver) { log('[ui] timer toggle: blocked', { started: state.started, won: state.won, gameOver: state.gameOver }); return; }
      state.timerRunning = !state.timerRunning;
      log('[ui] timer toggle', { running: state.timerRunning });
      if (state.timerRunning) {
        state.timerInterval = setInterval(() => {
          state.timer++;
          document.getElementById('timer').textContent = formatTime(state.timer);
        }, 1000);
      } else {
        if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
      }
      document.getElementById('timerWrap').classList.toggle('paused', !state.timerRunning);
      saveGame();
    });
  }

  const gameMuteBtn = document.getElementById('gameMuteBtn');
  if (gameMuteBtn) {
    gameMuteBtn.addEventListener('click', () => {
      state.settings.soundEnabled = !state.settings.soundEnabled;
      log('[ui] click: muteBtn', { soundEnabled: state.settings.soundEnabled });
      const icon = state.settings.soundEnabled ? 'ico-volume' : 'ico-volume-x';
      document.getElementById('gameMuteBtn').innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24"><use href="#' + icon + '"/></svg>';
      saveSettings();
    });
  }
}
