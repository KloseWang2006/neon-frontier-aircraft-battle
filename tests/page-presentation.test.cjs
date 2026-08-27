const assert = require('node:assert/strict');
const test = require('node:test');
const Catalog = require('../fighter-catalog.js');
const Presentation = require('../page-presentation.js');

class Element {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.listeners = {};
    this.style = {};
    this.className = '';
    this.innerHTML = '';
    this.hidden = false;
    this.value = '';
    this.classList = {
      toggle: (name, on) => {
        this.className = on ? name : '';
      },
    };
  }
  addEventListener(type, listener) {
    (this.listeners[type] ??= []).push(listener);
  }
  removeEventListener(type, listener) {
    this.listeners[type] = (this.listeners[type] || []).filter((item) => item !== listener);
  }
  fire(type) {
    for (const listener of this.listeners[type] || []) listener({ preventDefault() {} });
  }
}
function makeDocument() {
  const elements = Object.fromEntries(
    [
      '#score',
      '#best',
      '#lives',
      '#timer',
      '#state',
      '#shield',
      '#spread',
      '#double',
      '#skillName',
      '#skillCharge',
      '#skillMeter',
      '#skillStatus',
      '#skillButton',
      '#notice',
      '#rank',
      '#overlay',
      '#modal',
      '#fighterOptions',
      '#pause',
      '#restart',
      '#rankBtn',
    ].map((selector) => [selector, new Element()]),
  );
  const dynamic = {};
  const control = (name) => (dynamic[name] ??= new Element());
  const document = {
    defaultView: {},
    querySelector(selector) {
      if (elements[selector]) return elements[selector];
      if (['#go', '#close', '#again', '#save', '#pid'].includes(selector)) return control(selector);
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-k]') return directions;
      if (selector === '[data-fighter]') return fighters;
      return [];
    },
  };
  const directions = ['up', 'left', 'down', 'right'].map(
    (direction) => new Element({ k: direction }),
  );
  const fighters = ['azure', 'silver', 'green', 'yellow'].map(
    (fighter) => new Element({ fighter }),
  );
  elements['#fighterOptions'].querySelectorAll = (selector) =>
    selector === '[data-fighter]' ? fighters : [];
  const calls = [];
  const context = new Proxy(
    {},
    {
      get(_, key) {
        if (key === 'canvas') return canvas;
        return (...args) => calls.push([key, ...args]);
      },
      set() {
        return true;
      },
    },
  );
  const canvas = new Element();
  canvas.getContext = () => context;
  return { document, canvas, elements, dynamic, directions, fighters, calls };
}
const snapshot = ({
  game = {},
  view = {},
  best = 1200,
  board = [{ id: 'ace', score: 1200, time: 10000 }],
} = {}) => ({
  game: {
    fighterId: 'azure',
    score: 250,
    lives: undefined,
    status: 'ready',
    player: { x: 210, y: 630, lives: 3, invincibleMs: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    boss: null,
    shieldMs: 0,
    spreadMs: 0,
    doubleMs: 0,
    healFlashMs: 0,
    skillCharge: 0,
    skillCooldownMs: 0,
    shockwaveFlashMs: 0,
    stealthMs: 0,
    wingmenMs: 0,
    homingMs: 0,
    shieldAvailable: false,
    elapsedMs: 0,
    ...game,
  },
  view: { overlay: 'ready', notice: null, canRegister: false, endReason: null, ...view },
  best,
  board,
});

test('renders HUD, dynamic fighter choices, and canvas fallback from a session snapshot', () => {
  const fake = makeDocument(),
    intents = [];
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
    onIntent: (intent) => intents.push(intent),
  });
  page.render(snapshot());
  assert.equal(fake.elements['#score'].textContent, '000250');
  assert.equal(fake.elements['#best'].textContent, '001200');
  assert.match(fake.elements['#fighterOptions'].innerHTML, /青岚影忍/);
  assert.match(fake.elements['#fighterOptions'].innerHTML, /曜金流星/);
  assert.match(fake.elements['#modal'].innerHTML, /准备起飞/);
  assert.ok(fake.calls.some((call) => call[0] === 'fillRect'));
  fake.fighters[1].fire('click');
  assert.deepEqual(intents.pop(), { type: 'select-fighter', fighterId: 'silver' });
  page.destroy();
});

test('turns overlays and touch controls into intents while keeping ranking local', () => {
  const fake = makeDocument(),
    intents = [];
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
    onIntent: (intent) => intents.push(intent),
  });
  page.render(snapshot());
  page.render(snapshot());
  fake.dynamic['#go'].fire('click');
  fake.directions[0].fire('pointerdown');
  fake.directions[0].fire('pointerup');
  fake.elements['#skillButton'].fire('click');
  assert.deepEqual(intents.splice(0), [
    { type: 'start' },
    { type: 'direction', direction: 'up', pressed: true },
    { type: 'direction', direction: 'up', pressed: false },
    { type: 'skill' },
  ]);
  fake.elements['#rankBtn'].fire('click');
  assert.match(fake.elements['#modal'].innerHTML, /排行榜/);
  fake.dynamic['#close'].fire('click');
  page.render(
    snapshot({
      game: { status: 'over' },
      view: { overlay: 'ended', canRegister: true, endReason: 'death' },
    }),
  );
  fake.dynamic['#pid'].value = 'ace';
  fake.dynamic['#save'].fire('click');
  fake.dynamic['#again'].fire('click');
  assert.deepEqual(intents.splice(0), [{ type: 'register', id: 'ace' }, { type: 'restart' }]);
});
