(function () {

  const patterns = [
    { platform: 'Facebook',  regex: /FBAN|FBAV|FB_IAB|FBIOS/i },
    { platform: 'Instagram', regex: /Instagram/i },
    { platform: 'Messenger', regex: /FB_IAB\/MESSENGER/i },
    { platform: 'TikTok',    regex: /musical_ly|BytedanceWebview|TikTok/i },
    { platform: 'LinkedIn',  regex: /LinkedInApp/i },
    { platform: 'Line',      regex: /\bLine\//i },
    { platform: 'WeChat',    regex: /MicroMessenger/i },
    { platform: 'Twitter/X', regex: /Twitter/i },
    { platform: 'Snapchat',  regex: /Snapchat/i },
  ];

  const shimDomains = ['l.facebook.com', 'lm.facebook.com', 'l.instagram.com', 't.co'];

  function detect() {
    const ua = navigator.userAgent;
    let platform = null;
    let uaMatch = false;

    for (const p of patterns) {
      if (p.regex.test(ua)) {
        platform = p.platform;
        uaMatch = true;
        break;
      }
    }

    let signals = 0;
    if (uaMatch) signals += 2;
    try {
      if (navigator.share === undefined) signals += 1;
    } catch (_) { signals += 1; }
    try {
      if (typeof PaymentRequest === 'undefined') signals += 1;
    } catch (_) { signals += 1; }
    try {
      const ref = document.referrer || '';
      if (shimDomains.some(d => ref.includes(d))) signals += 2;
    } catch (_) {}

    let confidence = 'low';
    if (signals >= 4) confidence = 'high';
    else if (signals >= 2) confidence = 'medium';

    return {
      isInApp: confidence === 'high' || (confidence === 'medium' && uaMatch),
      platform,
      confidence,
    };
  }

  function showOverlay(result) {
    const platformName = result.platform || 'in-app browser';

    let instructions = 'Open this page in your browser for the best experience.';
    if (result.platform === 'Instagram' || result.platform === 'Facebook' || result.platform === 'Messenger') {
      instructions = 'Tap ⋯ (menu) in the top-right corner, then select "Open in Browser".';
    } else if (result.platform === 'Twitter/X') {
      instructions = 'Tap ⋯ (menu) and select "Open in Browser".';
    } else if (result.platform === 'TikTok') {
      instructions = 'Tap the browser icon in the top bar.';
    }

    const overlay = document.createElement('div');
    overlay.id = 'inapp-overlay';
    overlay.innerHTML =
      '<div class="inapp-card">' +
        '<div class="inapp-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg></div>' +
        '<h2>Open in Browser</h2>' +
        '<p class="inapp-message">For the best and most secure experience, please open this page in your browser.</p>' +
        '<p class="inapp-instructions">' + instructions + '</p>' +
        '<button class="inapp-copy-btn" id="inappCopyBtn">Copy Link</button>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('inappCopyBtn').addEventListener('click', function () {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          document.getElementById('inappCopyBtn').textContent = 'Copied!';
          setTimeout(function () {
            document.getElementById('inappCopyBtn').textContent = 'Copy Link';
          }, 2000);
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); document.getElementById('inappCopyBtn').textContent = 'Copied!'; } catch (_) {}
        document.body.removeChild(ta);
        setTimeout(function () {
          document.getElementById('inappCopyBtn').textContent = 'Copy Link';
        }, 2000);
      }
    });

  }

  var params = new URLSearchParams(window.location.search);
  if (params.has('skipInAppCheck')) return;

  var result = detect();
  if (result.isInApp) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { showOverlay(result); });
    } else {
      showOverlay(result);
    }
  }

})();
