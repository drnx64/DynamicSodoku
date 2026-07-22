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
  dailyState: 'sudoku_daily_state',
};

function saveSettings() {
  log('[storage] saveSettings()');
  try { localStorage.setItem(LS.settings, JSON.stringify(state.settings)); } catch(e) { log('[storage] saveSettings error', e); }
}
function loadSettings() {
  log('[storage] loadSettings()');
  try { const raw = localStorage.getItem(LS.settings); if (raw) Object.assign(state.settings, JSON.parse(raw)); else log('[storage] no settings found'); } catch(e) { log('[storage] loadSettings error', e); }
}

function clearGame() {
  log('[storage] clearGame()');
  if (state.difficulty && state.currentLevel && state.currentLevel > 1) {
    saveLevelProgress(state.difficulty, state.currentLevel);
  }
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  state.timerRunning = false;
  state.timer = 0;
  try { localStorage.removeItem(LS.game); localStorage.removeItem(LS.dailyState); } catch(e) { log('[storage] clearGame error', e); }
}

function saveGame() {
  log('[storage] saveGame()', { isDaily: state.isDaily, started: state.started, timer: state.timer });
  try {
    const data = {
      solution: state.solution, givens: state.givens, board: state.board,
      notes: state.notes.map(r => r.map(s => [...s])),
      history: state.history, historyIdx: state.historyIdx,
      timer: state.timer, mistakes: state.mistakes, hintsUsed: state.hintsUsed,
      hintsRemaining: state.hintsRemaining,
      difficulty: state.difficulty, gameOver: state.gameOver, won: state.won,
      started: state.started, selectedCell: state.selectedCell, isDaily: state.isDaily,
      notesUsed: state.notesUsed, currentLevel: state.currentLevel,
      countdownMode: state.countdownMode, countdownTime: state.countdownTime,
      secondChanceUsed: state.secondChanceUsed,
    };
    localStorage.setItem(LS.game, JSON.stringify(data));
    if (state.isDaily) saveDailyGame();
  } catch(e) { log('[storage] saveGame error', e); }
}

function loadGame() {
  log('[storage] loadGame()');
  try {
    const raw = localStorage.getItem(LS.game);
    if (!raw) { log('[storage] no saved game found'); return false; }
    const data = JSON.parse(raw);
    state.solution = data.solution; state.givens = data.givens; state.board = data.board;
    state.notes = data.notes.map(r => r.map(s => new Set(s)));
    state.history = data.history; state.historyIdx = data.historyIdx;
    state.timer = data.timer; state.mistakes = data.mistakes || 0;
    state.hintsUsed = data.hintsUsed || 0; state.hintsRemaining = (data.hintsRemaining ?? 3); state.difficulty = data.difficulty || 'easy';
    state.gameOver = data.gameOver || false; state.won = data.won || false;
    state.started = data.started || false; state.selectedCell = data.selectedCell || null;
    state.isDaily = data.isDaily || false; state.notesUsed = data.notesUsed || false;
    state.currentLevel = data.currentLevel || 1;
    state.countdownMode = data.countdownMode || false; state.countdownTime = data.countdownTime || 0;
    state.secondChanceUsed = data.secondChanceUsed || false;
    state.gameMode = data.isDaily ? 'daily' : 'normal';
    log('[storage] game loaded', { difficulty: state.difficulty, timer: state.timer, mistakes: state.mistakes, won: state.won });
    return true;
  } catch(e) { log('[storage] loadGame error', e); return false; }
}

function saveDailyGame() {
  if (!state.isDaily) { log('[storage] saveDailyGame: not daily, skipping'); return; }
  log('[storage] saveDailyGame()');
  try {
    const data = {
      date: todayStr(),
      solution: state.solution, givens: state.givens, board: state.board,
      notes: state.notes.map(r => r.map(s => [...s])),
      history: state.history, historyIdx: state.historyIdx,
      timer: state.timer, mistakes: state.mistakes, hintsUsed: state.hintsUsed,
      difficulty: state.difficulty, gameOver: state.gameOver, won: state.won,
      started: state.started, selectedCell: state.selectedCell,
      notesUsed: state.notesUsed, currentLevel: state.currentLevel,
    };
    localStorage.setItem(LS.dailyState, JSON.stringify(data));
  } catch(e) { log('[storage] saveDailyGame error', e); }
}
function loadDailyGame() {
  log('[storage] loadDailyGame()');
  try {
    const raw = localStorage.getItem(LS.dailyState);
    if (!raw) { log('[storage] no daily game found'); return false; }
    const data = JSON.parse(raw);
    if (data.date !== todayStr()) { log('[storage] daily game is from a different date', { saved: data.date, today: todayStr() }); return false; }
    state.solution = data.solution; state.givens = data.givens; state.board = data.board;
    state.notes = data.notes.map(r => r.map(s => new Set(s)));
    state.history = data.history; state.historyIdx = data.historyIdx;
    state.timer = data.timer; state.mistakes = data.mistakes || 0;
    state.hintsUsed = data.hintsUsed || 0; state.difficulty = data.difficulty || 'medium';
    state.gameOver = data.gameOver || false; state.won = data.won || false;
    state.started = data.started || false; state.selectedCell = data.selectedCell || null;
    state.notesUsed = data.notesUsed || false; state.currentLevel = data.currentLevel || 1;
    state.isDaily = true; state.gameMode = 'daily';
    log('[storage] daily game loaded', { timer: state.timer, mistakes: state.mistakes });
    return true;
  } catch(e) { log('[storage] loadDailyGame error', e); return false; }
}

function saveHash(h) {
  log('[storage] saveHash()', { h });
  try {
    let hashes = [];
    const raw = localStorage.getItem(LS.hashes);
    if (raw) hashes = JSON.parse(raw);
    hashes.push(h);
    if (hashes.length > 100) hashes = hashes.slice(-100);
    localStorage.setItem(LS.hashes, JSON.stringify(hashes));
  } catch(e) { log('[storage] saveHash error', e); }
}
function loadHashes() {
  log('[storage] loadHashes()');
  try { const raw = localStorage.getItem(LS.hashes); if (raw) { const h = JSON.parse(raw); log('[storage] hashes loaded', { count: h.length }); return h; } } catch(e) { log('[storage] loadHashes error', e); }
  return [];
}

