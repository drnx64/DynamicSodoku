// ============================================================
// 10. Settings
// ============================================================
const APP_VERSION = '1.9.0';
const APP_VERSION_DATE = '2026-07-18';

const DEFAULT_SETTINGS = {
  highlightSame: true, highlightPeers: true, highlightConflicts: true, highlightWrong: true,
  autoCandidates: false, showRemaining: true, mistakeLimit: true,
  timerVisible: true, darkTheme: false, soundEnabled: true, autoClearNotes: true,
  hapticFeedback: true, autoDarkMode: true, keyboardShortcuts: true,
  colorTheme: 'default', soundTheme: 'classic', playerName: 'Player',
  showCoordinates: true, showCompleted: true,
  reducedAnimations: false,
  dailyReminder: false, dailyReminderTime: '20:00',
  gridSize: 9,
};

const SETTINGS_CATEGORIES = [
  {
    name: 'Visuals',
    icon: 'ico-star',
    settings: [
      { key: 'darkTheme', label: 'Dark theme' },
      { key: 'autoDarkMode', label: 'Auto dark mode (system)' },
      { key: 'timerVisible', label: 'Show timer' },
      { key: 'colorTheme', label: 'Color theme', type: 'select', options: [
        { value: 'default', label: 'Default' },
        { value: 'ocean', label: 'Ocean' },
        { value: 'forest', label: 'Forest' },
        { value: 'sunset', label: 'Sunset' },
        { value: 'mono', label: 'Monochrome' },
      ]},
    ],
  },
  {
    name: 'Audio',
    icon: 'ico-music',
    settings: [
      { key: 'soundEnabled', label: 'Sound effects' },
      { key: 'hapticFeedback', label: 'Haptic feedback (mobile)' },
      { key: 'soundTheme', label: 'Sound theme', type: 'select', options: [
        { value: 'classic', label: 'Classic' },
        { value: 'piano', label: 'Piano' },
        { value: 'digital', label: 'Digital' },
        { value: 'retro', label: 'Retro' },
      ]},
    ],
  },
  {
    name: 'Gameplay',
    icon: 'ico-target',
    settings: [
      { key: 'highlightSame', label: 'Highlight same number' },
      { key: 'highlightPeers', label: 'Highlight row/column/box' },
      { key: 'highlightConflicts', label: 'Highlight conflicts' },
      { key: 'highlightWrong', label: 'Highlight wrong numbers' },
      { key: 'showRemaining', label: 'Show remaining counts' },
      { key: 'mistakeLimit', label: 'Mistake limit (3)' },
      { key: 'autoClearNotes', label: 'Auto-clear notes' },
      { key: 'keyboardShortcuts', label: 'Keyboard shortcuts' },
      { key: 'showCoordinates', label: 'Show coordinates (A1-I9)' },
      { key: 'showCompleted', label: 'Highlight completed rows/cols/boxes' },
      { key: 'reducedAnimations', label: 'Reduced animations (low-end devices)' },
      { key: 'dailyReminder', label: 'Daily reminder (browser notifications)', type: 'toggle' },
      { key: 'dailyReminderTime', label: 'Reminder time', type: 'select', options: [
        { value: '09:00', label: '9:00 AM' },
        { value: '12:00', label: '12:00 PM' },
        { value: '17:00', label: '5:00 PM' },
        { value: '20:00', label: '8:00 PM' },
        { value: '21:00', label: '9:00 PM' },
      ]},
      { key: 'playerName', label: 'Player name', type: 'text' },
    ],
  },
];

function detectDeviceTier() {
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || (isMobile ? 2 : 4);
  const smallScreen = window.innerWidth < 480;
  let score = 0;
  if (cores <= 2) score += 1;
  else if (cores <= 4) score += 2;
  else if (cores <= 8) score += 3;
  else score += 4;
  if (memory <= 1) score += 1;
  else if (memory <= 2) score += 2;
  else if (memory <= 4) score += 3;
  else score += 4;
  if (isMobile) score -= 1;
  if (smallScreen) score -= 1;
  return score <= 3 ? 'low' : score <= 5 ? 'medium' : 'high';
}

function autoDetectAnimations() {
  if (state.settings.reducedAnimations) return;
  const tier = detectDeviceTier();
  if (tier === 'low') {
    state.settings.reducedAnimations = true;
    saveSettings();
    log('[settings] auto-reduced animations for low-end device', { tier, cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory });
  }
}

