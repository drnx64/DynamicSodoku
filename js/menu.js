function getStreakFire(count) {
  if (count >= 30) return { level: 5, icon: 'ico-fire6', color: '#ec4899' };
  if (count >= 20) return { level: 4, icon: 'ico-fire5', color: '#f59e0b' };
  if (count >= 15) return { level: 3, icon: 'ico-fire4', color: '#22c55e' };
  if (count >= 10) return { level: 2, icon: 'ico-fire3', color: '#8b5cf6' };
  if (count >= 5)  return { level: 1, icon: 'ico-fire2', color: '#3b82f6' };
  return { level: 0, icon: 'ico-fire', color: '#ef4444' };
}

function updateMenuUI() {
  log('[menu] updateMenuUI()');
  const totalXp = stats.totalXp || 0;
  const rank = getRank(totalXp);
  const nextRank = getNextRank(totalXp);

  const levelBadge = document.getElementById('levelBadge');
  if (!levelBadge) { log('[menu] WARN: #levelBadge not found'); return; }
  const existing = levelBadge.querySelector('.rank-svg-icon');
  if (existing) existing.remove();
  const imgHtml = rankSvgImg(rank.name, 18);
  if (imgHtml) {
    levelBadge.insertAdjacentHTML('afterbegin', imgHtml);
  }
  const levelName = document.getElementById('levelName');
  if (levelName) levelName.textContent = rank.name;
  const xpCurrent = document.getElementById('xpCurrent');
  if (xpCurrent) xpCurrent.textContent = totalXp + ' XP';

  if (stats._lastRankName && stats._lastRankName !== rank.name) {
    levelBadge.classList.add('ranked-up');
  } else {
    levelBadge.classList.remove('ranked-up');
  }

  if (nextRank && nextRank.xp > rank.xp) {
    const denom = nextRank.xp - rank.xp || 1;
    const progress = ((totalXp - rank.xp) / denom) * 100;
    const xpBarFill = document.getElementById('xpBarFill');
    if (xpBarFill) xpBarFill.style.width = Math.min(100, progress) + '%';
    const xpNext = document.getElementById('xpNext');
    if (xpNext) xpNext.textContent = nextRank.xp - totalXp + ' XP to ' + nextRank.name;
  } else {
    const xpBarFill = document.getElementById('xpBarFill');
    if (xpBarFill) xpBarFill.style.width = '100%';
    const xpNext = document.getElementById('xpNext');
    if (xpNext) xpNext.textContent = 'MAX LEVEL';
  }

  const s = streak.count || 0;
  const streakBadge = document.getElementById('streakBadge');
  if (streakBadge) {
    const sc = document.getElementById('streakCount');
    if (sc) sc.textContent = s;
    streakBadge.classList.toggle('zero', s === 0);
    const fire = getStreakFire(s);
    streakBadge.className = 'streak-badge' + (s === 0 ? ' zero' : '') + ' level-' + fire.level;
    const use = streakBadge.querySelector('svg use');
    if (use) use.setAttribute('href', '#' + fire.icon);
  }

  const freezeBadge = document.getElementById('streakFreezeBadge');
  if (freezeBadge) {
    const fz = getStreakFreezes();
    const fzCount = document.getElementById('streakFreezeBadgeCount');
    if (fzCount) fzCount.textContent = fz;
    freezeBadge.style.display = fz > 0 ? 'inline-flex' : 'none';
  }

  const totalGamesCount = document.getElementById('totalGamesCount');
  if (totalGamesCount) totalGamesCount.textContent = stats.totalGames || 0;

  const dailyDone = isDailyDoneToday();
  const dailyCard = document.getElementById('dailyCard');
  const dailySub = document.getElementById('dailySub');
  if (dailyCard && dailySub) {
    if (dailyDone) {
      dailyCard.classList.add('daily-completed');
      dailySub.textContent = '\u2705 Completed today!';
    } else {
      dailyCard.classList.remove('daily-completed');
      dailySub.textContent = 'Complete today\'s puzzle for a bonus';
    }
  }

  const earned = stats.achievements || [];
  const achieveSub = document.getElementById('achieveSub');
  if (achieveSub) {
    const newCount = (stats._newAchievements || []).length;
    achieveSub.textContent = earned.length + ' / ' + ACHIEVEMENTS.length + ' unlocked' + (newCount > 0 ? '  \u2714 +' + newCount + ' new!' : '');
  }
  const bonusCircle = document.getElementById('bonusCircle');
  if (bonusCircle) {
    loadBonus();
    const ready = isBonusChallengeActive() && (bonusChallenge.gamesPlayed || 0) >= 10;
    bonusCircle.classList.toggle('claimable', ready);
  }

  loadDailyTasks();
  loadDailyClaim();

  const continueCard = document.getElementById('continueCard');
  const continueSub = document.getElementById('continueSub');
  if (continueCard) {
    const saved = hasSavedGame();
    if (saved) {
      continueCard.style.display = '';
      const diff = saved.difficulty || 'easy';
      const timer = saved.timer || 0;
      if (saved.isChallenge) {
        if (continueSub) continueSub.textContent = 'Resume Challenge \u2022 ' + formatTime(timer);
      } else if (continueSub) continueSub.textContent = 'Resume ' + capitalize(diff) + ' game \u2022 ' + formatTime(timer);
    } else {
      continueCard.style.display = 'none';
    }
  }
  log('[menu] updateMenuUI complete', { rank: rank.name, xp: totalXp, streak: s });
  showPendingTaskNotifications();
}

