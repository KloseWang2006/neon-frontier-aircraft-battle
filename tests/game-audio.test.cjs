const assert = require('node:assert/strict');
const test = require('node:test');
const Audio = require('../game-audio.js');
const Storage = require('../game-storage.js');

class FakeAudioContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = {};
    this.oscillators = [];
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
  createOscillator() {
    const oscillator = {
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    };
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    };
  }
}

test('unlocks after a user gesture, throttles dense events, and remembers mute state', async () => {
  const store = Storage.memory();
  let now = 1000;
  const sound = Audio.create({ AudioContext: FakeAudioContext, storage: store, now: () => now });
  assert.equal(sound.isEnabled(), true);
  sound.consume([{ type: 'player-volley' }]);
  assert.equal(await sound.unlock(), true);
  sound.consume([{ type: 'player-volley' }]);
  sound.consume([{ type: 'player-volley' }]);
  assert.equal(sound.play('player-volley'), false);
  now += 81;
  assert.equal(sound.play('player-volley'), true);
  assert.equal(sound.toggle(), false);
  assert.equal(store.getItem(Audio.KEY), 'false');
  assert.equal(sound.play('boss-started'), false);
  assert.equal(Audio.create({ AudioContext: FakeAudioContext, storage: store }).isEnabled(), false);
});

test('maps major events and silently degrades without Web Audio support', async () => {
  const sound = Audio.create({ AudioContext: FakeAudioContext, now: () => 1000 });
  await sound.unlock();
  sound.consume([
    { type: 'boss-started' },
    { type: 'boss-defeated' },
    { type: 'run-ended', reason: 'victory' },
  ]);
  const silent = Audio.create({ AudioContext: null });
  assert.equal(await silent.unlock(), false);
  assert.doesNotThrow(() => silent.consume([{ type: 'player-hit' }]));
});