const ACHIEVEMENTS = [
  { id: 'firstWin',        name: 'First Win',        desc: 'Complete your first puzzle',                      icon: 'ico-trophy',    cat: 'progress' },
  { id: 'warmUp',          name: 'Warm Up',           desc: 'Solve 10 puzzles',                               icon: 'ico-trophy',    cat: 'progress' },
  { id: 'middleGame',      name: 'Middle Game',       desc: 'Solve 25 puzzles',                               icon: 'ico-target',   cat: 'progress' },
  { id: 'dedicated',       name: 'Dedicated',         desc: 'Solve 50 puzzles',                               icon: 'ico-target',   cat: 'progress' },
  { id: 'marathon',        name: 'Marathon',           desc: 'Solve 100 puzzles',                              icon: 'ico-crown',    cat: 'progress' },
  { id: 'grandMaster',     name: 'Grand Master',       desc: 'Solve 250 puzzles',                              icon: 'ico-crown',    cat: 'progress' },
  { id: 'lightSpeed',      name: 'Light Speed',        desc: 'Solve Easy in under 2 minutes',                  icon: 'ico-bolt',     cat: 'speed' },
  { id: 'speedster',       name: 'Speedster',          desc: 'Solve Medium in under 4 minutes',                icon: 'ico-bolt',     cat: 'speed' },
  { id: 'speedDemon',      name: 'Speed Demon',        desc: 'Solve Hard in under 5 minutes',                  icon: 'ico-bolt',     cat: 'speed' },
  { id: 'quickWin',        name: 'Quick Win',          desc: 'Solve any puzzle in under 90 seconds',           icon: 'ico-zap',      cat: 'speed' },
  { id: 'flawless',        name: 'Flawless',           desc: 'Complete a puzzle with 0 mistakes',              icon: 'ico-star',     cat: 'flawless' },
  { id: 'perfectionist',   name: 'Perfectionist',      desc: 'Complete 5 flawless puzzles',                    icon: 'ico-star',     cat: 'flawless' },
  { id: 'immaculate',      name: 'Immaculate',         desc: 'Complete 25 flawless puzzles',                   icon: 'ico-star',     cat: 'flawless' },
  { id: 'noHints',         name: 'Pure Logic',         desc: 'Solve a puzzle without using hints',             icon: 'ico-lightbulb', cat: 'nohints' },
  { id: 'hintHater',       name: 'Hint Hater',         desc: 'Solve 10 puzzles without hints',                 icon: 'ico-lightbulb', cat: 'nohints' },
  { id: 'pureLogic',       name: 'Pure Mind',          desc: 'Solve 50 puzzles without hints',                 icon: 'ico-brain',    cat: 'nohints' },
  { id: 'comeback',        name: 'Comeback',           desc: 'Complete a puzzle with 3+ mistakes',             icon: 'ico-shield',   cat: 'comeback' },
  { id: 'neverGiveUp',     name: 'Never Give Up',      desc: 'Complete a puzzle with 5+ mistakes',             icon: 'ico-shield',   cat: 'comeback' },
  { id: 'streakStarter',   name: 'Streak Starter',     desc: 'Reach a 3-day streak',                          icon: 'ico-fire',     cat: 'streak' },
  { id: 'streakMaster',    name: 'Streak Master',      desc: 'Reach a 7-day streak',                          icon: 'ico-fire',     cat: 'streak' },
  { id: 'streakLegend',    name: 'Streak Legend',      desc: 'Reach a 30-day streak',                         icon: 'ico-fire',     cat: 'streak' },
  { id: 'impossibleWin',   name: 'Brave Soul',         desc: 'Complete an Impossible puzzle',                  icon: 'ico-diamond',  cat: 'impossible' },
  { id: 'braveHeart',      name: 'Brave Heart',        desc: 'Complete 10 Impossible puzzles',                 icon: 'ico-diamond',  cat: 'impossible' },
  { id: 'allDifficulties', name: 'All-Rounder',        desc: 'Complete at least 1 puzzle of each difficulty',  icon: 'ico-target',   cat: 'progress' },
  { id: 'noteTaker',       name: 'Note Taker',         desc: 'Complete a puzzle using notes mode',             icon: 'ico-pencil',   cat: 'misc' },
  { id: 'dailyPlayer',     name: 'Daily Player',       desc: 'Complete 7 daily challenges',                    icon: 'ico-calendar', cat: 'daily' },
  { id: 'dailyDevotee',    name: 'Daily Devotee',      desc: 'Complete 30 daily challenges',                   icon: 'ico-calendar', cat: 'daily' },
  { id: 'collector',       name: 'Collector',          desc: 'Unlock 10 achievements',                        icon: 'ico-award',    cat: 'misc' },
  { id: 'twoGames', name: 'Getting Started', desc: 'Solve 2 puzzles', icon: 'ico-trophy', cat: 'progress' },
  { id: 'fiveGames', name: 'Puzzle Fan', desc: 'Solve 5 puzzles', icon: 'ico-trophy', cat: 'progress' },
  { id: 'fifteenGames', name: 'Fifteen Club', desc: 'Solve 15 puzzles', icon: 'ico-trophy', cat: 'progress' },
  { id: 'twentyGames', name: 'Score 20', desc: 'Solve 20 puzzles', icon: 'ico-trophy', cat: 'progress' },
  { id: 'thirtyGames', name: 'Thirty Club', desc: 'Solve 30 puzzles', icon: 'ico-trophy', cat: 'progress' },
  { id: 'fortyGames', name: 'Forty Club', desc: 'Solve 40 puzzles', icon: 'ico-trophy', cat: 'progress' },
  { id: 'sixtyGames', name: 'Sixty Club', desc: 'Solve 60 puzzles', icon: 'ico-target', cat: 'progress' },
  { id: 'seventyFiveGames', name: 'Seventy Five', desc: 'Solve 75 puzzles', icon: 'ico-target', cat: 'progress' },
  { id: 'oneTwentyFive', name: '125 and Counting', desc: 'Solve 125 puzzles', icon: 'ico-target', cat: 'progress' },
  { id: 'oneFifty', name: '150 Club', desc: 'Solve 150 puzzles', icon: 'ico-crown', cat: 'progress' },
  { id: 'oneSeventyFive', name: '175 Club', desc: 'Solve 175 puzzles', icon: 'ico-crown', cat: 'progress' },
  { id: 'twoHundred', name: 'Bicentennial', desc: 'Solve 200 puzzles', icon: 'ico-crown', cat: 'progress' },
  { id: 'threeHundred', name: 'Triple Century', desc: 'Solve 300 puzzles', icon: 'ico-crown', cat: 'progress' },
  { id: 'fourHundred', name: 'Quad Century', desc: 'Solve 400 puzzles', icon: 'ico-crown', cat: 'progress' },
  { id: 'fiveHundred', name: 'Half Millennium', desc: 'Solve 500 puzzles', icon: 'ico-crown', cat: 'progress' },
  { id: 'sevenFifty', name: 'Seven Fifty', desc: 'Solve 750 puzzles', icon: 'ico-crown', cat: 'progress' },
  { id: 'easyOneMin', name: 'Easy Breeze', desc: 'Solve Easy in under 1 minute', icon: 'ico-bolt', cat: 'speed' },
  { id: 'easyThreeMin', name: 'Easy Stroll', desc: 'Solve Easy in under 3 minutes', icon: 'ico-bolt', cat: 'speed' },
  { id: 'easyFiveMin', name: 'Easy Cruise', desc: 'Solve Easy in under 5 minutes', icon: 'ico-bolt', cat: 'speed' },
  { id: 'mediumTwoMin', name: 'Medium Rare', desc: 'Solve Medium in under 2 minutes', icon: 'ico-bolt', cat: 'speed' },
  { id: 'mediumThreeMin', name: 'Medium Well', desc: 'Solve Medium in under 3 minutes', icon: 'ico-bolt', cat: 'speed' },
  { id: 'mediumFiveMin', name: 'Medium Speed', desc: 'Solve Medium in under 5 minutes', icon: 'ico-bolt', cat: 'speed' },
  { id: 'mediumEightMin', name: 'Medium Pace', desc: 'Solve Medium in under 8 minutes', icon: 'ico-bolt', cat: 'speed' },
  { id: 'hardTwoMin', name: 'Hard Boiled', desc: 'Solve Hard in under 2 minutes', icon: 'ico-zap', cat: 'speed' },
  { id: 'hardFourMin', name: 'Hard Charger', desc: 'Solve Hard in under 4 minutes', icon: 'ico-zap', cat: 'speed' },
  { id: 'hardEightMin', name: 'Hard Push', desc: 'Solve Hard in under 8 minutes', icon: 'ico-zap', cat: 'speed' },
  { id: 'hardTenMin', name: 'Hard Grind', desc: 'Solve Hard in under 10 minutes', icon: 'ico-zap', cat: 'speed' },
  { id: 'impossibleFiveMin', name: 'Impossible Rush', desc: 'Solve Impossible in under 5 minutes', icon: 'ico-diamond', cat: 'speed' },
  { id: 'impossibleTenMin', name: 'Impossible Pace', desc: 'Solve Impossible in under 10 minutes', icon: 'ico-diamond', cat: 'speed' },
  { id: 'impossibleFifteenMin', name: 'Impossible Grind', desc: 'Solve Impossible in under 15 minutes', icon: 'ico-diamond', cat: 'speed' },
  { id: 'impossibleTwentyMin', name: 'Impossible Marathon', desc: 'Solve Impossible in under 20 minutes', icon: 'ico-diamond', cat: 'speed' },
  { id: 'blitzWin', name: 'Blitz', desc: 'Solve any puzzle in under 30 seconds', icon: 'ico-zap', cat: 'speed' },
  { id: 'twoFlawless', name: 'Double Perfect', desc: 'Complete 2 flawless puzzles', icon: 'ico-star', cat: 'flawless' },
  { id: 'threeFlawless', name: 'Hat Trick', desc: 'Complete 3 flawless puzzles', icon: 'ico-star', cat: 'flawless' },
  { id: 'tenFlawless', name: 'Perfect Ten', desc: 'Complete 10 flawless puzzles', icon: 'ico-star', cat: 'flawless' },
  { id: 'twentyFlawless', name: 'Perfect Score', desc: 'Complete 20 flawless puzzles', icon: 'ico-star', cat: 'flawless' },
  { id: 'thirtyFlawless', name: 'Flawless Thirty', desc: 'Complete 30 flawless puzzles', icon: 'ico-star', cat: 'flawless' },
  { id: 'fiftyFlawless', name: 'Golden Perfection', desc: 'Complete 50 flawless puzzles', icon: 'ico-star', cat: 'flawless' },
  { id: 'seventyFiveFlawless', name: 'Platinum Perfection', desc: 'Complete 75 flawless puzzles', icon: 'ico-star', cat: 'flawless' },
  { id: 'hundredFlawless', name: 'Diamond Perfection', desc: 'Complete 100 flawless puzzles', icon: 'ico-star', cat: 'flawless' },
  { id: 'threeNoHints', name: 'Pure Thoughts', desc: 'Solve 3 puzzles without hints', icon: 'ico-lightbulb', cat: 'nohints' },
  { id: 'fiveNoHints', name: 'Pure Streak', desc: 'Solve 5 puzzles without hints', icon: 'ico-lightbulb', cat: 'nohints' },
  { id: 'fifteenNoHints', name: 'Pure Focus', desc: 'Solve 15 puzzles without hints', icon: 'ico-lightbulb', cat: 'nohints' },
  { id: 'twentyNoHints', name: 'Pure Dedication', desc: 'Solve 20 puzzles without hints', icon: 'ico-brain', cat: 'nohints' },
  { id: 'thirtyNoHints', name: 'Pure Thirty', desc: 'Solve 30 puzzles without hints', icon: 'ico-brain', cat: 'nohints' },
  { id: 'fortyNoHints', name: 'Pure Forty', desc: 'Solve 40 puzzles without hints', icon: 'ico-brain', cat: 'nohints' },
  { id: 'seventyFiveNoHints', name: 'Pure Soul', desc: 'Solve 75 puzzles without hints', icon: 'ico-brain', cat: 'nohints' },
  { id: 'hundredNoHints', name: 'Pure Legend', desc: 'Solve 100 puzzles without hints', icon: 'ico-brain', cat: 'nohints' },
  { id: 'twoMistakes', name: 'Almost Perfect', desc: 'Complete a puzzle with exactly 2 mistakes', icon: 'ico-shield', cat: 'comeback' },
  { id: 'fourMistakes', name: 'Persistent', desc: 'Complete a puzzle with exactly 4 mistakes', icon: 'ico-shield', cat: 'comeback' },
  { id: 'sixMistakes', name: 'Never Say Die', desc: 'Complete a puzzle with 6+ mistakes', icon: 'ico-shield', cat: 'comeback' },
  { id: 'crutchUser', name: 'Help Seeker', desc: 'Complete a puzzle using 3+ hints', icon: 'ico-lightbulb', cat: 'comeback' },
  { id: 'streakTwo', name: 'Double Streak', desc: 'Reach a 2-day streak', icon: 'ico-fire', cat: 'streak' },
  { id: 'streakFive', name: 'Streak Five', desc: 'Reach a 5-day streak', icon: 'ico-fire', cat: 'streak' },
  { id: 'streakTen', name: 'Streak Ten', desc: 'Reach a 10-day streak', icon: 'ico-fire', cat: 'streak' },
  { id: 'streakTwoWeeks', name: 'Two Week Streak', desc: 'Reach a 14-day streak', icon: 'ico-fire', cat: 'streak' },
  { id: 'streakThreeWeeks', name: 'Three Week Streak', desc: 'Reach a 21-day streak', icon: 'ico-fire', cat: 'streak' },
  { id: 'streakFifty', name: 'Streak Fifty', desc: 'Reach a 50-day streak', icon: 'ico-fire', cat: 'streak' },
  { id: 'streakHundred', name: 'Century Streak', desc: 'Reach a 100-day streak', icon: 'ico-fire', cat: 'streak' },
  { id: 'yearStreak', name: 'Year-Long Warrior', desc: 'Maintain a streak for 1 full year', icon: 'ico-fire', cat: 'streak' },
  { id: 'threeImpossible', name: 'Brave Trio', desc: 'Complete 3 Impossible puzzles', icon: 'ico-diamond', cat: 'impossible' },
  { id: 'fiveImpossible', name: 'Brave Five', desc: 'Complete 5 Impossible puzzles', icon: 'ico-diamond', cat: 'impossible' },
  { id: 'twentyFiveImpossible', name: 'Brave Twenty Five', desc: 'Complete 25 Impossible puzzles', icon: 'ico-diamond', cat: 'impossible' },
  { id: 'fiftyImpossible', name: 'Brave Fifty', desc: 'Complete 50 Impossible puzzles', icon: 'ico-diamond', cat: 'impossible' },
  { id: 'hundredImpossible', name: 'Brave Hundred', desc: 'Complete 100 Impossible puzzles', icon: 'ico-diamond', cat: 'impossible' },
  { id: 'firstDaily', name: 'First Daily', desc: 'Complete your first daily challenge', icon: 'ico-calendar', cat: 'daily' },
  { id: 'threeDaily', name: 'Daily Trio', desc: 'Complete 3 daily challenges', icon: 'ico-calendar', cat: 'daily' },
  { id: 'tenDaily', name: 'Daily Ten', desc: 'Complete 10 daily challenges', icon: 'ico-calendar', cat: 'daily' },
  { id: 'twentyDaily', name: 'Daily Twenty', desc: 'Complete 20 daily challenges', icon: 'ico-calendar', cat: 'daily' },
  { id: 'fiftyDaily', name: 'Daily Fifty', desc: 'Complete 50 daily challenges', icon: 'ico-calendar', cat: 'daily' },
  { id: 'hundredDaily', name: 'Daily Century', desc: 'Complete 100 daily challenges', icon: 'ico-calendar', cat: 'daily' },
  { id: 'xp1000', name: 'Thousand XP', desc: 'Earn 1,000 total XP', icon: 'ico-trophy', cat: 'misc' },
  { id: 'xp5000', name: 'Five Thousand XP', desc: 'Earn 5,000 total XP', icon: 'ico-trophy', cat: 'misc' },
  { id: 'xp10000', name: 'Ten Thousand XP', desc: 'Earn 10,000 total XP', icon: 'ico-crown', cat: 'misc' },
  { id: 'xp25000', name: 'Twenty Five K XP', desc: 'Earn 25,000 total XP', icon: 'ico-crown', cat: 'misc' },
  { id: 'xp50000', name: 'Fifty K XP', desc: 'Earn 50,000 total XP', icon: 'ico-crown', cat: 'misc' },
  { id: 'xp100000', name: 'Century XP', desc: 'Earn 100,000 total XP', icon: 'ico-crown', cat: 'misc' },
  { id: 'time30m', name: 'Thirty Minutes', desc: 'Play for 30 minutes total', icon: 'ico-clock', cat: 'misc' },
  { id: 'time1h', name: 'One Hour', desc: 'Play for 1 hour total', icon: 'ico-clock', cat: 'misc' },
  { id: 'time10h', name: 'Ten Hours', desc: 'Play for 10 hours total', icon: 'ico-clock', cat: 'misc' },
  { id: 'time50h', name: 'Fifty Hours', desc: 'Play for 50 hours total', icon: 'ico-clock', cat: 'misc' },
  { id: 'time100h', name: 'Hundred Hours', desc: 'Play for 100 hours total', icon: 'ico-clock', cat: 'misc' },
  { id: 'mistakes50', name: 'Fifty Mistakes', desc: 'Make 50 total mistakes', icon: 'ico-x', cat: 'misc' },
  { id: 'mistakes100', name: 'Hundred Mistakes', desc: 'Make 100 total mistakes', icon: 'ico-x', cat: 'misc' },
  { id: 'mistakes500', name: 'Five Hundred Mistakes', desc: 'Make 500 total mistakes', icon: 'ico-x', cat: 'misc' },
  { id: 'mistakes1000', name: 'Thousand Mistakes', desc: 'Make 1,000 total mistakes', icon: 'ico-x', cat: 'misc' },
  { id: 'mistakes5000', name: 'Five Thousand Mistakes', desc: 'Make 5,000 total mistakes', icon: 'ico-x', cat: 'misc' },
  { id: 'notes100', name: 'Note Taker I', desc: 'Place 100 notes', icon: 'ico-pencil', cat: 'misc' },
  { id: 'notes500', name: 'Note Taker II', desc: 'Place 500 notes', icon: 'ico-pencil', cat: 'misc' },
  { id: 'notes1000', name: 'Note Taker III', desc: 'Place 1,000 notes', icon: 'ico-pencil', cat: 'misc' },
  { id: 'notes5000', name: 'Note Taker IV', desc: 'Place 5,000 notes', icon: 'ico-pencil', cat: 'misc' },
  { id: 'firstHint', name: 'First Hint', desc: 'Use your first hint ever', icon: 'ico-lightbulb', cat: 'misc' },
  { id: 'tenHints', name: 'Ten Hints', desc: 'Use 10 hints total', icon: 'ico-lightbulb', cat: 'misc' },
  { id: 'fiftyHints', name: 'Fifty Hints', desc: 'Use 50 hints total', icon: 'ico-lightbulb', cat: 'misc' },
  { id: 'hundredHints', name: 'Hundred Hints', desc: 'Use 100 hints total', icon: 'ico-lightbulb', cat: 'misc' },
  { id: 'fiveHundredHints', name: 'Hint Master', desc: 'Use 500 hints total', icon: 'ico-lightbulb', cat: 'misc' },
  { id: 'undo100', name: 'Undo Artist', desc: 'Undo 100 moves', icon: 'ico-undo', cat: 'misc' },
  { id: 'undo500', name: 'Undo Expert', desc: 'Undo 500 moves', icon: 'ico-undo', cat: 'misc' },
  { id: 'undo1000', name: 'Undo Master', desc: 'Undo 1,000 moves', icon: 'ico-undo', cat: 'misc' },
  { id: 'noAutoCandidates', name: 'Pure Skill', desc: 'Solve a puzzle without auto-candidates', icon: 'ico-brain', cat: 'misc' },
  { id: 'noNotesMode', name: 'Memory Master', desc: 'Solve a puzzle without using notes', icon: 'ico-brain', cat: 'misc' },
  { id: 'legendary', name: 'Legendary', desc: 'Solve 1,000 puzzles', icon: 'ico-crown', cat: 'progress' },
  { id: 'speedOfLight', name: 'Speed of Light', desc: 'Solve Impossible in under 60 seconds', icon: 'ico-zap', cat: 'speed' },
  { id: 'jackpot', name: 'Jackpot', desc: 'Score 80 XP in a single game', icon: 'ico-star', cat: 'misc' },
];

