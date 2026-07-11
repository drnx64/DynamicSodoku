// ============================================================
// 10. Settings
// ============================================================
const DEFAULT_SETTINGS = {
  highlightSame: true, highlightPeers: true, highlightConflicts: true,
  autoCandidates: false, showRemaining: true, mistakeLimit: true,
  timerVisible: true, darkTheme: false, soundEnabled: true, autoClearNotes: true,
  hapticFeedback: true, autoDarkMode: false, keyboardShortcuts: true,
};

const SETTINGS_DEFS = [
  { key: 'highlightSame', label: 'Highlight same number' },
  { key: 'highlightPeers', label: 'Highlight row/column/box' },
  { key: 'highlightConflicts', label: 'Highlight conflicts' },
  { key: 'autoCandidates', label: 'Auto-show candidates' },
  { key: 'showRemaining', label: 'Show remaining counts' },
  { key: 'mistakeLimit', label: 'Mistake limit (3)' },
  { key: 'timerVisible', label: 'Show timer' },
  { key: 'darkTheme', label: 'Dark theme' },
  { key: 'autoDarkMode', label: 'Auto dark mode (system)' },
  { key: 'soundEnabled', label: 'Sound effects' },
  { key: 'keyboardShortcuts', label: 'Keyboard shortcuts' },
  { key: 'hapticFeedback', label: 'Haptic feedback (mobile)' },
  { key: 'autoClearNotes', label: 'Auto-clear notes' },
];

function haptic(pattern) {
  if (state.settings.hapticFeedback && navigator.vibrate) {
    try { navigator.vibrate(pattern || 10); } catch(e) {}
  }
}

let darkModeMedia = null;

function setupSettings() {
  const list = document.getElementById('settingsList');
  // Add export/import buttons before settings toggles
  const dataRow = document.createElement('div');
  dataRow.className = 'setting-row data-actions';
  dataRow.style.cssText = 'justify-content:center;gap:8px;flex-wrap:wrap;';
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export Data';
  exportBtn.className = 'data-btn';
  exportBtn.addEventListener('click', exportData);
  const importBtn = document.createElement('button');
  importBtn.textContent = 'Import Data';
  importBtn.className = 'data-btn';
  importBtn.addEventListener('click', importData);
  dataRow.appendChild(exportBtn);
  dataRow.appendChild(importBtn);
  list.appendChild(dataRow);

  for (const def of SETTINGS_DEFS) {
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
      toggle.classList.toggle('on', state.settings[def.key]);
      applySettings();
      saveSettings();
    });
    row.appendChild(label); row.appendChild(toggle);
    list.appendChild(row);
  }

  document.getElementById('closeSettings').addEventListener('click', () => document.getElementById('settingsModal').classList.remove('open'));
  document.getElementById('settingsModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) document.getElementById('settingsModal').classList.remove('open'); });
}

function rebuildSettingsUI() {
  const toggles = document.querySelectorAll('#settingsList .toggle');
  SETTINGS_DEFS.forEach((def, i) => { toggles[i].classList.toggle('on', state.settings[def.key]); });
}

function applySettings() {
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
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.style.display = state.settings.timerVisible ? '' : 'none';
  const muteBtn = document.getElementById('gameMuteBtn');
  if (muteBtn) {
    muteBtn.classList.toggle('muted', !state.settings.soundEnabled);
  }
  if (state.board && state.board.length === 9) render();
}

function exportData() {
  try {
    const data = {
      stats: stats,
      streak: streak,
      settings: state.settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sudoku-backup-' + todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch(e) { alert('Export failed: ' + e.message); }
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.stats) { stats = data.stats; saveStats(); }
        if (data.streak) { streak = data.streak; saveStreak(); }
        if (data.settings) { Object.assign(state.settings, data.settings); saveSettings(); applySettings(); }
        updateMenuUI();
        document.getElementById('settingsModal').classList.remove('open');
        alert('Data imported successfully!');
      } catch(err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
  });
  input.click();
}

