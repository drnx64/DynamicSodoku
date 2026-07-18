// ============================================================
// 3. Puzzle Generator
// ============================================================
function generateSolution(rand) {
  log('[generator] generateSolution()');
  rand = rand || Math.random;
  const grid = Array.from({length: 9}, () => Array(9).fill(0));
  _solveDet(grid);

  const numMap = shuffle([1,2,3,4,5,6,7,8,9], rand);
  const bandPerm = shuffle([0,1,2], rand);
  const stackPerm = shuffle([0,1,2], rand);
  const rowPerm = [];
  const colPerm = [];
  for (let b = 0; b < 3; b++) {
    const rows = shuffle([0,1,2], rand);
    for (let i = 0; i < 3; i++)
      rowPerm[b * 3 + i] = bandPerm[b] * 3 + rows[i];
  }
  for (let s = 0; s < 3; s++) {
    const cols = shuffle([0,1,2], rand);
    for (let i = 0; i < 3; i++)
      colPerm[s * 3 + i] = stackPerm[s] * 3 + cols[i];
  }
  const result = Array.from({length: 9}, () => Array(9).fill(0));
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      result[r][c] = numMap[grid[rowPerm[r]][colPerm[c]] - 1];
  if (rand() > 0.5) {
    const transposed = Array.from({length: 9}, () => Array(9).fill(0));
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        transposed[c][r] = result[r][c];
    return transposed;
  }
  return result;
}

function isComplete(grid) {
  log('[generator] isComplete()');
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] === 0) return false;
  return true;
}

const DIFFICULTY_CONFIG = {
  easy:       { minClues: 40, maxClues: 46, maxTech: 2 },
  medium:     { minClues: 32, maxClues: 39, maxTech: 5 },
  hard:       { minClues: 26, maxClues: 31, maxTech: 9 },
  impossible: { minClues: 17, maxClues: 25, maxTech: 10 },
};

function hashGivens(givens) {
  log('[generator] hashGivens()');
  let h = 0;
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      h = ((h << 5) - h) + (givens[r][c] ? 1 : 0) | 0;
  return h;
}

function makePuzzleResult(solution, givens) {
  log('[generator] makePuzzleResult()');
  const board = solution.map(r => [...r]);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (!givens[r][c]) board[r][c] = 0;
  return { solution, givens, board };
}

function generatePuzzle(difficulty, rand) {
  log('[generator] generatePuzzle()', { difficulty });
  rand = rand || Math.random;
  const cfg = DIFFICULTY_CONFIG[difficulty];
  let best = null, bestTech = Infinity;
  const recentHashes = loadHashes();

  for (let attempt = 0; attempt < 40; attempt++) {
    const solution = generateSolution(rand);
    if (!isComplete(solution)) continue;

    const allCells = shuffle(
      Array.from({length: 81}, (_, i) => [Math.floor(i / 9), i % 9]),
      rand
    );

    const board = solution.map(r => [...r]);
    const givens = Array.from({length: 9}, () => Array(9).fill(true));
    let clues = 81;
    for (const [r, c] of allCells) {
      if (clues <= cfg.minClues) break;
      const saved = board[r][c];
      board[r][c] = 0;
      givens[r][c] = false;
      if (countSolutions(board, 2) !== 1) {
        board[r][c] = saved;
        givens[r][c] = true;
      } else {
        clues--;
      }
    }

    if (clues > cfg.maxClues) continue;

    const h = hashGivens(givens);
    if (recentHashes.includes(h)) continue;

    const tech = gradeDifficulty(board);
    if (tech <= cfg.maxTech) {
      saveHash(h);
      return makePuzzleResult(solution, givens);
    }
    if (tech < bestTech) {
      bestTech = tech;
      best = makePuzzleResult(solution, givens);
    }
  }
  if (best) return best;
  for (let attempt = 0; attempt < 20; attempt++) {
    const solution = generateSolution(rand);
    if (!isComplete(solution)) continue;
    const allCells = shuffle(
      Array.from({length: 81}, (_, i) => [Math.floor(i / 9), i % 9]),
      rand
    );
    const board = solution.map(r => [...r]);
    const givens = Array.from({length: 9}, () => Array(9).fill(true));
    let clues = 81;
    for (const [r, c] of allCells) {
      if (clues <= cfg.minClues) break;
      const saved = board[r][c];
      board[r][c] = 0;
      givens[r][c] = false;
      if (countSolutions(board, 2) !== 1) {
        board[r][c] = saved;
        givens[r][c] = true;
      } else { clues--; }
    }
    const tech = gradeDifficulty(board);
    if (tech <= cfg.maxTech && clues >= cfg.minClues && clues <= cfg.maxClues) {
      saveHash(hashGivens(givens));
      return makePuzzleResult(solution, givens);
    }
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const solution = generateSolution(rand);
    if (!isComplete(solution)) continue;
    const allCells = shuffle(Array.from({length: 81}, (_, i) => [Math.floor(i / 9), i % 9]), rand);
    const board = solution.map(r => [...r]);
    const givens = Array.from({length: 9}, () => Array(9).fill(true));
    let clues = 81;
    for (const [r, c] of allCells) {
      if (clues <= cfg.minClues) break;
      const saved = board[r][c];
      board[r][c] = 0;
      givens[r][c] = false;
      if (countSolutions(board, 2) !== 1) {
        board[r][c] = saved;
        givens[r][c] = true;
      } else { clues--; }
    }
    if (clues >= cfg.minClues && clues <= cfg.maxClues) {
      saveHash(hashGivens(givens));
      return makePuzzleResult(solution, givens);
    }
  }
  const finalSolution = generateSolution(rand);
  const finalGivens = Array.from({length: 9}, () => Array(9).fill(true));
  const finalBoard = finalSolution.map(r => [...r]);
  for (const [r, c] of shuffle(Array.from({length: 81}, (_, i) => [Math.floor(i / 9), i % 9]), rand)) {
    const saved = finalBoard[r][c];
    finalBoard[r][c] = 0;
    finalGivens[r][c] = false;
    if (countSolutions(finalBoard, 2) !== 1) {
      finalBoard[r][c] = saved;
      finalGivens[r][c] = true;
    }
  }
  return { solution: finalSolution, givens: finalGivens, board: finalBoard };
}

