let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq1, freq2, duration) {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    [freq1, freq2].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    });
  } catch {
    // Audio not supported — silent fallback
  }
}

export function playFocusEndSound() {
  playTone(800, 600, 0.2);
}

export function playBreakEndSound() {
  playTone(600, 400, 0.15);
}
