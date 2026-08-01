(function () {
  // ============================================================
  // Challenge Links — seed-based "beat my time" challenges
  // URL: ?challenge=1&cs=<seed>&cd=<difficulty>&ct=<time>&cn=<name>
  // ============================================================

  var CH_KEY = 'sudoku_challenge_played';

  function getParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  function parseChallenge() {
    if (getParam('challenge') !== '1') return null;
    var seed = getParam('cs');
    var difficulty = getParam('cd');
    var time = parseInt(getParam('ct'), 10);
    var name = getParam('cn') || (window.AscendokuReferral && window.AscendokuReferral.getDisplayName ? window.AscendokuReferral.getDisplayName() : 'Friend');
    if (!seed || !DIFFICULTY_TIER_MAP[difficulty]) return null;
    return { seed: seed, difficulty: difficulty, time: isNaN(time) ? 0 : time, name: name };
  }

  var _lastWinTime = 0;

  function buildChallengeUrl() {
    var base = (window.AscendokuReferral && window.AscendokuReferral.getShareUrl) ? window.AscendokuReferral.getShareUrl('challenge') : window.location.href;
    var url = new URL(base);
    url.searchParams.set('challenge', '1');
    url.searchParams.set('cs', state._seed || state.challengeSeed || '');
    url.searchParams.set('cd', state.difficulty);
    url.searchParams.set('ct', String(Math.round(_lastWinTime || state.timer || 0)));
    var name = window.AscendokuReferral && window.AscendokuReferral.getDisplayName ? window.AscendokuReferral.getDisplayName() : 'Friend';
    url.searchParams.set('cn', name);
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

  function startChallengeGame(ch) {
    log('[challenge] startChallengeGame()', ch);
    clearGame();
    initNewGame(ch.difficulty, false, 1, null, { seed: ch.seed, name: ch.name, time: ch.time });
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

    var timesEl = document.getElementById('winChallengeTimes');
    var resultEl = document.getElementById('winChallengeResult');
    var backBtn = document.getElementById('winChallengeBack');
    if (!state.isChallenge || !state.challengeTarget) return;
    if (!timesEl || !resultEl || !backBtn) return;

    var target = state.challengeTarget;
    var myTime = state.timer;
    var beat = myTime < target.time;

    var wrap = document.getElementById('winChallenge');
    if (wrap) wrap.style.display = 'block';
    timesEl.innerHTML =
      '<span class="win-ch-t">You <b>' + formatTime(myTime) + '</b></span>' +
      '<span class="win-ch-vs">vs</span>' +
      '<span class="win-ch-t">' + target.name + ' <b>' + formatTime(target.time) + '</b></span>';
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
    setupWinUI: setupWinChallengeUI
  };
})();
