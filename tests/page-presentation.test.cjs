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
  fire(type, event = {}) {
    for (const listener of this.listeners[type] || []) listener({ preventDefault() {}, ...event });
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
      '#skillStatus',
      '#skillButton',
      '#skillCard',
      '#fighterSkillProgress',
      '#qProgressName',
      '#qProgressValue',
      '#qProgressFill',
      '#qProgressStatus',
      '#eProgressName',
      '#eProgressValue',
      '#eProgressFill',
      '#eProgressStatus',
      '#blinkCard',
      '#blinkName',
      '#blinkStatus',
      '#blinkButton',
      '#shieldCard',
      '#shieldSkillName',
      '#shieldSkillStatus',
      '#shieldButton',
      '#shadowStrikeCard',
      '#shadowStrikeName',
      '#shadowStrikeStatus',
      '#shadowStrikeButton',
      '#notice',
      '#rank',
      '#overlay',
      '#modal',
      '#fighterOptions',
      '#pause',
      '#restart',
      '#rankBtn',
      '#guideBtn',
      '#soundBtn',
      '#mobileScore',
      '#mobileLives',
      '#mobileTimer',
      '#mobileMenu',
      '#mobileCombatDock',
      '#mobileSkillButton',
      '#mobileUtilityButton',
    ].map((selector) => [selector, new Element()]),
  );
  const dynamic = {};
  const control = (name) => (dynamic[name] ??= new Element());
  const document = {
    defaultView: {},
    querySelector(selector) {
      if (elements[selector]) return elements[selector];
      if (
        [
          '#go',
          '#close',
          '#closeGuide',
          '#again',
          '#save',
          '#pid',
          '#mobileResume',
          '#mobileRestart',
          '#mobileGuide',
          '#mobileRank',
          '#mobileSound',
          '#closeMobileMenu',
        ].includes(selector)
      )
        return control(selector);
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
  canvas.width = 480;
  canvas.height = 720;
  canvas.getContext = () => context;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 240, height: 360 });
  canvas.setPointerCapture = (pointerId) => (canvas.pointerId = pointerId);
  canvas.hasPointerCapture = (pointerId) => canvas.pointerId === pointerId;
  canvas.releasePointerCapture = () => (canvas.pointerId = null);
  return { document, canvas, elements, dynamic, directions, fighters, calls };
}
const snapshot = ({
  game = {},
  view = {},
  best = 1200,
  board = [{ id: 'ace', score: 1200, time: 10000 }],
  soundEnabled = true,
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
    shadowStrikeCooldownMs: 0,
    shadowStrikes: [],
    elapsedMs: 0,
    ...game,
  },
  view: { overlay: 'ready', notice: null, canRegister: false, endReason: null, ...view },
  best,
  board,
  soundEnabled,
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
  assert.match(fake.elements['#skillButton'].textContent, /Q · 充能技/);
  assert.equal(fake.elements['#skillCard'].style['--skill-color'], '#65e8ff');
  assert.equal(fake.elements['#qProgressName'].textContent, 'Q · 冲击波');
  assert.equal(fake.elements['#eProgressName'].textContent, 'E · 潮涌屏障');
  assert.match(fake.elements['#fighterOptions'].innerHTML, /青岚影忍/);
  assert.match(fake.elements['#fighterOptions'].innerHTML, /曜金流星/);
  assert.match(fake.elements['#modal'].innerHTML, /准备起飞/);
  assert.ok(fake.calls.some((call) => call[0] === 'fillRect'));
  fake.fighters[1].fire('click');
  assert.deepEqual(intents.pop(), { type: 'select-fighter', fighterId: 'silver' });
  page.destroy();
});