const ACHIEVE_CATEGORIES = [
  { id: 'all',       name: 'All',         icon: 'ico-award' },
  { id: 'progress',  name: 'Progress',    icon: 'ico-trophy' },
  { id: 'speed',     name: 'Speed',       icon: 'ico-bolt' },
  { id: 'flawless',  name: 'Flawless',    icon: 'ico-star' },
  { id: 'nohints',   name: 'No Hints',    icon: 'ico-lightbulb' },
  { id: 'comeback',  name: 'Comeback',    icon: 'ico-shield' },
  { id: 'streak',    name: 'Streak',      icon: 'ico-fire' },
  { id: 'impossible', name: 'Impossible', icon: 'ico-diamond' },
  { id: 'daily',     name: 'Daily',       icon: 'ico-calendar' },
  { id: 'misc',      name: 'Misc',        icon: 'ico-award' },
];

function checkAchievements(difficulty, mistakes, hintsUsed, notesUsed, score, autoCandidates) {
  log('[storage] checkAchievements()', { difficulty, mistakes, hintsUsed, notesUsed, score, autoCandidates });
  const earned = stats.achievements || [];
  const newOnes = [];
  const total = stats.totalGames || 0;
  const flawlessCount = stats.flawlessCount || 0;
  const puzzlesNoHints = stats.puzzlesNoHints || 0;
  const dailyDone = stats.dailyChallengesDone || 0;

  if (!earned.includes('firstWin') && total >= 1) newOnes.push('firstWin');
  if (!earned.includes('warmUp') && total >= 10) newOnes.push('warmUp');
  if (!earned.includes('middleGame') && total >= 25) newOnes.push('middleGame');
  if (!earned.includes('dedicated') && total >= 50) newOnes.push('dedicated');
  if (!earned.includes('marathon') && total >= 100) newOnes.push('marathon');
  if (!earned.includes('grandMaster') && total >= 250) newOnes.push('grandMaster');

  if (!earned.includes('lightSpeed') && difficulty === 'easy' && state.timer < 120) newOnes.push('lightSpeed');
  if (!earned.includes('speedster') && difficulty === 'medium' && state.timer < 240) newOnes.push('speedster');
  if (!earned.includes('speedDemon') && difficulty === 'hard' && state.timer < 300) newOnes.push('speedDemon');
  if (!earned.includes('quickWin') && state.timer < 90) newOnes.push('quickWin');

  if (!earned.includes('flawless') && mistakes === 0) newOnes.push('flawless');
  if (!earned.includes('perfectionist') && flawlessCount >= 5) newOnes.push('perfectionist');
  if (!earned.includes('immaculate') && flawlessCount >= 25) newOnes.push('immaculate');

  if (!earned.includes('noHints') && hintsUsed === 0) newOnes.push('noHints');
  if (!earned.includes('hintHater') && puzzlesNoHints >= 10) newOnes.push('hintHater');
  if (!earned.includes('pureLogic') && puzzlesNoHints >= 50) newOnes.push('pureLogic');

  if (!earned.includes('comeback') && mistakes >= 3) newOnes.push('comeback');
  if (!earned.includes('neverGiveUp') && mistakes >= 5) newOnes.push('neverGiveUp');

  if (!earned.includes('streakStarter') && (streak.count || 0) >= 3) newOnes.push('streakStarter');
  if (!earned.includes('streakMaster') && (streak.count || 0) >= 7) newOnes.push('streakMaster');
  if (!earned.includes('streakLegend') && (streak.count || 0) >= 30) newOnes.push('streakLegend');

  if (!earned.includes('impossibleWin') && difficulty === 'impossible') newOnes.push('impossibleWin');
  if (!earned.includes('braveHeart') && (stats.gamesByDifficulty.impossible || 0) >= 10) newOnes.push('braveHeart');

  if (!earned.includes('allDifficulties') &&
      (stats.gamesByDifficulty.easy || 0) > 0 &&
      (stats.gamesByDifficulty.medium || 0) > 0 &&
      (stats.gamesByDifficulty.hard || 0) > 0 &&
      (stats.gamesByDifficulty.impossible || 0) > 0) newOnes.push('allDifficulties');

  if (!earned.includes('noteTaker') && notesUsed) newOnes.push('noteTaker');

  if (!earned.includes('dailyPlayer') && dailyDone >= 7) newOnes.push('dailyPlayer');
  if (!earned.includes('dailyDevotee') && dailyDone >= 30) newOnes.push('dailyDevotee');

  if (!earned.includes('collector') && (earned.length + newOnes.length) >= 10) newOnes.push('collector');

  if (!earned.includes('twoGames') && total >= 2) newOnes.push('twoGames');
  if (!earned.includes('fiveGames') && total >= 5) newOnes.push('fiveGames');
  if (!earned.includes('fifteenGames') && total >= 15) newOnes.push('fifteenGames');
  if (!earned.includes('twentyGames') && total >= 20) newOnes.push('twentyGames');
  if (!earned.includes('thirtyGames') && total >= 30) newOnes.push('thirtyGames');
  if (!earned.includes('fortyGames') && total >= 40) newOnes.push('fortyGames');
  if (!earned.includes('sixtyGames') && total >= 60) newOnes.push('sixtyGames');
  if (!earned.includes('seventyFiveGames') && total >= 75) newOnes.push('seventyFiveGames');
  if (!earned.includes('oneTwentyFive') && total >= 125) newOnes.push('oneTwentyFive');
  if (!earned.includes('oneFifty') && total >= 150) newOnes.push('oneFifty');
  if (!earned.includes('oneSeventyFive') && total >= 175) newOnes.push('oneSeventyFive');
  if (!earned.includes('twoHundred') && total >= 200) newOnes.push('twoHundred');
  if (!earned.includes('threeHundred') && total >= 300) newOnes.push('threeHundred');
  if (!earned.includes('fourHundred') && total >= 400) newOnes.push('fourHundred');
  if (!earned.includes('fiveHundred') && total >= 500) newOnes.push('fiveHundred');
  if (!earned.includes('sevenFifty') && total >= 750) newOnes.push('sevenFifty');

  if (!earned.includes('easyOneMin') && difficulty === 'easy' && state.timer < 60) newOnes.push('easyOneMin');
  if (!earned.includes('easyThreeMin') && difficulty === 'easy' && state.timer < 180) newOnes.push('easyThreeMin');
  if (!earned.includes('easyFiveMin') && difficulty === 'easy' && state.timer < 300) newOnes.push('easyFiveMin');
  if (!earned.includes('mediumTwoMin') && difficulty === 'medium' && state.timer < 120) newOnes.push('mediumTwoMin');
  if (!earned.includes('mediumThreeMin') && difficulty === 'medium' && state.timer < 180) newOnes.push('mediumThreeMin');
  if (!earned.includes('mediumFiveMin') && difficulty === 'medium' && state.timer < 300) newOnes.push('mediumFiveMin');
  if (!earned.includes('mediumEightMin') && difficulty === 'medium' && state.timer < 480) newOnes.push('mediumEightMin');
  if (!earned.includes('hardTwoMin') && difficulty === 'hard' && state.timer < 120) newOnes.push('hardTwoMin');
  if (!earned.includes('hardFourMin') && difficulty === 'hard' && state.timer < 240) newOnes.push('hardFourMin');
  if (!earned.includes('hardEightMin') && difficulty === 'hard' && state.timer < 480) newOnes.push('hardEightMin');
  if (!earned.includes('hardTenMin') && difficulty === 'hard' && state.timer < 600) newOnes.push('hardTenMin');
  if (!earned.includes('impossibleFiveMin') && difficulty === 'impossible' && state.timer < 300) newOnes.push('impossibleFiveMin');
  if (!earned.includes('impossibleTenMin') && difficulty === 'impossible' && state.timer < 600) newOnes.push('impossibleTenMin');
  if (!earned.includes('impossibleFifteenMin') && difficulty === 'impossible' && state.timer < 900) newOnes.push('impossibleFifteenMin');
  if (!earned.includes('impossibleTwentyMin') && difficulty === 'impossible' && state.timer < 1200) newOnes.push('impossibleTwentyMin');
  if (!earned.includes('blitzWin') && state.timer < 30) newOnes.push('blitzWin');

  if (!earned.includes('twoFlawless') && flawlessCount >= 2) newOnes.push('twoFlawless');
  if (!earned.includes('threeFlawless') && flawlessCount >= 3) newOnes.push('threeFlawless');
  if (!earned.includes('tenFlawless') && flawlessCount >= 10) newOnes.push('tenFlawless');
  if (!earned.includes('twentyFlawless') && flawlessCount >= 20) newOnes.push('twentyFlawless');
  if (!earned.includes('thirtyFlawless') && flawlessCount >= 30) newOnes.push('thirtyFlawless');
  if (!earned.includes('fiftyFlawless') && flawlessCount >= 50) newOnes.push('fiftyFlawless');
  if (!earned.includes('seventyFiveFlawless') && flawlessCount >= 75) newOnes.push('seventyFiveFlawless');
  if (!earned.includes('hundredFlawless') && flawlessCount >= 100) newOnes.push('hundredFlawless');

  if (!earned.includes('threeNoHints') && puzzlesNoHints >= 3) newOnes.push('threeNoHints');
  if (!earned.includes('fiveNoHints') && puzzlesNoHints >= 5) newOnes.push('fiveNoHints');
  if (!earned.includes('fifteenNoHints') && puzzlesNoHints >= 15) newOnes.push('fifteenNoHints');
  if (!earned.includes('twentyNoHints') && puzzlesNoHints >= 20) newOnes.push('twentyNoHints');
  if (!earned.includes('thirtyNoHints') && puzzlesNoHints >= 30) newOnes.push('thirtyNoHints');
  if (!earned.includes('fortyNoHints') && puzzlesNoHints >= 40) newOnes.push('fortyNoHints');
  if (!earned.includes('seventyFiveNoHints') && puzzlesNoHints >= 75) newOnes.push('seventyFiveNoHints');
  if (!earned.includes('hundredNoHints') && puzzlesNoHints >= 100) newOnes.push('hundredNoHints');

  if (!earned.includes('twoMistakes') && mistakes === 2) newOnes.push('twoMistakes');
  if (!earned.includes('fourMistakes') && mistakes === 4) newOnes.push('fourMistakes');
  if (!earned.includes('sixMistakes') && mistakes >= 6) newOnes.push('sixMistakes');
  if (!earned.includes('crutchUser') && hintsUsed >= 3) newOnes.push('crutchUser');

  if (!earned.includes('streakTwo') && (streak.count || 0) >= 2) newOnes.push('streakTwo');
  if (!earned.includes('streakFive') && (streak.count || 0) >= 5) newOnes.push('streakFive');
  if (!earned.includes('streakTen') && (streak.count || 0) >= 10) newOnes.push('streakTen');
  if (!earned.includes('streakTwoWeeks') && (streak.count || 0) >= 14) newOnes.push('streakTwoWeeks');
  if (!earned.includes('streakThreeWeeks') && (streak.count || 0) >= 21) newOnes.push('streakThreeWeeks');
  if (!earned.includes('streakFifty') && (streak.count || 0) >= 50) newOnes.push('streakFifty');
  if (!earned.includes('streakHundred') && (streak.count || 0) >= 100) newOnes.push('streakHundred');
  if (!earned.includes('yearStreak') && (streak.count || 0) >= 365) newOnes.push('yearStreak');

  if (!earned.includes('threeImpossible') && (stats.gamesByDifficulty.impossible || 0) >= 3) newOnes.push('threeImpossible');
  if (!earned.includes('fiveImpossible') && (stats.gamesByDifficulty.impossible || 0) >= 5) newOnes.push('fiveImpossible');
  if (!earned.includes('twentyFiveImpossible') && (stats.gamesByDifficulty.impossible || 0) >= 25) newOnes.push('twentyFiveImpossible');
  if (!earned.includes('fiftyImpossible') && (stats.gamesByDifficulty.impossible || 0) >= 50) newOnes.push('fiftyImpossible');
  if (!earned.includes('hundredImpossible') && (stats.gamesByDifficulty.impossible || 0) >= 100) newOnes.push('hundredImpossible');

  if (!earned.includes('firstDaily') && dailyDone >= 1) newOnes.push('firstDaily');
  if (!earned.includes('threeDaily') && dailyDone >= 3) newOnes.push('threeDaily');
  if (!earned.includes('tenDaily') && dailyDone >= 10) newOnes.push('tenDaily');
  if (!earned.includes('twentyDaily') && dailyDone >= 20) newOnes.push('twentyDaily');
  if (!earned.includes('fiftyDaily') && dailyDone >= 50) newOnes.push('fiftyDaily');
  if (!earned.includes('hundredDaily') && dailyDone >= 100) newOnes.push('hundredDaily');

  if (!earned.includes('xp1000') && (stats.totalXp || 0) >= 1000) newOnes.push('xp1000');
  if (!earned.includes('xp5000') && (stats.totalXp || 0) >= 5000) newOnes.push('xp5000');
  if (!earned.includes('xp10000') && (stats.totalXp || 0) >= 10000) newOnes.push('xp10000');
  if (!earned.includes('xp25000') && (stats.totalXp || 0) >= 25000) newOnes.push('xp25000');
  if (!earned.includes('xp50000') && (stats.totalXp || 0) >= 50000) newOnes.push('xp50000');
  if (!earned.includes('xp100000') && (stats.totalXp || 0) >= 100000) newOnes.push('xp100000');
  if (!earned.includes('time30m') && (stats.totalTime || 0) >= 1800) newOnes.push('time30m');
  if (!earned.includes('time1h') && (stats.totalTime || 0) >= 3600) newOnes.push('time1h');
  if (!earned.includes('time10h') && (stats.totalTime || 0) >= 36000) newOnes.push('time10h');
  if (!earned.includes('time50h') && (stats.totalTime || 0) >= 180000) newOnes.push('time50h');
  if (!earned.includes('time100h') && (stats.totalTime || 0) >= 360000) newOnes.push('time100h');
  if (!earned.includes('mistakes50') && (stats.totalMistakes || 0) >= 50) newOnes.push('mistakes50');
  if (!earned.includes('mistakes100') && (stats.totalMistakes || 0) >= 100) newOnes.push('mistakes100');
  if (!earned.includes('mistakes500') && (stats.totalMistakes || 0) >= 500) newOnes.push('mistakes500');
  if (!earned.includes('mistakes1000') && (stats.totalMistakes || 0) >= 1000) newOnes.push('mistakes1000');
  if (!earned.includes('mistakes5000') && (stats.totalMistakes || 0) >= 5000) newOnes.push('mistakes5000');
  if (!earned.includes('notes100') && (stats.totalNotesPlaced || 0) >= 100) newOnes.push('notes100');
  if (!earned.includes('notes500') && (stats.totalNotesPlaced || 0) >= 500) newOnes.push('notes500');
  if (!earned.includes('notes1000') && (stats.totalNotesPlaced || 0) >= 1000) newOnes.push('notes1000');
  if (!earned.includes('notes5000') && (stats.totalNotesPlaced || 0) >= 5000) newOnes.push('notes5000');
  if (!earned.includes('firstHint') && (stats.totalHintsUsedAll || 0) >= 1) newOnes.push('firstHint');
  if (!earned.includes('tenHints') && (stats.totalHintsUsedAll || 0) >= 10) newOnes.push('tenHints');
  if (!earned.includes('fiftyHints') && (stats.totalHintsUsedAll || 0) >= 50) newOnes.push('fiftyHints');
  if (!earned.includes('hundredHints') && (stats.totalHintsUsedAll || 0) >= 100) newOnes.push('hundredHints');
  if (!earned.includes('fiveHundredHints') && (stats.totalHintsUsedAll || 0) >= 500) newOnes.push('fiveHundredHints');
  if (!earned.includes('undo100') && (stats.totalUndosUsed || 0) >= 100) newOnes.push('undo100');
  if (!earned.includes('undo500') && (stats.totalUndosUsed || 0) >= 500) newOnes.push('undo500');
  if (!earned.includes('undo1000') && (stats.totalUndosUsed || 0) >= 1000) newOnes.push('undo1000');
  if (!earned.includes('noAutoCandidates') && !autoCandidates) newOnes.push('noAutoCandidates');
  if (!earned.includes('noNotesMode') && !notesUsed) newOnes.push('noNotesMode');

  if (!earned.includes('legendary') && total >= 1000) newOnes.push('legendary');
  if (!earned.includes('speedOfLight') && difficulty === 'impossible' && state.timer < 60) newOnes.push('speedOfLight');
  if (!earned.includes('jackpot') && score >= 80) newOnes.push('jackpot');

  if (newOnes.length > 0) {
    log('[storage] new achievements earned', { newOnes });
  } else {
    log('[storage] no new achievements');
  }

  for (const id of newOnes) {
    if (!earned.includes(id)) earned.push(id);
  }
  if (newOnes.length > 0) {
    stats.achievements = earned;
    saveStats();
    showAchievementToast(newOnes);
  }
}

