// ============================================================
// 15. Initialization
// ============================================================
function detectLowPower() {
  try {
    const ua = navigator.userAgent;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|Silk/i.test(ua);
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || (isMobile && (cores <= 4 || mem <= 4))) {
      document.documentElement.classList.add('low-power');
      log('[init] low-power mode enabled', { isMobile, cores, mem, reducedMotion });
    }
  } catch (e) { log('[init] low-power detection failed', e); }
}
detectLowPower();

function init() {
  log('[init] init() starting');
  loadSettings();
  state.settings = Object.assign({}, DEFAULT_SETTINGS, state.settings);
  applySettings();

  loadStats();
  loadStreak();
  loadBonus();
  checkStreak();

  if (window.AscendokuReferral && window.AscendokuReferral.claimReferralReward) {
    const reward = window.AscendokuReferral.claimReferralReward();
    if (reward) {
      log('[init] referral reward claimed', reward);
      stats.totalXp = (stats.totalXp || 0) + reward.xp;
      stats._freeHints = (stats._freeHints || 0) + reward.hints;
      saveStats();
      showToast('Referral bonus: +' + reward.xp + ' XP and a free hint!');
    }
  }

  setupSettings();
  setupInput();
  setupNavigation();
  setupDialogs();
  requestNotificationPermission();

  const loaded = loadGame();
  if (loaded && state.solution && state.solution.length === (state.size || 9)) {
    if (state.won || state.gameOver || state.mistakes >= 3) {
      log('[init] clearing finished/unplayable game', { won: state.won, gameOver: state.gameOver, mistakes: state.mistakes });
      clearGame();
    }
  }

  const challenge = window.AscendokuChallenge ? AscendokuChallenge.parse() : null;
  if (challenge) {
    const resumeMatch = state.isChallenge && state.challengeSeed === challenge.seed && !state.won && !state.gameOver;
    log('[init] challenge link detected', { challenge, resumeMatch });
    if (!resumeMatch) { window.AscendokuChallenge.start(challenge); }
    else {
      document.getElementById('gameLabel').textContent = 'Challenge';
      document.getElementById('winOverlay').classList.remove('open');
      const gameBadge = document.getElementById('gameLevelBadge');
      if (gameBadge) gameBadge.style.display = 'none';
      updateUndoRedo();
      requestRender({ entering: true });
      if (state.timer > 0 && !state.won && !state.gameOver) startTimer();
      showPage('page-game');
    }
    log('[init] init() complete (challenge)');
    var sk = document.getElementById('skeleton');
    if (sk) { sk.classList.add('hide'); setTimeout(function () { sk.style.display = 'none'; }, 500); }
    return;
  }

  showPage('page-menu');
  updateMenuUI();
  log('[init] init() complete');
  var sk = document.getElementById('skeleton');
  if (sk) { sk.classList.add('hide'); setTimeout(function () { sk.style.display = 'none'; }, 500); }
}

setInterval(() => {
  verifyStatsIntegrity();
  loadWithVault(LS.settings, 'settings', {});
  loadWithVault(LS.streak, 'streak', {});
  loadWithVault(BONUS_KEY, 'bonus', {});
  loadWithVault(LS.daily, 'daily', {});
  loadWithVault(LEVEL_PROGRESS_KEY, 'levelProgress', {});
}, 30000);

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      log('[pwa] service worker registered', { scope: reg.scope });
    }).catch((err) => {
      log('[pwa] service worker registration failed', err);
    });
  });
}
registerServiceWorker();

let deferredInstallPrompt = null;
function setupInstallPrompt() {
  const banner = document.getElementById('installBanner');
  if (!banner) return;
  const btn = document.getElementById('installBannerBtn');
  const close = document.getElementById('installBannerClose');

  const dismissInstall = () => {
    banner.style.display = 'none';
    try { sessionStorage.setItem('sd_install_dismissed', '1'); } catch (_) {}
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    try {
      if (sessionStorage.getItem('sd_install_dismissed')) return;
    } catch (_) {}
    banner.style.display = 'flex';
  });

  if (btn) {
    btn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      log('[pwa] install choice', { outcome: choice.outcome });
      deferredInstallPrompt = null;
      if (choice.outcome === 'accepted') dismissInstall();
    });
  }

  if (close) close.addEventListener('click', dismissInstall);

  window.addEventListener('appinstalled', () => {
    log('[pwa] app installed');
    dismissInstall();
  });
}
setupInstallPrompt();

function setupConnectivityHints() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const offlineToast = (on) => {
    toast.textContent = on ? 'Back online!' : 'Offline — saved progress will sync when you reconnect';
    toast.classList.add('open');
    setTimeout(() => toast.classList.remove('open'), 3000);
  };
  window.addEventListener('offline', () => offlineToast(false));
  window.addEventListener('online', () => offlineToast(true));
}
setupConnectivityHints();

document.addEventListener('DOMContentLoaded', () => {
  log('[init] DOMContentLoaded fired');
  init();
});
