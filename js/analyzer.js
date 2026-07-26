const ANALYZE_STEPS_KEY = 'sudoku_analyze_steps';

let analyzeSteps = [];
let analyzeIdx = -1;

const _colName = (c) => String.fromCharCode(65 + c);
const _cellName = (r, c) => _colName(c) + (r + 1);

function analyzePuzzle() {
  const board = state.board.map(r => [...r]);
  const solution = state.solution.map(r => [...r]);
  const steps = [];
  const working = board.map(r => [...r]);
  const cands = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));

  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (working[r][c] === 0)
        cands[r][c] = getCandidates(working, r, c);

  const addStep = (technique, desc, row, col, num, highlight) => {
    steps.push({ technique, desc, row, col, num, highlight: highlight || [] });
  };

  let changed = true;
  while (changed) {
    changed = false;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] !== 0) continue;
        if (cands[r][c].size === 1) {
          const n = [...cands[r][c]][0];
          addStep('Naked Single', `${_cellName(r, c)} — only candidate is ${n}`, r, c, n);
          working[r][c] = n;
          for (let i = 0; i < 9; i++) {
            cands[r][i].delete(n);
            cands[i][c].delete(n);
          }
          const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
          for (let rr = br; rr < br+3; rr++)
            for (let cc = bc; cc < bc+3; cc++)
              cands[rr][cc].delete(n);
          changed = true;
        }
      }
    }
    if (changed) continue;

    for (let r = 0; r < 9; r++) {
      for (let n = 1; n <= 9; n++) {
        const cells = [];
        for (let c = 0; c < 9; c++)
          if (working[r][c] === 0 && cands[r][c].has(n)) cells.push(c);
        if (cells.length === 1) {
          const c = cells[0];
          addStep('Hidden Single (Row)', `Row ${r+1}: ${n} only fits in ${_cellName(r, c)}`, r, c, n, cells.map(cell => [r, cell]));
          working[r][c] = n;
          for (let i = 0; i < 9; i++) { cands[r][i].delete(n); cands[i][c].delete(n); }
          const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
          for (let rr = br; rr < br+3; rr++)
            for (let cc = bc; cc < bc+3; cc++)
              cands[rr][cc].delete(n);
          changed = true; break;
        }
      }
      if (changed) break;
    }
    if (changed) continue;

    for (let c = 0; c < 9; c++) {
      for (let n = 1; n <= 9; n++) {
        const cells = [];
        for (let r = 0; r < 9; r++)
          if (working[r][c] === 0 && cands[r][c].has(n)) cells.push(r);
        if (cells.length === 1) {
          const r = cells[0];
          addStep('Hidden Single (Col)', `Col ${_colName(c)}: ${n} only fits in ${_cellName(r, c)}`, r, c, n, cells.map(row => [row, c]));
          working[r][c] = n;
          for (let i = 0; i < 9; i++) { cands[r][i].delete(n); cands[i][c].delete(n); }
          const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
          for (let rr = br; rr < br+3; rr++)
            for (let cc = bc; cc < bc+3; cc++)
              cands[rr][cc].delete(n);
          changed = true; break;
        }
      }
      if (changed) break;
    }
    if (changed) continue;

    for (let bi = 0; bi < 9; bi++) {
      const br = Math.floor(bi/3)*3, bc = (bi%3)*3;
      for (let n = 1; n <= 9; n++) {
        const cells = [];
        for (let r = br; r < br+3; r++)
          for (let c = bc; c < bc+3; c++)
            if (working[r][c] === 0 && cands[r][c].has(n)) cells.push([r, c]);
        if (cells.length === 1) {
          const [r, c] = cells[0];
          addStep('Hidden Single (Box)', `Box ${bi+1}: ${n} only fits in ${_cellName(r, c)}`, r, c, n, cells);
          working[r][c] = n;
          for (let i = 0; i < 9; i++) { cands[r][i].delete(n); cands[i][c].delete(n); }
          for (let rr = br; rr < br+3; rr++)
            for (let cc = bc; cc < bc+3; cc++)
              cands[rr][cc].delete(n);
          changed = true; break;
        }
      }
      if (changed) break;
    }
    if (changed) continue;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] !== 0 || cands[r][c].size !== 2) continue;
        const pair = [...cands[r][c]];
        const sameRow = cands[r].filter((set, ci) => ci !== c && set.size === 2 && [...set].sort().join() === pair.sort().join());
        if (sameRow.length > 0) {
          const ci = cands[r].findIndex((set, ci) => ci !== c && set.size === 2 && [...set].sort().join() === pair.sort().join());
          if (ci >= 0) {
            const eliminated = [];
            for (let cc = 0; cc < 9; cc++) {
              if (cc === c || cc === ci) continue;
              if (cands[r][cc].has(pair[0]) || cands[r][cc].has(pair[1])) {
                cands[r][cc].delete(pair[0]); cands[r][cc].delete(pair[1]);
                eliminated.push([r, cc]);
              }
            }
            if (eliminated.length > 0) {
              addStep('Naked Pair (Row)', `Row ${r+1}: {${pair.join(',')}} locked in ${_colName(c)} & ${_colName(ci)}`, r, c, 0, [[r, c], [r, ci], ...eliminated]);
              changed = true; break;
            }
          }
        }
        if (changed) break;

        const sameCol = [];
        for (let ri = 0; ri < 9; ri++) {
          if (ri === r) continue;
          if (cands[ri][c].size === 2 && [...cands[ri][c]].sort().join() === pair.sort().join()) sameCol.push(ri);
        }
        if (sameCol.length > 0) {
          const ri = sameCol[0];
          const eliminated = [];
          for (let rr = 0; rr < 9; rr++) {
            if (rr === r || rr === ri) continue;
            if (cands[rr][c].has(pair[0]) || cands[rr][c].has(pair[1])) {
              cands[rr][c].delete(pair[0]); cands[rr][c].delete(pair[1]);
              eliminated.push([rr, c]);
            }
          }
          if (eliminated.length > 0) {
            addStep('Naked Pair (Col)', `Col ${_colName(c)}: {${pair.join(',')}} locked in rows ${r+1} & ${ri+1}`, r, c, 0, [[r, c], [ri, c], ...eliminated]);
            changed = true; break;
          }
        }
        if (changed) break;
      }
      if (changed) break;
    }
    if (changed) continue;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] !== 0 || cands[r][c].size !== 3) continue;
        const triple = [...cands[r][c]];
        const sameRow = [];
        for (let cc = 0; cc < 9; cc++) {
          if (cc === c) continue;
          if (working[r][cc] !== 0) continue;
          const s = [...cands[r][cc]];
          if (s.every(v => triple.includes(v))) sameRow.push(cc);
        }
        sameRow.push(c);
        if (sameRow.length === 3) {
          const eliminated = [];
          for (let cc = 0; cc < 9; cc++) {
            if (sameRow.includes(cc)) continue;
            let changedSome = false;
            triple.forEach(v => { if (cands[r][cc].has(v)) { cands[r][cc].delete(v); changedSome = true; } });
            if (changedSome) eliminated.push([r, cc]);
          }
          if (eliminated.length > 0) {
            addStep('Naked Triple (Row)', `Row ${r+1}: {${triple.join(',')}} locked in ${sameRow.map(x => _colName(x)).join(', ')}`, r, c, 0, [...sameRow.map(cc => [r, cc]), ...eliminated]);
            changed = true; break;
          }
        }
        if (changed) break;

        const sameCol = [];
        for (let rr = 0; rr < 9; rr++) {
          if (rr === r) continue;
          if (working[rr][c] !== 0) continue;
          const s = [...cands[rr][c]];
          if (s.every(v => triple.includes(v))) sameCol.push(rr);
        }
        sameCol.push(r);
        if (sameCol.length === 3) {
          const eliminated = [];
          for (let rr = 0; rr < 9; rr++) {
            if (sameCol.includes(rr)) continue;
            let changedSome = false;
            triple.forEach(v => { if (cands[rr][c].has(v)) { cands[rr][c].delete(v); changedSome = true; } });
            if (changedSome) eliminated.push([rr, c]);
          }
          if (eliminated.length > 0) {
            addStep('Naked Triple (Col)', `Col ${_colName(c)}: {${triple.join(',')}} locked in rows ${sameCol.map(x => x+1).join(', ')}`, r, c, 0, [...sameCol.map(rr => [rr, c]), ...eliminated]);
            changed = true; break;
          }
        }
        if (changed) break;
      }
      if (changed) break;
    }
    if (changed) continue;

    for (let bi = 0; bi < 9; bi++) {
      const br = Math.floor(bi/3)*3, bc = (bi%3)*3;
      for (let n = 1; n <= 9; n++) {
        const cells = [];
        for (let r = br; r < br+3; r++)
          for (let c = bc; c < bc+3; c++)
            if (working[r][c] === 0 && cands[r][c].has(n)) cells.push([r, c]);
        if (cells.length === 2 || cells.length === 3) {
          const rows = [...new Set(cells.map(([r]) => r))];
          const cols = [...new Set(cells.map(([,c]) => c))];
          if (rows.length === 1) {
            const row = rows[0];
            const eliminated = [];
            for (let c = 0; c < 9; c++) {
              if (c >= bc && c < bc+3) continue;
              if (cands[row][c].has(n)) { cands[row][c].delete(n); eliminated.push([row, c]); }
            }
            if (eliminated.length > 0) {
              addStep('Pointing Pair', `Box ${bi+1}: ${n} locked in Row ${row+1}`, cells[0][0], cells[0][1], 0, [...cells, ...eliminated]);
              changed = true; break;
            }
          } else if (cols.length === 1) {
            const col = cols[0];
            const eliminated = [];
            for (let r = 0; r < 9; r++) {
              if (r >= br && r < br+3) continue;
              if (cands[r][col].has(n)) { cands[r][col].delete(n); eliminated.push([r, col]); }
            }
            if (eliminated.length > 0) {
              addStep('Pointing Pair', `Box ${bi+1}: ${n} locked in ${_colName(col)}`, cells[0][0], cells[0][1], 0, [...cells, ...eliminated]);
              changed = true; break;
            }
          }
        }
      }
      if (changed) break;
    }
    if (changed) continue;

    for (let bi = 0; bi < 9; bi++) {
      const br = Math.floor(bi/3)*3, bc = (bi%3)*3;
      for (let n = 1; n <= 9; n++) {
        const cells = [];
        for (let r = br; r < br+3; r++)
          for (let c = bc; c < bc+3; c++)
            if (working[r][c] === 0 && cands[r][c].has(n)) cells.push([r, c]);
        if (cells.length === 0) continue;
        const rows = [...new Set(cells.map(([r]) => r))];
        const cols = [...new Set(cells.map(([,c]) => c))];
        if (rows.length === 2 && cells.length > 2) {
          const farRows = [...new Set(rows)];
          const eliminated = [];
          for (let r = 0; r < 9; r++) {
            if (r >= br && r < br+3) continue;
            if (farRows.includes(r)) {
              for (let c = bc; c < bc+3; c++) {
                if (cands[r][c].has(n)) { cands[r][c].delete(n); eliminated.push([r, c]); }
              }
            }
          }
          if (eliminated.length > 0) {
            addStep('Box-Line Reduction', `Box ${bi+1}: ${n} limited to rows ${farRows.map(x => x+1).join(', ')}`, cells[0][0], cells[0][1], 0, [...cells, ...eliminated]);
            changed = true; break;
          }
        }
        if (cols.length === 2 && cells.length > 2) {
          const farCols = [...new Set(cols)];
          const eliminated = [];
          for (let c = 0; c < 9; c++) {
            if (c >= bc && c < bc+3) continue;
            if (farCols.includes(c)) {
              for (let r = br; r < br+3; r++) {
                if (cands[r][c].has(n)) { cands[r][c].delete(n); eliminated.push([r, c]); }
              }
            }
          }
          if (eliminated.length > 0) {
            addStep('Box-Line Reduction', `Box ${bi+1}: ${n} limited to ${farCols.map(x => _colName(x)).join(', ')}`, cells[0][0], cells[0][1], 0, [...cells, ...eliminated]);
            changed = true; break;
          }
        }
      }
      if (changed) break;
    }
    if (changed) continue;

    break;
  }

  const allFilled = working.every(row => row.every(v => v !== 0));
  analyzeSteps = steps;
  analyzeIdx = -1;
  showAnalyzerModal(steps, allFilled);
}

