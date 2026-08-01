(function () {
  var overlay = document.getElementById('shareOverlay');
  if (!overlay) return;

  function buildUrl(source) {
    if (window.AscendokuReferral && window.AscendokuReferral.getShareUrl) {
      return window.AscendokuReferral.getShareUrl(source);
    }
    return window.location.href;
  }

  function openShare() {
    var native = document.getElementById('shareNative');
    if (native) native.style.display = navigator.share ? 'flex' : 'none';
    overlay.classList.add('open');
  }

  function closeShare() {
    overlay.classList.remove('open');
  }

  var shareBtn = document.getElementById('gameShareBtn');
  if (shareBtn) shareBtn.addEventListener('click', openShare);

  var closeBtn = document.getElementById('shareClose');
  if (closeBtn) closeBtn.addEventListener('click', closeShare);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeShare();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeShare();
  });

  overlay.querySelectorAll('.share-btn[data-platform]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      handleShare(btn.dataset.platform);
    });
  });

  function handleShare(platform) {
    var withSource = (platform === 'copy' || platform === 'native') ? null : platform;
    var url = buildUrl(withSource);
    var text = 'Play Ascendoku! Climb the ranks 🧩';
    var encodedUrl = encodeURIComponent(url);
    var shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl;
        break;
      case 'x':
        shareUrl = 'https://twitter.com/intent/tweet?url=' + encodedUrl + '&text=' + encodeURIComponent(text);
        break;
      case 'whatsapp':
        shareUrl = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
        break;
      case 'telegram':
        shareUrl = 'https://t.me/share/url?url=' + encodedUrl + '&text=' + encodeURIComponent(text);
        break;
      case 'copy':
        navigator.clipboard.writeText(url).then(function () {
          showToast('Referral link copied!');
        }).catch(function () {
          showToast('Copy: ' + url);
        });
        closeShare();
        return;
      case 'native':
        navigator.share({ title: 'Ascendoku', text: text, url: url }).catch(function () {});
        closeShare();
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=640,height=480');
    }
    closeShare();
  }
})();
