// ============================================================
// 7. Rendering — Virtual DOM Diff (reuses cell elements)
// ============================================================
let _cellRefs = null;

function _buildCells(boardEl) {
  const n = state.size || 9;
  _cellRefs = Array.from({ length: n }, () => Array(n));
  const frag = document.createDocumentFragment();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      const vs = document.createElement('span');
      vs.className = 'cell-value';
      cell.appendChild(vs);

      const ng = document.createElement('div');
      ng.className = 'notes-grid';
      const noteCols = Math.ceil(Math.sqrt(n));
      const noteRows = Math.ceil(n / noteCols);
      ng.style.gridTemplateColumns = 'repeat(' + noteCols + ', 1fr)';
      ng.style.gridTemplateRows = 'repeat(' + noteRows + ', 1fr)';
      for (let i = 0; i < n; i++) ng.appendChild(document.createElement('span'));
      cell.appendChild(ng);

      cell.addEventListener('click', () => selectCell(r, c));
      frag.appendChild(cell);
      _cellRefs[r][c] = cell;
    }
  }
  boardEl.appendChild(frag);
}

function rebuildBoardForSize() {
  const n = state.size || 9;
  const boardEl = document.getElementById('board');
  if (boardEl) {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
    boardEl.style.gridTemplateRows = 'repeat(' + n + ', 1fr)';
  }
  const rowArea = document.getElementById('coordsRowArea');
  const colArea = document.getElementById('coordsColArea');
  if (rowArea) rowArea.style.gridTemplateColumns = 'repeat(' + n + ', 1fr)';
  if (colArea) colArea.style.gridTemplateRows = 'repeat(' + n + ', 1fr)';
  if (rowArea) {
    rowArea.innerHTML = '';
    for (let c = 0; c < n; c++) {
      const el = document.createElement('div');
      el.className = 'coords-col';
      el.dataset.coord = c;
      el.textContent = String.fromCharCode(65 + c);
      rowArea.appendChild(el);
    }
  }
  if (colArea) {
    colArea.innerHTML = '';
    for (let r = 0; r < n; r++) {
      const el = document.createElement('div');
      el.className = 'coords-row';
      el.dataset.coord = r;
      el.textContent = r + 1;
      colArea.appendChild(el);
    }
  }
  const boardWrap = document.getElementById('boardWrap');
  if (boardWrap) boardWrap.classList.toggle('board-size-6', n === 6);
  _cellRefs = null;
  buildNumPad();
}

const _completedColor = 'rgba(34, 197, 94, 0.12)';