function showAnalyzerModal(steps, solved) {
  const overlay = document.getElementById('analyzerOverlay');
  if (!overlay) return;
  const content = document.getElementById('analyzerContent');
  const nav = document.getElementById('analyzerNav');
  const stepInfo = document.getElementById('analyzerStepInfo');
  if (!content) return;

  if (steps.length === 0) {
    content.innerHTML = '<div class="analyzer-empty">No solving steps found. The puzzle may require guessing (backtracking).</div>';
    if (nav) nav.style.display = 'none';
    if (stepInfo) stepInfo.textContent = '';
    overlay.classList.add('open');
    return;
  }

  if (solved && steps.length === 0) {
    content.innerHTML = '<div class="analyzer-empty">Puzzle is already complete!</div>';
    if (nav) nav.style.display = 'none';
    if (stepInfo) stepInfo.textContent = '';
    overlay.classList.add('open');
    return;
  }

  if (nav) nav.style.display = 'flex';
  if (stepInfo) stepInfo.textContent = `${steps.length} step${steps.length > 1 ? 's' : ''} to solve`;

  const renderStep = (idx) => {
    const step = steps[idx];
    if (!step) return;
    const boardCopy = state.board.map(r => [...r]);
    if (step.highlight) {
      step.highlight.forEach(([r, c]) => {
        if (boardCopy[r][c] === 0) boardCopy[r][c] = -1;
      });
    }
    let html = '<div class="analyzer-step">';
    html += `<div class="analyzer-technique">${step.technique}</div>`;
    html += `<div class="analyzer-desc">${step.desc}</div>`;
    html += '<div class="analyzer-board">';
    html += '<div class="analyzer-coord"></div>';
    for (let c = 0; c < 9; c++) {
      html += `<div class="analyzer-coord">${_colName(c)}</div>`;
    }
    for (let r = 0; r < 9; r++) {
      html += `<div class="analyzer-coord">${r + 1}</div>`;
      for (let c = 0; c < 9; c++) {
        const val = boardCopy[r][c];
        const isGiven = state.givens[r][c];
        const isHighlighted = step.highlight && step.highlight.some(([hr, hc]) => hr === r && hc === c);
        const isTarget = step.row === r && step.col === c;
        let cls = 'analyzer-cell';
        if (isGiven) cls += ' given';
        if (isTarget) cls += ' target';
        else if (isHighlighted) cls += ' highlighted';
        html += `<div class="${cls}" data-r="${r}" data-c="${c}">${val > 0 ? val : ''}</div>`;
      }
    }
    html += '</div></div>';
    content.innerHTML = html;
    document.getElementById('analyzerPrevBtn').disabled = idx <= 0;
    document.getElementById('analyzerNextBtn').disabled = idx >= steps.length - 1;
    const pos = document.getElementById('analyzerPosition');
    if (pos) pos.textContent = `Step ${idx + 1} / ${steps.length}`;
  };

  if (steps.length > 0) {
    analyzeIdx = 0;
    renderStep(0);
    document.getElementById('analyzerPrevBtn').onclick = () => {
      if (analyzeIdx > 0) { analyzeIdx--; renderStep(analyzeIdx); }
    };
    document.getElementById('analyzerNextBtn').onclick = () => {
      if (analyzeIdx < steps.length - 1) { analyzeIdx++; renderStep(analyzeIdx); }
    };
  }

  overlay.classList.add('open');
}

