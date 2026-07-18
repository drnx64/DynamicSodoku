// ============================================================
// Friend Leaderboard (localStorage-based async multiplayer)
// ============================================================
const LB_KEY = 'sudoku_leaderboard';

function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return data;
  } catch(e) { log('[leaderboard] getLeaderboard error', e); return []; }
}

function saveLeaderboard(data) {
  log('[leaderboard] saveLeaderboard()', { count: data.length });
  try { localStorage.setItem(LB_KEY, JSON.stringify(data)); } catch(e) { log('[leaderboard] saveLeaderboard error', e); }
}

function addScoreToLeaderboard(name, score, difficulty) {
  log('[leaderboard] addScoreToLeaderboard()', { name, score, difficulty });
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
    name: 'You',
    score: avgScore || 10,
    xp: totalXp,
    games: totalGames,
    difficulty: lastDiff,
    date: todayStr(),
    id: 0,
    isMe: true,
  };
}

function getMockLeaderboard() {
  const mockNames = ['SudokuMaster', 'LogicQueen', 'NumberNinja', 'GridWizard', 'CellKing', 'PuzzleWhiz', 'DigitDancer', 'RowRuler', 'BoxBoss', 'CageBreaker', 'SolverSam', 'BrainAce', 'PencilMark', 'XWingFox', 'Swordfish'];
  const userXp = stats.totalXp || 0;
  const userGames = stats.totalGames || 0;
  const userAvgScore = userGames > 0 ? Math.round(userXp / userGames) : 20;
  return mockNames.map((name, i) => {
    const varScore = Math.round(userAvgScore * (0.5 + Math.random() * 1.0) + Math.random() * 30);
    const games = Math.round(userGames * (0.2 + Math.random() * 1.5) + 1);
    const xp = varScore * games + Math.round(Math.random() * 100);
    return {
      name, score: varScore + Math.round(Math.random() * 15),
      xp, games, difficulty: ['easy','medium','hard','impossible'][Math.floor(Math.random() * 4)],
      date: todayStr(), id: Date.now() + i, isMock: true,
    };
  }).sort((a, b) => b.score - a.score);
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
    entries.sort((a, b) => b.score - a.score);
  } else {
    entries.sort((a, b) => b.id - a.id);
  }
  const top = entries.slice(0, 50);
  log('[leaderboard] rendering entries', { count: top.length, view, userRank: top.findIndex(e => e.isMe) + 1 });
  list.innerHTML = top.map((e, i) => {
    const topThree = i < 3;
    const rankCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const rankLabel = i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : '#' + (i + 1);
    const avatarUrl = 'https://api.dicebear.com/9.x/pixel-art/svg?seed=' + encodeURIComponent(e.name) + '&scale=120';
    const fallbackAvatar = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><rect width="30" height="30" fill="%23e4e7ec" rx="15"/><text x="15" y="20" font-size="16" font-weight="700" fill="%23888" text-anchor="middle" font-family="sans-serif">' + (e.name ? e.name.charAt(0).toUpperCase() : '?') + '</text></svg>');
    const detail = view === 'recent'
      ? e.difficulty + ' \u00b7 ' + e.date
      : e.difficulty + ' \u00b7 ' + (e.games || 0) + ' games';
    return '<div class="leader-entry' + (topThree ? ' top-three' : '') + (e.isMe ? ' is-me' : '') + '">'
      + '<div class="leader-rank ' + rankCls + '">' + rankLabel + '</div>'
      + '<img class="leader-avatar" src="' + avatarUrl + '" alt="" loading="lazy" onerror="this.src=\'' + fallbackAvatar + '\'">'
      + '<div class="leader-info"><div class="leader-name">' + escapeHtml(e.name) + '</div><div class="leader-detail">' + detail + '</div></div>'
      + '<div class="leader-score">+' + e.score + '</div>'
      + '</div>';
  }).join('');

  const tabs = document.querySelector('.leader-tabs');
  if (tabs) tabs.scrollLeft = 0;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function shareLeaderboard() {
  log('[leaderboard] shareLeaderboard()');
  const board = getLeaderboard();
  try {
    const code = btoa(JSON.stringify(board));
    const shareData = {
      title: 'Sudoku Leaderboard',
      text: 'My Sudoku leaderboard! ' + board.length + ' entries.',
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