function haptic(pattern) {
  log('[settings] haptic()', { pattern });
  if (state.settings.hapticFeedback && navigator.vibrate) {
    try { navigator.vibrate(pattern || 10); } catch(e) { log('[settings] haptic error', e); }
  }
}

let darkModeMedia = null;

function setupSettings() {
  log('[settings] setupSettings()');
  const container = document.getElementById('settingsPageContent');
  if (!container) { log('[settings] WARN: #settingsPageContent not found'); return; }
  container.innerHTML = '';

  // Theme selector section - primary
  const themeSection = document.createElement('div');
  themeSection.className = 'settings-section settings-section-primary';
  const themeHeader = document.createElement('div');
  themeHeader.className = 'settings-category-header';
  themeHeader.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><use href="#ico-palette"/></svg> Theme';
  themeSection.appendChild(themeHeader);
  const themeRow = document.createElement('div');
  themeRow.className = 'setting-row';
  const themeOptions = document.createElement('div');
  themeOptions.className = 'theme-options';
  const themes = [
    { id: 'default', label: 'Default', style: 'linear-gradient(135deg,#f0f2f5,#fff)' },
    { id: 'ocean', label: 'Ocean', style: 'linear-gradient(135deg,#e8f4f8,#fff)' },
    { id: 'forest', label: 'Forest', style: 'linear-gradient(135deg,#ecfdf5,#fff)' },
    { id: 'sunset', label: 'Sunset', style: 'linear-gradient(135deg,#fff1f2,#fff)' },
    { id: 'midnight', label: 'Midnight', style: 'linear-gradient(135deg,#1e293b,#0f172a);color:#e2e8f0' },
  ];
  const currentTheme = state.settings.colorTheme || 'default';
  for (const t of themes) {
    const btn = document.createElement('button');
    btn.className = 'theme-option' + (t.id === currentTheme ? ' active' : '');
    btn.dataset.theme = t.id;
    btn.style.cssText = 'background:' + t.style;
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      themeOptions.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.settings.colorTheme = t.id;
      applySettings();
      saveSettings();
    });
    themeOptions.appendChild(btn);
  }
  themeRow.appendChild(themeOptions);
  themeSection.appendChild(themeRow);
  container.appendChild(themeSection);

  const tiers = ['settings-section-primary', 'settings-section-secondary', 'settings-section-secondary'];
  for (let ci = 0; ci < SETTINGS_CATEGORIES.length; ci++) {
    const cat = SETTINGS_CATEGORIES[ci];
    const section = document.createElement('div');
    section.className = 'settings-section ' + (tiers[ci] || 'settings-section-secondary');

    const header = document.createElement('div');
    header.className = 'settings-category-header';
    header.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><use href="#' + cat.icon + '"/></svg> ' + cat.name;
    section.appendChild(header);

    for (const def of cat.settings) {
      if (def.type === 'select') {
        const row = document.createElement('div');
        row.className = 'setting-row';
        const label = document.createElement('span');
        label.className = 'setting-label';
        label.textContent = def.label;
        const select = document.createElement('select');
        select.className = 'setting-select';
        for (const opt of def.options) {
          const op = document.createElement('option');
          op.value = opt.value;
          op.textContent = opt.label;
          if (state.settings[def.key] === opt.value) op.selected = true;
          select.appendChild(op);
        }
        select.addEventListener('change', () => {
          log('[settings] select changed', { key: def.key, value: select.value });
          state.settings[def.key] = select.value;
          applySettings();
          saveSettings();
        });
        row.appendChild(label); row.appendChild(select);
        section.appendChild(row);
      } else if (def.type === 'text') {
        const row = document.createElement('div');
        row.className = 'setting-row';
        const label = document.createElement('span');
        label.className = 'setting-label';
        label.textContent = def.label;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'setting-input';
        input.value = state.settings[def.key] || '';
        input.addEventListener('input', () => {
          state.settings[def.key] = input.value || DEFAULT_SETTINGS[def.key];
          saveSettings();
          updateMenuUI();
        });
        row.appendChild(label); row.appendChild(input);
        section.appendChild(row);
      } else {
        const row = document.createElement('div');
        row.className = 'setting-row';
        const label = document.createElement('span');
        label.className = 'setting-label';
        label.textContent = def.label;
        const toggle = document.createElement('div');
        toggle.className = 'toggle';
        if (state.settings[def.key]) toggle.classList.add('on');
        toggle.addEventListener('click', () => {
          state.settings[def.key] = !state.settings[def.key];
          log('[settings] toggle clicked', { key: def.key, newVal: state.settings[def.key] });
          toggle.classList.toggle('on', state.settings[def.key]);
          applySettings();
          saveSettings();
          if (def.key === 'dailyReminder' && state.settings[def.key]) requestNotificationPermission();
        });
        row.appendChild(label); row.appendChild(toggle);
        section.appendChild(row);
      }
    }
    container.appendChild(section);
  }

  // Auto-Candidates premium section
  const autoSection = document.createElement('div');
  autoSection.className = 'settings-section settings-premium';
  const autoHeader = document.createElement('div');
  autoHeader.className = 'settings-category-header';
  autoHeader.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><use href="#ico-zap"/></svg> Auto-Candidates';
  autoSection.appendChild(autoHeader);
  const autoDesc = document.createElement('div');
  autoDesc.className = 'setting-row';
  autoDesc.innerHTML = '<span class="setting-label">Auto-show candidates</span><span class="premium-badge">10 XP / use</span>';
  autoSection.appendChild(autoDesc);
  const autoStatus = document.createElement('div');
  autoStatus.className = 'setting-row';
  const currentXp = stats.totalXp || 0;
  autoStatus.innerHTML =
    '<span class="setting-label">Your XP</span>' +
    '<span style="font-weight:700;color:var(--xp-gold);font-size:14px;">' + currentXp + ' XP</span>';
  autoSection.appendChild(autoStatus);
  const autoToggleRow = document.createElement('div');
  autoToggleRow.className = 'setting-row';
  const autoToggleLabel = document.createElement('span');
  autoToggleLabel.className = 'setting-label';
  autoToggleLabel.textContent = 'Active now';
  const autoToggle = document.createElement('div');
  autoToggle.className = 'toggle';
  if (state.settings.autoCandidates) autoToggle.classList.add('on');
  autoToggle.addEventListener('click', () => {
    const wantsOn = !state.settings.autoCandidates;
    if (wantsOn) {
      if (!state._autoCandidatesPaid && !state._devMode && (stats.totalXp || 0) < 10) {
        showToast('Not enough XP! (10 XP required)');
        return;
      }
      if (!state._autoCandidatesPaid && !state._devMode) stats.totalXp = (stats.totalXp || 0) - 10;
      saveStats();
      updateMenuUI();
    }
    state.settings.autoCandidates = wantsOn;
    autoToggle.classList.toggle('on', wantsOn);
    applySettings();
    saveSettings();
    requestRender();
    updateNotesBtn();
    const xpSpan = autoStatus.querySelector('span:last-child');
    if (xpSpan) xpSpan.textContent = (stats.totalXp || 0) + ' XP';
  });
  autoToggleRow.appendChild(autoToggleLabel);
  autoToggleRow.appendChild(autoToggle);
  autoSection.appendChild(autoToggleRow);
  container.appendChild(autoSection);

  // Data Management section - tertiary
  const dataSection = document.createElement('div');
  dataSection.className = 'settings-section settings-section-tertiary';
  const dataHeader = document.createElement('div');
  dataHeader.className = 'settings-category-header';
  dataHeader.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><use href="#ico-download"/></svg> Cloud Save';
  dataSection.appendChild(dataHeader);
  const dataRow = document.createElement('div');
  dataRow.className = 'setting-row data-actions cloud-actions';
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export File';
  exportBtn.className = 'data-btn';
  exportBtn.addEventListener('click', () => { log('[settings] click: exportData'); exportData(); });
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy Backup';
  copyBtn.className = 'data-btn';
  copyBtn.addEventListener('click', () => { log('[settings] click: copyBackup'); copyBackup(); });
  const importBtn = document.createElement('button');
  importBtn.textContent = 'Import File';
  importBtn.className = 'data-btn';
  importBtn.addEventListener('click', () => { log('[settings] click: importData'); importData(); });
  const pasteBtn = document.createElement('button');
  pasteBtn.textContent = 'Paste Backup';
  pasteBtn.className = 'data-btn';
  pasteBtn.addEventListener('click', () => { log('[settings] click: pasteBackup'); pasteBackup(); });
  dataRow.appendChild(exportBtn);
  dataRow.appendChild(copyBtn);
  dataRow.appendChild(importBtn);
  dataRow.appendChild(pasteBtn);
  dataSection.appendChild(dataRow);
  const dataDesc = document.createElement('div');
  dataDesc.className = 'cloud-save-desc';
  dataDesc.textContent = 'Back up all progress, streaks, achievements and settings. Restore on any device.';
  dataSection.appendChild(dataDesc);
  container.appendChild(dataSection);

  // Version & About section - tertiary
  const aboutSection = document.createElement('div');
  aboutSection.className = 'settings-section settings-section-tertiary';
  const aboutHeader = document.createElement('div');
  aboutHeader.className = 'settings-category-header';
  aboutHeader.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><use href="#ico-star"/></svg> About';
  aboutSection.appendChild(aboutHeader);

  const versionRow = document.createElement('div');
  versionRow.className = 'setting-row';
  versionRow.innerHTML = '<span class="setting-label">Version</span><span style="color:var(--text-muted);font-size:13px;">' + APP_VERSION + ' (' + APP_VERSION_DATE + ')</span>';
  aboutSection.appendChild(versionRow);

  const devLinks = document.createElement('div');
  devLinks.className = 'dev-links';
  const links = [
    { label: 'Telegram', url: 'https://t.me/drnx64', icon: 'ico-send' },
    { label: 'Facebook Messenger', url: 'https://m.me/drnx64', icon: 'ico-message' },
    { label: 'GitHub', url: 'https://github.com/drnx64', icon: 'ico-code' },
  ];
  for (const link of links) {
    const a = document.createElement('a');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'dev-link';
    a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align:middle;"><use href="#' + link.icon + '"/></svg> @drnx64 <span style="margin-left:auto;color:var(--text-muted);font-size:11px;">' + link.label + '</span>';
    devLinks.appendChild(a);
  }
  aboutSection.appendChild(devLinks);
  container.appendChild(aboutSection);

  log('[settings] setupSettings complete');
}

