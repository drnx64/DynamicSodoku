// ============================================================
// 1. Sudoku Engine
// ============================================================
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
  const copy = grid.map(r => [...r]);
  if (_solveDet(copy)) return copy;
  return null;
}

function _solveDet(grid) {
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 9; col++)
      if (grid[row][col] === 0) {
        for (let n = 1; n <= 9; n++)
          if (isValidPlacement(grid, row, col, n)) {
            grid[row][col] = n;
            if (_solveDet(grid)) return true;
            grid[row][col] = 0;
          }
        return false;
      }
  return true;
}

function countSolutions(grid, cap) {
  cap = cap || 2;
  let count = 0;
  function _count(g) {
    if (count >= cap) return;
    for (let row = 0; row < 9; row++)
      for (let col = 0; col < 9; col++)
        if (g[row][col] === 0) {
          for (let n = 1; n <= 9; n++)
            if (isValidPlacement(g, row, col, n)) {
              g[row][col] = n;
              _count(g);
              g[row][col] = 0;
              if (count >= cap) return;
            }
          return;
        }
    count++;
  }
  _count(grid.map(r => [...r]));
  return count;
}