function getAchievementProgress(id) {
  const earned = stats.achievements || [];
  const total = stats.totalGames || 0;
  const flawlessCount = stats.flawlessCount || 0;
  const puzzlesNoHints = stats.puzzlesNoHints || 0;
  const dailyDone = stats.dailyChallengesDone || 0;
  switch (id) {
    case 'warmUp':        return { current: Math.min(total, 10), max: 10 };
    case 'middleGame':    return { current: Math.min(total, 25), max: 25 };
    case 'dedicated':     return { current: Math.min(total, 50), max: 50 };
    case 'marathon':      return { current: Math.min(total, 100), max: 100 };
    case 'grandMaster':   return { current: Math.min(total, 250), max: 250 };
    case 'perfectionist': return { current: Math.min(flawlessCount, 5), max: 5 };
    case 'immaculate':    return { current: Math.min(flawlessCount, 25), max: 25 };
    case 'hintHater':     return { current: Math.min(puzzlesNoHints, 10), max: 10 };
    case 'pureLogic':     return { current: Math.min(puzzlesNoHints, 50), max: 50 };
    case 'dailyPlayer':   return { current: Math.min(dailyDone, 7), max: 7 };
    case 'dailyDevotee':  return { current: Math.min(dailyDone, 30), max: 30 };
    case 'collector':     return { current: Math.min(earned.length, 10), max: 10 };
    case 'twoGames':        return { current: Math.min(total, 2), max: 2 };
    case 'fiveGames':       return { current: Math.min(total, 5), max: 5 };
    case 'fifteenGames':    return { current: Math.min(total, 15), max: 15 };
    case 'twentyGames':     return { current: Math.min(total, 20), max: 20 };
    case 'thirtyGames':     return { current: Math.min(total, 30), max: 30 };
    case 'fortyGames':      return { current: Math.min(total, 40), max: 40 };
    case 'sixtyGames':      return { current: Math.min(total, 60), max: 60 };
    case 'seventyFiveGames': return { current: Math.min(total, 75), max: 75 };
    case 'oneTwentyFive':   return { current: Math.min(total, 125), max: 125 };
    case 'oneFifty':        return { current: Math.min(total, 150), max: 150 };
    case 'oneSeventyFive':  return { current: Math.min(total, 175), max: 175 };
    case 'twoHundred':      return { current: Math.min(total, 200), max: 200 };
    case 'threeHundred':    return { current: Math.min(total, 300), max: 300 };
    case 'fourHundred':     return { current: Math.min(total, 400), max: 400 };
    case 'fiveHundred':     return { current: Math.min(total, 500), max: 500 };
    case 'sevenFifty':      return { current: Math.min(total, 750), max: 750 };
    case 'legendary':       return { current: Math.min(total, 1000), max: 1000 };
    case 'twoFlawless':      return { current: Math.min(flawlessCount, 2), max: 2 };
    case 'threeFlawless':    return { current: Math.min(flawlessCount, 3), max: 3 };
    case 'tenFlawless':      return { current: Math.min(flawlessCount, 10), max: 10 };
    case 'twentyFlawless':   return { current: Math.min(flawlessCount, 20), max: 20 };
    case 'thirtyFlawless':   return { current: Math.min(flawlessCount, 30), max: 30 };
    case 'fiftyFlawless':    return { current: Math.min(flawlessCount, 50), max: 50 };
    case 'seventyFiveFlawless': return { current: Math.min(flawlessCount, 75), max: 75 };
    case 'hundredFlawless':  return { current: Math.min(flawlessCount, 100), max: 100 };
    case 'threeNoHints':         return { current: Math.min(puzzlesNoHints, 3), max: 3 };
    case 'fiveNoHints':          return { current: Math.min(puzzlesNoHints, 5), max: 5 };
    case 'fifteenNoHints':       return { current: Math.min(puzzlesNoHints, 15), max: 15 };
    case 'twentyNoHints':        return { current: Math.min(puzzlesNoHints, 20), max: 20 };
    case 'thirtyNoHints':        return { current: Math.min(puzzlesNoHints, 30), max: 30 };
    case 'fortyNoHints':         return { current: Math.min(puzzlesNoHints, 40), max: 40 };
    case 'seventyFiveNoHints':   return { current: Math.min(puzzlesNoHints, 75), max: 75 };
    case 'hundredNoHints':       return { current: Math.min(puzzlesNoHints, 100), max: 100 };
    case 'threeImpossible':       return { current: Math.min(stats.gamesByDifficulty.impossible || 0, 3), max: 3 };
    case 'fiveImpossible':        return { current: Math.min(stats.gamesByDifficulty.impossible || 0, 5), max: 5 };
    case 'twentyFiveImpossible':  return { current: Math.min(stats.gamesByDifficulty.impossible || 0, 25), max: 25 };
    case 'fiftyImpossible':       return { current: Math.min(stats.gamesByDifficulty.impossible || 0, 50), max: 50 };
    case 'hundredImpossible':     return { current: Math.min(stats.gamesByDifficulty.impossible || 0, 100), max: 100 };
    case 'firstDaily':     return { current: Math.min(dailyDone, 1), max: 1 };
    case 'threeDaily':     return { current: Math.min(dailyDone, 3), max: 3 };
    case 'tenDaily':       return { current: Math.min(dailyDone, 10), max: 10 };
    case 'twentyDaily':    return { current: Math.min(dailyDone, 20), max: 20 };
    case 'fiftyDaily':     return { current: Math.min(dailyDone, 50), max: 50 };
    case 'hundredDaily':   return { current: Math.min(dailyDone, 100), max: 100 };
    case 'xp1000':          return { current: Math.min(stats.totalXp || 0, 1000), max: 1000 };
    case 'xp5000':          return { current: Math.min(stats.totalXp || 0, 5000), max: 5000 };
    case 'xp10000':         return { current: Math.min(stats.totalXp || 0, 10000), max: 10000 };
    case 'xp25000':         return { current: Math.min(stats.totalXp || 0, 25000), max: 25000 };
    case 'xp50000':         return { current: Math.min(stats.totalXp || 0, 50000), max: 50000 };
    case 'xp100000':        return { current: Math.min(stats.totalXp || 0, 100000), max: 100000 };
    case 'time30m':         return { current: Math.min(stats.totalTime || 0, 1800), max: 1800 };
    case 'time1h':          return { current: Math.min(stats.totalTime || 0, 3600), max: 3600 };
    case 'time10h':         return { current: Math.min(stats.totalTime || 0, 36000), max: 36000 };
    case 'time50h':         return { current: Math.min(stats.totalTime || 0, 180000), max: 180000 };
    case 'time100h':        return { current: Math.min(stats.totalTime || 0, 360000), max: 360000 };
    case 'mistakes50':      return { current: Math.min(stats.totalMistakes || 0, 50), max: 50 };
    case 'mistakes100':     return { current: Math.min(stats.totalMistakes || 0, 100), max: 100 };
    case 'mistakes500':     return { current: Math.min(stats.totalMistakes || 0, 500), max: 500 };
    case 'mistakes1000':    return { current: Math.min(stats.totalMistakes || 0, 1000), max: 1000 };
    case 'mistakes5000':    return { current: Math.min(stats.totalMistakes || 0, 5000), max: 5000 };
    case 'notes100':        return { current: Math.min(stats.totalNotesPlaced || 0, 100), max: 100 };
    case 'notes500':        return { current: Math.min(stats.totalNotesPlaced || 0, 500), max: 500 };
    case 'notes1000':       return { current: Math.min(stats.totalNotesPlaced || 0, 1000), max: 1000 };
    case 'notes5000':       return { current: Math.min(stats.totalNotesPlaced || 0, 5000), max: 5000 };
    case 'firstHint':       return { current: Math.min(stats.totalHintsUsedAll || 0, 1), max: 1 };
    case 'tenHints':        return { current: Math.min(stats.totalHintsUsedAll || 0, 10), max: 10 };
    case 'fiftyHints':      return { current: Math.min(stats.totalHintsUsedAll || 0, 50), max: 50 };
    case 'hundredHints':    return { current: Math.min(stats.totalHintsUsedAll || 0, 100), max: 100 };
    case 'fiveHundredHints': return { current: Math.min(stats.totalHintsUsedAll || 0, 500), max: 500 };
    case 'undo100':         return { current: Math.min(stats.totalUndosUsed || 0, 100), max: 100 };
    case 'undo500':         return { current: Math.min(stats.totalUndosUsed || 0, 500), max: 500 };
    case 'undo1000':        return { current: Math.min(stats.totalUndosUsed || 0, 1000), max: 1000 };
    case 'streakTwo':        return { current: Math.min(streak.count || 0, 2), max: 2 };
    case 'streakFive':       return { current: Math.min(streak.count || 0, 5), max: 5 };
    case 'streakTen':        return { current: Math.min(streak.count || 0, 10), max: 10 };
    case 'streakTwoWeeks':   return { current: Math.min(streak.count || 0, 14), max: 14 };
    case 'streakThreeWeeks': return { current: Math.min(streak.count || 0, 21), max: 21 };
    case 'streakFifty':      return { current: Math.min(streak.count || 0, 50), max: 50 };
    case 'streakHundred':    return { current: Math.min(streak.count || 0, 100), max: 100 };
    case 'yearStreak':       return { current: Math.min(streak.count || 0, 365), max: 365 };
    default:              return null;
  }
}