function applySettings() {
  log('[settings] applySettings()');
  document.documentElement.classList.toggle('reduced-motion', !!state.settings.reducedAnimations);
  document.body.classList.toggle('dark', state.settings.darkTheme);
  if (state.settings.autoDarkMode) {
    if (!darkModeMedia) {
      darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeMedia.addEventListener('change', (e) => {
        if (state.settings.autoDarkMode) {
          document.body.classList.toggle('dark', e.matches);
        }
      });
    }
    document.body.classList.toggle('dark', darkModeMedia.matches);
  } else {
    document.body.classList.toggle('dark', state.settings.darkTheme);
  }

  document.body.dataset.theme = state.settings.colorTheme || 'default';

  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.style.display = state.settings.timerVisible ? '' : 'none';
  const muteBtn = document.getElementById('gameMuteBtn');
  if (muteBtn) {
    muteBtn.classList.toggle('muted', !state.settings.soundEnabled);
  }
  const bc = document.getElementById('boardArea');
  if (bc) bc.classList.toggle('hidden-coords', !state.settings.showCoordinates);
  if (state.board && state.board.length === (state.size || 9)) requestRender();
  scheduleDailyReminder();
}

function rebuildSettingsUI() {
  log('[settings] rebuildSettingsUI()');
  const container = document.getElementById('settingsPageContent');
  if (container) setupSettings();
}

