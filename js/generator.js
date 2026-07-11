// ============================================================
// 3. Puzzle Generator
// ============================================================
function generateSolution(rand) {
  rand = rand || Math.random;
  const grid = Array.from({length: 9}, () => Array(9).fill(0));
  for (let box = 0; box < 3; box++) {
    const nums = shuffle([1,2,3,4,5,6,7,8,9], rand);
    let idx = 0;
    for (let r = box*3; r < box*3+3; r++)
      for (let c = box*3; c < box*3+3; c++)
        grid[r][c] = nums[idx++];
  }
  function _solveRand(g) {
    for (let row = 0; row < 9; row++)
      for (let col = 0; col < 9; col++)
        if (g[row][col] === 0) {
          const nums = shuffle([1,2,3,4,5,6,7,8,9], rand);
          for (const n of nums)
            if (isValidPlacement(g, row, col, n)) {
              g[row][col] = n;
              if (_solveRand(g)) return true;
              g[row][col] = 0;
            }
          return false;
        }
    return true;
  }
  _solveRand(grid);
  return grid;
}

const DIFFICULTY_CONFIG = {
  easy:       { minClues: 40, maxClues: 46, maxTech: 2 },
  medium:     { minClues: 32, maxClues: 39, maxTech: 5 },
  hard:       { minClues: 26, maxClues: 31, maxTech: 9 },
  impossible: { minClues: 17, maxClues: 25, maxTech: 10 },
};

function hashGivens(givens) {
  let h = 0;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      h = ((h << 5) - h) + (givens[r][c] ? 1 : 0) | 0;
  return h;
}

function generatePuzzle(difficulty, rand) {
  rand = rand || Math.random;
  const cfg = DIFFICULTY_CONFIG[difficulty];
  let best = null, bestTech = Infinity;
  const recentHashes = loadHashes();

  for (let attempt = 0; attempt < 40; attempt++) {
    const solution = generateSolution(rand);
    const allCells = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        allCells.push([r, c]);
    const shuffled = shuffle(allCells, rand);

    const board = solution.map(r => [...r]);
    const givens = Array.from({length: 9}, () => Array(9).fill(true));
    let clues = 81;
    for (const [r, c] of shuffled) {
      if (clues <= cfg.minClues) break;
      const saved = board[r][c];
      board[r][c] = 0;
      givens[r][c] = false;
      if (countSolutions(board, 2) > 1) {
        board[r][c] = saved;
        givens[r][c] = true;
      } else {
        clues--;
      }
    }

    const h = hashGivens(givens);
    if (recentHashes.includes(h)) continue;
    if (clues < cfg.minClues || clues > cfg.maxClues) continue;

    const tech = gradeDifficulty(board);
    if (tech <= cfg.maxTech) {
      const result = { solution, board: solution.map(r => [...r]), givens };
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (!givens[r][c]) result.board[r][c] = 0;
      saveHash(h);
      return result;
    }
    if (tech < bestTech) {
      bestTech = tech;
      const r = { solution, board: solution.map(r => [...r]), givens };
      for (let rr = 0; rr < 9; rr++)
        for (let cc = 0; cc < 9; cc++)
          if (!givens[rr][cc]) r.board[rr][cc] = 0;
      best = r;
    }
  }
  if (best) return best;
  for (let attempt = 0; attempt < 20; attempt++) {
    const solution = generateSolution(rand);
    const allCells = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        allCells.push([r, c]);
    const shuffled = shuffle(allCells, rand);
    const board = solution.map(r => [...r]);
    const givens = Array.from({length: 9}, () => Array(9).fill(true));
    let clues = 81;
    for (const [r, c] of shuffled) {
      if (clues <= cfg.minClues) break;
      const saved = board[r][c];
      board[r][c] = 0;
      givens[r][c] = false;
      if (countSolutions(board, 2) > 1) {
        board[r][c] = saved;
        givens[r][c] = true;
      } else { clues--; }
    }
    const result = { solution, board: solution.map(r => [...r]), givens };
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (!givens[r][c]) result.board[r][c] = 0;
    return result;
  }
  return generateSolution(rand);
}