function showAchievementToast(ids) {
  log('[storage] showAchievementToast()', { ids });
  const container = document.getElementById('achievementToastContainer') || (() => {
    const el = document.createElement('div');
    el.id = 'achievementToastContainer';
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:400;display:flex;flex-direction:column;gap:12px;pointer-events:none;align-items:center;';
    document.body.appendChild(el);
    return el;
  })();
  ids.forEach((id, idx) => {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) { log('[storage] achievement not found', { id }); return; }
    const toast = document.createElement('div');
    toast.style.cssText = 'background:linear-gradient(135deg,var(--xp-gold),#f97316,#ef4444);color:#fff;padding:18px 32px;border-radius:14px;font-size:17px;font-weight:700;box-shadow:0 8px 32px rgba(0,0,0,0.3);animation:achievePop 1.2s ease forwards;display:flex;align-items:center;gap:12px;text-align:center;border:2px solid rgba(255,255,255,0.3);max-width:340px;';
    toast.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><use href="#' + a.icon + '"/></svg> <div><div style="font-size:11px;opacity:0.8;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Achievement Unlocked!</div><div>' + a.name + '</div></div>';
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px)'; toast.style.transition = 'all 0.5s ease'; setTimeout(() => toast.remove(), 500); }, 4000 + idx * 800);
    container.appendChild(toast);
  });

  if ('Notification' in window && Notification.permission === 'granted') {
    const first = ACHIEVEMENTS.find(x => x.id === ids[0]);
    if (first) new Notification('Achievement Unlocked!', { body: first.name + ' - ' + first.desc, icon: 'assets/icon.svg' });
  }
}

