// ============================================================
// Friend Leaderboard (localStorage-based async multiplayer)
// ============================================================
const LB_KEY = 'sudoku_leaderboard';

function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function saveLeaderboard(data) {
  try { localStorage.setItem(LB_KEY, JSON.stringify(data)); } catch(e) {}
}

function addScoreToLeaderboard(name, score, difficulty) {
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
}

function getLeaderboardTop(limit) {
  return getLeaderboard().slice(0, limit || 20);
}

function renderLeaderboard(view) {
  const list = document.getElementById('leaderboardList');
  let entries = getLeaderboard();
  if (view === 'top') {
    entries.sort((a, b) => b.score - a.score);
  } else {
    entries.sort((a, b) => b.id - a.id);
  }
  if (entries.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted);font-size:13px;">No entries yet. Complete a puzzle to appear here!</div>';
    return;
  }
  const top = entries.slice(0, 50);
  list.innerHTML = top.map((e, i) => {
    const rankCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const rankLabel = i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : '#' + (i + 1);
    const avatarUrl = 'https://api.dicebear.com/9.x/pixel-art/svg?seed=' + encodeURIComponent(e.name) + '&scale=120';
    const detail = view === 'recent'
      ? e.difficulty + ' \u00b7 ' + e.date
      : e.difficulty + ' \u00b7 ' + (e.games || 0) + ' games';
    return '<div class="leader-entry">'
      + '<div class="leader-rank ' + rankCls + '">' + rankLabel + '</div>'
      + '<img class="leader-avatar" src="' + avatarUrl + '" alt="" loading="lazy">'
      + '<div class="leader-info"><div class="leader-name">' + escapeHtml(e.name) + '</div><div class="leader-detail">' + detail + '</div></div>'
      + '<div class="leader-score">+' + e.score + '</div>'
      + '</div>';
  }).join('');
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function shareLeaderboard() {
  const board = getLeaderboard();
  try {
    const code = btoa(JSON.stringify(board));
    const shareData = {
      title: 'Sudoku Leaderboard',
      text: 'My Sudoku leaderboard! ' + board.length + ' entries.',
    };
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(code);
      alert('Leaderboard data copied to clipboard! Share it with friends.');
    }
  } catch(e) { alert('Share failed: ' + e.message); }
}

function importLeaderboard(code) {
  try {
    const data = JSON.parse(atob(code));
    if (Array.isArray(data)) {
      saveLeaderboard(data);
      alert('Leaderboard imported! (' + data.length + ' entries)');
    }
  } catch(e) { alert('Invalid leaderboard data.'); }
}
