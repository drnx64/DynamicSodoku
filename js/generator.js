// ============================================================
// Puzzle Generator — compatibility wrapper around new engine
// ============================================================

const DIFFICULTY_TIER_MAP = { easy: 1, medium: 2, hard: 3, impossible: 4 };

function generatePuzzle(difficulty, rand, options) {
  const customTier = options && options.tier;
  const targetTier = customTier || DIFFICULTY_TIER_MAP[difficulty];
  if (!targetTier) throw new Error('Unknown difficulty: ' + difficulty);

  const oldRandom = rand ? Math.random : null;
  if (rand) Math.random = rand;

  try {
    const result = generateGamePuzzle(targetTier, options || {});
    const solution = result.solution;
    const givens = solution.map((r, ri) => r.map((v, ci) => result.puzzle[ri][ci] !== 0));
    const board = result.puzzle.map(r => [...r]);
    return { solution, givens, board, tier: result.difficulty, size: result.size || 9 };
  } finally {
    if (oldRandom) Math.random = oldRandom;
  }
}

let _puzzleWorker = null;
let _puzzleWorkerId = 0;
const _puzzleCallbacks = {};

function generatePuzzleAsync(difficulty, seed, options) {
  return new Promise((resolve, reject) => {
    if (!_puzzleWorker) {
      try {
        _puzzleWorker = new Worker('js/puzzle-worker.js');
        _puzzleWorker.onmessage = (e) => {
          const { type, id } = e.data;
          const cb = _puzzleCallbacks[id];
          if (!cb) return;
          delete _puzzleCallbacks[id];
          if (type === 'result') {
            cb.resolve(e.data);
          } else {
            cb.reject(new Error(e.data.error || 'Unknown worker error'));
          }
        };
        _puzzleWorker.onerror = (err) => {
          const ids = Object.keys(_puzzleCallbacks);
          for (const id of ids) {
            _puzzleCallbacks[id].reject(err);
            delete _puzzleCallbacks[id];
          }
          _puzzleWorker = null;
        };
      } catch (e) {
        reject(e);
        return;
      }
    }
    const id = ++_puzzleWorkerId;
    _puzzleCallbacks[id] = { resolve, reject };
    _puzzleWorker.postMessage({ type: 'generate', difficulty, seed, options: options || {}, id });
  });
}
