function rankSvgUrl(rankName) {
  const t = rankName.toLowerCase();
  if (t.includes('wood')) return 'assets/rank-wood.svg';
  if (t.includes('bronze')) return 'assets/rank-bronze.svg';
  if (t.includes('silver')) return 'assets/rank-silver.svg';
  if (t.includes('gold')) return 'assets/rank-gold.svg';
  if (t.includes('platinum')) return 'assets/rank-platinum.svg';
  if (t.includes('emerald')) return 'assets/rank-emerald.svg';
  if (t.includes('diamond')) return 'assets/rank-diamond.svg';
  if (t.includes('master')) return 'assets/rank-master.svg';
  if (t.includes('grandmaster')) return 'assets/rank-grandmaster.svg';
  if (t.includes('elite')) return 'assets/rank-elite.svg';
  return '';
}

function rankSvgImg(rankName, size) {
  const src = rankSvgUrl(rankName);
  if (!src) return '';
  return '<img src="' + src + '" width="' + size + '" height="' + size + '" class="rank-svg-icon" alt="' + rankName + '">';
}

function updateMenuUI() {
  const totalXp = stats.totalXp || 0;
  const rank = getRank(totalXp);
  const nextRank = getNextRank(totalXp);

  const levelBadge = document.getElementById('levelBadge');
  const existing = levelBadge.querySelector('.rank-svg-icon');
  if (existing) existing.remove();
  const imgHtml = rankSvgImg(rank.name, 18);
  if (imgHtml) {
    levelBadge.insertAdjacentHTML('afterbegin', imgHtml);
  }
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

  document.getElementById('totalGamesCount').textContent = stats.totalGames || 0;

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

function setupDialogs() {
  document.getElementById('levelBadge').addEventListener('click', showRankJourney);
  document.getElementById('xpBarWrap').addEventListener('click', showRankJourney);

  document.getElementById('streakBadge').addEventListener('click', showStreakJourney);

  document.getElementById('rankClose').addEventListener('click', () => document.getElementById('rankOverlay').classList.remove('open'));
  document.getElementById('rankOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('rankOverlay').classList.remove('open');
  });

  document.getElementById('streakClose').addEventListener('click', () => document.getElementById('streakOverlay').classList.remove('open'));
  document.getElementById('streakOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('streakOverlay').classList.remove('open');
  });
}

function showRankJourney() {
  const totalXp = stats.totalXp || 0;
  const rank = getRank(totalXp);
  const nextRank = getNextRank(totalXp);
  const rankIdx = RANKS.indexOf(rank);

  const iconEl = document.getElementById('rankCurrentIcon');
  iconEl.innerHTML = rankSvgImg(rank.name, 28);
  document.getElementById('rankCurrentName').textContent = rank.name;
  document.getElementById('rankCurrentXp').textContent = totalXp + ' XP';

  if (nextRank && nextRank.xp > rank.xp) {
    const progress = ((totalXp - rank.xp) / (nextRank.xp - rank.xp)) * 100;
    document.getElementById('rankProgressFill').style.width = Math.min(100, progress) + '%';
    document.getElementById('rankNextLabel').textContent = (nextRank.xp - totalXp) + ' XP to ' + nextRank.name;
  } else {
    document.getElementById('rankProgressFill').style.width = '100%';
    document.getElementById('rankNextLabel').textContent = 'MAX RANK';
  }

  const timeline = document.getElementById('rankTimeline');
  timeline.innerHTML = '';
  const start = Math.max(0, rankIdx - 5);
  const end = Math.min(RANKS.length - 1, rankIdx + 10);
  for (let i = start; i <= end; i++) {
    const r = RANKS[i];
    const entry = document.createElement('div');
    entry.className = 'rank-tl-entry';
    const dot = document.createElement('div');
    dot.className = 'rank-tl-dot';
    if (i <= rankIdx) {
      dot.innerHTML = rankSvgImg(r.name, 10);
    }
    entry.appendChild(dot);
    const name = document.createElement('span');
    name.className = 'rank-tl-name';
    name.textContent = r.name;
    entry.appendChild(name);
    const xp = document.createElement('span');
    xp.className = 'rank-tl-xp';
    xp.textContent = r.xp + ' XP';
    entry.appendChild(xp);
    if (i < rankIdx) entry.classList.add('passed');
    else if (i === rankIdx) entry.classList.add('current');
    else entry.classList.add('locked');
    timeline.appendChild(entry);
  }

  document.getElementById('rankTotalGames').textContent = stats.totalGames || 0;
  const hours = Math.floor((stats.totalTime || 0) / 3600);
  document.getElementById('rankTotalTime').textContent = hours + 'h';

  const diffs = ['easy', 'medium', 'hard', 'impossible'];
  let bestTime = Infinity;
  diffs.forEach(d => {
    const count = stats.gamesByDifficulty[d] || 0;
    document.getElementById('rank' + d.charAt(0).toUpperCase() + d.slice(1) + 'Games').textContent = count;
    if (stats.bestTimes[d] < bestTime) bestTime = stats.bestTimes[d];
  });
  document.getElementById('rankBestTime').textContent = bestTime < Infinity ? formatTime(bestTime) : '--';

  const earned = stats.achievements || [];
  const grid = document.getElementById('rankAchievements');
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const el = document.createElement('div');
    el.className = 'rank-achievement';
    const unlocked = earned.includes(a.id);
    if (unlocked) el.classList.add('unlocked');
    el.innerHTML = '<div class="rank-ach-icon"><svg width="18" height="18" viewBox="0 0 24 24"><use href="#' + a.icon + '"/></svg></div><div class="rank-ach-info"><div class="rank-ach-name">' + a.name + '</div><div class="rank-ach-desc">' + a.desc + '</div></div>';
    grid.appendChild(el);
  });

  document.getElementById('rankOverlay').classList.add('open');
}

function showStreakJourney() {
  const s = streak.count || 0;
  document.getElementById('streakBigCount').textContent = s;
  document.getElementById('streakBestCount').textContent = stats.bestStreak || s || 0;

  const done = isDailyDoneToday();
  const status = document.getElementById('streakDailyStatus');
  const icon = document.getElementById('streakDailyIcon');
  const text = document.getElementById('streakDailyText');
  if (done) {
    status.classList.add('done');
    icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24"><use href="#ico-check"/></svg>';
    text.textContent = 'Today\'s Daily Challenge completed!';
  } else {
    status.classList.remove('done');
    icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24"><use href="#ico-calendar"/></svg>';
    text.textContent = 'Complete today\'s Daily Challenge to continue your streak';
  }

  const cal = document.getElementById('streakCalendar');
  cal.innerHTML = '';
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  labels.forEach(l => {
    const lbl = document.createElement('div');
    lbl.className = 'streak-day-label';
    lbl.textContent = l;
    cal.appendChild(lbl);
  });

  const today = new Date();
  const todayStrVal = todayStr();
  const streakStart = streak.lastDate ? subtractDays(new Date(streak.lastDate), (streak.count || 1) - 1) : null;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayEl = document.createElement('div');
    dayEl.className = 'streak-day';
    dayEl.textContent = d.getDate();
    const dStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    if (dStr === todayStrVal) dayEl.classList.add('today');
    if (streak.lastDate && streakStart && dStr >= streakStart && dStr <= streak.lastDate) dayEl.classList.add('done');
    if (dStr === todayStrVal && done) dayEl.classList.add('done');
    cal.appendChild(dayEl);
  }

  document.getElementById('streakOverlay').classList.add('open');
}

function subtractDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