function render(opts) {
  opts = opts || {};
  const boardEl = document.getElementById('board');
  if (!boardEl) { log('[ui] render: WARN #board not found'); return; }
  if (typeof syncGridConfig === 'function') syncGridConfig();
  const n = state.size || 9;

  if (!_cellRefs) _buildCells(boardEl);

  const conflicts = state.settings.highlightConflicts ? findConflicts(state.board) : new Set();
  const wrongCells = state.settings.highlightWrong ? getWrongCells(state.board, state.solution) : new Set();
  const selectedVal = state.selectedCell ? state.board[state.selectedCell[0]][state.selectedCell[1]] : 0;

  const candidatesCache = state.settings.autoCandidates ? {} : null;
  function getCachedCandidates(r, c) {
    const key = r * n + c;
    if (!candidatesCache[key]) candidatesCache[key] = getCandidates(state.board, r, c);
    return candidatesCache[key];
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = _cellRefs[r][c];
      const valSpan = cell.firstChild;
      const notesGrid = valSpan.nextSibling;
      const val = state.board[r][c];
      const isGiven = state.givens[r][c];
      const isSelected = state.selectedCell && state.selectedCell[0] === r && state.selectedCell[1] === c;

      const cls = ['cell'];

      if (opts.entering) {
        if (!state.settings.reducedAnimations) {
          cls.push('entering');
          cell.style.animationDelay = ((r * n + c) * 12) + 'ms';
        } else {
          cell.style.animation = 'none';
        }
      }

      if (isGiven) cls.push('given');
      else if (val) cls.push('user');
      if (isSelected) cls.push('selected');

      if (state.settings.highlightPeers && state.selectedCell) {
        const [sr, sc] = state.selectedCell;
        if ((r === sr || c === sc || boxIndexOf(r, c) === boxIndexOf(sr, sc)) && !(r === sr && c === sc))
          cls.push('peer');
      }
      if (state.settings.highlightSame && selectedVal && val === selectedVal && !isSelected)
        cls.push('same-num');
      if (conflicts.has(r + ',' + c)) cls.push('conflict');
      if (wrongCells.has(r + ',' + c)) cls.push('wrong-cell');

      if (opts.popCell && opts.popCell[0] === r && opts.popCell[1] === c) cls.push('pop');
      if (opts.shakeCell && opts.shakeCell[0] === r && opts.shakeCell[1] === c) cls.push('shake');
      if (opts.mistakeCell && opts.mistakeCell[0] === r && opts.mistakeCell[1] === c) cls.push('mistake-cell');
      if (opts.hintHighlight && opts.hintHighlight.row === r && opts.hintHighlight.col === c) {
        cls.push(state.settings.reducedAnimations ? '' : 'hint-cell');
        if (state.settings.reducedAnimations) cell.style.boxShadow = 'inset 0 0 0 3px var(--accent)';
      }
      if (opts.hintHighlight && (r === opts.hintHighlight.row || c === opts.hintHighlight.col || boxIndexOf(r, c) === boxIndexOf(opts.hintHighlight.row, opts.hintHighlight.col))) {
        if (!(r === opts.hintHighlight.row && c === opts.hintHighlight.col)) cls.push('hint-peer');
      }

      cell.className = cls.join(' ');

      valSpan.textContent = val || '';

      const bi = boxIndexOf(r, c);
      const showCompleted = state.settings.showCompleted && val && (state.completed.rows.has(r) || state.completed.cols.has(c) || state.completed.boxes.has(bi));
      cell.style.background = showCompleted ? _completedColor : '';

      const hasNotes = !val && state.notes[r][c] && state.notes[r][c].size > 0;
      const useAuto = !val && state.settings.autoCandidates && !isGiven;
      if (hasNotes || useAuto) {
        notesGrid.style.display = 'grid';
        const spans = notesGrid.children;
        if (useAuto) {
          const cands = getCachedCandidates(r, c);
          for (let d = 0; d < n; d++) spans[d].textContent = cands.has(d + 1) ? String(d + 1) : '';
        } else {
          for (let d = 0; d < n; d++) spans[d].textContent = state.notes[r][c].has(d + 1) ? String(d + 1) : '';
        }
      } else {
        notesGrid.style.display = 'none';
      }
    }
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const bi = boxIndexOf(r, c);
      const rowAnim = state.completedAnimated.rows.has(r) && !state.settings.reducedAnimations;
      const colAnim = state.completedAnimated.cols.has(c) && !state.settings.reducedAnimations;
      const boxAnim = state.completedAnimated.boxes.has(bi) && !state.settings.reducedAnimations;
      if (rowAnim || colAnim || boxAnim) {
        const cell = _cellRefs[r][c];
        let delay = 0;
        if (rowAnim) delay = c * 60;
        else if (colAnim) delay = r * 60;
        else {
          const sr = boxStartRow(bi);
          const sc = boxStartCol(bi);
          delay = ((r - sr) * GRID.boxW + (c - sc)) * 60;
        }
        ((cr) => setTimeout(() => {
          cr.animate([
            { transform: 'scale(1)', background: _completedColor, boxShadow: 'none' },
            { transform: 'scale(1.25)', background: 'rgba(34, 197, 94, 0.35)', boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)' },
            { transform: 'scale(0.92)', background: _completedColor, boxShadow: 'none' },
            { transform: 'scale(1.05)', background: 'rgba(34, 197, 94, 0.08)', boxShadow: 'none' },
            { transform: 'scale(1)', background: _completedColor, boxShadow: 'none' }
          ], { duration: 700, easing: 'ease', fill: 'forwards' });
        }, delay))(cell);
      }
    }
  }

  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = formatTime(state.timer);
  const tw = document.getElementById('timerWrap');
  if (tw) tw.classList.toggle('timer-warn', state.timer >= 300);
  const mistakesEl = document.getElementById('mistakes');
  if (mistakesEl) mistakesEl.textContent = String(state.mistakes);
  updateNumPad();
  updateNotesBtn();
  updateUndoRedo();
  updateTimerIcon();
  updateGameLink();
}

// Batching — coalesce multiple render calls into one microtask
let _renderPending = false;
let _renderOpts = {};