test('renders themed Q charge and E lifecycle progress for every fighter', () => {
  const fake = makeDocument();
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
  });
  page.render(
    snapshot({ game: { fighterId: 'azure', skillCharge: 55, shieldSkillCooldownMs: 15000 } }),
  );
  assert.equal(fake.elements['#qProgressFill'].style.width, '55%');
  assert.equal(fake.elements['#eProgressFill'].style.width, '50%');
  assert.match(fake.elements['#eProgressStatus'].textContent, /冷却 15.0s/);
  page.render(snapshot({ game: { fighterId: 'silver', blinkCooldownMs: 7500 } }));
  assert.equal(fake.elements['#skillCard'].style['--skill-color'], '#d8e4f0');
  assert.equal(fake.elements['#eProgressName'].textContent, 'E · 瞬闪突袭');
  assert.equal(fake.elements['#eProgressFill'].style.width, '50%');
  page.render(
    snapshot({ game: { fighterId: 'green', shadowStrikes: [{ remainingMs: 225, totalMs: 450 }] } }),
  );
  assert.equal(fake.elements['#skillCard'].style['--skill-color'], '#75ff9e');
  assert.equal(fake.elements['#eProgressName'].textContent, 'E · 影刃双袭');
  assert.equal(fake.elements['#eProgressFill'].style.width, '50%');
  page.render(
    snapshot({ game: { fighterId: 'yellow', blinkMarker: { remainingMs: 2500, locked: true } } }),
  );
  assert.equal(fake.elements['#skillCard'].style['--skill-color'], '#ffe85b');
  assert.equal(fake.elements['#eProgressName'].textContent, 'E · 星煌跃迁');
  assert.equal(fake.elements['#eProgressFill'].style.width, '50%');
  assert.match(fake.elements['#eProgressStatus'].textContent, /二段窗口/);
  page.destroy();
});

test('renders the yellow fighter beacon HUD states and hides it for other fighters', () => {
  const fake = makeDocument();
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
  });
  page.render(snapshot({ game: { fighterId: 'yellow', blinkCooldownMs: 0, blinkMarker: null } }));
  assert.equal(fake.elements['#blinkCard'].hidden, false);
  assert.equal(fake.elements['#blinkStatus'].textContent, '可标记');
  assert.equal(fake.elements['#blinkButton'].disabled, false);
  page.render(
    snapshot({
      game: {
        fighterId: 'yellow',
        blinkCooldownMs: 1000,
        blinkMarker: null,
      },
    }),
  );
  assert.match(fake.elements['#blinkStatus'].textContent, /冷却/);
  assert.equal(fake.elements['#blinkButton'].disabled, true);
  page.render(
    snapshot({
      game: {
        fighterId: 'yellow',
        blinkCooldownMs: 0,
        blinkMarker: { mode: 'beacon', locked: true, noTarget: true, remainingMs: 4800 },
      },
    }),
  );
  assert.match(fake.elements['#blinkStatus'].textContent, /可跃迁/);
  assert.equal(fake.elements['#blinkButton'].disabled, false);
  page.render(snapshot({ game: { fighterId: 'azure' } }));
  assert.equal(fake.elements['#blinkCard'].hidden, true);
  page.destroy();
});

test('renders the Silver Assassin assault HUD and waits for activity-zone entry', () => {
  const fake = makeDocument();
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
  });
  page.render(
    snapshot({
      game: {
        fighterId: 'silver',
        blinkMarker: {
          mode: 'assault',
          locked: true,
          inRange: false,
          targetKind: 'enemy',
          remainingMs: 4200,
        },
      },
    }),
  );
  assert.equal(fake.elements['#blinkCard'].hidden, false);
  assert.match(fake.elements['#blinkCard'].className, /blink-card-silver/);
  assert.match(fake.elements['#blinkStatus'].textContent, /等待进入活动区/);
  assert.equal(fake.elements['#blinkButton'].disabled, true);
  page.render(
    snapshot({
      game: {
        fighterId: 'silver',
        blinkMarker: {
          mode: 'assault',
          locked: true,
          inRange: true,
          targetKind: 'enemy',
          remainingMs: 4200,
        },
      },
    }),
  );
  assert.match(fake.elements['#blinkStatus'].textContent, /可瞬闪/);
  assert.equal(fake.elements['#blinkButton'].disabled, false);
  page.destroy();
});

