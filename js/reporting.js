var WEBHOOK_URL = (function () {
  try {
    return atob('aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTUyNzkxNTMwNDU3Mzg2NjEzNC9pWGpCS2pUN1A3SGp5UVFQOERjdGZCUVRIU0kzdUNkTE9DOXpaMU5LN3BUSTBzaGFYM1NRTVVPLXMxWDAyRVVGNjZsWQ==');
  } catch (e) { return ''; }
})();

function reportError(context, err) {
  if (!WEBHOOK_URL) return;
  const breadcrumbs = getBreadcrumbs().slice(-20).map(c => c.type + ': ' + c.data).join('\n');
  const lines = [];
  lines.push('### Context');
  lines.push(context || 'Unknown');
  lines.push('');
  lines.push('### Message');
  lines.push(err?.message || String(err || 'Unknown'));
  lines.push('');
  lines.push('### Stack');
  lines.push(err?.stack || 'N/A');
  lines.push('');
  lines.push('### Breadcrumbs');
  lines.push(breadcrumbs || 'None');
  lines.push('');
  lines.push('### URL');
  lines.push(location.href);
  lines.push('');
  lines.push('### User Agent');
  lines.push(navigator.userAgent);
  const body = lines.join('\n');

  const MAX_FIELD = 1000;
  const chunks = [];
  for (let i = 0; i < body.length; i += MAX_FIELD) {
    chunks.push('```\n' + body.slice(i, i + MAX_FIELD) + '\n```');
  }

  const fields = chunks.map((value, i) => ({
    name: chunks.length > 1 ? 'Report (part ' + (i + 1) + '/' + chunks.length + ')' : 'Report',
    value: value,
    inline: false,
  }));

  const payload = {
    content: null,
    embeds: [{
      title: 'Ascendoku Error Report',
      color: 0xef4444,
      fields: fields,
      timestamp: new Date().toISOString(),
    }],
  };
  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function reportIssue(context, detail) {
  reportError('Manual: ' + context, new Error(detail));
}

function reportBreadcrumb(type, data) {
  const stored = sessionStorage.getItem('sd_breadcrumbs');
  const crumbs = stored ? JSON.parse(stored) : [];
  crumbs.push({ t: Date.now(), type, data: String(data).slice(0, 100) });
  if (crumbs.length > 50) crumbs.splice(0, crumbs.length - 50);
  sessionStorage.setItem('sd_breadcrumbs', JSON.stringify(crumbs));
}

function getBreadcrumbs() {
  try {
    const stored = sessionStorage.getItem('sd_breadcrumbs');
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function setupErrorReporting() {
  window.onerror = function (msg, url, line, col, err) {
    reportError('window.onerror: ' + msg, err);
    return true;
  };
  window.addEventListener('unhandledrejection', function (e) {
    reportError('Unhandled Promise rejection', e.reason);
  });
}

setupErrorReporting();
