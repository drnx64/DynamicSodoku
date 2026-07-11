// ============================================================
// 14. Sound Effects
// ============================================================
function playSound(type) {
  if (!state.settings.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.08;

    if (type === 'place') {
      osc.frequency.value = 520; osc.type = 'sine';
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.frequency.value = 200; osc.type = 'sawtooth';
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'win') {
      osc.frequency.value = 523; osc.type = 'sine';
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const c2 = new (window.AudioContext || window.webkitAudioContext)();
        const o2 = c2.createOscillator(); const g2 = c2.createGain();
        o2.connect(g2); g2.connect(c2.destination);
        g2.gain.value = 0.08; o2.frequency.value = 659; o2.type = 'sine';
        g2.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 0.15);
        o2.start(c2.currentTime); o2.stop(c2.currentTime + 0.15);
      }, 150);
      setTimeout(() => {
        const c3 = new (window.AudioContext || window.webkitAudioContext)();
        const o3 = c3.createOscillator(); const g3 = c3.createGain();
        o3.connect(g3); g3.connect(c3.destination);
        g3.gain.value = 0.08; o3.frequency.value = 784; o3.type = 'sine';
        g3.gain.exponentialRampToValueAtTime(0.001, c3.currentTime + 0.2);
        o3.start(c3.currentTime); o3.stop(c3.currentTime + 0.2);
      }, 300);
    }
  } catch(e) {}
}

