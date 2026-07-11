// ============================================================
// 10. Settings
// ============================================================
const DEFAULT_SETTINGS = {
  highlightSame: true, highlightPeers: true, highlightConflicts: true,
  autoCandidates: false, showRemaining: true, mistakeLimit: true,
  timerVisible: true, darkTheme: false, soundEnabled: true, autoClearNotes: true,
  hapticFeedback: true, autoDarkMode: false, keyboardShortcuts: true,
  colorTheme: 'default', soundTheme: 'classic',
};

const SETTINGS_CATEGORIES = [
  {
    name: 'Gameplay',
    icon: 'ico-target',
    settings: [
      { key: 'highlightSame', label: 'Highlight same number' },
      { key: 'highlightPeers', label: 'Highlight row/column/box' },
      { key: 'highlightConflicts', label: 'Highlight conflicts' },
      { key: 'autoCandidates', label: 'Auto-show candidates' },
      { key: 'showRemaining', label: 'Show remaining counts' },
      { key: 'mistakeLimit', label: 'Mistake limit (3)' },
      { key: 'autoClearNotes', label: 'Auto-clear notes' },
      { key: 'keyboardShortcuts', label: 'Keyboard shortcuts' },
    ],
  },
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
];

function haptic(pattern) {
  if (state.settings.hapticFeedback && navigator.vibrate) {
    try { navigator.vibrate(pattern || 10); } catch(e) {}
  }
}

let darkModeMedia = null;

function setupSettings() {
  const container = document.getElementById('settingsPageContent');
  container.innerHTML = '';

  for (const cat of SETTINGS_CATEGORIES) {
    const section = document.createElement('div');
    section.className = 'settings-section';

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
          state.settings[def.key] = select.value;
          applySettings();
          saveSettings();
        });
        row.appendChild(label); row.appendChild(select);
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
          toggle.classList.toggle('on', state.settings[def.key]);
          applySettings();
          saveSettings();
        });
        row.appendChild(label); row.appendChild(toggle);
        section.appendChild(row);
      }
    }
    container.appendChild(section);
  }

  // Data Management section
  const dataSection = document.createElement('div');
  dataSection.className = 'settings-section';
  const dataHeader = document.createElement('div');
  dataHeader.className = 'settings-category-header';
  dataHeader.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24"><use href="#ico-download"/></svg> Data';
  dataSection.appendChild(dataHeader);
  const dataRow = document.createElement('div');
  dataRow.className = 'setting-row data-actions';
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
  dataSection.appendChild(dataRow);
  container.appendChild(dataSection);
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

  // Apply color theme
  document.body.dataset.theme = state.settings.colorTheme || 'default';

  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.style.display = state.settings.timerVisible ? '' : 'none';
  const muteBtn = document.getElementById('gameMuteBtn');
  if (muteBtn) {
    muteBtn.classList.toggle('muted', !state.settings.soundEnabled);
  }
  if (state.board && state.board.length === 9) render();
}

function rebuildSettingsUI() {
  const container = document.getElementById('settingsPageContent');
  if (container) setupSettings();
}

function exportData() {
  try {
    const data = { stats, streak, settings: state.settings, exportedAt: new Date().toISOString() };
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
        showPage('page-menu');
        alert('Data imported successfully!');
      } catch(err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
  });
  input.click();
}
