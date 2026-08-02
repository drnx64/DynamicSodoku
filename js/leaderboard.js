// ============================================================
// Friend Leaderboard (localStorage-based async multiplayer)
// ============================================================
const LB_KEY = 'sudoku_leaderboard';

function getLeaderboard() {
  return loadWithVault(LB_KEY, 'leaderboard', []);
}

function saveLeaderboard(data) {
  log('[leaderboard] saveLeaderboard()', { count: data.length });
  saveWithVault(LB_KEY, data, 'leaderboard');
}

function addScoreToLeaderboard(name, score, difficulty) {
  log('[leaderboard] addScoreToLeaderboard()', { name, score, difficulty });
  saveWithVault(MOCK_CACHE_KEY, [], 'mockLeaderboard');
  const board = getLeaderboard();
  board.push({
    name: name || 'Anonymous',
    score: score || 0,
    difficulty: difficulty || 'medium',
    xp: stats.totalXp || 0,
    games: stats.totalGames || 0,
    date: todayStr(),
    id: Date.now() + Math.random(),
  });
  board.sort((a, b) => b.score - a.score);
  if (board.length > 100) board.length = 100;
  saveLeaderboard(board);
  log('[leaderboard] score added', { totalEntries: board.length });
}

function getLeaderboardTop(limit) {
  return getLeaderboard().slice(0, limit || 20);
}

function getUserEntry() {
  const totalXp = stats.totalXp || 0;
  const totalGames = stats.totalGames || 0;
  const avgScore = totalGames > 0 ? Math.round(totalXp / totalGames) : 0;
  const lastDiff = stats.lastDifficulty || 'medium';
  return {
    name: state.settings.playerName || 'Player',
    score: avgScore || 10,
    xp: totalXp,
    games: totalGames,
    difficulty: lastDiff,
    date: todayStr(),
    id: 0,
    isMe: true,
  };
}

const MOCK_CACHE_KEY = 'sudoku_mock_leaderboard';

function getMockLeaderboard() {
  const cached = loadWithVault(MOCK_CACHE_KEY, 'mockLeaderboard', null);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;

  const mockNames = [
    'GrandmasterZen', 'SageOfLogic', 'NumberWizard', 'LogicOverlord', 'GridDeity',
    'AscendSamurai', 'PuzzleTitan', 'CellSorcerer', 'BoxMagician', 'RowEnforcer',
    'DigitMystic', 'RiddleMaster', 'BrainStorm', 'SolverElite', 'PuzzleProphet',
    'AscendMaster', 'LogicQueen', 'NumberNinja', 'GridWizard', 'CellKing',
    'PuzzleWhiz', 'DigitDancer', 'RowRuler', 'BoxBoss', 'CageBreaker',
    'SolverSam', 'BrainAce', 'PencilMark', 'XWingFox', 'Swordfish',
    'NakedPair', 'HiddenTriple', 'SkyScraper', 'WXYZwing', 'BugHunter',
    'QuantumGrid', 'NeuralSolver', 'DeductionKing',
  ];
  const userXp = stats.totalXp || 0;
  const userGames = stats.totalGames || 0;
  const today = todayStr().replace(/-/g, '');
  const seed = parseInt(today, 10) || 20260718;
  let r = seed;
  const next = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };

  const XP_TIERS = [
    { minXp: 180000, maxXp: 280000, minGames: 500, maxGames: 1200, count: 8 },
    { minXp: 85000,  maxXp: 179999, minGames: 200, maxGames: 499,  count: 5 },
    { minXp: 59000,  maxXp: 84999,  minGames: 120, maxGames: 199,  count: 5 },
    { minXp: 29000,  maxXp: 58999,  minGames: 60,  maxGames: 119,  count: 5 },
    { minXp: 8000,   maxXp: 28999,  minGames: 20,  maxGames: 59,   count: 5 },
    { minXp: 500,    maxXp: 7999,   minGames: 2,   maxGames: 19,   count: 10 },
  ];

  let tierIdx = 0, usedInTier = 0;
  const data = mockNames.map((name, i) => {
    if (tierIdx < XP_TIERS.length && usedInTier >= XP_TIERS[tierIdx].count) { usedInTier = 0; tierIdx++; }
    const t = XP_TIERS[Math.min(tierIdx, XP_TIERS.length - 1)];
    usedInTier++;
    const s1 = next(), s2 = next(), s3 = next(), s4 = next();
    const xp = Math.round(t.minXp + s1 * (t.maxXp - t.minXp));
    const games = Math.round(t.minGames + s2 * (t.maxGames - t.minGames));
    const varScore = Math.max(5, Math.round(xp / games));
    const diffs = ['easy','medium','hard','impossible'];
    return {
      name,
      score: Math.max(1, varScore + Math.round(s3 * 20 - 5)),
      xp: Math.max(1, xp),
      games: Math.max(1, games),
      difficulty: diffs[Math.floor(s4 * 4)],
      date: todayStr(),
      id: i + 1,
      isMock: true,
    };
  }).sort((a, b) => b.xp - a.xp);

  saveWithVault(MOCK_CACHE_KEY, data, 'mockLeaderboard');
  return data;
}

