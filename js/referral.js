(function () {
  var REFERRAL_KEY = 'sudoku_visitor_id';

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

  function notifyDiscord(referrerId, visitorId) {
    var encoded = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTUzMjMxNzYzMDIzMTM0NzM4MS9fN0tMeGtDdURzMEZ3Y2VCT0VQbkNJaUZQbEV4TjFaTmNNNlhoT1RiRjRBMnZlT2RJNHJWUTFzZ0d2UHFsLXpwV0RVLQ==';
    var webhookUrl;
    try { webhookUrl = atob(encoded); } catch (e) { return; }
    var safeRef = (referrerId || '').replace(/[<>&"']/g, '');
    var safeVis = (visitorId || '').replace(/[<>&"']/g, '');
    var payload = { content: 'Referral: **' + safeRef + '** → **' + safeVis + '**' };
    try {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () {});
    } catch (e) {}
  }

  function replaceRefInURL(visitorId) {
    var url = new URL(window.location.href);
    url.searchParams.set('ref', visitorId);
    window.history.replaceState({}, '', url.toString());
  }

  var referrerId = getRefFromURL();
  var visitorId = getVisitorId();

  if (referrerId && referrerId !== visitorId) {
    notifyDiscord(referrerId, visitorId);
  }

  replaceRefInURL(visitorId);
})();
