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

  function notifyTelegram(referrerId) {
    var BOT_TOKEN = 'YOUR_BOT_TOKEN'; 
    var CHAT_ID = 'YOUR_CHAT_ID';    
    var text = encodeURIComponent('New referral visit from: ' + referrerId);
    var url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + text;
    try {
      fetch(url, { method: 'POST' }).catch(function () {});
    } catch (e) {}
  }

  function replaceRefInURL(visitorId) {
    var url = new URL(window.location.href);
    url.searchParams.set('ref', visitorId);
    window.history.replaceState({}, '', url.toString());
  }

  var referrerId = getRefFromURL();
  var visitorId = getVisitorId();

  if (referrerId) {
    notifyTelegram(referrerId);
  }

  replaceRefInURL(visitorId);
})();