function showAnalyzerUnlock() {
  const overlay = document.getElementById('analyzerUnlockOverlay');
  if (!overlay) return;
  const xpVal = document.getElementById('analyzerUnlockXpVal');
  const payBtn = document.getElementById('analyzerUnlockPay');
  const cancelBtn = document.getElementById('analyzerUnlockCancel');
  const priceEl = document.querySelector('.analyzer-unlock-price');
  if (priceEl) priceEl.textContent = state._devMode ? 'FREE (dev)' : '30 XP';
  if (xpVal) xpVal.textContent = stats.totalXp || 0;
  if (payBtn) payBtn.disabled = !state._devMode && (stats.totalXp || 0) < 30;
  if (payBtn) payBtn.textContent = state._devMode ? 'Unlock (dev)' : 'Unlock for 30 XP';

  const cleanup = () => {
    cancelBtn?.removeEventListener('click', close);
    payBtn?.removeEventListener('click', onPay);
    overlay.removeEventListener('click', onBgClick);
  };
  const close = () => { cleanup(); overlay.classList.remove('open'); };
  const onPay = () => {
    if (!state._devMode && (stats.totalXp || 0) < 30) { showToast('Not enough XP!'); close(); return; }
    if (!state._devMode) stats.totalXp = (stats.totalXp || 0) - 30;
    saveStats();
    state._analyzerUnlocked = true;
    close();
    showToast('Analyzer unlocked for this game!');
    analyzePuzzle();
  };
  const onBgClick = (e) => { if (e.target === e.currentTarget) close(); };

  cancelBtn?.addEventListener('click', close);
  payBtn?.addEventListener('click', onPay);
  overlay.addEventListener('click', onBgClick);

  overlay.classList.add('open');
}