test('renders the Azure Storm shield utility HUD and emits its E intent', () => {
  const fake = makeDocument();
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
    onIntent: (intent) => fake.intents.push(intent),
  });
  fake.intents = [];
  page.render(
    snapshot({
      game: { fighterId: 'azure', shieldSkillCooldownMs: 0, shieldSkillMs: 0 },
    }),
  );
  assert.equal(fake.elements['#shieldCard'].hidden, false);
  assert.equal(fake.elements['#shieldSkillName'].textContent, '潮涌屏障');
  assert.equal(fake.elements['#shieldSkillStatus'].textContent, '可释放');
  assert.equal(fake.elements['#shieldButton'].disabled, false);
  assert.match(fake.elements['#shieldButton'].textContent, /E · 普通技 · 潮涌屏障/);
  fake.elements['#shieldButton'].fire('click');
  assert.deepEqual(fake.intents, [{ type: 'blink' }]);
  page.render(
    snapshot({
      game: { fighterId: 'azure', shieldSkillCooldownMs: 30000, shieldSkillMs: 0 },
    }),
  );
  assert.match(fake.elements['#shieldSkillStatus'].textContent, /冷却/);
  assert.equal(fake.elements['#shieldButton'].disabled, true);
  page.destroy();
});

test('renders 青岚影忍 independent shadow-strike HUD and its Canvas effect', () => {
  const fake = makeDocument(),
    intents = [];
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
    onIntent: (intent) => intents.push(intent),
  });
  page.render(
    snapshot({
      game: {
        fighterId: 'green',
        wingmenMs: 8000,
        shadowStrikes: [
          { fromX: 220, fromY: 650, hitX: 220, hitY: 420, remainingMs: 450, totalMs: 450 },
        ],
      },
    }),
  );
  assert.equal(fake.elements['#shadowStrikeCard'].hidden, false);
  assert.equal(fake.elements['#shadowStrikeName'].textContent, '影刃双袭');
  assert.equal(fake.elements['#shadowStrikeStatus'].textContent, '影刃出击');
  assert.equal(fake.elements['#shadowStrikeButton'].disabled, true);
  assert.ok(fake.calls.some((call) => call[0] === 'drawImage' || call[0] === 'fillRect'));
  fake.elements['#shadowStrikeButton'].fire('click');
  assert.deepEqual(intents, [{ type: 'blink' }]);
  page.render(snapshot({ game: { fighterId: 'green', shadowStrikeCooldownMs: 12000 } }));
  assert.match(fake.elements['#shadowStrikeStatus'].textContent, /冷却 12.0s/);
  page.render(snapshot({ game: { fighterId: 'azure' } }));
  assert.equal(fake.elements['#shadowStrikeCard'].hidden, true);
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
  fake.elements['#blinkButton'].fire('click');
  assert.deepEqual(intents.splice(0), [
    { type: 'start' },
    { type: 'direction', direction: 'up', pressed: true },
    { type: 'direction', direction: 'up', pressed: false },
    { type: 'skill' },
    { type: 'blink' },
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

test('renders a mobile combat dock and turns canvas dragging into bounded touch intents', () => {
  const fake = makeDocument(),
    intents = [];
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
    onIntent: (intent) => intents.push(intent),
  });
  page.render(
    snapshot({ game: { status: 'running', skillCharge: 100 }, view: { overlay: 'none' } }),
  );
  assert.equal(fake.elements['#mobileScore'].textContent, '000250');
  assert.equal(fake.elements['#mobileLives'].textContent, '♥♥♥');
  assert.match(fake.elements['#mobileSkillButton'].textContent, /冲击波/);
  assert.equal(fake.elements['#mobileSkillButton'].disabled, false);
  assert.equal(fake.elements['#mobileUtilityButton'].disabled, false);
  fake.canvas.fire('pointerdown', {
    pointerType: 'touch',
    pointerId: 7,
    clientX: 120,
    clientY: 300,
  });
  fake.canvas.fire('pointermove', {
    pointerType: 'touch',
    pointerId: 7,
    clientX: 200,
    clientY: 330,
  });
  fake.canvas.fire('pointerup', { pointerType: 'touch', pointerId: 7 });
  fake.elements['#mobileSkillButton'].fire('click');
  fake.elements['#mobileUtilityButton'].fire('click');
  fake.elements['#mobileMenu'].fire('click');
  assert.deepEqual(intents, [
    { type: 'touch-target', point: { x: 240, y: 600 } },
    { type: 'touch-target', point: { x: 400, y: 660 } },
    { type: 'touch-end' },
    { type: 'skill' },
    { type: 'blink' },
    { type: 'mobile-menu' },
  ]);
  assert.equal(fake.canvas.pointerId, null);
  assert.match(fake.elements['#modal'].innerHTML, /战斗菜单/);
  page.destroy();
});