const GAME_SETTINGS_ITEMS = [
  { key: 'highlightSame', label: 'Highlight same number' },
  { key: 'highlightPeers', label: 'Highlight row/col/box' },
  { key: 'highlightConflicts', label: 'Highlight conflicts' },
  { key: 'showRemaining', label: 'Show remaining counts' },
  { key: 'timerVisible', label: 'Show timer' },
  { key: 'autoClearNotes', label: 'Auto-clear notes' },
  { key: 'soundEnabled', label: 'Sound effects' },
  { key: 'showCoordinates', label: 'Show coordinates (A1-I9)' },
  { key: 'showCompleted', label: 'Highlight completed rows/cols/boxes' },
];

const GAME_SETTINGS_EXTRA = [
  { type: 'separator' },
  { type: 'theme' },
  { type: 'select', key: 'colorTheme', label: 'Color theme', options: [
    { value: 'default', label: 'Default' },
    { value: 'ocean', label: 'Ocean' },
    { value: 'forest', label: 'Forest' },
    { value: 'sunset', label: 'Sunset' },
    { value: 'midnight', label: 'Midnight' },
  ]},
  { type: 'select', key: 'soundTheme', label: 'Sound theme', options: [
    { value: 'classic', label: 'Classic' },
    { value: 'piano', label: 'Piano' },
    { value: 'digital', label: 'Digital' },
    { value: 'retro', label: 'Retro' },
  ]},
];

