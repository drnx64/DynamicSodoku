window.dev = function () {
  state._devMode = !state._devMode;
  if (state._devMode) {
    console.log('%c🧪 DEV MODE ACTIVE', 'font-size:18px;font-weight:bold;color:#fbbf24');
    console.log('%cAll XP costs bypassed — undo, hints, auto-candidates, analyzer, second chance are free.', 'color:#94a3b8');
    console.log('%cRun devPay() to trigger the analyzer pay prompt (no XP deducted).', 'color:#94a3b8');
    showToast('🧪 Dev mode ON — all features free');
  } else {
    console.log('%cDev mode OFF', 'color:#94a3b8');
    showToast('Dev mode OFF');
  }
};

window.devPay = function () {
  if (typeof showAnalyzerUnlock === 'function') {
    console.log('%cTriggering analyzer pay prompt (dev mode — no cost)', 'color:#94a3b8');
    showAnalyzerUnlock();
  } else {
    console.warn('showAnalyzerUnlock not available yet');
  }
};

window.autocomplete = function () {
  if (!state || !state.solution || !state.solution[0]) {
    console.warn('%c[dev] No active puzzle to autocomplete', 'color:#ef4444');
    return;
  }
  state.board = state.solution.map(r => [...r]);
  state.notes = state.notes.map(r => r.map(() => new Set()));
  state.history = []; state.historyIdx = -1;
  state.hintsUsed = 0;
  requestRender();
  saveGame();
  checkWin();
  console.log('%c[dev] Puzzle autocompleted!', 'color:#22c55e');
};

const _rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

window.stream = function () {
  const diffs = ['easy', 'medium', 'hard', 'impossible'];
  const totalGames = _rand(50, 5000);

  const gamesByDifficulty = {};
  let sum = 0;
  for (const d of diffs) {
    gamesByDifficulty[d] = _rand(10, Math.max(11, Math.round(totalGames * 0.4)));
    sum += gamesByDifficulty[d];
  }
  const factor = totalGames / sum;
  for (const d of diffs) {
    gamesByDifficulty[d] = Math.max(1, Math.round(gamesByDifficulty[d] * factor));
  }

  const avgScore = _rand(15, 45);
  const totalXp = totalGames * avgScore;
  const rank = getRank(totalXp);

  const highestLevel = _rand(100, 1500);
  const highestLevelByDifficulty = {};
  for (const d of diffs) {
    highestLevelByDifficulty[d] = _rand(10, highestLevel);
  }

  const bestTimes = {};
  const timeRange = { easy: [60, 600], medium: [90, 900], hard: [150, 1200], impossible: [240, 1800] };
  for (const d of diffs) {
    bestTimes[d] = _rand(timeRange[d][0], timeRange[d][1]);
  }

  const bestStreak = _rand(5, 365);
  const streakCount = _rand(0, bestStreak);

  const statsSubset = [
    ['totalTime', totalGames * _rand(120, 400)],
    ['bestStreak', bestStreak],
    ['totalMistakes', totalGames * _rand(1, 6)],
    ['totalNotesPlaced', totalGames * _rand(20, 120)],
    ['totalHintsUsedAll', totalGames * _rand(0, 3)],
    ['totalUndosUsed', totalGames * _rand(0, 8)],
    ['dailyChallengesDone', _rand(0, 200)],
    ['flawlessCount', Math.round(totalGames * _rand(10, 60) / 100)],
    ['puzzlesNoHints', Math.round(totalGames * _rand(20, 90) / 100)],
    ['highestLevel', highestLevel],
  ];

  const rankUpdate = { totalGames, totalXp, gamesByDifficulty, bestTimes, highestLevelByDifficulty, _lastRankName: rank.name };
  Object.assign(stats, rankUpdate);
  for (const [k, v] of statsSubset) stats[k] = v;

  const allIds = ACHIEVEMENTS.map(a => a.id);
  const shuffled = [...allIds].sort(() => Math.random() - 0.5);
  const achieveCount = _rand(25, Math.min(60, allIds.length));
  stats.achievements = shuffled.slice(0, achieveCount);
  stats._newAchievements = [];

  const daysAgo = _rand(60, 1200);
  const past = new Date(Date.now() - daysAgo * 86400000);
  stats.firstGameDate = past.toISOString().slice(0, 10);

  stats._freeHints = _rand(0, 30);

  streak.count = streakCount;
  streak.lastDate = todayStr();
  streak.freezes = _rand(0, 10);

  for (const d of diffs) saveLevelProgress(d, highestLevelByDifficulty[d]);

  saveStats();
  saveStreak();

  try {
    if (typeof updateMenuUI === 'function') updateMenuUI();
  } catch (e) { console.warn('[stream] updateMenuUI failed', e); }
  try {
    if (typeof updateDiffBestTimes === 'function') updateDiffBestTimes();
  } catch (e) { console.warn('[stream] updateDiffBestTimes failed', e); }

  console.log('%c🎥 STREAM MODE — random profile generated', 'font-size:16px;font-weight:bold;color:#fbbf24');
  console.log('%c' + rank.name + ' · ' + totalXp.toLocaleString() + ' XP', 'font-size:14px;font-weight:bold;color:#f472b6');
  console.log('%cHighest level: ' + highestLevel + ' · Streak: ' + streakCount + 'd', 'color:#a5b4fc');
  console.table(gamesByDifficulty);
  if (typeof showToast === 'function') showToast('🎥 Stream profile generated (' + rank.name + ')');
  return { rank: rank.name, totalXp, highestLevel, gamesByDifficulty, bestTimes, bestStreak, achievements: stats.achievements.length };
};
