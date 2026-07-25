// ============================================================
// Difficulty Grader — compatibility wrapper around gradePuzzle
// ============================================================

function gradeDifficulty(board) {
  const grade = gradePuzzle(board);
  if (!grade.solved) return 10;
  return grade.tier === 1 ? 2
       : grade.tier === 2 ? 7
       : grade.tier === 3 ? 9
       : 10;
}