function setupGameSettings() {
  log('[settings] setupGameSettings()');
  const body = document.getElementById('gameSettingsBody');
  if (!body) return;
  body.innerHTML = '';
  
  const allItems = [...GAME_SETTINGS_ITEMS];
  for (const item of allItems) {
    const row = document.createElement('div');
    row.className = 'setting-row';
    const label = document.createElement('span');
    label.className = 'setting-label';
    label.textContent = item.label;
    const toggle = document.createElement('div');
    toggle.className = 'toggle';
    if (state.settings[item.key]) toggle.classList.add('on');
    toggle.addEventListener('click', () => {
      state.settings[item.key] = !state.settings[item.key];
      toggle.classList.toggle('on', state.settings[item.key]);
      applySettings();
      saveSettings();
    });
    row.appendChild(label);
    row.appendChild(toggle);
    body.appendChild(row);
  }

  // separator
  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:var(--border);margin:8px 0;';
  body.appendChild(sep);

  // theme options
  const themeRow = document.createElement('div');
  themeRow.className = 'setting-row';
  themeRow.style.flexDirection = 'column';
  themeRow.style.alignItems = 'stretch';
  themeRow.style.gap = '6px';
  const themeLabel = document.createElement('span');
  themeLabel.className = 'setting-label';
  themeLabel.textContent = 'Color theme';
  themeRow.appendChild(themeLabel);
  const themeOpts = document.createElement('div');
  themeOpts.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
  const themes = [
    { id: 'default', label: 'Default', style: 'linear-gradient(135deg,#f0f2f5,#fff)' },
    { id: 'ocean', label: 'Ocean', style: 'linear-gradient(135deg,#e8f4f8,#fff)' },
    { id: 'forest', label: 'Forest', style: 'linear-gradient(135deg,#ecfdf5,#fff)' },
    { id: 'sunset', label: 'Sunset', style: 'linear-gradient(135deg,#fff1f2,#fff)' },
    { id: 'midnight', label: 'Midnight', style: 'linear-gradient(135deg,#1e293b,#0f172a);color:#e2e8f0' },
  ];
  const currentTheme = state.settings.colorTheme || 'default';
  for (const t of themes) {
    const btn = document.createElement('button');
    btn.className = 'theme-option';
    btn.style.cssText = 'background:' + t.style + ';font-size:10px;padding:5px 8px;border-radius:6px;border:2px solid transparent;cursor:pointer;font-weight:600;';
    if (t.id === currentTheme) btn.style.borderColor = '#7c5cfc';
    btn.textContent = t.label;
    btn.addEventListener('click', () => {
      themeOpts.querySelectorAll('button').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = '#7c5cfc';
      state.settings.colorTheme = t.id;
      applySettings();
      saveSettings();
    });
    themeOpts.appendChild(btn);
  }
  themeRow.appendChild(themeOpts);
  body.appendChild(themeRow);

  // sound theme select
  const soundRow = document.createElement('div');
  soundRow.className = 'setting-row';
  const soundLabel = document.createElement('span');
  soundLabel.className = 'setting-label';
  soundLabel.textContent = 'Sound theme';
  const soundSelect = document.createElement('select');
  soundSelect.className = 'setting-select';
  const soundThemes = [
    { value: 'classic', label: 'Classic' },
    { value: 'piano', label: 'Piano' },
    { value: 'digital', label: 'Digital' },
    { value: 'retro', label: 'Retro' },
  ];
  for (const opt of soundThemes) {
    const op = document.createElement('option');
    op.value = opt.value;
    op.textContent = opt.label;
    if (state.settings.soundTheme === opt.value) op.selected = true;
    soundSelect.appendChild(op);
  }
  soundSelect.addEventListener('change', () => {
    state.settings.soundTheme = soundSelect.value;
    applySettings();
    saveSettings();
  });
  soundRow.appendChild(soundLabel);
  soundRow.appendChild(soundSelect);
  body.appendChild(soundRow);
}

