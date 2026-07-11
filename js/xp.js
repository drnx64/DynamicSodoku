// ============================================================
// 5. XP / Ranking System
// ============================================================
const RANKS = [
  { name: 'Wood I', xp: 0 },
  { name: 'Wood II', xp: 80 },
  { name: 'Wood III', xp: 200 },
  { name: 'Wood IV', xp: 400 },
  { name: 'Bronze I', xp: 700 },
  { name: 'Bronze II', xp: 1100 },
  { name: 'Bronze III', xp: 1600 },
  { name: 'Bronze IV', xp: 2200 },
  { name: 'Silver I', xp: 2900 },
  { name: 'Silver II', xp: 3700 },
  { name: 'Silver III', xp: 4600 },
  { name: 'Silver IV', xp: 5600 },
  { name: 'Gold I', xp: 6800 },
  { name: 'Gold II', xp: 8200 },
  { name: 'Gold III', xp: 9800 },
  { name: 'Gold IV', xp: 11600 },
  { name: 'Platinum I', xp: 13600 },
  { name: 'Platinum II', xp: 15800 },
  { name: 'Platinum III', xp: 18200 },
  { name: 'Platinum IV', xp: 21000 },
  { name: 'Emerald I', xp: 24000 },
  { name: 'Emerald II', xp: 27500 },
  { name: 'Emerald III', xp: 31500 },
  { name: 'Emerald IV', xp: 36000 },
  { name: 'Diamond I', xp: 41000 },
  { name: 'Diamond II', xp: 46500 },
  { name: 'Diamond III', xp: 52500 },
  { name: 'Diamond IV', xp: 59000 },
  { name: 'Master', xp: 66000 },
  { name: 'Grandmaster', xp: 75000 },
  { name: 'Elite Grandmaster', xp: 85000 },
];

function getRank(totalXp) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (totalXp >= r.xp) rank = r; }
  return rank;
}

function getNextRank(totalXp) {
  for (const r of RANKS) { if (totalXp < r.xp) return r; }
  return RANKS[RANKS.length - 1];
}

function calcScore(difficulty, timeSec, mistakes, hintsUsed) {
  const roll = Math.floor(Math.random() * 10000) + 1;
  let base;
  if (roll <= 8000)       base = 10 + Math.floor(Math.random() * 6);     // 10-15
  else if (roll <= 9200)  base = 45 + Math.floor(Math.random() * 11);    // 45-55
  else if (roll <= 9999)  base = 60 + Math.floor(Math.random() * 26);    // 60-85
  else                    base = 100;                                     // perfect

  const diffMult = { easy: 0.8, medium: 1.0, hard: 1.2, impossible: 1.5 };
  const perf = diffMult[difficulty] || 1;

  let timeMod = 0;
  const benchmarks = { easy: 300, medium: 600, hard: 900, impossible: 1800 };
  const bm = benchmarks[difficulty] || 600;
  if (timeSec < bm * 0.5) timeMod = 5;
  else if (timeSec < bm * 0.75) timeMod = 3;
  else if (timeSec < bm) timeMod = 1;
  else if (timeSec > bm * 1.5) timeMod = -3;
  else if (timeSec > bm * 2) timeMod = -5;

  const mistakeMod = Math.max(0, 5 - mistakes * 2);
  const hintMod = Math.max(0, 5 - hintsUsed * 2);

  let score = Math.round((base + timeMod + mistakeMod + hintMod) * perf);
  score = Math.max(1, Math.min(100, score));
  return score;
}

function calcDailyBonus() {
  return 50;
}

