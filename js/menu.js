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

  // Daily bonus card
  const bonusCard = document.getElementById('bonusCard');
  const bonusSub = document.getElementById('bonusSub');
  const claimBtn = document.getElementById('bonusClaimBtn');
  loadBonus();
  if (canClaimBonus()) {
    bonusCard.style.display = 'flex';
    bonusSub.textContent = 'Claim 10 bonus games with +3 hints each!';
    claimBtn.style.display = 'block';
    claimBtn.onclick = () => {
      if (claimBonus()) {
        claimBtn.style.display = 'none';
        bonusSub.textContent = '10 bonus games claimed today!';
        updateMenuUI();
      }
    };
  } else if (dailyBonus.lastClaimDate === todayStr() && dailyBonus.gamesRemaining > 0) {
    bonusCard.style.display = 'flex';
    bonusSub.textContent = dailyBonus.gamesRemaining + ' / 10 bonus games remaining today';
    claimBtn.style.display = 'none';
  } else if (stats.firstGameDate) {
    const first = new Date(stats.firstGameDate);
    const now = new Date();
    const diffDays = Math.floor((now - first) / 86400000);
    if (diffDays < 7) {
      bonusCard.style.display = 'flex';
      bonusSub.textContent = 'Bonus unlocks in ' + (7 - diffDays) + ' days';
      claimBtn.style.display = 'none';
    } else {
      bonusCard.style.display = 'none';
    }
  } else {
    bonusCard.style.display = 'none';
  }

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

  const earned = stats.achievements || [];
  const achieveSub = document.getElementById('achieveSub');
  if (achieveSub) {
    achieveSub.textContent = earned.length + ' / ' + ACHIEVEMENTS.length + ' unlocked';
  }
}

function showDailyToast() {
  const toast = document.getElementById('dailyToast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function showStats() {
  const content = document.getElementById('statsContent');
  content.innerHTML = '';

  const total = stats.totalGames || 0;
  const totalTime = stats.totalTime || 0;
  const totalXp = stats.totalXp || 0;
  const bestStreak = stats.bestStreak || 0;
  const flawlessCount = stats.flawlessCount || 0;
  const totalMistakes = stats.totalMistakes || 0;
  const avgTime = total > 0 ? Math.round(totalTime / total) : 0;
  const accuracy = total > 0 ? Math.round(((total - totalMistakes) / (total * 81)) * 100) : 100;

  const highestLevel = stats.highestLevel || 1;

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  grid.innerHTML = `
    <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Puzzles Solved</div></div>
    <div class="stat-card"><div class="stat-value">${totalXp}</div><div class="stat-label">Total XP</div></div>
    <div class="stat-card"><div class="stat-value">${formatTime(avgTime)}</div><div class="stat-label">Avg Time</div></div>
    <div class="stat-card"><div class="stat-value">${bestStreak}</div><div class="stat-label">Best Streak</div></div>
    <div class="stat-card"><div class="stat-value">${highestLevel}</div><div class="stat-label">Highest Level</div></div>
  `;
  content.appendChild(grid);

  const diffTitle = document.createElement('div');
  diffTitle.className = 'stats-section-title';
  diffTitle.textContent = 'By Difficulty';
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
    row.innerHTML = '<div class="stats-bar-label">' + d.label + '</div><div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + Math.max(8, pct) + '%;background:' + d.color + '">' + count + '</div></div>';
    barChart.appendChild(row);
  });
  content.appendChild(barChart);

  const timeTitle = document.createElement('div');
  timeTitle.className = 'stats-section-title';
  timeTitle.textContent = 'Best Times';
  content.appendChild(timeTitle);
  const timeGrid = document.createElement('div');
  timeGrid.className = 'stats-grid';
  diffs.forEach(d => {
    const t = stats.bestTimes[d.key];
    timeGrid.innerHTML += '<div class="stat-card"><div class="stat-value">' + (t < Infinity ? formatTime(t) : '--') + '</div><div class="stat-label">' + d.label + '</div></div>';
  });
  content.appendChild(timeGrid);

  // Leaderboard section
  const lbTitle = document.createElement('div');
  lbTitle.className = 'stats-section-title';
  lbTitle.textContent = 'Leaderboard';
  content.appendChild(lbTitle);

  const lbContainer = document.createElement('div');
  lbContainer.style.cssText = 'background:var(--card-bg);border-radius:var(--radius);padding:12px;box-shadow:var(--card-shadow);margin-bottom:16px;';

  function getMockLeaderboard() {
    const mockNames = ['SudokuMaster', 'LogicQueen', 'NumberNinja', 'GridWizard', 'CellKing', 'PuzzleWhiz', 'DigitDancer', 'RowRuler', 'BoxBoss', 'CageBreaker', 'SolverSam', 'BrainAce', 'PencilMark', 'XWingFox', 'Swordfish'];
    const userXp = stats.totalXp || 0;
    const userGames = stats.totalGames || 0;
    const userAvgScore = userGames > 0 ? Math.round(userXp / userGames) : 20;
    const mockEntries = [];
    mockNames.forEach((name, i) => {
      const varScore = Math.round(userAvgScore * (0.5 + Math.random() * 1.0) + Math.random() * 30);
      const games = Math.round(userGames * (0.2 + Math.random() * 1.5) + 1);
      const xp = varScore * games + Math.round(Math.random() * 100);
      mockEntries.push({
        name, score: varScore + Math.round(Math.random() * 15),
        xp, games, difficulty: ['easy','medium','hard','impossible'][Math.floor(Math.random() * 4)],
        date: todayStr(), id: Date.now() + i, isMock: true,
      });
    });
    return mockEntries.sort((a, b) => b.score - a.score);
  }

  const lbList = document.createElement('div');
  const topScores = getLeaderboardTop(10);
  const mockScores = getMockLeaderboard();
  const allScores = topScores.length > 0 ? topScores : [];

  if (allScores.length === 0) {
    // Show mock data instead
    mockScores.slice(0, 10).forEach((entry, i) => {
      const row = document.createElement('div');
      const isPlayer = i === 0 && topScores.length === 0;
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border);' + (isPlayer ? 'font-weight:700;color:var(--xp-gold);' : '');
      row.innerHTML = '<span>' + (i + 1) + '. ' + (isPlayer ? 'You' : entry.name) + '</span><span>' + entry.score + ' pts</span>';
      lbList.appendChild(row);
    });
  } else {
    allScores.forEach((entry, i) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border);' + (i === 0 ? 'font-weight:700;color:var(--xp-gold);' : '');
      row.innerHTML = '<span>' + (i + 1) + '. ' + entry.name + '</span><span>' + entry.score + ' pts</span>';
      lbList.appendChild(row);
    });
  }
  lbContainer.appendChild(lbList);

  const lbActions = document.createElement('div');
  lbActions.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
  const shareBtn = document.createElement('button');
  shareBtn.className = 'data-btn';
  shareBtn.textContent = 'Share';
  shareBtn.addEventListener('click', shareLeaderboard);
  const importBtn2 = document.createElement('button');
  importBtn2.className = 'data-btn';
  importBtn2.textContent = 'Import';
  importBtn2.addEventListener('click', () => {
    const code = prompt('Paste leaderboard code:');
    if (code) importLeaderboard(code);
  });
  lbActions.appendChild(shareBtn);
  lbActions.appendChild(importBtn2);
  lbContainer.appendChild(lbActions);
  content.appendChild(lbContainer);

  showPage('page-stats');
}