function requestRender(opts) {
  if (opts) {
    if (opts.entering) _renderOpts.entering = true;
    if (opts.popCell) _renderOpts.popCell = opts.popCell;
    if (opts.shakeCell) _renderOpts.shakeCell = opts.shakeCell;
    if (opts.mistakeCell) _renderOpts.mistakeCell = opts.mistakeCell;
    if (opts.hintHighlight) _renderOpts.hintHighlight = opts.hintHighlight;
  }
  if (_renderPending) return;
  _renderPending = true;
  queueMicrotask(() => {
    _renderPending = false;
    render(_renderOpts);
    _renderOpts = {};
  });
}

function selectCell(row, col) {
  log('[ui] selectCell()', { row, col, prevSelected: state.selectedCell });
  state.selectedCell = [row, col];
  state._lastMistakeCell = null;
  requestRender();
  saveGame();
}

function updateNumPad() {
  const n = state.size || 9;
  const counts = Array(n + 1).fill(n);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (state.board[r][c]) counts[state.board[r][c]]--;
  const numPad = document.getElementById('numPad');
  if (!numPad) return;

  numPad.querySelectorAll('button').forEach((btn, i) => {
    const d = i + 1;
    const rem = btn.querySelector('.remaining');
    if (rem) {
      rem.textContent = counts[d];
      rem.classList.toggle('zero', counts[d] <= 0);
    }
    btn.classList.toggle('placed', counts[d] <= 0);
    if (rem) rem.style.display = state.settings.showRemaining ? '' : 'none';
  });
}

function updateTimerIcon() {
  const wrap = document.getElementById('timerWrap');
  if (!wrap) return;
  const icon = wrap.querySelector('svg use');
  if (icon) icon.setAttribute('href', state.timerRunning ? '#ico-clock' : '#ico-pause');
}

function updateNotesBtn() {
  const notesBtn = document.getElementById('notesBtn');
  if (notesBtn) notesBtn.classList.toggle('active', state.notesMode);
  const autoBtn = document.getElementById('gameAutoBtn');
  if (autoBtn) autoBtn.classList.toggle('active', state.settings.autoCandidates);
  const badge = document.getElementById('autoBadge');
  if (badge) {
    if (state._freeAuto > 0) {
      badge.textContent = 'Free';
      autoBtn.title = 'Auto-candidates (Free)';
    } else {
      badge.textContent = '10';
      autoBtn.title = 'Auto-candidates (10 XP)';
    }
  }
}

function updateUndoRedo() {
  const undo = document.getElementById('undoBtn');
  const hint = document.getElementById('hintBtn');
  const erase = document.getElementById('eraseBtn');
  if (!undo || !hint) return;
  const undoCount = state.historyIdx + 1;

  undo.disabled = state.historyIdx < 0;

  if (erase) {
    const sc = state.selectedCell;
    erase.disabled = !sc || (state.givens[sc[0]]?.[sc[1]] ?? false);
  }

  let undoBadge = undo.querySelector('.action-badge');

  if (undoCount > 0 && !undo.disabled) {
    if (!undoBadge) { undoBadge = document.createElement('span'); undoBadge.className = 'action-badge'; undo.appendChild(undoBadge); }
    undoBadge.textContent = (state._freeUndos > 0) ? 'Free' : '5 XP';
    undoBadge.style.display = '';
  } else if (undoBadge) { undoBadge.style.display = 'none'; }

  let hintBadge = hint.querySelector('.action-badge');
  const unlimited = Date.now() < state._unlimitedHintsUntil;
  if (unlimited) {
    if (!hintBadge) { hintBadge = document.createElement('span'); hintBadge.className = 'action-badge'; hint.appendChild(hintBadge); }
    hintBadge.textContent = '\u221E';
    hintBadge.style.display = '';
  } else if (state.hintsRemaining > 0 || (stats._freeHints || 0) > 0) {
    if (!hintBadge) { hintBadge = document.createElement('span'); hintBadge.className = 'action-badge'; hint.appendChild(hintBadge); }
    hintBadge.textContent = (state.hintsRemaining + (stats._freeHints || 0));
    hintBadge.style.display = '';
  } else if (hintBadge) { hintBadge.style.display = 'none'; }
}

function updateBadges() {
  updateUndoRedo();
}