test('opens the complete guide only when ready or paused and restores the original overlay on close', () => {
  const fake = makeDocument(),
    intents = [];
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
    onIntent: (intent) => intents.push(intent),
  });
  page.render(snapshot());
  assert.equal(fake.elements['#guideBtn'].disabled, false);
  fake.elements['#guideBtn'].fire('click');
  assert.equal(page.isControlsLocked(), true);
  assert.equal(fake.elements['#pause'].disabled, true);
  assert.equal(fake.elements['#restart'].disabled, true);
  assert.equal(fake.elements['#pause'].textContent, '说明阅读中');
  assert.equal(fake.elements['#restart'].textContent, '操作已锁定');
  assert.match(fake.elements['#pause'].className, /guide-control-locked/);
  assert.match(fake.elements['#modal'].innerHTML, /游戏说明/);
  assert.match(fake.elements['#modal'].innerHTML, /蔚蓝风暴/);
  assert.match(fake.elements['#modal'].innerHTML, /银翼杀手/);
  assert.match(fake.elements['#modal'].innerHTML, /青岚影忍/);
  assert.match(fake.elements['#modal'].innerHTML, /曜金流星/);
  assert.match(fake.elements['#modal'].innerHTML, /护盾 2.5%/);
  fake.dynamic['#closeGuide'].fire('click');
  assert.equal(page.isControlsLocked(), false);
  assert.equal(fake.elements['#pause'].disabled, false);
  assert.equal(fake.elements['#restart'].disabled, false);
  assert.equal(fake.elements['#pause'].textContent, '暂停');
  assert.equal(fake.elements['#restart'].textContent, '重新开始');
  assert.match(fake.elements['#modal'].innerHTML, /准备起飞/);
  page.render(snapshot({ game: { status: 'running' }, view: { overlay: 'none' } }));
  assert.equal(fake.elements['#guideBtn'].disabled, true);
  fake.elements['#guideBtn'].fire('click');
  assert.equal(fake.elements['#overlay'].hidden, true);
  page.render(snapshot({ game: { status: 'paused' }, view: { overlay: 'none' } }));
  assert.equal(fake.elements['#guideBtn'].disabled, false);
  fake.elements['#guideBtn'].fire('click');
  assert.equal(page.isControlsLocked(), true);
  fake.elements['#pause'].fire('click');
  fake.elements['#restart'].fire('click');
  assert.deepEqual(intents, []);
  assert.match(fake.elements['#modal'].innerHTML, /Boss、通关与排行/);
  fake.dynamic['#closeGuide'].fire('click');
  assert.equal(page.isControlsLocked(), false);
  assert.equal(fake.elements['#overlay'].hidden, true);
  page.destroy();
});

test('renders the persisted sound state and emits a sound-toggle intent', () => {
  const fake = makeDocument(),
    intents = [];
  const page = Presentation.create({
    document: fake.document,
    canvas: fake.canvas,
    catalog: Catalog,
    onIntent: (intent) => intents.push(intent),
  });
  page.render(snapshot({ soundEnabled: true }));
  assert.equal(fake.elements['#soundBtn'].textContent, '🔊 音效：开');
  fake.elements['#soundBtn'].fire('click');
  assert.deepEqual(intents, [{ type: 'toggle-sound' }]);
  page.render(snapshot({ soundEnabled: false }));
  assert.equal(fake.elements['#soundBtn'].textContent, '🔇 音效：关');
  assert.match(fake.elements['#soundBtn'].className, /sound-off/);
  page.destroy();
});