function getRankInfo(xp) {
  const r = getRank(xp || 0);
  return { name: r.name, icon: rankSvgImg(r.name, 14) };
}

function getRankSuffix(name) {
  const parts = name.split(' ');
  return parts[parts.length - 1];
}

function renderLeaderboard(view) {
  log('[leaderboard] renderLeaderboard()', { view });
  const list = document.getElementById('leaderboardList');
  if (!list) { log('[leaderboard] WARN: #leaderboardList not found'); return; }
  let entries = getLeaderboard();
  let usingMock = false;
  if (entries.length === 0) {
    log('[leaderboard] no real entries, using mock data');
    entries = getMockLeaderboard();
    usingMock = true;
  }
  const userEntry = getUserEntry();
  const exists = entries.some(e => e.isMe);
  if (!exists && (stats.totalGames || 0) > 0) {
    entries.push(userEntry);
  }
  if (view === 'top') {
    entries.sort((a, b) => (b.xp || 0) - (a.xp || 0) || (b.games || 0) - (a.games || 0));
  } else {
    entries.sort((a, b) => b.id - a.id);
  }
  const top = entries.slice(0, 50);
  log('[leaderboard] rendering entries', { count: top.length, view, userRank: top.findIndex(e => e.isMe) + 1 });

  const firstGameDate = stats.firstGameDate || '--';
  const userRank = getRank(stats.totalXp || 0);
  const profileHtml = '<div class="leader-profile">'
    + '<div class="leader-profile-avatar">' + rankSvgImg(userRank.name, 36) + '</div>'
    + '<div class="leader-profile-info">'
    + '<div class="leader-profile-name">' + escapeHtml(state.settings.playerName || 'Player') + '</div>'
    + '<div class="leader-profile-rank">' + userRank.name + ' \u00b7 ' + (stats.totalXp || 0) + ' XP</div>'
    + '<div class="leader-profile-joined">Joined ' + firstGameDate + ' \u00b7 ' + (stats.totalGames || 0) + ' puzzles solved</div>'
    + '</div>'
    + '</div>';

  const rowsHtml = top.map((e, i) => {
    const topThree = i < 3;
    const rankCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const rankLabel = i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : '#' + (i + 1);
    const rankInfo = getRankInfo(e.xp);
    const avatarUrl = 'https://api.dicebear.com/9.x/pixel-art/svg?seed=' + encodeURIComponent(e.name) + '&scale=120';
    const fallbackAvatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><rect width="30" height="30" fill="%23e4e7ec" rx="15"/><text x="15" y="20" font-size="16" font-weight="700" fill="%23888" text-anchor="middle" font-family="sans-serif">' + (e.name ? e.name.charAt(0).toUpperCase() : '?') + '</text></svg>');
    const detail = view === 'recent'
      ? e.difficulty + ' \u00b7 ' + e.date
      : (e.xp || 0) + ' XP \u00b7 ' + (e.games || 0) + ' games';
    const scoreLabel = view === 'top' ? e.xp || 0 : '+' + e.score;
    return '<div class="leader-entry' + (topThree ? ' top-three' : '') + (e.isMe ? ' is-me' : '') + '">'
      + '<div class="leader-rank ' + rankCls + '">' + rankLabel + '</div>'
      + '<div class="leader-badge-wrap"><div class="leader-rank-icon">' + rankInfo.icon + '</div><div class="leader-rank-label">' + getRankSuffix(rankInfo.name) + '</div></div>'
      + '<img class="leader-avatar" src="' + avatarUrl + '" alt="" loading="lazy" onerror="this.src=\'' + fallbackAvatar + '\'">'
      + '<div class="leader-info"><div class="leader-name">' + escapeHtml(e.name) + '</div><div class="leader-detail">' + detail + '</div></div>'
      + '<div class="leader-score">' + scoreLabel + '</div>'
      + '</div>';
  }).join('');

  list.innerHTML = profileHtml + rowsHtml;

  const tabs = document.querySelector('.leader-tabs');
  if (tabs) tabs.scrollLeft = 0;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function showDailyLeaderboard() {
  log('[leaderboard] showDailyLeaderboard()');
  const overlay = document.getElementById('dailyLeaderboardOverlay');
  const content = document.getElementById('dailyLeaderboardContent');
  if (!overlay || !content) { log('[leaderboard] WARN: daily leaderboard elements not found'); return; }

  const today = todayStr();
  const allEntries = getLeaderboard();
  const userEntry = getUserEntry();
  userEntry.date = today;

  let entries = allEntries.filter(e => e.date === today);
  if (entries.length === 0 && (stats.dailyArchive || []).includes(today)) {
    entries.push(userEntry);
  } else if ((stats.totalGames || 0) > 0 && !entries.some(e => e.isMe)) {
    entries.push(userEntry);
  }
  entries.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.xp || 0) - (a.xp || 0));
  const top = entries.slice(0, 20);
  const userRank = top.findIndex(e => e.isMe) + 1;

  let html = '<div class="daily-lb-header">' + today + ' \u00b7 fastest solves ranked by score'
    + (userRank > 0 ? ' \u00b7 you are #' + userRank : '') + '</div>';

  if (top.length === 0) {
    html += '<div class="daily-lb-empty">No daily solves yet. Finish today\u2019s Daily Challenge to appear here!</div>';
  } else {
    html += '<div class="daily-lb-list">';
    top.forEach((e, i) => {
      const medal = i === 0 ? '\ud83e\udd47' : i === 1 ? '\ud83e\udd48' : i === 2 ? '\ud83e\udd49' : (i + 1);
      const name = (e.isMe ? '\u2605 ' : '') + escapeHtml(e.name || 'Anonymous');
      const scoreLabel = (e.score || 0) + ' pts';
      html += '<div class="daily-lb-entry' + (e.isMe ? ' is-me' : '') + '">'
        + '<div class="daily-lb-rank">' + medal + '</div>'
        + '<div class="daily-lb-name">' + name + '</div>'
        + '<div class="daily-lb-time">' + scoreLabel + '</div>'
        + '</div>';
    });
    html += '</div>';
  }

  content.innerHTML = html;
  overlay.classList.add('open');
}

function shareLeaderboard() {
  log('[leaderboard] shareLeaderboard()');
  const board = getLeaderboard();
  try {
    const code = btoa(JSON.stringify(board));
    const shareData = {
      title: 'Ascendoku Leaderboard',
      text: 'My Ascendoku leaderboard! ' + board.length + ' entries.',
    };
    if (navigator.share) {
      navigator.share(shareData);
      log('[leaderboard] shared via navigator.share');
    } else {
      navigator.clipboard.writeText(code);
      alert('Leaderboard data copied to clipboard! Share it with friends.');
      log('[leaderboard] copied to clipboard');
    }
  } catch(e) { log('[leaderboard] share error', e); alert('Share failed: ' + e.message); }
}

function importLeaderboard(code) {
  log('[leaderboard] importLeaderboard()');
  try {
    const data = JSON.parse(atob(code));
    if (Array.isArray(data)) {
      saveLeaderboard(data);
      log('[leaderboard] imported entries', { count: data.length });
      alert('Leaderboard imported! (' + data.length + ' entries)');
    } else {
      log('[leaderboard] import: invalid data format');
    }
  } catch(e) { log('[leaderboard] import error', e); alert('Invalid leaderboard data.'); }
}
