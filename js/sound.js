// ============================================================
// 14. Sound Effects with Theme Support
// ============================================================
const SOUND_THEMES = {
  classic: {
    place: { freq: 520, type: 'sine', duration: 0.1, gain: 0.08 },
    error: { freq: 200, type: 'sawtooth', duration: 0.2, gain: 0.08 },
    winBase: { freq: 523, type: 'sine', duration: 0.15, gain: 0.08 },
    winThird: { freq: 659, type: 'sine', duration: 0.15, gain: 0.08 },
    winFifth: { freq: 784, type: 'sine', duration: 0.2, gain: 0.08 },
  },
  piano: {
    place: { freq: 440, type: 'sine', duration: 0.3, gain: 0.06 },
    error: { freq: 160, type: 'sine', duration: 0.4, gain: 0.06 },
    winBase: { freq: 262, type: 'sine', duration: 0.4, gain: 0.06 },
    winThird: { freq: 330, type: 'sine', duration: 0.4, gain: 0.06 },
    winFifth: { freq: 392, type: 'sine', duration: 0.5, gain: 0.06 },
  },
  digital: {
    place: { freq: 800, type: 'square', duration: 0.05, gain: 0.04 },
    error: { freq: 100, type: 'square', duration: 0.15, gain: 0.04 },
    winBase: { freq: 880, type: 'square', duration: 0.1, gain: 0.04 },
    winThird: { freq: 1108, type: 'square', duration: 0.1, gain: 0.04 },
    winFifth: { freq: 1318, type: 'square', duration: 0.15, gain: 0.04 },
  },
  retro: {
    place: { freq: 600, type: 'triangle', duration: 0.08, gain: 0.07 },
    error: { freq: 150, type: 'triangle', duration: 0.25, gain: 0.07 },
    winBase: { freq: 500, type: 'triangle', duration: 0.12, gain: 0.07 },
    winThird: { freq: 630, type: 'triangle', duration: 0.12, gain: 0.07 },
    winFifth: { freq: 750, type: 'triangle', duration: 0.18, gain: 0.07 },
  },
};

function getSoundTheme() {
  log('[sound] getSoundTheme()');
  const themeName = state.settings.soundTheme || 'classic';
  return SOUND_THEMES[themeName] || SOUND_THEMES.classic;
}

let _audioCtx = null;
function getAudioContext() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playTone(freq, type, duration, gainVal, startDelay) {
  log('[sound] playTone()', { freq, type, duration, gainVal, startDelay });
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = gainVal;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime + (startDelay || 0));
    osc.stop(ctx.currentTime + (startDelay || 0) + duration);
  } catch(e) {}
}

function playSound(type) {
  log('[sound] playSound()', { type, enabled: state.settings.soundEnabled });
  if (!state.settings.soundEnabled) return;
  const theme = getSoundTheme();
  try {
    if (type === 'place') {
      const s = theme.place;
      playTone(s.freq, s.type, s.duration, s.gain);
    } else if (type === 'error') {
      const s = theme.error;
      playTone(s.freq, s.type, s.duration, s.gain);
    } else if (type === 'win') {
      playTone(theme.winBase.freq, theme.winBase.type, theme.winBase.duration, theme.winBase.gain);
      setTimeout(() => {
        playTone(theme.winThird.freq, theme.winThird.type, theme.winThird.duration, theme.winThird.gain);
      }, 150);
      setTimeout(() => {
        playTone(theme.winFifth.freq, theme.winFifth.type, theme.winFifth.duration, theme.winFifth.gain);
      }, 300);
    }
  } catch(e) {}
}