let stats = {
  totalGames: 0, totalXp: 0, totalTime: 0,
  gamesByDifficulty: { easy: 0, medium: 0, hard: 0, impossible: 0 },
  bestTimes: { easy: Infinity, medium: Infinity, hard: Infinity, impossible: Infinity },
  bestStreak: 0,
  achievements: [],
  puzzlesNoHints: 0,
  flawlessCount: 0,
  dailyChallengesDone: 0,
  totalMistakes: 0,
  totalNotesPlaced: 0,
  totalHintsUsedAll: 0,
  totalUndosUsed: 0,
  dailyArchive: [],
  highestLevel: 1,
  highestLevelByDifficulty: { easy: 0, medium: 0, hard: 0, impossible: 0 },
  firstGameDate: null,
  _vault: '',
};

const BONUS_KEY = 'sudoku_bonus_challenge';
let bonusChallenge = { startDate: null, gamesPlayed: 0, claimed: false, _claimedMilestones: [] };

function loadBonus() {
  log('[storage] loadBonus()');
  try { const r = localStorage.getItem(BONUS_KEY); if (r) bonusChallenge = JSON.parse(r); } catch(e) { log('[storage] loadBonus error', e); }
  if (!bonusChallenge._claimedMilestones) bonusChallenge._claimedMilestones = [];
}
function saveBonus() {
  log('[storage] saveBonus()', { gamesPlayed: bonusChallenge.gamesPlayed, claimed: bonusChallenge.claimed });
  try { localStorage.setItem(BONUS_KEY, JSON.stringify(bonusChallenge)); } catch(e) { log('[storage] saveBonus error', e); }
}

