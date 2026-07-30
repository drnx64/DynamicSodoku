(function () {
  var REFERRAL_KEY = 'sudoku_visitor_id';
  var NAME_KEY = 'sudoku_visitor_name';
  var NOTIFIED_KEY = 'sudoku_visited';
  var CREDITED_KEY = 'sudoku_credited_refs';

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
      id = crypto.randomUUID();
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
    return (str || '').replace(/[<>&"']/g, '').slice(0, 50);
  }

  function isLikelyBot() {
    try {
      return navigator.webdriver || /bot|crawl|spider|scrape|Headless/i.test(navigator.userAgent);
    } catch (e) { return false; }
  }

  function replaceRefInURL(visitorId, displayName) {
    var url = new URL(window.location.href);
    url.searchParams.set('ref', visitorId);
    url.searchParams.set('n', displayName);
    window.history.replaceState({}, '', url.toString());
  }

  if (isLikelyBot()) return;

  var referrerId = getRefFromURL();
  var referrerName = getRefNameFromURL();
  var visitorId = getVisitorId();
  var visitorName = getDisplayName();
  var visited = localStorage.getItem(NOTIFIED_KEY);

  if (!visited) {
    sendToDiscord('🆕 **' + sanitize(visitorName) + '** visited the site!');
    try { localStorage.setItem(NOTIFIED_KEY, '1'); } catch (e) {}
  }

  if (referrerId && referrerId !== visitorId) {
    var credited = getCreditedRefs();
    if (credited.indexOf(referrerId) === -1) {
      var shownName = referrerName || referrerId;
      sendToDiscord('🔗 **' + sanitize(shownName) + '** referred **' + sanitize(visitorName) + '**');
      addCreditedRef(referrerId);
    }
  }

  replaceRefInURL(visitorId, visitorName);
})();
