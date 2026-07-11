// ============================================================
// 10. Settings
// ============================================================
const DEFAULT_SETTINGS = {
  highlightSame: true, highlightPeers: true, highlightConflicts: true,
  autoCandidates: false, showRemaining: true, mistakeLimit: true,
  timerVisible: true, darkTheme: false, soundEnabled: true, autoClearNotes: true,
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
  { key: 'soundEnabled', label: 'Sound effects' },
  { key: 'autoClearNotes', label: 'Auto-clear notes' },
];

function setupSettings() {
  const list = document.getElementById('settingsList');
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
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.style.display = state.settings.timerVisible ? '' : 'none';
  if (state.board && state.board.length === 9) render();
}