function showDailyTasks() {
  log('[menu] showDailyTasks()');
  loadDailyTasks();
  const list = document.getElementById('dailyTasksList');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < dailyTasks.tasks.length; i++) {
    const t = dailyTasks.tasks[i];
    const done = dailyTasks.completed.includes(i);
    const claimed = dailyTasks._claimedNotifications && dailyTasks._claimedNotifications.includes(i);
    const card = document.createElement('div');
    card.className = 'daily-task-item' + (done ? ' done' : '');
    const rewardParts = [];
    if (t.reward.hints) rewardParts.push(t.reward.hints + ' hints');
    if (t.reward.xp) rewardParts.push(t.reward.xp + ' XP');
    if (t.reward.autoUse) rewardParts.push(t.reward.autoUse + ' auto');
    const progress = done ? 100 : 0;
    card.innerHTML =
      '<div class="daily-task-icon">' + (done ? '<svg width="20" height="20" viewBox="0 0 24 24"><use href="#ico-check"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24"><use href="#ico-sparkle"/></svg>') + '</div>' +
      '<div class="daily-task-info">' +
        '<div class="daily-task-desc">' + t.desc + '</div>' +
        '<div class="daily-task-progress-wrap"><div class="daily-task-progress-bar" style="width:' + progress + '%"></div></div>' +
        '<div class="daily-task-reward">+' + rewardParts.join(' + ') + '</div>' +
      '</div>' +
      '<button class="daily-task-claim-btn"' + (done && !claimed ? '' : ' disabled') + ' data-idx="' + i + '">' + (done && !claimed ? 'Claim' : (claimed ? 'Done' : '--')) + '</button>';
    list.appendChild(card);
  }
  list.querySelectorAll('.daily-task-claim-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (!dailyTasks._claimedNotifications) dailyTasks._claimedNotifications = [];
      if (!dailyTasks._claimedNotifications.includes(idx)) {
        dailyTasks._claimedNotifications.push(idx);
        saveDailyTasks();
      }
      btn.disabled = true;
      btn.textContent = 'Done';
      showToast('Reward claimed!');
    });
  });
  document.getElementById('dailyTasksOverlay').classList.add('open');
}

function showPendingTaskNotifications() {
  if (!dailyTasks._pendingNotifications || dailyTasks._pendingNotifications.length === 0) return;
  const pending = [...dailyTasks._pendingNotifications];
  dailyTasks._pendingNotifications = [];
  saveDailyTasks();
  loadDailyTasks();
  const overlay = document.getElementById('dailyTasksOverlay');
  if (!overlay) return;
  const list = document.getElementById('dailyTasksList');
  if (!list) return;
  list.innerHTML = '';
  for (const idx of pending) {
    const t = dailyTasks.tasks[idx];
    if (!t) continue;
    const rewardParts = [];
    if (t.reward.hints) rewardParts.push(t.reward.hints + ' hints');
    if (t.reward.xp) rewardParts.push(t.reward.xp + ' XP');
    if (t.reward.autoUse) rewardParts.push(t.reward.autoUse + ' auto');
    const card = document.createElement('div');
    card.className = 'daily-task-item done';
    card.innerHTML =
      '<div class="daily-task-icon"><svg width="20" height="20" viewBox="0 0 24 24"><use href="#ico-check"/></svg></div>' +
      '<div class="daily-task-info">' +
        '<div class="daily-task-desc">' + t.desc + '</div>' +
        '<div class="daily-task-progress-wrap"><div class="daily-task-progress-bar" style="width:100%"></div></div>' +
        '<div class="daily-task-reward">+' + rewardParts.join(' + ') + ' earned!</div>' +
      '</div>' +
      '<button class="daily-task-claim-btn" data-idx="' + idx + '">Claim</button>';
    list.appendChild(card);
  }
  list.querySelectorAll('.daily-task-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      btn.disabled = true;
      btn.textContent = 'Done';
      showToast('Reward claimed!');
    });
  });
  overlay.classList.add('open');
  overlay.onclick = (e) => {
    if (e.target === e.currentTarget) overlay.classList.remove('open');
  };
}