const CLOUD_SAVE_PREFIX = 'sudoku_';
const CLOUD_SAVE_VERSION = 1;

function _collectCloudSave() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.indexOf(CLOUD_SAVE_PREFIX) === 0) {
        data[key] = localStorage.getItem(key);
      }
    }
  } catch(e) { log('[settings] cloud collect error', e); }
  return data;
}

function _buildBackupPayload() {
  return {
    app: 'Ascendoku',
    type: 'cloud-save',
    version: CLOUD_SAVE_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: _collectCloudSave(),
  };
}

function _downloadBackup(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ascendoku-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function _copyBackupText(payload) {
  const text = JSON.stringify(payload);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Backup copied to clipboard!');
    }).catch(() => {
      _fallbackCopy(text);
    });
  } else {
    _fallbackCopy(text);
  }
}

function _fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showToast('Backup copied to clipboard!'); }
  catch(e) { showToast('Copy failed — use Export file instead'); }
  document.body.removeChild(ta);
}

function exportData() {
  log('[settings] exportData()');
  try {
    const payload = _buildBackupPayload();
    const keyCount = Object.keys(payload.data).length;
    _downloadBackup(payload);
    showToast('Backup exported (' + keyCount + ' keys)');
    log('[settings] data exported', { keyCount });
  } catch(e) { log('[settings] export failed', e); alert('Export failed: ' + e.message); }
}

function copyBackup() {
  log('[settings] copyBackup()');
  try {
    const payload = _buildBackupPayload();
    _copyBackupText(payload);
  } catch(e) { log('[settings] copy backup failed', e); alert('Copy failed: ' + e.message); }
}

function _restoreCloudSave(data) {
  const keys = Object.keys(data);
  let restored = 0;
  for (const key of keys) {
    if (key.indexOf(CLOUD_SAVE_PREFIX) !== 0) {
      log('[settings] import: skipping non-app key', { key });
      continue;
    }
    if (typeof data[key] !== 'string') {
      log('[settings] import: skipping non-string key', { key });
      continue;
    }
    try {
      localStorage.setItem(key, data[key]);
      restored++;
    } catch(e) { log('[settings] import: failed to set', { key, error: e }); }
  }
  return restored;
}

function _validateBackup(payload) {
  if (!payload || typeof payload !== 'object') return 'Not a valid backup object';
  if (payload.app !== 'Ascendoku' || payload.type !== 'cloud-save') return 'Not an Ascendoku cloud save';
  if (!payload.data || typeof payload.data !== 'object') return 'Backup has no data';
  return null;
}

function _reloadAppStateAfterImport() {
  state.settings = Object.assign({}, DEFAULT_SETTINGS, loadWithVault(LS.settings, 'settings', state.settings));
  applySettings();
  stats = loadWithVault(LS.stats, 'stats', stats);
  streak = loadWithVault(LS.streak, 'streak', streak);
  bonusChallenge = loadWithVault(BONUS_KEY, 'bonus', bonusChallenge);
  updateMenuUI();
}

function _applyImportedPayload(payload) {
  const err = _validateBackup(payload);
  if (err) { showToast(err); alert(err); return false; }
  const restored = _restoreCloudSave(payload.data);
  _reloadAppStateAfterImport();
  showToast('Imported ' + restored + ' save entries');
  log('[settings] import: applied', { restored });
  return true;
}

function importData() {
  log('[settings] importData()');
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) { log('[settings] import: no file selected'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const payload = JSON.parse(e.target.result);
        _applyImportedPayload(payload);
      } catch(err) { log('[settings] import parse error', err); alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
  });
  input.click();
}

function pasteBackup() {
  log('[settings] pasteBackup()');
  if (navigator.clipboard && navigator.clipboard.readText) {
    navigator.clipboard.readText().then(text => {
      if (!text || !text.trim()) { showToast('Clipboard is empty'); return; }
      try {
        const payload = JSON.parse(text);
        _applyImportedPayload(payload);
      } catch(err) { log('[settings] paste parse error', err); alert('Invalid backup text: ' + err.message); }
    }).catch(() => {
      _promptPaste();
    });
  } else {
    _promptPaste();
  }
}

function _promptPaste() {
  const text = prompt('Paste your Ascendoku backup JSON here:');
  if (!text) return;
  try {
    const payload = JSON.parse(text);
    _applyImportedPayload(payload);
  } catch(err) { alert('Invalid backup text: ' + err.message); }
}
