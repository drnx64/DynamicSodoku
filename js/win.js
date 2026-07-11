// ============================================================
// 12. Win Dialog & XP Awarding
// ============================================================
function fireConfetti() {
  const colors = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#8b5cf6', '#ec4899', '#06b6d4'];
  const container = document.getElementById('confettiContainer');
  container.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (Math.random() * 6 + 4) + 'px';
    piece.style.height = (Math.random() * 6 + 4) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
    piece.style.animationDelay = (Math.random() * 1.5) + 's';
    container.appendChild(piece);
  }
  setTimeout(() => container.innerHTML = '', 5000);
}

function rankSvgTag(rankName, size) {
  const t = rankName.toLowerCase();
  let src;
  if (t.includes('wood')) src = 'assets/rank-wood.svg';
  else if (t.includes('bronze')) src = 'assets/rank-bronze.svg';
  else if (t.includes('silver')) src = 'assets/rank-silver.svg';
  else if (t.includes('gold')) src = 'assets/rank-gold.svg';
  else if (t.includes('platinum')) src = 'assets/rank-platinum.svg';
  else if (t.includes('emerald')) src = 'assets/rank-emerald.svg';
  else if (t.includes('diamond')) src = 'assets/rank-diamond.svg';
  else if (t.includes('master')) src = 'assets/rank-master.svg';
  else if (t.includes('grandmaster')) src = 'assets/rank-grandmaster.svg';
  else if (t.includes('elite')) src = 'assets/rank-elite.svg';
  else return '';
  return '<img src="' + src + '" width="' + size + '" height="' + size + '" class="rank-svg-icon" alt="' + rankName + '">';
}

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
  stats.totalTime += state.timer;
  stats.gamesByDifficulty[state.difficulty] = (stats.gamesByDifficulty[state.difficulty] || 0) + 1;
  if (state.timer < stats.bestTimes[state.difficulty]) stats.bestTimes[state.difficulty] = state.timer;
  if (streak.count > stats.bestStreak) stats.bestStreak = streak.count;
  saveStats();

  const newRank = getRank(stats.totalXp);
  const leveledUp = newRank.name !== prevRank.name;

  document.getElementById('winXp').textContent = totalEarned;
  const levelUpEl = document.getElementById('winLevelUp');
  if (leveledUp) {
    levelUpEl.style.display = 'inline-block';
    levelUpEl.innerHTML = rankSvgTag(newRank.name, 18) + '\u2002&#8593; ' + newRank.name + '!';
  } else {
    levelUpEl.style.display = 'none';
  }

  clearGame();
  checkAchievements(state.difficulty, state.mistakes, state.hintsUsed);
  fireConfetti();
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

