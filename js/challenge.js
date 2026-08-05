(function () {
  // ============================================================
  // Challenge Links — seed-based "beat my time" challenges
  // Compact token format (v2): b<diff><T4><M2><H2><C2>.<name>_<hash>
  //   b        = version marker
  //   diff     = one char (e/m/h/i/x)
  //   T4       = time in sec, base36 uppercase, zero-padded 4
  //   M2       = mistakes, base36, zero-padded 2
  //   H2       = hints used, base36, zero-padded 2
  //   C2       = best combo, base36, zero-padded 2
  //   name     = sanitized [a-zA-Z0-9-], up to 14 chars
  //   hash     = base36 of the puzzle seed's 32-bit hash (6-7 chars).
  //              The puzzle RNG is seeded from hashStr(seed), so this
  //              regenerates the exact same puzzle with a far shorter token.
  // v1 tokens (a<diff>...<name>_<rawSeed>) still decode for old links.
  // URL: /<token>   (also accepts ?c=<token>)
  // Legacy: ?challenge=1&cs=<seed>&cd=<difficulty>&ct=<time>&cn=<name>
  // ============================================================

  var CH_VERSION = 'b';
  var DIFF_CODE = { easy: 'e', medium: 'm', hard: 'h', impossible: 'i', custom: 'x' };
  var DIFF_CODE_REV = { e: 'easy', m: 'medium', h: 'hard', i: 'impossible', x: 'custom' };

  function getParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  function base36(num, len) {
    var s = Math.max(0, num | 0).toString(36).toUpperCase();
    while (s.length < len) s = '0' + s;
    return s;
  }

  function fromBase36(str) {
    var v = parseInt(str, 36);
    return isNaN(v) ? 0 : v;
  }

  function encodeChallenge(payload) {
    var name = String(payload.name || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 14);
    var rawSeed = payload.seed;
    var seedNum = (typeof rawSeed === 'number' ? rawSeed : hashStr(String(rawSeed || ''))) >>> 0;
    var seed = seedNum.toString(36).toUpperCase();
    var diff = DIFF_CODE[payload.difficulty] || 'm';
    return CH_VERSION + diff
      + base36(payload.time || 0, 4)
      + base36(payload.mistakes || 0, 2)
      + base36(payload.hints || 0, 2)
      + base36(payload.combo || 0, 2)
      + '.' + name + '_' + seed;
  }

  function decodeChallenge(token) {
    if (!token || typeof token !== 'string' || token.length < 12) return null;
    var version = token.charAt(0);
    if (version !== 'a' && version !== 'b') return null;
    var diff = DIFF_CODE_REV[token.charAt(1)];
    if (!diff) return null;
    var t = fromBase36(token.substr(2, 4));
    var m = fromBase36(token.substr(6, 2));
    var h = fromBase36(token.substr(8, 2));
    var c = fromBase36(token.substr(10, 2));
    var rest = token.substr(12);
    if (rest.charAt(0) !== '.') return null;
    rest = rest.slice(1);
    var sep = rest.indexOf('_');
    var name = sep === -1 ? '' : rest.slice(0, sep);
    var seedRaw = sep === -1 ? rest : rest.slice(sep + 1);
    if (!seedRaw) return null;
    var seed = seedRaw;
    if (version === 'b') {
      seed = parseInt(seedRaw, 36);
      if (isNaN(seed)) return null;
    }
    return { version: version, difficulty: diff, time: t, mistakes: m, hints: h, combo: c, name: name, seed: seed };
  }

  function referralName() {
    if (window.AscendokuReferral && window.AscendokuReferral.getDisplayName) {
      var n = window.AscendokuReferral.getDisplayName();
      if (n && n !== 'You') return n;
    }
    return 'Friend';
  }

  function parseChallenge() {
    var c = getParam('c');
    if (c) {
      var ch = decodeChallenge(c);
      if (ch && DIFFICULTY_TIER_MAP[ch.difficulty]) {
        ch.name = ch.name || referralName();
        return ch;
      }
      return null;
    }

    // bare path token, e.g. site.com/<token>
    var path = window.location.pathname || '';
    if (path.length > 1) {
      var seg = path.slice(1);
      if (seg.length >= 12 && /^[a-zA-Z0-9_.-]+$/.test(seg)) {
        var ch2 = decodeChallenge(seg);
        if (ch2 && DIFFICULTY_TIER_MAP[ch2.difficulty]) {
          ch2.name = ch2.name || referralName();
          return ch2;
        }
      }
    }

    // legacy query format
    if (getParam('challenge') === '1') {
      var seed = getParam('cs');
      var difficulty = getParam('cd');
      var time = parseInt(getParam('ct'), 10);
      if (!seed || !DIFFICULTY_TIER_MAP[difficulty]) return null;
      return { version: CH_VERSION, difficulty: difficulty, time: isNaN(time) ? 0 : time, mistakes: 0, hints: 0, combo: 0, name: getParam('cn') || referralName(), seed: seed };
    }
    return null;
  }

  var _lastWinTime = 0;

  function buildChallengeUrl() {
    var payload = {
      difficulty: resolveCustomDifficulty(),
      time: Math.round(_lastWinTime || state.timer || 0),
      mistakes: state.mistakes || 0,
      hints: state.hintsUsed || 0,
      combo: state.maxCombo || 0,
      name: referralName(),
      seed: state._seed || state.challengeSeed || ''
    };
    var token = encodeChallenge(payload);
    var url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.pathname = '/' + token;
    return url.toString();
  }

  function copyOrShare(url, label) {
    if (navigator.share) {
      navigator.share({ title: 'Ascendoku Challenge', text: 'Can you beat my time? ' + label, url: url }).catch(function () {});
    } else {
      navigator.clipboard.writeText(url).then(function () {
        showToast('Challenge link copied!');
      }).catch(function () {
        showToast('Copy: ' + url);
      });
    }
  }

  function setupChallengeBanner() {
    var banner = document.getElementById('challengeBanner');
    if (!banner) return;
    var t = state.challengeTarget;
    if (!state.isChallenge || !t || !t.time) {
      banner.style.display = 'none';
      return;
    }
    var titleEl = document.getElementById('challengeBannerTitle');
    var targetsEl = document.getElementById('challengeBannerTargets');
    if (titleEl) titleEl.textContent = 'Challenge from ' + (t.name || 'Friend');
    if (targetsEl) {
      var parts = [];
      if (t.time) parts.push('Time to beat: <b>' + formatTime(t.time) + '</b>');
      if (typeof t.mistakes === 'number' && t.mistakes >= 0) parts.push('Mistakes to beat: <b>' + t.mistakes + '</b>');
      if (typeof t.hints === 'number' && t.hints >= 0) parts.push('Hints: <b>' + t.hints + '</b>');
      if (typeof t.combo === 'number' && t.combo > 0) parts.push('Combo: <b>x' + t.combo + '</b>');
      targetsEl.innerHTML = parts.join(' &middot; ');
    }
    banner.style.display = 'block';
  }

  function startChallengeGame(ch) {
    log('[challenge] startChallengeGame()', ch);
    clearGame();
    initNewGame(ch.difficulty, false, 1, null, { seed: ch.seed, name: ch.name, time: ch.time, mistakes: ch.mistakes, hints: ch.hints, combo: ch.combo });
    setupChallengeBanner();
  }

  function rematchChallenge() {
    log('[challenge] rematchChallenge()');
    var seed = state.challengeSeed || state._seed;
    var t = state.challengeTarget || {};
    clearGame();
    initNewGame(state.difficulty, false, 1, null, {
      seed: seed,
      name: t.name || referralName(),
      time: t.time || 0,
      mistakes: t.mistakes || 0,
      hints: t.hints || 0,
      combo: t.combo || 0
    });
    setupChallengeBanner();
  }

  function setupWinChallengeUI() {
    _lastWinTime = state.timer;

    var friendBtn = document.getElementById('winChallengeFriend');
    if (friendBtn) {
      friendBtn.style.display = (state.isDaily || state.isChallenge || !state._seed) ? 'none' : 'inline-flex';
      friendBtn.onclick = function () {
        var url = buildChallengeUrl();
        copyOrShare(url, formatTime(_lastWinTime));
      };
    }

    if (!state.isChallenge || !state.challengeTarget) {
      var hiddenWrap = document.getElementById('winChallenge');
      if (hiddenWrap) hiddenWrap.style.display = 'none';
      return;
    }

    var timesEl = document.getElementById('winChallengeTimes');
    var resultEl = document.getElementById('winChallengeResult');
    var backBtn = document.getElementById('winChallengeBack');
    var rematchBtn = document.getElementById('winChallengeRematch');
    if (!timesEl || !resultEl || !backBtn) return;
    if (rematchBtn) {
      rematchBtn.onclick = function () {
        var ov = document.getElementById('winOverlay');
        if (ov) ov.classList.remove('open');
        rematchChallenge();
      };
    }

    var target = state.challengeTarget;
    if (!target) return;
    var myTime = state.timer;
    var beat = myTime < target.time;

    var wrap = document.getElementById('winChallenge');
    if (wrap) wrap.style.display = 'block';
    timesEl.innerHTML =
      '<span class="win-ch-t">You <b>' + formatTime(myTime) + '</b> &middot; ' + (state.mistakes || 0) + ' err</span>' +
      '<span class="win-ch-vs">vs</span>' +
      '<span class="win-ch-t">' + target.name + ' <b>' + formatTime(target.time) + '</b> &middot; ' + (target.mistakes || 0) + ' err</span>';
    resultEl.textContent = beat
      ? 'You beat ' + target.name + '! Challenge them back to keep the rivalry going.'
      : target.name + ' beat you by ' + formatTime(target.time - myTime) + '. Try again or flip the tables!';

    backBtn.onclick = function () {
      var url = buildChallengeUrl();
      copyOrShare(url, formatTime(myTime));
    };
  }

  window.AscendokuChallenge = {
    parse: parseChallenge,
    buildChallengeUrl: buildChallengeUrl,
    start: startChallengeGame,
    setupWinUI: setupWinChallengeUI,
    setupBanner: setupChallengeBanner,
    encode: encodeChallenge,
    decode: decodeChallenge
  };
})();
