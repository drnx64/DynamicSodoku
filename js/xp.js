// ============================================================
// 5. XP / Ranking System
// ============================================================
const RANKS = [
  { name: 'Wood IV', xp: 0 },
  { name: 'Wood III', xp: 80 },
  { name: 'Wood II', xp: 200 },
  { name: 'Wood I', xp: 400 },
  { name: 'Bronze IV', xp: 700 },
  { name: 'Bronze III', xp: 1100 },
  { name: 'Bronze II', xp: 1600 },
  { name: 'Bronze I', xp: 2200 },
  { name: 'Silver IV', xp: 2900 },
  { name: 'Silver III', xp: 3700 },
  { name: 'Silver II', xp: 4600 },
  { name: 'Silver I', xp: 5600 },
  { name: 'Gold IV', xp: 6800 },
  { name: 'Gold III', xp: 8200 },
  { name: 'Gold II', xp: 9800 },
  { name: 'Gold I', xp: 11600 },
  { name: 'Platinum IV', xp: 13600 },
  { name: 'Platinum III', xp: 15800 },
  { name: 'Platinum II', xp: 18200 },
  { name: 'Platinum I', xp: 21000 },
  { name: 'Emerald IV', xp: 24000 },
  { name: 'Emerald III', xp: 27500 },
  { name: 'Emerald II', xp: 31500 },
  { name: 'Emerald I', xp: 36000 },
  { name: 'Diamond IV', xp: 41000 },
  { name: 'Diamond III', xp: 46500 },
  { name: 'Diamond II', xp: 52500 },
  { name: 'Diamond I', xp: 59000 },
  { name: 'Master', xp: 66000 },
  { name: 'Grandmaster', xp: 75000 },
  { name: 'Elite Grandmaster', xp: 85000 },
];

function getRank(totalXp) {
  log('[xp] getRank()', { totalXp });
  let rank = RANKS[0];
  for (const r of RANKS) { if (totalXp >= r.xp) rank = r; }
  return rank;
}

function getNextRank(totalXp) {
  log('[xp] getNextRank()', { totalXp });
  for (const r of RANKS) { if (totalXp < r.xp) return r; }
  return RANKS[RANKS.length - 1];
}

function calcScore(difficulty, timeSec, mistakes, hintsUsed) {
  log('[xp] calcScore()', { difficulty, timeSec, mistakes, hintsUsed });
  const baseMap = { easy: 6, medium: 10, hard: 15, impossible: 20 };
  const base = baseMap[difficulty] || 10;

  const diffMult = { easy: 0.5, medium: 0.7, hard: 0.9, impossible: 1.1 };
  const perf = diffMult[difficulty] || 0.7;

  let timeMod = 0;
  const benchmarks = { easy: 300, medium: 600, hard: 900, impossible: 1800 };
  const bm = benchmarks[difficulty] || 600;
  if (timeSec < bm * 0.5) timeMod = 3;
  else if (timeSec < bm * 0.75) timeMod = 2;
  else if (timeSec < bm) timeMod = 1;
  else if (timeSec > bm * 2) timeMod = -3;
  else if (timeSec > bm * 1.5) timeMod = -1;

  const mistakeMod = Math.max(0, 3 - mistakes);
  const hintMod = Math.max(0, 3 - hintsUsed);

  let score = Math.round((base + timeMod + mistakeMod + hintMod) * perf);
  score = Math.max(1, Math.min(80, score));
  return score;
}

function calcDailyBonus() {
  log('[xp] calcDailyBonus()');
  return 30;
}

