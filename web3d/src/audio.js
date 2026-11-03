let context = null;
let master = null;
let voice = null;
let enabled = true;

function audioContext() {
  if (!enabled) return null;
  try {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.ratio.value = 3;
      master = context.createGain();
      master.gain.value = 0.72;
      master.connect(compressor);
      compressor.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    return context;
  } catch (_) {
    return null;
  }
}

export function playTone(midi, long = false) {
  const ac = audioContext();
  if (!ac) return false;
  if (voice) voice.stop();
  const t = ac.currentTime + 0.008;
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  const duration = long ? 1.8 : 0.75;
  const output = ac.createGain();
  output.connect(master);
  output.gain.setValueAtTime(0.0001, t);
  output.gain.exponentialRampToValueAtTime(0.3, t + 0.008);
  output.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  [[1, 1, 1], [2, 0.28, 0.6], [3.01, 0.13, 0.34], [5.04, 0.05, 0.16]].forEach(([multiple, level, decay]) => {
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency * multiple;
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration * decay);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(t);
    oscillator.stop(t + duration * decay + 0.05);
  });
  voice = {
    stop() {
      try {
        const now = ac.currentTime;
        output.gain.cancelScheduledValues(now);
        output.gain.setValueAtTime(Math.max(0.0001, output.gain.value), now);
        output.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      } catch (_) {}
    },
  };
  return true;
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
  if (!enabled && voice) voice.stop();
  return enabled;
}

export function isSoundEnabled() {
  return enabled;
}
