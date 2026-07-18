// ============================================================
// 1. Sudoku Engine
// ============================================================
const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log(...args);
  if (typeof reportBreadcrumb === 'function') reportBreadcrumb(args[0], args[1] || '');
}

function isValidPlacement(board, row, col, val) {
  if (!val) return true;
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === val && i !== col) return false;
    if (board[i][col] === val && i !== row) return false;
  }
  const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (board[r][c] === val && (r !== row || c !== col)) return false;
  return true;
}

function findConflicts(board) {
  log('[engine] findConflicts()');
  const conflicts = new Set();
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 9; col++) {
      const v = board[row][col];
      if (!v) continue;
      for (let i = 0; i < 9; i++) {
        if (i !== col && board[row][i] === v) { conflicts.add(row+','+col); conflicts.add(row+','+i); }
        if (i !== row && board[i][col] === v) { conflicts.add(row+','+col); conflicts.add(i+','+col); }
      }
      const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
      for (let r = br; r < br + 3; r++)
        for (let c = bc; c < bc + 3; c++)
          if ((r !== row || c !== col) && board[r][c] === v) { conflicts.add(row+','+col); conflicts.add(r+','+c); }
    }
  return conflicts;
}

function getCandidates(board, row, col) {
  if (DEBUG) log('[engine] getCandidates()', { row, col });
  if (board[row][col]) return new Set();
  const cands = new Set([1,2,3,4,5,6,7,8,9]);
  for (let i = 0; i < 9; i++) {
    cands.delete(board[row][i]);
    cands.delete(board[i][col]);
  }
  const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      cands.delete(board[r][c]);
  return cands;
}

function solve(grid) {
  log('[engine] solve()');
  const copy = grid.map(r => [...r]);
  if (_solveDet(copy)) return copy;
  return null;
}

function _solveDet(grid) {
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);
  const boxIdx = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (!v) continue;
      const m = 1 << v;
      rows[r] |= m; cols[c] |= m; boxes[boxIdx(r, c)] |= m;
    }
  function canPlace(r, c, n) { const m = 1 << n; return !(rows[r] & m || cols[c] & m || boxes[boxIdx(r, c)] & m); }
  function place(r, c, n) { const m = 1 << n; rows[r] |= m; cols[c] |= m; boxes[boxIdx(r, c)] |= m; grid[r][c] = n; }
  function unplace(r, c, n) { const m = ~(1 << n); rows[r] &= m; cols[c] &= m; boxes[boxIdx(r, c)] &= m; grid[r][c] = 0; }
  function solve() {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] === 0) {
          for (let n = 1; n <= 9; n++)
            if (canPlace(r, c, n)) {
              place(r, c, n);
              if (solve()) return true;
              unplace(r, c, n);
            }
          return false;
        }
    return true;
  }
  return solve();
}

function countSolutions(grid, cap) {
  if (cap === undefined) cap = 2;
  let count = 0;
  const g = grid.map(r => [...r]);
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);
  const boxIdx = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++) {
      const v = g[r][c];
      if (!v) continue;
      const m = 1 << v;
      rows[r] |= m; cols[c] |= m; boxes[boxIdx(r, c)] |= m;
    }
  function canPlace(r, c, n) { const m = 1 << n; return !(rows[r] & m || cols[c] & m || boxes[boxIdx(r, c)] & m); }
  function place(r, c, n) { const m = 1 << n; rows[r] |= m; cols[c] |= m; boxes[boxIdx(r, c)] |= m; g[r][c] = n; }
  function unplace(r, c, n) { const m = ~(1 << n); rows[r] &= m; cols[c] &= m; boxes[boxIdx(r, c)] &= m; g[r][c] = 0; }
  function solve() {
    if (count >= cap) return;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (g[r][c] === 0) {
          for (let n = 1; n <= 9; n++)
            if (canPlace(r, c, n)) {
              place(r, c, n);
              solve();
              unplace(r, c, n);
              if (count >= cap) return;
            }
          return;
        }
    count++;
  }
  solve();
  return count;
}

