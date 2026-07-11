// ============================================================
// 11. Persistence & Stats
// ============================================================
const LS = {
  settings: 'sudoku_settings',
  game: 'sudoku_game',
  hashes: 'sudoku_hashes',
  stats: 'sudoku_stats',
  streak: 'sudoku_streak',
  daily: 'sudoku_daily',
};

function saveSettings() {
  try { localStorage.setItem(LS.settings, JSON.stringify(state.settings)); } catch(e) {}
}
function loadSettings() {
  try { const raw = localStorage.getItem(LS.settings); if (raw) Object.assign(state.settings, JSON.parse(raw)); } catch(e) {}
}

function clearGame() {
  try { localStorage.removeItem(LS.game); } catch(e) {}
}

function saveGame() {
  try {
    const data = {
      solution: state.solution, givens: state.givens, board: state.board,
      notes: state.notes.map(r => r.map(s => [...s])),
      history: state.history, historyIdx: state.historyIdx,
      timer: state.timer, mistakes: state.mistakes, hintsUsed: state.hintsUsed,
      difficulty: state.difficulty, gameOver: state.gameOver, won: state.won,
      started: state.started, selectedCell: state.selectedCell, isDaily: state.isDaily,
    };
    localStorage.setItem(LS.game, JSON.stringify(data));
  } catch(e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem(LS.game);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.solution = data.solution; state.givens = data.givens; state.board = data.board;
    state.notes = data.notes.map(r => r.map(s => new Set(s)));
    state.history = data.history; state.historyIdx = data.historyIdx;
    state.timer = data.timer; state.mistakes = data.mistakes || 0;
    state.hintsUsed = data.hintsUsed || 0; state.difficulty = data.difficulty || 'easy';
    state.gameOver = data.gameOver || false; state.won = data.won || false;
    state.started = data.started || false; state.selectedCell = data.selectedCell || null;
    state.isDaily = data.isDaily || false;
    return true;
  } catch(e) { return false; }
}

function saveHash(h) {
  try {
    let hashes = [];
    const raw = localStorage.getItem(LS.hashes);
    if (raw) hashes = JSON.parse(raw);
    hashes.push(h);
    if (hashes.length > 100) hashes = hashes.slice(-100);
    localStorage.setItem(LS.hashes, JSON.stringify(hashes));
  } catch(e) {}
}
function loadHashes() {
  try { const raw = localStorage.getItem(LS.hashes); if (raw) return JSON.parse(raw); } catch(e) {}
  return [];
}

// Stats
let stats = {
  totalGames: 0, totalXp: 0, totalTime: 0,
  gamesByDifficulty: { easy: 0, medium: 0, hard: 0, impossible: 0 },
  bestTimes: { easy: Infinity, medium: Infinity, hard: Infinity, impossible: Infinity },
  bestStreak: 0,
};

function loadStats() {
  try { const raw = localStorage.getItem(LS.stats); if (raw) stats = JSON.parse(raw); } catch(e) {}
}
function saveStats() {
  try { localStorage.setItem(LS.stats, JSON.stringify(stats)); } catch(e) {}
}

// Streak
let streak = { count: 0, lastDate: null };

function loadStreak() {
  try { const raw = localStorage.getItem(LS.streak); if (raw) streak = JSON.parse(raw); } catch(e) {}
}
function saveStreak() {
  try { localStorage.setItem(LS.streak, JSON.stringify(streak)); } catch(e) {}
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function isDailyDoneToday() {
  try {
    const raw = localStorage.getItem(LS.daily);
    if (raw) { const d = JSON.parse(raw); return d.date === todayStr() && d.done; }
  } catch(e) {}
  return false;
}

function markDailyDone() {
  try { localStorage.setItem(LS.daily, JSON.stringify({ date: todayStr(), done: true })); } catch(e) {}
}

function checkStreak() {
  const today = todayStr();
  if (!streak.lastDate) return;
  if (streak.lastDate === today) return;
  const last = new Date(streak.lastDate);
  const now = new Date(today);
  const diffMs = now - last;
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays > 1) {
    const lostStreak = streak.count;
    streak.count = 0;
    streak.lastDate = null;
    saveStreak();
    if (lostStreak > 0) showStreakLost(lostStreak);
  }
}

function showStreakLost(count) {
  document.getElementById('oldStreakCount').textContent = count;
  document.getElementById('streakLostOverlay').classList.add('open');
  document.getElementById('streakLostOk').onclick = () => document.getElementById('streakLostOverlay').classList.remove('open');
}

