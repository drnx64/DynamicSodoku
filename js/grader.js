// ============================================================
// 4. Difficulty Grader
// ============================================================
function gradeDifficulty(board) {
  const g = board.map(r => [...r]);
  let cands = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (g[r][c] === 0) cands[r][c] = getCandidates(g, r, c);

  function place(r, c, v) {
    g[r][c] = v;
    cands[r][c] = new Set();
    for (let i = 0; i < 9; i++) {
      cands[r][i].delete(v);
      cands[i][c].delete(v);
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++)
      for (let cc = bc; cc < bc + 3; cc++)
        cands[rr][cc].delete(v);
  }

  let hardestTech = 0;
  while (true) {
    let full = true;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (g[r][c] === 0) full = false;
    if (full) break;
    let progress = false;

    for (let r = 0; r < 9 && !progress; r++)
      for (let c = 0; c < 9 && !progress; c++)
        if (g[r][c] === 0 && cands[r][c].size === 1) {
          place(r, c, [...cands[r][c]][0]);
          hardestTech = Math.max(hardestTech, 1);
          progress = true;
        }

    if (!progress) {
      for (let n = 1; n <= 9 && !progress; n++) {
        for (let row = 0; row < 9 && !progress; row++) {
          const cells = [];
          for (let c = 0; c < 9; c++) if (g[row][c] === 0 && cands[row][c].has(n)) cells.push([row, c]);
          if (cells.length === 1) { place(cells[0][0], cells[0][1], n); hardestTech = Math.max(hardestTech, 2); progress = true; }
        }
        for (let col = 0; col < 9 && !progress; col++) {
          const cells = [];
          for (let r = 0; r < 9; r++) if (g[r][col] === 0 && cands[r][col].has(n)) cells.push([r, col]);
          if (cells.length === 1) { place(cells[0][0], cells[0][1], n); hardestTech = Math.max(hardestTech, 2); progress = true; }
        }
        for (let br = 0; br < 9 && !progress; br += 3)
          for (let bc = 0; bc < 9 && !progress; bc += 3) {
            const cells = [];
            for (let r = br; r < br+3; r++)
              for (let c = bc; c < bc+3; c++)
                if (g[r][c] === 0 && cands[r][c].has(n)) cells.push([r, c]);
            if (cells.length === 1) { place(cells[0][0], cells[0][1], n); hardestTech = Math.max(hardestTech, 2); progress = true; }
          }
      }
    }

    if (!progress) {
      let elim = false;
      for (let row = 0; row < 9 && !elim; row++) {
        const rowCells = []; for (let c = 0; c < 9; c++) if (g[row][c] === 0) rowCells.push([row, c]);
        elim = elimPair(rowCells, cands) || elim;
      }
      for (let col = 0; col < 9 && !elim; col++) {
        const colCells = []; for (let r = 0; r < 9; r++) if (g[r][col] === 0) colCells.push([r, col]);
        elim = elimPair(colCells, cands) || elim;
      }
      for (let br = 0; br < 9 && !elim; br += 3)
        for (let bc = 0; bc < 9 && !elim; bc += 3) {
          const boxCells = []; for (let r = br; r < br+3; r++) for (let c = bc; c < bc+3; c++) if (g[r][c] === 0) boxCells.push([r, c]);
          elim = elimPair(boxCells, cands) || elim;
        }
      if (elim) { hardestTech = Math.max(hardestTech, 3); progress = true; }
    }

    if (!progress) {
      let elim = false;
      for (let row = 0; row < 9 && !elim; row++) {
        const rowCells = []; for (let c = 0; c < 9; c++) if (g[row][c] === 0) rowCells.push([row, c]);
        elim = elimTriple(rowCells, cands) || elim;
      }
      for (let col = 0; col < 9 && !elim; col++) {
        const colCells = []; for (let r = 0; r < 9; r++) if (g[r][col] === 0) colCells.push([r, col]);
        elim = elimTriple(colCells, cands) || elim;
      }
      for (let br = 0; br < 9 && !elim; br += 3)
        for (let bc = 0; bc < 9 && !elim; bc += 3) {
          const boxCells = []; for (let r = br; r < br+3; r++) for (let c = bc; c < bc+3; c++) if (g[r][c] === 0) boxCells.push([r, c]);
          elim = elimTriple(boxCells, cands) || elim;
        }
      if (elim) { hardestTech = Math.max(hardestTech, 7); progress = true; }
    }

    if (!progress) {
      let elim = false;
      for (let br = 0; br < 9 && !elim; br += 3)
        for (let bc = 0; bc < 9 && !elim; bc += 3)
          for (let n = 1; n <= 9 && !elim; n++) {
            const rows = new Set(), cols = new Set();
            for (let r = br; r < br+3; r++)
              for (let c = bc; c < bc+3; c++)
                if (g[r][c] === 0 && cands[r][c].has(n)) { rows.add(r); cols.add(c); }
            if (rows.size === 1) {
              const row = [...rows][0];
              for (let c = 0; c < 9; c++)
                if ((c < bc || c >= bc+3) && g[row][c] === 0 && cands[row][c].has(n)) { cands[row][c].delete(n); elim = true; }
            }
            if (cols.size === 1) {
              const col = [...cols][0];
              for (let r = 0; r < 9; r++)
                if ((r < br || r >= br+3) && g[r][col] === 0 && cands[r][col].has(n)) { cands[r][col].delete(n); elim = true; }
            }
          }
      if (elim) { hardestTech = Math.max(hardestTech, 5); progress = true; }
    }

    if (!progress) {
      let elim = false;
      for (let row = 0; row < 9 && !elim; row++)
        for (let n = 1; n <= 9 && !elim; n++) {
          const cols = [], boxes = new Set();
          for (let c = 0; c < 9; c++)
            if (g[row][c] === 0 && cands[row][c].has(n)) { cols.push(c); boxes.add(Math.floor(c / 3)); }
          if (cols.length >= 2 && cols.length <= 3 && boxes.size === 1) {
            const bc = [...boxes][0] * 3;
            for (let r = 0; r < 9; r++)
              if (r !== row) for (let c = bc; c < bc+3; c++) if (g[r][c] === 0 && cands[r][c].has(n)) { cands[r][c].delete(n); elim = true; }
          }
        }
      for (let col = 0; col < 9 && !elim; col++)
        for (let n = 1; n <= 9 && !elim; n++) {
          const rows = [], boxes = new Set();
          for (let r = 0; r < 9; r++)
            if (g[r][col] === 0 && cands[r][col].has(n)) { rows.push(r); boxes.add(Math.floor(r / 3)); }
          if (rows.length >= 2 && rows.length <= 3 && boxes.size === 1) {
            const br = [...boxes][0] * 3;
            for (let c = 0; c < 9; c++)
              if (c !== col) for (let r = br; r < br+3; r++) if (g[r][c] === 0 && cands[r][c].has(n)) { cands[r][c].delete(n); elim = true; }
          }
        }
      if (elim) { hardestTech = Math.max(hardestTech, 6); progress = true; }
    }

    if (!progress) {
      let elim = false;
      for (let n = 1; n <= 9 && !elim; n++) {
        const rowsWithCols = [];
        for (let r = 0; r < 9; r++) {
          const cols = [];
          for (let c = 0; c < 9; c++) if (g[r][c] === 0 && cands[r][c].has(n)) cols.push(c);
          if (cols.length === 2) rowsWithCols.push([r, cols]);
        }
        for (let i = 0; i < rowsWithCols.length && !elim; i++)
          for (let j = i+1; j < rowsWithCols.length && !elim; j++) {
            const c1 = rowsWithCols[i][1], c2 = rowsWithCols[j][1];
            if (c1[0] === c2[0] && c1[1] === c2[1])
              for (let r = 0; r < 9; r++)
                if (r !== rowsWithCols[i][0] && r !== rowsWithCols[j][0])
                  for (const c of c1) if (g[r][c] === 0 && cands[r][c].has(n)) { cands[r][c].delete(n); elim = true; }
          }
      }
      if (elim) { hardestTech = Math.max(hardestTech, 9); progress = true; }
    }

    if (!progress) { hardestTech = Math.max(hardestTech, 10); break; }
  }
  return hardestTech;
}

