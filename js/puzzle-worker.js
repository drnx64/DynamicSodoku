importScripts('engine.js', 'rng.js', 'generator.js');

self.addEventListener('message', (e) => {
  const { type, difficulty, seed, id } = e.data;
  if (type !== 'generate') return;
  const oldRandom = Math.random;
  if (seed) {
    const rng = createSeededRng(seed);
    Math.random = rng;
  }
  try {
    const result = generatePuzzle(difficulty);
    self.postMessage({
      type: 'result', id,
      difficulty,
      solution: result.solution,
      givens: result.givens,
      board: result.board
    });
  } catch (err) {
    self.postMessage({ type: 'error', id, error: err.message });
  } finally {
    if (seed) Math.random = oldRandom;
  }
});
