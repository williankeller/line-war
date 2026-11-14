// Sound effects made with the Web Audio API. No audio files needed.
// Browsers only allow sound after a user gesture, so call unlock()
// from a click or key handler before the first sound.

export function createAudio(isEnabled) {
  let context = null;
  let lastCutAt = 0;

  function unlock() {
    if (!isEnabled()) return;
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  const ready = () => context !== null && isEnabled();

  function envelope(node, attack, decay, peak) {
    const gain = context.createGain();
    const start = context.currentTime;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
    node.connect(gain);
    gain.connect(context.destination);
  }

  function tone(frequency, type, attack, decay, peak, slideTo) {
    const osc = context.createOscillator();
    const start = context.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + attack + decay);
    envelope(osc, attack, decay, peak);
    osc.start(start);
    osc.stop(start + attack + decay + 0.05);
  }

  function noise(duration, peak, frequency) {
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    source.connect(filter);
    envelope(filter, 0.005, duration, peak);
    source.start();
  }

  function later(ms, fn) {
    setTimeout(() => { if (ready()) fn(); }, ms);
  }

  return {
    unlock,

    cut() {
      if (!ready()) return;
      const now = performance.now();
      if (now - lastCutAt < 45) return; // many cuts per frame would be noise
      lastCutAt = now;
      tone(1600 + Math.random() * 900, 'square', 0.002, 0.05, 0.04);
    },

    release() { if (ready()) noise(0.18, 0.12, 1400); },
    grip() { if (ready()) tone(240, 'triangle', 0.005, 0.09, 0.07, 150); },
    bump() { if (ready()) tone(150, 'sine', 0.004, 0.12, 0.14, 55); },

    explode() {
      if (!ready()) return;
      tone(130, 'sawtooth', 0.01, 0.7, 0.3, 28);
      noise(0.55, 0.28, 450);
    },

    alarm() {
      if (!ready()) return;
      tone(880, 'square', 0.01, 0.2, 0.12);
      later(220, () => tone(660, 'square', 0.01, 0.3, 0.12));
    },

    win() {
      if (!ready()) return;
      [523, 659, 784, 1046].forEach((frequency, i) => {
        later(i * 130, () => tone(frequency, 'triangle', 0.01, 0.4, 0.18));
      });
    },
  };
}