function elimPair(cells, cands) {
  let elim = false;
  for (let i = 0; i < cells.length; i++) {
    const [r1, c1] = cells[i];
    const s1 = [...cands[r1][c1]];
    if (s1.length !== 2) continue;
    for (let j = i+1; j < cells.length; j++) {
      const [r2, c2] = cells[j];
      const s2 = [...cands[r2][c2]];
      if (s2.length !== 2) continue;
      if (s1[0] === s2[0] && s1[1] === s2[1]) {
        for (const [r, c] of cells) {
          if ((r === r1 && c === c1) || (r === r2 && c === c2)) continue;
          for (const v of s1) { if (cands[r][c].has(v)) { cands[r][c].delete(v); elim = true; } }
        }
      }
    }
  }
  return elim;
}

function elimTriple(cells, cands) {
  let elim = false;
  for (let i = 0; i < cells.length; i++) {
    const [r1, c1] = cells[i];
    const s1 = [...cands[r1][c1]];
    if (s1.length < 2 || s1.length > 3) continue;
    for (let j = i+1; j < cells.length; j++) {
      const [r2, c2] = cells[j];
      const s2 = [...cands[r2][c2]];
      if (s2.length < 2 || s2.length > 3) continue;
      for (let k = j+1; k < cells.length; k++) {
        const [r3, c3] = cells[k];
        const s3 = [...cands[r3][c3]];
        if (s3.length < 2 || s3.length > 3) continue;
        const union = new Set([...s1, ...s2, ...s3]);
        if (union.size <= 3) {
          for (const [r, c] of cells) {
            if ((r === r1 && c === c1) || (r === r2 && c === c2) || (r === r3 && c === c3)) continue;
            for (const v of union) { if (cands[r][c].has(v)) { cands[r][c].delete(v); elim = true; } }
          }
        }
      }
    }
  }
  return elim;
}