function showDailyArchive() {
  const content = document.getElementById('archiveContent');
  content.innerHTML = '';

  const archive = stats.dailyArchive || [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  for (let m = 0; m < 3; m++) {
    const d = new Date(year, month - m, 1);
    const monthLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const firstDay = d.getDay();

    const label = document.createElement('div');
    label.className = 'archive-month-label';
    label.textContent = monthLabel;
    content.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'archive-grid';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
      const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const isToday = dateStr === todayStr();
      const completed = archive.includes(dateStr);
      const el = document.createElement('div');
      el.className = 'archive-day' + (completed ? ' completed' : '') + (isToday ? ' today' : '');
      el.textContent = day;
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
  document.getElementById('levelBadge').addEventListener('click', showRankJourney);
  document.getElementById('xpBarWrap').addEventListener('click', showRankJourney);
  document.getElementById('streakBadge').addEventListener('click', showStreakJourney);
  document.getElementById('achieveCard').addEventListener('click', showAchievements);
  document.getElementById('statsCard').addEventListener('click', showStats);

  document.getElementById('rankClose').addEventListener('click', () => document.getElementById('rankOverlay').classList.remove('open'));
  document.getElementById('rankOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('rankOverlay').classList.remove('open');
  });

  document.getElementById('streakClose').addEventListener('click', () => document.getElementById('streakOverlay').classList.remove('open'));
  document.getElementById('streakOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('streakOverlay').classList.remove('open');
  });

  document.querySelectorAll('.achieve-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.achieve-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showAchievements();
    });
  });

  document.querySelectorAll('.achieve-cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.achieve-cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showAchievements();
    });
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
  const count = RANKS.length;
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

  // Draw connector lines between each pair of consecutive nodes
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
      // Transition: first half green, second half dashed
      line.style.background = 'linear-gradient(90deg, var(--success) 50%, var(--border) 50%)';
    } else {
      line.style.background = 'var(--border)';
      line.style.height = '2px';
      line.style.borderTop = '2px dashed var(--border)';
      line.style.background = 'transparent';
    }
    wrap.appendChild(line);
  }

  // Place rank nodes
  for (const p of nodes) {
    const r = RANKS[p.idx];
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
    name.textContent = r.name;
    node.appendChild(name);

    const xp = document.createElement('div');
    xp.className = 'rank-tl-xp';
    xp.textContent = r.xp + ' XP';
    node.appendChild(xp);

    wrap.appendChild(node);
  }

  wrap.style.height = (count * gapY + 30) + 'px';
  timeline.appendChild(wrap);

  // Scroll to current rank
  const currentEl = wrap.querySelector('.rank-tl-node.current');
  if (currentEl) {
    setTimeout(() => {
      currentEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 100);
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

  document.getElementById('rankOverlay').classList.add('open');
}

let _achievePage = 0;
const _ACHIEVE_PER_PAGE = 20;

function showAchievements() {
  const earned = stats.achievements || [];
  const filter = document.querySelector('.achieve-tab.active')?.dataset?.filter || 'all';
  const catFilter = document.querySelector('.achieve-cat-tab.active')?.dataset?.cat || 'all';
  const grid = document.getElementById('achieveGrid');
  grid.innerHTML = '';

  document.getElementById('achieveCount').textContent = earned.length + ' / ' + ACHIEVEMENTS.length;

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

  // Group by category
  const catOrder = ['progress', 'speed', 'flawless', 'nohints', 'comeback', 'streak', 'impossible', 'daily', 'misc'];
  const catNames = { progress: 'Progress', speed: 'Speed', flawless: 'Flawless', nohints: 'No Hints', comeback: 'Comeback', streak: 'Streak', impossible: 'Impossible', daily: 'Daily', misc: 'Misc' };
  const catIcons = { progress: 'ico-trophy', speed: 'ico-bolt', flawless: 'ico-star', nohints: 'ico-lightbulb', comeback: 'ico-shield', streak: 'ico-fire', impossible: 'ico-diamond', daily: 'ico-calendar', misc: 'ico-award' };

  const grouped = {};
  for (const a of filtered) {
    const cat = a.cat || 'misc';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  }

  // Paginate: flatten groups in category order, then slice
  let flatOrdered = [];
  for (const catId of catOrder) {
    if (grouped[catId]) {
      flatOrdered = flatOrdered.concat(grouped[catId]);
    }
  }
  // Add any unknown categories at the end
  for (const catId of Object.keys(grouped)) {
    if (!catOrder.includes(catId)) {
      flatOrdered = flatOrdered.concat(grouped[catId]);
    }
  }

  const totalPages = Math.max(1, Math.ceil(flatOrdered.length / _ACHIEVE_PER_PAGE));
  _achievePage = Math.min(_achievePage, totalPages - 1);

  const pageItems = flatOrdered.slice(_achievePage * _ACHIEVE_PER_PAGE, (_achievePage + 1) * _ACHIEVE_PER_PAGE);

  let currentGroupCat = null;
  for (const a of pageItems) {
    const cat = a.cat || 'misc';
    if (cat !== currentGroupCat) {
      currentGroupCat = cat;
      const header = document.createElement('div');
      header.className = 'achieve-cat-header';
      header.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24"><use href="#' + (catIcons[cat] || 'ico-award') + '"/></svg> ' + (catNames[cat] || cat);
      grid.appendChild(header);
    }
    const unlocked = earned.includes(a.id);
    const el = document.createElement('div');
    el.className = 'achieve-item' + (unlocked ? ' unlocked' : '');
    const progress = getAchievementProgress(a.id);
    let progressHtml = '';
    if (progress && !unlocked) {
      const pct = Math.min(100, (progress.current / progress.max * 100));
      progressHtml = '<div class="achieve-progress"><div class="achieve-progress-fill" style="width:' + pct + '%"></div></div><div class="achieve-progress-label">' + progress.current + '/' + progress.max + '</div>';
    }
    el.innerHTML = '<div class="achieve-icon"><svg width="22" height="22" viewBox="0 0 24 24"><use href="#' + a.icon + '"/></svg></div><div class="achieve-info"><div class="achieve-name">' + a.name + '</div><div class="achieve-desc">' + a.desc + '</div>' + progressHtml + '</div>';
    grid.appendChild(el);
  }

  // Pagination controls
  if (totalPages > 1) {
    const pagination = document.createElement('div');
    pagination.className = 'achieve-pagination';
    const prevBtn = document.createElement('button');
    prevBtn.className = 'data-btn';
    prevBtn.textContent = '\u2039 Prev';
    prevBtn.disabled = _achievePage === 0;
    prevBtn.addEventListener('click', () => { if (_achievePage > 0) { _achievePage--; showAchievements(); } });
    const pageInfo = document.createElement('span');
    pageInfo.className = 'achieve-page-info';
    pageInfo.textContent = (_achievePage + 1) + ' / ' + totalPages;
    const nextBtn = document.createElement('button');
    nextBtn.className = 'data-btn';
    nextBtn.textContent = 'Next \u203A';
    nextBtn.disabled = _achievePage >= totalPages - 1;
    nextBtn.addEventListener('click', () => { if (_achievePage < totalPages - 1) { _achievePage++; showAchievements(); } });
    pagination.appendChild(prevBtn);
    pagination.appendChild(pageInfo);
    pagination.appendChild(nextBtn);
    grid.appendChild(pagination);
  }

  showPage('page-achievements');
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
