// ============================================================
// 12. Win Dialog & XP Awarding
// ============================================================
function fireConfetti() {
  log('[win] fireConfetti()');
  const colors = ['#dc2626', '#f59e0b', '#16a34a', '#2563eb', '#8b5cf6', '#ec4899', '#06b6d4'];
  const container = document.getElementById('confettiContainer');
  if (!container) { log('[win] WARN: #confettiContainer not found'); return; }
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

function showWinDialog() {
  log('[win] showWinDialog()');
  const score = calcScore(state.difficulty, state.timer, state.mistakes, state.hintsUsed);
  const comboMult = Math.min(state.maxCombo || 0, 9) / 10;
  const comboBonus = Math.round(score * comboMult);
  let totalEarned = score + comboBonus;
  const prevXp = stats.totalXp;
  const prevRank = getRank(prevXp);

  document.getElementById('winTime').textContent = formatTime(state.timer);
  document.getElementById('winMistakes').textContent = String(state.mistakes);
  document.getElementById('winHints').textContent = String(state.hintsUsed);

  const diffNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard', impossible: 'Impossible' };

  if (state.isDaily) {
    totalEarned += calcDailyBonus();
    markDailyDone();
    stats.dailyChallengesDone = (stats.dailyChallengesDone || 0) + 1;
    const archive = stats.dailyArchive || [];
    const today = todayStr();
    if (!archive.includes(today)) {
      archive.push(today);
      stats.dailyArchive = archive;
    }
    document.getElementById('winSubtitle').textContent = 'Daily Challenge completed!';
    updateStreak();
  } else {
    document.getElementById('winSubtitle').textContent = diffNames[state.difficulty] + ' puzzle solved!';
  }

  const levelInfo = document.getElementById('winLevelInfo');
  const levelNum = document.getElementById('winLevelNum');
  if (!state.isDaily) {
    levelInfo.style.display = 'inline-block';
    levelNum.textContent = state.currentLevel;
    const diff = state.difficulty;
    if (state.currentLevel > stats.highestLevel) stats.highestLevel = state.currentLevel;
    if (state.currentLevel > (stats.highestLevelByDifficulty[diff] || 0)) stats.highestLevelByDifficulty[diff] = state.currentLevel;
    state.currentLevel++;
  } else {
    levelInfo.style.display = 'none';
  }

  if (!stats.firstGameDate) stats.firstGameDate = todayStr();
  stats.totalGames++;
  trackBonusGame();
  stats.totalXp += totalEarned;
  stats.totalTime += state.timer;
  stats.gamesByDifficulty[state.difficulty] = (stats.gamesByDifficulty[state.difficulty] || 0) + 1;
  stats.totalMistakes = (stats.totalMistakes || 0) + state.mistakes;
  if (state.timer < stats.bestTimes[state.difficulty]) stats.bestTimes[state.difficulty] = state.timer;
  if (streak.count > stats.bestStreak) stats.bestStreak = streak.count;
  if (state.mistakes === 0) stats.flawlessCount = (stats.flawlessCount || 0) + 1;
  if (state.mistakes === 0) earnSecondChance();
  if (state.isDaily) earnSecondChance();
  if (state.currentLevel % 5 === 0 && !state.isDaily) earnSecondChance();
  if (state.hintsUsed === 0) stats.puzzlesNoHints = (stats.puzzlesNoHints || 0) + 1;
  saveStats();

  const newRank = getRank(stats.totalXp);
  const leveledUp = newRank.name !== prevRank.name;
  log('[win] stats updated', { score, comboMult, comboBonus, totalEarned, newTotalXp: stats.totalXp, prevRank: prevRank.name, newRank: newRank.name, leveledUp });

  document.getElementById('winXp').textContent = totalEarned;
  const comboEl = document.getElementById('winComboBonus');
  if (comboEl) {
    comboEl.style.display = state.maxCombo >= 2 ? 'inline' : 'none';
    if (state.maxCombo >= 2) comboEl.textContent = ' (incl. x' + (state.maxCombo > 9 ? 9 : state.maxCombo) + ' combo +' + comboBonus + ')';
  }
  const levelUpEl = document.getElementById('winLevelUp');
  if (leveledUp) {
    levelUpEl.style.display = 'inline-block';
    levelUpEl.innerHTML = rankSvgImg(newRank.name, 18) + '\u2002&#8593; ' + newRank.name + '!';
  } else {
    levelUpEl.style.display = 'none';
  }

  const nextBtn = document.getElementById('winNext');
  if (!state.isDaily) {
    nextBtn.textContent = 'Next Level';
  } else {
    nextBtn.textContent = 'Back to Menu';
  }

  clearGame();
  checkAchievements(state.difficulty, state.mistakes, state.hintsUsed, state.notesUsed, totalEarned, state.settings.autoCandidates);
  addScoreToLeaderboard(state.settings.playerName || 'Player', Math.round(totalEarned), state.difficulty);
  fireConfetti();

  function openWinDialog() {
    const winOverlay = document.getElementById('winOverlay');
    if (!winOverlay) { log('[win] WARN: #winOverlay not found'); return; }
    winOverlay.classList.add('open');
    updateMenuUI();
  }

  if (leveledUp) {
    log('[win] showing rank-up animation');
    const overlay = document.getElementById('rankupOverlay');
    if (!overlay) { log('[win] WARN: #rankupOverlay not found'); return; }
    document.getElementById('rankupBadge').innerHTML = rankSvgImg(newRank.name, 96);
    document.getElementById('rankupOldRank').textContent = prevRank.name;
    document.getElementById('rankupNewRank').textContent = newRank.name;
    overlay.classList.add('open');
    setTimeout(() => {
      overlay.classList.remove('open');
      openWinDialog();
    }, 2200);
  } else {
    openWinDialog();
  }
}

function updateStreak() {
  log('[win] updateStreak()');
  const today = todayStr();
  if (streak.lastDate === today) { log('[win] updateStreak: already updated today'); return; }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth()+1).padStart(2,'0') + '-' + String(yesterday.getDate()).padStart(2,'0');

  if (streak.lastDate === yStr) {
    streak.count++;
    log('[win] streak continued', { newCount: streak.count });
  } else if (streak.lastDate !== today) {
    streak.count = 1;
    log('[win] new streak started');
  }
  streak.lastDate = today;
  saveStreak();

  loadBonus();
  if (!bonusChallenge._claimedMilestones) bonusChallenge._claimedMilestones = [];
  for (const m of STREAK_MILESTONES) {
    if (streak.count >= m.days && !bonusChallenge._claimedMilestones.includes(m.days)) {
      log('[win] streak milestone reached', { days: m.days, xp: m.xp });
      bonusChallenge._claimedMilestones.push(m.days);
      stats.totalXp = (stats.totalXp || 0) + m.xp;
      saveStats();
      saveBonus();
      showMilestoneRewardToast(m);
    }
  }
}

function showMilestoneRewardToast(m) {
  log('[win] showMilestoneRewardToast()', { label: m.label });
  if (m.days === 365) {
    if (!stats.achievements) stats.achievements = [];
    if (!stats.achievements.includes('yearStreak')) stats.achievements.push('yearStreak');
    saveStats();
  }
  const toast = document.getElementById('toast');
  if (!toast) { log('[win] WARN: #toast not found'); return; }
  toast.innerHTML =
    '<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid var(--xp-gold);border-radius:12px;padding:14px 20px;text-align:center;box-shadow:0 8px 32px rgba(251,191,36,0.3);">' +
    '<div style="font-size:28px;margin-bottom:4px;"><svg width="28" height="28" viewBox="0 0 24 24"><use href="#ico-party"/></svg></div>' +
    '<div style="font-size:15px;font-weight:800;color:var(--xp-gold);">' + m.label + '</div>' +
    '<div style="font-size:13px;color:#ccc;margin-top:2px;">+' + m.xp + ' XP Bonus!</div>' +
    '</div>';
  toast.classList.add('open');
  setTimeout(() => toast.classList.remove('open'), 3000);
}
