(function () {
  var REFERRAL_KEY = 'sudoku_visitor_id';
  var NAME_KEY = 'sudoku_visitor_name';
  var NOTIFIED_KEY = 'sudoku_visited';
  var REFERRED_BY_KEY = 'sudoku_referred_by';
  var SOURCE_KEY = 'sudoku_source';

  var NAMES = [
    'Mario','Angelica','Ael','Sam','Josh','Luna','Nova','Kai','Zara','Rex',
    'Ivy','Jade','Orion','Vega','Cleo','Finn','Gia','Hugo','Iris','Jax',
    'Kira','Leo','Mila','Nash','Onyx','Piper','Quinn','Remy','Sage','Tess',
    'Uma','Vince','Wren','Xena','Yuki','Zion','Aria','Blaise','Cora','Dax',
    'Elio','Faye','Gale','Halo','Indy','Jules','Kade','Lux','Moxie','Noir',
    'Olive','Pace','Rune','Skye','True','Vale','Witt','Zuri','Arlo','Bree',
    'Cyra','Dove','Eden','Frost','Gwen','Haven','Isla','Jett','Koa','Leaf',
    'Moss','Nyx','Oaks','Prim','Rain','Shay','Thorn','Wolf','Ash','Blue',
    'Cole','Dune','Echo','Fern','Gray','Haze','Ione','Jazz','Kestrel','Lake'
  ];

  function genName() {
    var name = NAMES[Math.floor(Math.random() * NAMES.length)];
    var tag = Math.random().toString(36).substring(2, 5);
    return name + '-' + tag;
  }

  function getVisitorId() {
    var id = localStorage.getItem(REFERRAL_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      localStorage.setItem(REFERRAL_KEY, id);
    }
    return id;
  }

  function getDisplayName() {
    var name = localStorage.getItem(NAME_KEY);
    if (!name) {
      name = genName();
      localStorage.setItem(NAME_KEY, name);
    }
    return name;
  }

  function getRefFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('ref') || null;
  }

  function getRefNameFromURL() {
    var params = new URLSearchParams(window.location.search);
    return params.get('n') || null;
  }

  function getReferredBy() {
    try {
      return localStorage.getItem(REFERRED_BY_KEY) || null;
    } catch (e) { return null; }
  }

  function setReferredBy(ref) {
    try { localStorage.setItem(REFERRED_BY_KEY, ref); } catch (e) {}
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
    return (str || '').replace(/[<>&"']/g, '').slice(0, 50);
  }

  function isLikelyBot() {
    try {
      return navigator.webdriver || /bot|crawl|spider|scrape|Headless/i.test(navigator.userAgent);
    } catch (e) { return false; }
  }

  function getUTMSource() {
    var params = new URLSearchParams(window.location.search);
    return params.get('utm_source') || null;
  }

  function detectReferrerSource() {
    var ref = document.referrer;
    if (!ref) return 'Direct';
    try {
      var host = new URL(ref).hostname.replace(/^www\./, '');
      if (/facebook/.test(host)) return 'Facebook';
      if (/instagram/.test(host)) return 'Instagram';
      if (/t\.me|telegram/.test(host)) return 'Telegram';
      if (/whatsapp/.test(host)) return 'WhatsApp';
      if (/x\.com|twitter/.test(host)) return 'X (Twitter)';
      if (/linkedin/.test(host)) return 'LinkedIn';
      if (/youtube|youtu\.be/.test(host)) return 'YouTube';
      if (/reddit/.test(host)) return 'Reddit';
      if (/pinterest/.test(host)) return 'Pinterest';
      if (/google|bing|yahoo|duckduckgo/.test(host)) return 'Search';
      return host;
    } catch (e) { return 'Direct'; }
  }

  function getArrivalSource() {
    return getUTMSource() || detectReferrerSource();
  }

  function getFirstSource() {
    try {
      var stored = localStorage.getItem(SOURCE_KEY);
      if (stored) return stored;
    } catch (e) {}
    var source = getArrivalSource();
    try { localStorage.setItem(SOURCE_KEY, source); } catch (e) {}
    return source;
  }

  function getDeviceInfo() {
    var ua = navigator.userAgent;
    var device = /iPad|Tablet|PlayBook/i.test(ua) ? 'Tablet'
      : /Mobi|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';
    var browser = 'Browser';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Chrome\//.test(ua)) browser = 'Chrome';
    else if (/Safari\//.test(ua)) browser = 'Safari';
    var os = 'OS';
    if (/Windows/.test(ua)) os = 'Windows';
    else if (/Mac OS/.test(ua)) os = 'macOS';
    else if (/Android/.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iOS/.test(ua)) os = 'iOS';
    else if (/Linux/.test(ua)) os = 'Linux';
    return device + ' · ' + browser + ' · ' + os;
  }

  function replaceRefInURL(visitorId, displayName) {
    var url = new URL(window.location.href);
    url.searchParams.set('ref', visitorId);
    url.searchParams.set('n', displayName);
    window.history.replaceState({}, '', url.toString());
  }

  function buildShareUrl(source) {
    var url = new URL(window.location.href);
    url.searchParams.set('ref', getVisitorId());
    url.searchParams.set('n', getDisplayName());
    if (source) {
      url.searchParams.set('utm_source', source);
      url.searchParams.set('utm_medium', 'social');
    }
    return url.toString();
  }

  if (isLikelyBot()) return;

  var referrerId = getRefFromURL();
  var referrerName = getRefNameFromURL();
  var visitorId = getVisitorId();
  var visitorName = getDisplayName();
  var arrivalSource = getArrivalSource();
  var visited = localStorage.getItem(NOTIFIED_KEY);

  if (!visited) {
    var devInfo = getDeviceInfo();
    var msg = '🆕 **' + sanitize(visitorName) + '** visited the site! (' + devInfo + ')';
    if (arrivalSource && arrivalSource !== 'Direct') {
      msg += ' via **' + sanitize(arrivalSource) + '**';
    }
    sendToDiscord(msg);
    try { localStorage.setItem(NOTIFIED_KEY, '1'); } catch (e) {}
    getFirstSource();
  }

  if (referrerId && referrerId !== visitorId && !getReferredBy()) {
    var shownName = referrerName || referrerId;
    var refMsg = '🔗 **' + sanitize(shownName) + '** referred **' + sanitize(visitorName) + '**';
    if (arrivalSource && arrivalSource !== 'Direct') {
      refMsg += ' via **' + sanitize(arrivalSource) + '**';
    }
    sendToDiscord(refMsg);
    setReferredBy(referrerId);
    getFirstSource();
  }

  replaceRefInURL(visitorId, visitorName);

  window.AscendokuReferral = {
    getShareUrl: buildShareUrl,
    getVisitorId: getVisitorId,
    getDisplayName: getDisplayName
  };
})();