function showDailyToast() {
  log('[menu] showDailyToast()');
  const toast = document.getElementById('dailyToast');
  if (!toast) { log('[menu] WARN: #dailyToast not found'); return; }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function showStats() {
  log('[menu] showStats()');
  const content = document.getElementById('statsContent');
  if (!content) { log('[menu] WARN: #statsContent not found'); return; }
  content.innerHTML = '';

  const total = stats.totalGames || 0;
  const totalTime = stats.totalTime || 0;
  const totalXp = stats.totalXp || 0;
  const bestStreak = stats.bestStreak || 0;
  const totalMistakes = stats.totalMistakes || 0;
  const avgTime = total > 0 ? Math.round(totalTime / total) : 0;
  const highestLevel = stats.highestLevel || 1;
  const rank = getRank(totalXp);
  const joined = stats.firstGameDate || '--';
  const bestTime = getBestTime();

  const hero = document.createElement('div');
  hero.className = 'stats-hero';
  hero.innerHTML =
    '<div class="stats-hero-rank">' + rankSvgImg(rank.name, 44) + '</div>'
    + '<div class="stats-hero-info">'
    +   '<div class="stats-hero-rank-name">' + rank.name + '</div>'
    +   '<div class="stats-hero-xp">' + totalXp.toLocaleString() + ' XP</div>'
    +   '<div class="stats-hero-joined">Joined ' + joined + '</div>'
    + '</div>'
    + '<div class="stats-hero-meta">'
    +   '<div class="stats-hero-meta-item"><strong>' + total + '</strong><span>Solved</span></div>'
    +   '<div class="stats-hero-meta-item"><strong>Lv ' + highestLevel + '</strong><span>Highest</span></div>'
    + '</div>';
  content.appendChild(hero);

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  const cards = [
    { icon: 'ico-trophy', label: 'Puzzles Solved', value: String(total) },
    { icon: 'ico-clock', label: 'Avg Time', value: formatTime(avgTime) },
    { icon: 'ico-bolt', label: 'Best Time', value: bestTime > 0 ? formatTime(bestTime) : '--' },
    { icon: 'ico-fire', label: 'Best Streak', value: String(bestStreak) },
    { icon: 'ico-warning', label: 'Mistakes', value: String(totalMistakes) },
    { icon: 'ico-target', label: 'Highest Level', value: String(highestLevel) },
  ];
  cards.forEach(c => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = '<div class="stat-icon"><svg width="18" height="18" viewBox="0 0 24 24"><use href="#' + c.icon + '"/></svg></div>'
      + '<div class="stat-value">' + c.value + '</div>'
      + '<div class="stat-label">' + c.label + '</div>';
    grid.appendChild(card);
  });
  content.appendChild(grid);

  const diffTitle = document.createElement('div');
  diffTitle.className = 'stats-section-title';
  diffTitle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24"><use href="#ico-bar-chart"/></svg> By Difficulty';
  content.appendChild(diffTitle);

  const barChart = document.createElement('div');
  barChart.className = 'stats-bar-chart';
  const diffs = [
    { key: 'easy', label: 'Easy', color: '#16a34a' },
    { key: 'medium', label: 'Medium', color: '#f59e0b' },
    { key: 'hard', label: 'Hard', color: '#dc2626' },
    { key: 'impossible', label: 'Impossible', color: '#8b5cf6' },
  ];
  const maxCount = Math.max(1, ...diffs.map(d => stats.gamesByDifficulty[d.key] || 0));
  diffs.forEach(d => {
    const count = stats.gamesByDifficulty[d.key] || 0;
    const pct = (count / maxCount) * 100;
    const row = document.createElement('div');
    row.className = 'stats-bar-row';
    row.innerHTML = '<div class="stats-bar-label"><span class="dot" style="background:' + d.color + '"></span>' + d.label + '</div>'
      + '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + Math.max(8, pct) + '%;background:' + d.color + '"></div></div>'
      + '<div class="stats-bar-count">' + count + '</div>';
    barChart.appendChild(row);
  });
  content.appendChild(barChart);

  const timeTitle = document.createElement('div');
  timeTitle.className = 'stats-section-title';
  timeTitle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24"><use href="#ico-clock"/></svg> Best Times';
  content.appendChild(timeTitle);
  const timeGrid = document.createElement('div');
  timeGrid.className = 'stats-grid';
  diffs.forEach(d => {
    const t = (stats.bestTimes || {})[d.key];
    timeGrid.innerHTML += '<div class="stat-card"><div class="stat-icon"><span class="dot" style="background:' + d.color + '"></span></div><div class="stat-value">' + (t < Infinity ? formatTime(t) : '--') + '</div><div class="stat-label">' + d.label + '</div></div>';
  });
  content.appendChild(timeGrid);

  showPage('page-stats');
}

