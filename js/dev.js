window.dev = function () {
  state._devMode = !state._devMode;
  if (state._devMode) {
    console.log('%c🧪 DEV MODE ACTIVE', 'font-size:18px;font-weight:bold;color:#fbbf24');
    console.log('%cAll XP costs bypassed — undo, hints, auto-candidates, analyzer, second chance are free.', 'color:#94a3b8');
    console.log('%cRun devPay() to trigger the analyzer pay prompt (no XP deducted).', 'color:#94a3b8');
    showToast('🧪 Dev mode ON — all features free');
  } else {
    console.log('%cDev mode OFF', 'color:#94a3b8');
    showToast('Dev mode OFF');
  }
};

window.devPay = function () {
  if (typeof showAnalyzerUnlock === 'function') {
    console.log('%cTriggering analyzer pay prompt (dev mode — no cost)', 'color:#94a3b8');
    showAnalyzerUnlock();
  } else {
    console.warn('showAnalyzerUnlock not available yet');
  }
};
