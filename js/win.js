// ============================================================
// 12. Win Dialog & XP Awarding
// ============================================================
function showWinDialog() {
  const score = calcScore(state.difficulty, state.timer, state.mistakes, state.hintsUsed);
  const prevXp = stats.totalXp;
  const prevRank = getRank(prevXp);
  let totalEarned = score;

  document.getElementById('winTime').textContent = formatTime(state.timer);
  document.getElementById('winMistakes').textContent = String(state.mistakes);
  document.getElementById('winHints').textContent = String(state.hintsUsed);

  const diffNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard', impossible: 'Impossible' };

  if (state.isDaily) {
    totalEarned += calcDailyBonus();
    markDailyDone();
    document.getElementById('winSubtitle').textContent = 'Daily Challenge completed!';
    updateStreak();
  } else {
    document.getElementById('winSubtitle').textContent = diffNames[state.difficulty] + ' puzzle solved!';
  }

  stats.totalGames++;
  stats.totalXp += totalEarned;
  stats.gamesByDifficulty[state.difficulty] = (stats.gamesByDifficulty[state.difficulty] || 0) + 1;
  saveStats();

  const newRank = getRank(stats.totalXp);
  const leveledUp = newRank.name !== prevRank.name;

  document.getElementById('winXp').textContent = totalEarned;
  const levelUpEl = document.getElementById('winLevelUp');
  if (leveledUp) {
    levelUpEl.style.display = 'inline-block';
    levelUpEl.textContent = '\u2191 ' + newRank.name + '!\u2003';
  } else {
    levelUpEl.style.display = 'none';
  }

  document.getElementById('winOverlay').classList.add('open');
  updateMenuUI();
}

function updateStreak() {
  const today = todayStr();
  if (streak.lastDate === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth()+1).padStart(2,'0') + '-' + String(yesterday.getDate()).padStart(2,'0');

  if (streak.lastDate === yStr) {
    streak.count++;
  } else if (streak.lastDate !== today) {
    streak.count = 1;
  }
  streak.lastDate = today;
  saveStreak();
}