function showDailyArchive() {
  log('[menu] showDailyArchive()');
  const content = document.getElementById('archiveContent');
  if (!content) { log('[menu] WARN: #archiveContent not found'); return; }
  content.innerHTML = '';

  const archive = stats.dailyArchive || [];
  const today = new Date();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date(today);
  const past = new Date(today);
  past.setDate(past.getDate() - 29);

  const months = [];
  let d = new Date(past);
  while (d <= now) {
    const key = d.getFullYear() + '-' + d.getMonth();
    if (!months.includes(key)) months.push(key);
    d.setDate(d.getDate() + 1);
  }

  months.reverse();
  for (const key of months) {
    const [y, m] = key.split('-').map(Number);
    const first = new Date(y, m, 1);
    const monthLabel = first.toLocaleString('default', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();

    const label = document.createElement('div');
    label.className = 'archive-month-label';
    label.textContent = monthLabel;
    content.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'archive-grid';

    dayNames.forEach(n => {
      const el = document.createElement('div');
      el.className = 'streak-day-label';
      el.textContent = n;
      grid.appendChild(el);
    });

    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'archive-day empty';
      grid.appendChild(el);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const dateObj = new Date(y, m, day);
      const isToday = dateStr === todayStr();
      const completed = archive.includes(dateStr);
      const inRange = dateObj >= past && dateObj <= now;
      const el = document.createElement('div');
      el.className = 'archive-day' + (completed ? ' completed' : '') + (isToday ? ' today' : '');
      el.textContent = day;
      if (inRange) {
        el.dataset.date = dateStr;
        el.classList.add('clickable');
        el.title = isToday ? 'Today\'s puzzle' : 'Play ' + dateStr;
        el.addEventListener('click', () => {
          if (state.started && !state.won && !state.gameOver) {
            if (!confirm('You have a game in progress. Start this archived puzzle instead?')) return;
          }
          clearGame();
          initNewGame('medium', true, 1, dateStr);
        });
      } else {
        el.style.opacity = '0.25';
      }
      grid.appendChild(el);
    }

    content.appendChild(grid);
  }

  const totalDays = archive.length;
  const sumEl = document.createElement('div');
  sumEl.style.cssText = 'text-align:center;padding:16px;font-size:13px;color:var(--text-muted);';
  sumEl.textContent = 'Total daily puzzles completed: ' + totalDays;
  content.appendChild(sumEl);

  showPage('page-daily-archive');
}