function isBonusChallengeActive() {
  if (!bonusChallenge.startDate) return false;
  const start = new Date(bonusChallenge.startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return diffDays < 7 && !bonusChallenge.claimed;
}

function getBonusDaysLeft() {
  if (!bonusChallenge.startDate) return 0;
  const start = new Date(bonusChallenge.startDate);
  const now = new Date();
  const elapsed = Math.floor((now - start) / 86400000);
  return Math.max(0, 7 - elapsed);
}

function getBonusHoursLeft() {
  if (!bonusChallenge.startDate) return 0;
  const start = new Date(bonusChallenge.startDate);
  const now = new Date();
  const elapsed = (now.getTime() - start.getTime()) / 3600000;
  return Math.max(0, Math.floor(168 - elapsed));
}

function startBonusChallenge() {
  if (bonusChallenge.startDate) return;
  bonusChallenge = { startDate: new Date().toISOString(), gamesPlayed: 1, claimed: false };
  saveBonus();
}

function trackBonusGame() {
  if (!bonusChallenge.startDate) {
    bonusChallenge = { startDate: new Date().toISOString(), gamesPlayed: 1, claimed: false };
    saveBonus();
    return;
  }
  const active = isBonusChallengeActive();
  if (active || (!bonusChallenge.claimed && getBonusDaysLeft() > 0)) {
    bonusChallenge.gamesPlayed = (bonusChallenge.gamesPlayed || 0) + 1;
    saveBonus();
  }
}

function claimBonusReward() {
  log('[storage] claimBonusReward()');
  if (!isBonusChallengeActive()) return false;
  if ((bonusChallenge.gamesPlayed || 0) < 10) return false;
  bonusChallenge.bonusHints = (bonusChallenge.bonusHints || 0) + 3;
  bonusChallenge.claimed = true;
  saveBonus();
  log('[storage] bonus reward claimed: +3 hints');
  return true;
}

function loadStats() {
  log('[storage] loadStats()');
  try {
    const raw = localStorage.getItem(LS.stats);
    if (raw) {
      stats = JSON.parse(raw);
      const decoded = decodeVault(stats._vault || '');
      if (decoded) {
        let tampered = false;
        const checks = ['totalHintsUsedAll', 'totalUndosUsed', 'totalGames', 'totalXp'];
        for (const key of checks) {
          if (decoded[key] !== undefined && decoded[key] !== stats[key]) {
            log('[storage] stats tampered for', { key, decoded: decoded[key], stored: stats[key] });
            stats[key] = decoded[key];
            tampered = true;
          }
        }
        if (tampered) saveStats();
      }
      log('[storage] stats loaded', { totalGames: stats.totalGames, totalXp: stats.totalXp });
    } else {
      log('[storage] no stats found, using defaults');
    }
  } catch(e) { log('[storage] loadStats error', e); }
}
function saveStats() {
  log('[storage] saveStats()', { totalGames: stats.totalGames, totalXp: stats.totalXp });
  try {
    verifyStatsIntegrity();
    stats._vault = encodeVault({
      totalHintsUsedAll: stats.totalHintsUsedAll,
      totalUndosUsed: stats.totalUndosUsed,
      totalGames: stats.totalGames,
      totalXp: stats.totalXp,
    });
    localStorage.setItem(LS.stats, JSON.stringify(stats));
  } catch(e) { log('[storage] saveStats error', e); }
}

function verifyStatsIntegrity() {
  const vault = stats._vault;
  if (!vault) return;
  const decoded = decodeVault(vault);
  if (!decoded) return;
  const checks = ['totalHintsUsedAll', 'totalUndosUsed', 'totalGames', 'totalXp'];
  let tampered = false;
  for (const key of checks) {
    if (decoded[key] !== undefined && decoded[key] !== stats[key]) {
      log('[storage] integrity violation detected for', { key, decoded: decoded[key], stored: stats[key] });
      stats[key] = decoded[key];
      tampered = true;
    }
  }
  if (tampered) {
    localStorage.setItem(LS.stats, JSON.stringify(stats));
    log('[storage] stats restored from vault after tamper detection');
  }
}

function encodeVault(obj) {
  const salt = 'sd_v2';
  const raw = salt + ':' + JSON.stringify(obj);
  return btoa(raw.split('').reverse().join(''));
}
function decodeVault(encoded) {
  try {
    const raw = atob(encoded).split('').reverse().join('');
    const idx = raw.indexOf(':');
    if (idx === -1 || raw.slice(0, idx) !== 'sd_v2') return null;
    return JSON.parse(raw.slice(idx + 1));
  } catch(e) { return null; }
}

let streak = { count: 0, lastDate: null, _vault: '', _milestones: [] };

const STREAK_MILESTONES = [
  { days: 10,  xp: 100,  label: '10-Day Streak' },
  { days: 20,  xp: 250,  label: '20-Day Streak' },
  { days: 30,  xp: 500,  label: '30-Day Streak' },
  { days: 90,  xp: 1000, label: '3-Month Streak' },
  { days: 180, xp: 2500, label: '6-Month Streak' },
  { days: 365, xp: 5000, label: '1-Year Streak' },
];

function loadStreak() {
  log('[storage] loadStreak()');
  try {
    const raw = localStorage.getItem(LS.streak);
    if (raw) {
      streak = JSON.parse(raw);
      const decoded = decodeVault(streak._vault || '');
      if (decoded && (decoded.count !== streak.count || decoded.lastDate !== streak.lastDate)) {
        log('[storage] streak tampered, restoring', { decoded: decoded.count, stored: streak.count });
        streak.count = decoded.count;
        streak.lastDate = decoded.lastDate;
        saveStreak();
      }
      log('[storage] streak loaded', { count: streak.count, lastDate: streak.lastDate });
    } else {
      log('[storage] no streak found');
    }
  } catch(e) { log('[storage] loadStreak error', e); }
}
function saveStreak() {
  log('[storage] saveStreak()', { count: streak.count, lastDate: streak.lastDate });
  try {
    streak._vault = encodeVault({ count: streak.count, lastDate: streak.lastDate });
    localStorage.setItem(LS.streak, JSON.stringify(streak));
  } catch(e) { log('[storage] saveStreak error', e); }
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
  log('[storage] markDailyDone()');
  try {
    localStorage.setItem(LS.daily, JSON.stringify({ date: todayStr(), done: true }));
    localStorage.removeItem(LS.dailyState);
  } catch(e) {}
}

function checkStreak() {
  log('[storage] checkStreak()');
  const today = todayStr();
  if (!streak.lastDate) { log('[storage] checkStreak: no lastDate'); return; }
  if (streak.lastDate === today) { log('[storage] checkStreak: already updated today'); return; }
  const last = new Date(streak.lastDate + 'T00:00:00');
  const now = new Date(today + 'T00:00:00');
  const diffMs = now.getTime() - last.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays > 1) {
    const lostStreak = streak.count;
    log('[storage] streak lost!', { lostStreak, diffDays });
    streak.count = 0;
    streak.lastDate = null;
    saveStreak();
    if (lostStreak > 0) showStreakLost(lostStreak);
  }
}

function showStreakLost(count) {
  log('[storage] showStreakLost()', { count });
  document.getElementById('oldStreakCount').textContent = count;
  document.getElementById('streakLostOverlay').classList.add('open');
  document.getElementById('streakLostOk').onclick = () => document.getElementById('streakLostOverlay').classList.remove('open');
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

const LEVEL_PROGRESS_KEY = 'sudoku_level_progress';

function saveLevelProgress(difficulty, level) {
  try {
    const raw = localStorage.getItem(LEVEL_PROGRESS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[difficulty] = level;
    localStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(data));
  } catch(e) { log('[storage] saveLevelProgress error', e); }
}

function loadLevelProgress(difficulty) {
  try {
    const raw = localStorage.getItem(LEVEL_PROGRESS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return data[difficulty] || 1;
    }
  } catch(e) { log('[storage] loadLevelProgress error', e); }
  return 1;
}
