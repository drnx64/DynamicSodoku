importScripts('engine.js', 'rng.js', 'generator.js');

self.addEventListener('message', (e) => {
  const { type, difficulty, seed, id, options } = e.data;
  if (type !== 'generate') return;
  const oldRandom = Math.random;
  if (seed) {
    const rng = createSeededRng(seed);
    Math.random = rng;
  }
  try {
    const result = generatePuzzle(difficulty, null, options || {});
    self.postMessage({
      type: 'result', id,
      difficulty,
      solution: result.solution,
      givens: result.givens,
      board: result.board,
      tier: result.tier,
      size: result.size || 9
    });
  } catch (err) {
    self.postMessage({ type: 'error', id, error: err.message });
  } finally {
    if (seed) Math.random = oldRandom;
  }
});