function setupDialogs() {
  log('[menu] setupDialogs()');
  const levelBadge = document.getElementById('levelBadge');
  if (levelBadge) levelBadge.addEventListener('click', () => { log('[menu] click: levelBadge'); showRankJourney(); });
  const xpBarWrap = document.getElementById('xpBarWrap');
  if (xpBarWrap) xpBarWrap.addEventListener('click', () => { log('[menu] click: xpBarWrap'); showRankJourney(); });
  const streakBadge = document.getElementById('streakBadge');
  if (streakBadge) streakBadge.addEventListener('click', () => { log('[menu] click: streakBadge'); showStreakJourney(); });
  const freezeBadge = document.getElementById('streakFreezeBadge');
  if (freezeBadge) freezeBadge.addEventListener('click', () => { log('[menu] click: streakFreezeBadge'); showStreakJourney(); });
  const continueCard = document.getElementById('continueCard');
  if (continueCard) continueCard.addEventListener('click', () => {
    log('[menu] click: continueCard');
    if (loadGame()) {
      state.isDaily = false;
      state.gameMode = state.isChallenge ? 'challenge' : 'normal';
      document.getElementById('gameLabel').textContent = state.isChallenge ? 'Challenge' : (state.difficulty === 'custom' ? 'Custom' : capitalize(state.difficulty));
      document.getElementById('winOverlay').classList.remove('open');
      const gameBadge = document.getElementById('gameLevelBadge');
      if (gameBadge) gameBadge.style.display = state.isChallenge ? 'none' : 'inline-flex';
      const numBadge = document.getElementById('gameLevelNum');
      if (numBadge) numBadge.textContent = state.currentLevel;
      updateUndoRedo();
      requestRender({ entering: true });
      if (state.timer > 0 && !state.won && !state.gameOver) startTimer();
      showPage('page-game');
    }
  });

  const achieveCard = document.getElementById('achieveCard');
  if (achieveCard) achieveCard.addEventListener('click', () => { log('[menu] click: achieveCard'); showAchievements(); });
  const statsCard = document.getElementById('statsCard');
  if (statsCard) statsCard.addEventListener('click', () => { log('[menu] click: statsCard'); showStats(); });
  const dailyTasksClose = document.getElementById('dailyTasksClose');
  if (dailyTasksClose) dailyTasksClose.addEventListener('click', () => { document.getElementById('dailyTasksOverlay').classList.remove('open'); });
  document.getElementById('dailyTasksOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('dailyTasksOverlay').classList.remove('open');
  });

  const bonusCircle = document.getElementById('bonusCircle');
  if (bonusCircle) bonusCircle.addEventListener('click', () => { log('[menu] click: bonusCircle'); loadBonus(); showBonusModal(); });
  const bonusClose = document.getElementById('bonusClose');
  if (bonusClose) bonusClose.addEventListener('click', () => { log('[menu] click: bonusClose'); document.getElementById('bonusOverlay').classList.remove('open'); });
  document.getElementById('bonusOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('bonusOverlay').classList.remove('open');
  });
  const bonusClaimBtn = document.getElementById('bonusModalClaimBtn');
  if (bonusClaimBtn) bonusClaimBtn.addEventListener('click', () => { log('[menu] click: bonusModalClaimBtn'); claimBonusReward(); showBonusModal(); });

  const rankClose = document.getElementById('rankClose');
  if (rankClose) {
    rankClose.addEventListener('click', () => { log('[menu] click: rankClose'); document.getElementById('rankOverlay').classList.remove('open'); });
  }
  document.getElementById('rankOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('rankOverlay').classList.remove('open');
  });

  const streakClose = document.getElementById('streakClose');
  if (streakClose) {
    streakClose.addEventListener('click', () => { log('[menu] click: streakClose'); document.getElementById('streakOverlay').classList.remove('open'); });
  }
  document.getElementById('streakOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('streakOverlay').classList.remove('open');
  });

  const streakFreezeBuy = document.getElementById('streakFreezeBuy');
  if (streakFreezeBuy) {
    streakFreezeBuy.addEventListener('click', () => {
      log('[menu] click: streakFreezeBuy');
      const cost = 75;
      if ((stats.totalXp || 0) < cost) {
        showToast('Not enough XP!');
        return;
      }
      stats.totalXp -= cost;
      saveStats();
      grantStreakFreeze(1);
      const freezeCountEl = document.getElementById('streakFreezeCount');
      if (freezeCountEl) freezeCountEl.textContent = getStreakFreezes();
      showToast('Streak freeze purchased!');
      playSound('place');
    });
  }

  document.querySelectorAll('.achieve-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      log('[menu] click: achieve-tab', { filter: tab.dataset.filter });
      document.querySelectorAll('.achieve-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showAchievements();
    });
  });

  document.querySelectorAll('.achieve-cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      log('[menu] click: achieve-cat-tab', { cat: tab.dataset.cat });
      document.querySelectorAll('.achieve-cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showAchievements();
    });
  });
}

