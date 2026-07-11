// ============================================================
// 13. Menu UI Update
// ============================================================
function updateMenuUI() {
  const totalXp = stats.totalXp || 0;
  const rank = getRank(totalXp);
  const nextRank = getNextRank(totalXp);

  document.getElementById('levelName').textContent = rank.name;
  document.getElementById('xpCurrent').textContent = totalXp + ' XP';

  if (nextRank && nextRank.xp > rank.xp) {
    const progress = ((totalXp - rank.xp) / (nextRank.xp - rank.xp)) * 100;
    document.getElementById('xpBarFill').style.width = Math.min(100, progress) + '%';
    document.getElementById('xpNext').textContent = nextRank.xp - totalXp + ' XP to ' + nextRank.name;
  } else {
    document.getElementById('xpBarFill').style.width = '100%';
    document.getElementById('xpNext').textContent = 'MAX LEVEL';
  }

  const s = streak.count || 0;
  const badge = document.getElementById('streakBadge');
  document.getElementById('streakCount').textContent = s;
  badge.classList.toggle('zero', s === 0);

  document.getElementById('totalGames').textContent = (stats.totalGames || 0) + ' puzzles solved';

  const dailyDone = isDailyDoneToday();
  const dailyCard = document.getElementById('dailyCard');
  const dailySub = document.getElementById('dailySub');
  if (dailyDone) {
    dailyCard.classList.add('daily-completed');
    dailySub.textContent = '\u2705 Completed today!';
  } else {
    dailyCard.classList.remove('daily-completed');
    dailySub.textContent = 'Complete today\'s puzzle for a bonus';
  }
}

function showDailyToast() {
  const toast = document.getElementById('dailyToast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