function updateGameLink() {
  const el = document.getElementById('gameLink');
  if (!el) return;
  const fullUrl = window.location.href;
  const displayUrl = fullUrl.split('?')[0].replace(/^https?:\/\//, '').replace(/\/?$/, '') + '/…';
  el.textContent = 'GAME: ' + displayUrl;
  el.title = 'Click to copy shareable referral link';
  el.onclick = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showToast('Referral link copied!');
    });
  };
}

// ============================================================
// 8. Input Handling
// ============================================================
function buildNumPad() {
  const numPad = document.getElementById('numPad');
  if (!numPad) return;
  numPad.innerHTML = '';
  numPad.style.setProperty('--pad-cols', state.size || 9);
  const n = state.size || 9;
  for (let d = 1; d <= n; d++) {
    const btn = document.createElement('button');
    btn.textContent = d;
    const rem = document.createElement('span');
    rem.className = 'remaining';
    btn.appendChild(rem);
    btn.addEventListener('click', () => {
      log('[ui] numPad click', { d, selectedCell: state.selectedCell });
      if (state.selectedCell) placeNumber(state.selectedCell[0], state.selectedCell[1], d);
      else log('[ui] numPad: no cell selected, ignoring');
    });
    numPad.appendChild(btn);
  }
}

function setupInput() {
  log('[ui] setupInput()');
  buildNumPad();

  document.addEventListener('keydown', (e) => {
    if (!state.settings.keyboardShortcuts) return;
    const n = state.size || 9;
    if (e.key >= '1' && e.key <= String(n) && state.selectedCell)
      placeNumber(state.selectedCell[0], state.selectedCell[1], parseInt(e.key));
    if ((e.key === 'Backspace' || e.key === 'Delete') && state.selectedCell)
      placeNumber(state.selectedCell[0], state.selectedCell[1], 0);
    if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey)
      { state.notesMode = !state.notesMode; log('[ui] keyboard: toggle notes mode', { notesMode: state.notesMode }); updateNotesBtn(); }
    if (e.key === 'ArrowUp' && state.selectedCell) { e.preventDefault(); selectCell(Math.max(0, state.selectedCell[0] - 1), state.selectedCell[1]); }
    if (e.key === 'ArrowDown' && state.selectedCell) { e.preventDefault(); selectCell(Math.min(n - 1, state.selectedCell[0] + 1), state.selectedCell[1]); }
    if (e.key === 'ArrowLeft' && state.selectedCell) { e.preventDefault(); selectCell(state.selectedCell[0], Math.max(0, state.selectedCell[1] - 1)); }
    if (e.key === 'ArrowRight' && state.selectedCell) { e.preventDefault(); selectCell(state.selectedCell[0], Math.min(n - 1, state.selectedCell[1] + 1)); }
    if (e.key === 'Home') { e.preventDefault(); selectCell(0, 0); }
    if (e.key === 'End') { e.preventDefault(); selectCell(n - 1, n - 1); }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!state.selectedCell) { selectCell(0, 0); return; }
      const sr = state.selectedCell[0], sc = state.selectedCell[1];
      const dir = e.shiftKey ? -1 : 1;
      const total = n * n;
      for (let i = 1; i <= total; i++) {
        const idx = ((sr * n + sc + i * dir) % total + total) % total;
        const r = Math.floor(idx / n), c = idx % n;
        if (state.board[r][c] === 0) { selectCell(r, c); break; }
      }
    }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); log('[ui] keyboard: redo'); redo(); }
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); log('[ui] keyboard: undo'); undo(); }
  });

  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) undoBtn.addEventListener('click', () => { log('[ui] click: undoBtn'); undo(); });
  const eraseBtn = document.getElementById('eraseBtn');
  if (eraseBtn) eraseBtn.addEventListener('click', () => {
    log('[ui] click: eraseBtn');
    if (!state.selectedCell) return;
    placeNumber(state.selectedCell[0], state.selectedCell[1], 0);
  });
  const notesBtn = document.getElementById('notesBtn');
  if (notesBtn) {
    notesBtn.addEventListener('click', () => { state.notesMode = !state.notesMode; state.penMode = false; log('[ui] click: notesBtn', { notesMode: state.notesMode }); updateNotesBtn(); });
  }

  const hintBtn = document.getElementById('hintBtn');
  if (hintBtn) hintBtn.addEventListener('click', () => { log('[ui] click: hintBtn'); giveHint(); });

  const AUTO_COST = 10;
  const gameAutoBtn = document.getElementById('gameAutoBtn');
  if (gameAutoBtn) {
    function showAutoModal() {
      const overlay = document.getElementById('autoInfoOverlay');
      if (!overlay) return;
      const xpEl = document.getElementById('autoInfoXp');
      if (xpEl) {
        xpEl.textContent = (stats.totalXp || 0) + (state._freeAuto > 0 ? ' (Free uses: ' + state._freeAuto + ')' : '');
      }
      const desc = overlay.querySelector('.hint-shop-desc');
      if (desc) {
        if (state._freeAuto > 0) {
          desc.innerHTML = 'Shows <strong>possible numbers</strong> in every empty cell, calculated automatically. <strong>Free use available!</strong>';
        } else {
          desc.innerHTML = 'Shows <strong>possible numbers</strong> in every empty cell, calculated automatically. Helps you spot patterns faster &mdash; <strong>10 XP per use</strong>.';
        }
      }
      const buyBtn = document.getElementById('autoInfoBuy');
      if (buyBtn) {
        buyBtn.textContent = state._freeAuto > 0 ? 'Use (Free)' : 'Use for 10 XP';
      }
      overlay.classList.add('open');
    }
    function confirmAuto() {
      if (state._freeAuto > 0 || state._devMode) {
        if (state._freeAuto > 0) state._freeAuto--;
      } else {
        if ((stats.totalXp || 0) < AUTO_COST) {
          showToast('Not enough XP! (' + AUTO_COST + ' XP required)');
          document.getElementById('autoInfoOverlay')?.classList.remove('open');
          return;
        }
        stats.totalXp = (stats.totalXp || 0) - AUTO_COST;
        state._autoCandidatesPaid = true;
      }
      saveStats();
      saveGame();
      updateMenuUI();
      state.settings.autoCandidates = true;
      log('[ui] click: gameAutoBtn - confirmed via modal', { autoCandidates: true });
      requestRender();
      saveSettings();
      updateNotesBtn();
      document.getElementById('autoInfoOverlay')?.classList.remove('open');
    }
    gameAutoBtn.addEventListener('click', () => {
      if (state.settings.autoCandidates) {
        state.settings.autoCandidates = false;
        log('[ui] click: gameAutoBtn - toggle off', { autoCandidates: false });
        requestRender();
        saveSettings();
        updateNotesBtn();
      } else {
        showAutoModal();
      }
    });
    document.getElementById('autoInfoBuy')?.addEventListener('click', confirmAuto);
    document.getElementById('autoInfoCancel')?.addEventListener('click', () => {
      document.getElementById('autoInfoOverlay')?.classList.remove('open');
    });
    document.getElementById('autoInfoOverlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        document.getElementById('autoInfoOverlay')?.classList.remove('open');
      }
    });
  }

  function togglePause() {
    if (!state.started || state.won || state.gameOver) { log('[ui] togglePause: blocked', { started: state.started, won: state.won, gameOver: state.gameOver }); return; }
    if (state.timerRunning) {
      pauseTimer();
    } else if (!state.timerInterval) {
      startTimer();
    } else {
      return;
    }
    document.getElementById('timerWrap').classList.toggle('paused', !state.timerRunning);
    document.getElementById('page-game')?.classList.toggle('paused', !state.timerRunning);
    document.getElementById('pauseOverlay')?.classList.toggle('open', !state.timerRunning);
    updateTimerIcon();
    saveGame();
  }

  const timerWrap = document.getElementById('timerWrap');
  if (timerWrap) {
    timerWrap.addEventListener('click', () => {
      if (!state.started || state.won || state.gameOver) { log('[ui] timer toggle: blocked', { started: state.started, won: state.won, gameOver: state.gameOver }); return; }
      togglePause();
    });
  }

  const gamePauseBtn = document.getElementById('gamePauseBtn');
  if (gamePauseBtn) {
    gamePauseBtn.addEventListener('click', togglePause);
    document.getElementById('pauseResumeBtn')?.addEventListener('click', togglePause);
    document.getElementById('pauseQuitBtn')?.addEventListener('click', () => {
      log('[ui] click: pauseQuitBtn');
      if (state.started && !state.won && !state.gameOver) {
        showGameExitConfirm();
      } else {
        document.getElementById('pauseOverlay')?.classList.remove('open');
        clearGame();
        showPage('page-menu');
        updateMenuUI();
      }
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