function showRankJourney() {
  log('[menu] showRankJourney()');
  const totalXp = stats.totalXp || 0;
  const rank = getRank(totalXp);
  const nextRank = getNextRank(totalXp);
  const rankIdx = getRankIndex(rank);
  const allRanks = getFixedRanksWithNextFew(8);

  const iconEl = document.getElementById('rankCurrentIcon');
  if (!iconEl) { log('[menu] WARN: #rankCurrentIcon not found'); return; }
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
  if (!timeline) { log('[menu] WARN: #rankTimeline not found'); return; }
  timeline.innerHTML = '';
  const count = allRanks.length;
  const gapY = 56, marginL = 60, marginR = 60;
  const wrapW = 280;
  const leftX = marginL, rightX = wrapW - marginR;
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const x = i % 2 === 0 ? leftX : rightX;
    const y = count * gapY - i * gapY;
    nodes.push({ x, y, idx: i });
  }

  const wrap = document.createElement('div');
  wrap.className = 'rank-tl-svg-wrap';

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i], b = nodes[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const line = document.createElement('div');
    line.className = 'rank-tl-line';
    line.style.cssText = 'position:absolute;left:' + a.x + 'px;top:' + a.y + 'px;width:' + len + 'px;height:3px;transform-origin:0 50%;transform:rotate(' + angle + 'deg);border-radius:2px;';
    if (nodes[i + 1].idx <= rankIdx) {
      line.style.background = 'var(--success)';
    } else if (nodes[i].idx < rankIdx && nodes[i + 1].idx > rankIdx) {
      line.style.background = 'linear-gradient(90deg, var(--success) 50%, var(--border) 50%)';
    } else {
      line.style.background = 'var(--border)';
      line.style.height = '2px';
      line.style.borderTop = '2px dashed var(--border)';
      line.style.background = 'transparent';
    }
    wrap.appendChild(line);
  }

  for (const p of nodes) {
    const r = allRanks[p.idx];
    const node = document.createElement('div');
    node.className = 'rank-tl-node';
    if (p.idx < rankIdx) node.classList.add('passed');
    else if (p.idx === rankIdx) node.classList.add('current');
    else node.classList.add('locked');
    node.style.left = p.x + 'px';
    node.style.top = p.y + 'px';

    const dot = document.createElement('div');
    dot.className = 'rank-tl-dot';
    if (p.idx <= rankIdx) {
      dot.innerHTML = rankSvgImg(r.name, 12);
    }
    node.appendChild(dot);

    const name = document.createElement('div');
    name.className = 'rank-tl-name';
    name.innerHTML = rankSvgImg(r.name, 10) + ' ' + r.name;
    node.appendChild(name);

    const xp = document.createElement('div');
    xp.className = 'rank-tl-xp';
    xp.textContent = r.xp + ' XP';
    node.appendChild(xp);

    wrap.appendChild(node);
  }

  wrap.style.height = (count * gapY + 30) + 'px';
  timeline.appendChild(wrap);

  const currentEl = wrap.querySelector('.rank-tl-node.current');
  if (currentEl) {
    setTimeout(() => {
      currentEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
  }

  const rankTotalGames = document.getElementById('rankTotalGames');
  if (rankTotalGames) rankTotalGames.textContent = stats.totalGames || 0;
  const rankTotalTime = document.getElementById('rankTotalTime');
  if (rankTotalTime) {
    const hours = Math.floor((stats.totalTime || 0) / 3600);
    rankTotalTime.textContent = hours + 'h';
  }

  const diffs = ['easy', 'medium', 'hard', 'impossible'];
  let bestTime = Infinity;
  diffs.forEach(d => {
    const count = stats.gamesByDifficulty[d] || 0;
    const el = document.getElementById('rank' + d.charAt(0).toUpperCase() + d.slice(1) + 'Games');
    if (el) el.textContent = count;
    if (stats.bestTimes[d] < bestTime) bestTime = stats.bestTimes[d];
  });
  const rankBestTime = document.getElementById('rankBestTime');
  if (rankBestTime) rankBestTime.textContent = bestTime < Infinity ? formatTime(bestTime) : '--';

  document.getElementById('rankOverlay').classList.add('open');
}

function showAchievements() {
  log('[menu] showAchievements()');
  const earned = stats.achievements || [];
  const newAchievements = stats._newAchievements || [];
  const filter = document.querySelector('#achieveFilterTabs .achieve-tab.active')?.dataset?.filter || 'all';
  const catFilter = document.querySelector('#achieveCatTabs .achieve-cat-tab.active')?.dataset?.cat || 'all';
  const grid = document.getElementById('achieveGrid');
  if (!grid) { log('[menu] WARN: #achieveGrid not found'); return; }
  grid.innerHTML = '';

  const achieveCount = document.getElementById('achieveCount');
  if (achieveCount) achieveCount.textContent = earned.length + '/' + ACHIEVEMENTS.length;

  const overview = document.createElement('div');
  overview.className = 'achieve-overview';
  const ovPct = ACHIEVEMENTS.length > 0 ? Math.round((earned.length / ACHIEVEMENTS.length) * 100) : 0;
  overview.innerHTML = '<div class="achieve-overview-info"><strong>' + earned.length + ' / ' + ACHIEVEMENTS.length + '</strong><span>Unlocked</span></div>'
    + '<div class="achieve-overview-track"><div class="achieve-overview-fill" style="width:' + ovPct + '%"></div></div>'
    + '<div class="achieve-overview-pct">' + ovPct + '%</div>';
  grid.appendChild(overview);

  let filtered = ACHIEVEMENTS;
  if (catFilter !== 'all') {
    filtered = filtered.filter(a => a.cat === catFilter);
  }
  if (filter === 'unlocked') filtered = filtered.filter(a => earned.includes(a.id));
  else if (filter === 'locked') filtered = filtered.filter(a => !earned.includes(a.id));
  else {
    const unlocked = filtered.filter(a => earned.includes(a.id));
    const locked = filtered.filter(a => !earned.includes(a.id));
    filtered = [...unlocked, ...locked];
  }

  log('[menu] showAchievements: filtered count', { total: ACHIEVEMENTS.length, filtered: filtered.length, filter, catFilter });

  const catOrder = ['progress', 'speed', 'flawless', 'nohints', 'comeback', 'streak', 'impossible', 'daily', 'misc'];
  const catNames = { progress: 'Progress', speed: 'Speed', flawless: 'Flawless', nohints: 'No Hints', comeback: 'Comeback', streak: 'Streak', impossible: 'Impossible', daily: 'Daily', misc: 'Misc' };
  const catIcons = { progress: 'ico-trophy', speed: 'ico-bolt', flawless: 'ico-star', nohints: 'ico-lightbulb', comeback: 'ico-shield', streak: 'ico-fire', impossible: 'ico-diamond', daily: 'ico-calendar', misc: 'ico-award' };

  const grouped = {};
  for (const a of filtered) {
    const cat = a.cat || 'misc';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  }

  let flatOrdered = [];
  for (const catId of catOrder) {
    if (grouped[catId]) {
      if (flatOrdered.length > 0) flatOrdered.push(null);
      flatOrdered = flatOrdered.concat(grouped[catId]);
    }
  }
  for (const catId of Object.keys(grouped)) {
    if (!catOrder.includes(catId)) {
      if (flatOrdered.length > 0) flatOrdered.push(null);
      flatOrdered = flatOrdered.concat(grouped[catId]);
    }
  }

  let currentGroupCat = null;
  for (const a of flatOrdered) {
    if (a === null) { currentGroupCat = null; continue; }
    const cat = a.cat || 'misc';
    if (cat !== currentGroupCat && catFilter === 'all') {
      currentGroupCat = cat;
      const header = document.createElement('div');
      header.className = 'achieve-cat-header';
      header.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><use href="#' + (catIcons[cat] || 'ico-award') + '"/></svg> ' + (catNames[cat] || cat);
      grid.appendChild(header);
    }
    const unlocked = earned.includes(a.id);
    const isNew = newAchievements.includes(a.id);
    const card = document.createElement('div');
    card.className = 'achieve-card' + (unlocked ? ' unlocked' : '') + (isNew ? ' achieve-new' : '');
    card.dataset.cat = cat;
    const progress = getAchievementProgress(a.id);
    let progressHtml = '';
    if (progress && !unlocked) {
      const pct = Math.min(100, (progress.current / progress.max * 100));
      progressHtml = '<div class="achieve-progress"><div class="achieve-progress-fill" style="width:' + pct + '%"></div></div><div class="achieve-progress-label">' + progress.current + '/' + progress.max + '</div>';
    }
    const newBadge = isNew ? '<span class="achieve-new-badge">NEW</span>' : '';
    const statusIcon = unlocked
      ? '<svg width="16" height="16" viewBox="0 0 24 24"><use href="#ico-check"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24"><use href="#ico-circle"/></svg>';
    card.innerHTML = '<div class="achieve-icon"><svg width="22" height="22" viewBox="0 0 24 24"><use href="#' + a.icon + '"/></svg></div>'
      + '<div class="achieve-info"><div class="achieve-name">' + a.name + newBadge + '</div><div class="achieve-desc">' + a.desc + '</div>' + progressHtml + '</div>'
      + '<div class="achieve-status">' + statusIcon + '</div>';
    grid.appendChild(card);
  }

  showPage('page-achievements');

  const catScroll = document.getElementById('achieveCatTabs');
  if (catScroll) catScroll.scrollLeft = 0;

  const filterTabs = document.getElementById('achieveFilterTabs');
  if (filterTabs) filterTabs.scrollLeft = 0;

  if (newAchievements.length > 0) {
    clearNewAchievements();
    updateMenuUI();
  }

  log('[menu] achievements page shown');
}

function formatDate(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function showBonusModal() {
  log('[menu] showBonusModal()');
  const overlay = document.getElementById('bonusOverlay');
  const timerEl = document.getElementById('bonusTimer');
  const countEl = document.getElementById('bonusCount');
  const fillEl = document.getElementById('bonusProgressFill');
  const claimBtn = document.getElementById('bonusModalClaimBtn');
  const statusEl = document.getElementById('bonusStatus');
  if (!overlay) return;

  const played = bonusChallenge.gamesPlayed || 0;
  const pct = Math.min(100, (played / 10) * 100);
  countEl.textContent = played + ' / 10';
  countEl.className = 'bonus-count' + (played >= 10 ? ' done' : '');
  fillEl.style.width = pct + '%';

  const dateInfoEl = document.getElementById('bonusDateInfo') || (() => {
    const el = document.createElement('div');
    el.id = 'bonusDateInfo';
    el.style.cssText = 'font-size:11px;color:var(--text-muted);margin:4px 0 8px;text-align:center;';
    timerEl.parentNode.insertBefore(el, timerEl.nextSibling);
    return el;
  })();

  if (bonusChallenge.claimed) {
    timerEl.textContent = 'Reward claimed!';
    timerEl.className = 'bonus-timer';
    claimBtn.disabled = true;
    const hints = bonusChallenge.bonusHints || 0;
    statusEl.textContent = 'You earned +3 bonus hints! (' + hints + ' remaining)';
    dateInfoEl.textContent = 'Started ' + formatDate(bonusChallenge.startDate) + ' \u2022 Ended ' + formatDate(new Date(new Date(bonusChallenge.startDate).getTime() + 7*86400000).toISOString());
    overlay.classList.add('open');
    return;
  }

  if (!bonusChallenge.startDate) {
    timerEl.textContent = 'Challenge starts on your first visit!';
    timerEl.className = 'bonus-timer';
    claimBtn.disabled = true;
    statusEl.textContent = '';
    dateInfoEl.textContent = '';
    overlay.classList.add('open');
    return;
  }

  const hoursLeft = getBonusHoursLeft();
  const startDate = formatDate(bonusChallenge.startDate);
  const endDate = formatDate(new Date(new Date(bonusChallenge.startDate).getTime() + 7*86400000).toISOString());
  dateInfoEl.textContent = startDate + ' \u2192 ' + endDate;

  if (hoursLeft <= 0) {
    timerEl.textContent = 'Challenge expired!';
    timerEl.className = 'bonus-timer expired';
    claimBtn.disabled = true;
    statusEl.textContent = played >= 10 ? 'You completed the challenge but didn\'t claim in time' : 'Play 10 games within 7 days to earn the reward';
    overlay.classList.add('open');
    return;
  }

  const days = Math.floor(hoursLeft / 24);
  const hours = hoursLeft % 24;
  timerEl.textContent = days + 'd ' + hours + 'h remaining';
  timerEl.className = 'bonus-timer';

  if (played >= 10) {
    claimBtn.disabled = false;
    statusEl.textContent = 'Ready! Claim your reward!';
  } else {
    claimBtn.disabled = true;
    statusEl.textContent = played + ' / 10 games played';
  }
  overlay.classList.add('open');
}

function showStreakJourney() {
  log('[menu] showStreakJourney()');
  const s = streak.count || 0;
  document.getElementById('streakBigCount').textContent = s;
  document.getElementById('streakBestCount').textContent = stats.bestStreak || s || 0;

  const freezeCountEl = document.getElementById('streakFreezeCount');
  if (freezeCountEl) freezeCountEl.textContent = getStreakFreezes();

  const fire = getStreakFire(s);
  const wrap = document.getElementById('streakFireWrap');
  if (!wrap) { log('[menu] WARN: #streakFireWrap not found'); return; }
  const wrapUse = wrap.querySelector('svg use');
  if (wrapUse) wrapUse.setAttribute('href', '#' + fire.icon);
  wrap.className = 'streak-fire-wrap level-' + fire.level;
  document.getElementById('streakHeaderFire').style.color = fire.color;
  document.getElementById('streakOverlay').style.setProperty('--streak-color', fire.color);

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
  if (!cal) { log('[menu] WARN: #streakCalendar not found'); return; }
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

function showStatsCard() {
  const totalXp = stats.totalXp || 0;
  const rank = getRank(totalXp);
  const cardHtml = '<div class="stat-card-share">' +
    '<div class="stat-card-header">' +
      '<div class="stat-card-rank-icon">' + rankSvgImg(rank.name, 48) + '</div>' +
      '<div class="stat-card-title">Ascendoku Stats</div>' +
      '<div class="stat-card-rank">' + rank.name + '</div>' +
    '</div>' +
    '<div class="stat-card-body">' +
      '<div class="stat-card-row"><span class="stat-label">XP</span><span class="stat-value">' + totalXp + '</span></div>' +
      '<div class="stat-card-row"><span class="stat-label">Puzzles Solved</span><span class="stat-value">' + (stats.totalGames || 0) + '</span></div>' +
      '<div class="stat-card-row"><span class="stat-label">Best Time</span><span class="stat-value">' + formatTime(getBestTime()) + '</span></div>' +
      '<div class="stat-card-row"><span class="stat-label">Total Mistakes</span><span class="stat-value">' + (stats.totalMistakes || 0) + '</span></div>' +
      '<div class="stat-card-row"><span class="stat-label">Hints Used</span><span class="stat-value">' + (stats.totalHintsUsedAll || 0) + '</span></div>' +
      '<div class="stat-card-row"><span class="stat-label">Streak</span><span class="stat-value">' + (streak.count || 0) + ' days</span></div>' +
    '</div>' +
    '<div class="stat-card-footer">Play at: ' + window.location.href.split('?')[0] + '</div>' +
  '</div>';

  const overlay = document.getElementById('statsCardOverlay');
  if (!overlay) return;
  const content = document.getElementById('statsCardContent');
  if (content) content.innerHTML = cardHtml;
  overlay.classList.add('open');
}

function getBestTime() {
  const times = Object.values(stats.bestTimes || {}).filter(t => t && t < 999999);
  return times.length > 0 ? Math.min(...times) : 0;
}
