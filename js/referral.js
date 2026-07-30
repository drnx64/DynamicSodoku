(function () {
  var REFERRAL_KEY = 'sudoku_visitor_id';
  var NOTIFIED_KEY = 'sudoku_visited';
  var CREDITED_KEY = 'sudoku_credited_refs';

  function getRefFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('ref') || null;
  }

  function getVisitorId() {
    var id = localStorage.getItem(REFERRAL_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem(REFERRAL_KEY, id);
    }
    return id;
  }

  function getCreditedRefs() {
    try {
      var raw = localStorage.getItem(CREDITED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function addCreditedRef(ref) {
    try {
      var list = getCreditedRefs();
      if (list.indexOf(ref) === -1) {
        list.push(ref);
        localStorage.setItem(CREDITED_KEY, JSON.stringify(list));
      }
    } catch (e) {}
  }

  function sendToDiscord(content) {
    var encoded = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTUzMjMxNzYzMDIzMTM0NzM4MS9fN0tMeGtDdURzMEZ3Y2VCT0VQbkNJaUZQbEV4TjFaTmNNNlhoT1RiRjRBMnZlT2RJNHJWUTFzZ0d2UHFsLXpwV0RVLQ==';
    var webhookUrl;
    try { webhookUrl = atob(encoded); } catch (e) { return; }
    try {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content })
      }).catch(function () {});
    } catch (e) {}
  }

  function sanitize(str) {
    return (str || '').replace(/[<>&"']/g, '').slice(0, 100);
  }

  function isLikelyBot() {
    try {
      return navigator.webdriver || /bot|crawl|spider|scrape|Headless/i.test(navigator.userAgent);
    } catch (e) { return false; }
  }

  function replaceRefInURL(visitorId) {
    var url = new URL(window.location.href);
    url.searchParams.set('ref', visitorId);
    window.history.replaceState({}, '', url.toString());
  }

  if (isLikelyBot()) return;

  var referrerId = getRefFromURL();
  var visitorId = getVisitorId();
  var visited = localStorage.getItem(NOTIFIED_KEY);

  if (!visited) {
    var msg = 'New visitor: **' + sanitize(visitorId) + '**';
    sendToDiscord(msg);
    try { localStorage.setItem(NOTIFIED_KEY, '1'); } catch (e) {}
  }

  if (referrerId && referrerId !== visitorId) {
    var credited = getCreditedRefs();
    if (credited.indexOf(referrerId) === -1) {
      sendToDiscord('Referral credit: **' + sanitize(referrerId) + '** → **' + sanitize(visitorId) + '**');
      addCreditedRef(referrerId);
    }
  }

  replaceRefInURL(visitorId);
})();
