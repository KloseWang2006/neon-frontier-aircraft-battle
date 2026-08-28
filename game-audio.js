(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GameAudio = api;
})(globalThis, () => {
  const KEY = 'aircraft-battle-sound-enabled-v1';
  const throttleMs = Object.freeze({
    'player-volley': 80,
    'enemy-volley': 180,
    'boss-volley': 280,
    'enemy-destroyed': 55,
  });
  const profiles = Object.freeze({
    'player-volley': {
      frequency: 680,
      endFrequency: 440,
      duration: 0.035,
      gain: 0.018,
      type: 'sine',
    },
    'enemy-volley': {
      frequency: 260,
      endFrequency: 180,
      duration: 0.065,
      gain: 0.028,
      type: 'sawtooth',
    },
    'boss-volley': {
      frequency: 150,
      endFrequency: 95,
      duration: 0.11,
      gain: 0.05,
      type: 'sawtooth',
    },
    'enemy-destroyed': {
      frequency: 210,
      endFrequency: 720,
      duration: 0.09,
      gain: 0.045,
      type: 'triangle',
    },
    'player-hit': {
      frequency: 130,
      endFrequency: 80,
      duration: 0.16,
      gain: 0.08,
      type: 'sawtooth',
    },
    'shield-blocked': {
      frequency: 780,
      endFrequency: 1120,
      duration: 0.11,
      gain: 0.05,
      type: 'sine',
    },
    'powerup-collected': {
      frequency: 520,
      endFrequency: 940,
      duration: 0.16,
      gain: 0.06,
      type: 'sine',
    },
    'life-restored': {
      frequency: 660,
      endFrequency: 1320,
      duration: 0.2,
      gain: 0.06,
      type: 'sine',
    },
    'shockwave-released': {
      frequency: 180,
      endFrequency: 680,
      duration: 0.26,
      gain: 0.075,
      type: 'sine',
    },
    'stealth-activated': {
      frequency: 980,
      endFrequency: 340,
      duration: 0.2,
      gain: 0.05,
      type: 'sine',
    },
    'wingmen-activated': {
      frequency: 430,
      endFrequency: 860,
      duration: 0.18,
      gain: 0.055,
      type: 'triangle',
    },
    'homing-activated': {
      frequency: 360,
      endFrequency: 1060,
      duration: 0.22,
      gain: 0.06,
      type: 'sine',
    },
    'shield-skill-activated': {
      frequency: 500,
      endFrequency: 900,
      duration: 0.2,
      gain: 0.06,
      type: 'sine',
    },
    'blink-launched': {
      frequency: 700,
      endFrequency: 1080,
      duration: 0.1,
      gain: 0.05,
      type: 'triangle',
    },
    'blink-triggered': {
      frequency: 1180,
      endFrequency: 250,
      duration: 0.16,
      gain: 0.07,
      type: 'sawtooth',
    },
    'shadow-strike-activated': {
      frequency: 330,
      endFrequency: 780,
      duration: 0.15,
      gain: 0.065,
      type: 'square',
    },
    'boss-started': {
      frequency: 105,
      endFrequency: 230,
      duration: 0.34,
      gain: 0.09,
      type: 'sawtooth',
    },
    'boss-defeated': {
      frequency: 320,
      endFrequency: 1080,
      duration: 0.32,
      gain: 0.09,
      type: 'triangle',
    },
    'ranking-unlocked': {
      frequency: 740,
      endFrequency: 1180,
      duration: 0.17,
      gain: 0.06,
      type: 'sine',
    },
    pause: { frequency: 320, endFrequency: 220, duration: 0.08, gain: 0.04, type: 'triangle' },
    resume: { frequency: 220, endFrequency: 390, duration: 0.08, gain: 0.04, type: 'triangle' },
    victory: { frequency: 520, endFrequency: 1320, duration: 0.42, gain: 0.09, type: 'sine' },
    death: { frequency: 240, endFrequency: 70, duration: 0.35, gain: 0.08, type: 'sawtooth' },
  });

  function create({
    AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext,
    storage,
    now = Date.now,
  } = {}) {
    let enabled = !storage || storage.getItem(KEY) !== 'false',
      context = null,
      destroyed = false;
    const lastPlayed = {};
    const persist = () => storage && storage.setItem(KEY, String(enabled));
    function unlock() {
      if (!enabled || destroyed || !AudioContext) return Promise.resolve(false);
      try {
        if (!context) context = new AudioContext();
        if (context.state === 'suspended' && context.resume)
          return Promise.resolve(context.resume()).then(() => true);
        return Promise.resolve(true);
      } catch {
        return Promise.resolve(false);
      }
    }
    function tone(profile) {
      if (
        !context ||
        !context.createOscillator ||
        !context.createGain ||
        context.state === 'closed'
      )
        return;
      try {
        const oscillator = context.createOscillator(),
          gain = context.createGain(),
          time = context.currentTime || 0,
          end = time + profile.duration;
        oscillator.type = profile.type;
        oscillator.frequency.setValueAtTime(profile.frequency, time);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, profile.endFrequency), end);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(profile.gain, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(time);
        oscillator.stop(end + 0.02);
      } catch {
        // Audio is optional: browser-specific audio failures must not affect play.
      }
    }
    function play(type) {
      const profile = profiles[type];
      if (
        !enabled ||
        !profile ||
        !context ||
        context.state === 'suspended' ||
        context.state === 'closed'
      )
        return false;
      const time = now(),
        limit = throttleMs[type] || 0;
      if (limit && time - (lastPlayed[type] || -Infinity) < limit) return false;
      lastPlayed[type] = time;
      tone(profile);
      return true;
    }
    function consume(events = []) {
      for (const event of events) {
        if (event.type === 'run-ended') play(event.reason === 'victory' ? 'victory' : 'death');
        else play(event.type);
      }
    }
    function setEnabled(value) {
      enabled = Boolean(value);
      persist();
      return enabled;
    }
    function toggle() {
      return setEnabled(!enabled);
    }
    function isEnabled() {
      return enabled;
    }
    function destroy() {
      destroyed = true;
      if (context && context.close) context.close();
      context = null;
    }
    return Object.freeze({
      unlock,
      consume,
      play,
      setEnabled,
      toggle,
      isEnabled,
      destroy,
      key: KEY,
    });
  }
  return Object.freeze({ KEY, create });
});
