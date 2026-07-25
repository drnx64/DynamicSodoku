// ============================================================
// Puzzle Generator — compatibility wrapper around new engine
// ============================================================

const DIFFICULTY_TIER_MAP = { easy: 1, medium: 2, hard: 3, impossible: 4 };

function generatePuzzle(difficulty, rand) {
  const targetTier = DIFFICULTY_TIER_MAP[difficulty];
  if (!targetTier) throw new Error('Unknown difficulty: ' + difficulty);

  const oldRandom = rand ? Math.random : null;
  if (rand) Math.random = rand;

  try {
    const result = generateGamePuzzle(targetTier);
    const solution = result.solution;
    const givens = solution.map((r, ri) => r.map((v, ci) => result.puzzle[ri][ci] !== 0));
    const board = result.puzzle.map(r => [...r]);
    return { solution, givens, board };
  } finally {
    if (oldRandom) Math.random = oldRandom;
  }
}
