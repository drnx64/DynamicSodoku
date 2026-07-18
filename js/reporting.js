let WEBHOOK_URL = '';

async function loadEnv() {
  try {
    const res = await fetch('.env');
    const text = await res.text();
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (t && !t.startsWith('#')) {
        const eq = t.indexOf('=');
        if (eq > 0) {
          const key = t.slice(0, eq).trim();
          const val = t.slice(eq + 1).trim();
          if (key === 'DISCORD_WEBHOOK_URL' && val) WEBHOOK_URL = val;
        }
      }
    }
  } catch (e) {
    console.warn('[reporting] Could not load .env file, error reporting disabled');
  }
}

function reportError(context, err) {
  if (!WEBHOOK_URL) return;
  const breadcrumbs = getBreadcrumbs().slice(-20).map(c => c.type + ': ' + c.data).join('\n');
  const payload = {
    content: null,
    embeds: [{
      title: 'DynamicSodoku Error Report',
      color: 0xef4444,
      fields: [
        { name: 'Context', value: (context || '').slice(0, 256), inline: true },
        { name: 'Message', value: (err?.message || String(err || 'Unknown')).slice(0, 512), inline: false },
        { name: 'Stack', value: (err?.stack || 'N/A').slice(0, 1000), inline: false },
        { name: 'Breadcrumbs', value: breadcrumbs.slice(0, 1000) || 'None', inline: false },
        { name: 'URL', value: location.href.slice(0, 256), inline: true },
        { name: 'User Agent', value: navigator.userAgent.slice(0, 200), inline: true },
      ],
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
    reportError(`window.onerror: ${msg}`, err);
    return true;
  };
  window.addEventListener('unhandledrejection', function (e) {
    reportError('Unhandled Promise rejection', e.reason);
  });
}

loadEnv();
setupErrorReporting();
