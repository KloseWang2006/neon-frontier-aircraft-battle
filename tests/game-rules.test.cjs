const assert = require('node:assert/strict');
const test = require('node:test');
const GameRules = require('../game-rules.js');
const FighterCatalog = require('../fighter-catalog.js');
const run = (state, frame = {}) =>
  GameRules.step(state, {
    dt: frame.dt ?? 16,
    input: frame.input || {},
    random: frame.random || (() => 0.5),
  });

test('moves within the lower sixty percent and supports diagonal input', () => {
  let s = GameRules.create({ player: { x: 210, y: 630 } });
  s = run(s, { dt: 100, input: { left: true, up: true } }).state;
  assert.deepEqual([s.player.x, s.player.y], [178, 598]);
  s = run(GameRules.create({ player: { x: 0, y: 288 } }), {
    dt: 1000,
    input: { left: true, up: true },
  }).state;
  assert.deepEqual([s.player.x, s.player.y], [0, 288]);
});
test('fires from the moved player position and double spread produces three shots', () => {
  let s = GameRules.create({
    player: { x: 210, y: 630 },
    fireClock: 90,
    doubleMs: 8000,
    spreadMs: 8000,
  });
  s = run(s, { dt: 0, input: { up: true } }).state;
  assert.equal(s.bullets.length, 3);
  assert.equal(s.bullets[0].y, 621);
});
test('gives player bullets the selected fighter color', () => {
  assert.equal(GameRules.fighters.azure.bulletColor, '#5ef');
  assert.equal(GameRules.fighters.silver.bulletColor, '#dcecff');
  assert.equal(GameRules.fighters.green.bulletColor, '#65ff9a');
  assert.equal(GameRules.fighters.yellow.bulletColor, '#ffe85b');
  let s = run(GameRules.create({ fighterId: 'azure', fireClock: 180 }), { dt: 0 }).state;
  assert.equal(s.bullets[0].color, GameRules.fighters.azure.bulletColor);
  s = run(GameRules.create({ fighterId: 'silver', fireClock: 180, spreadMs: 8000 }), {
    dt: 0,
  }).state;
  assert.equal(s.bullets.length, 3);
  assert.ok(s.bullets.every((b) => b.color === GameRules.fighters.silver.bulletColor));
  s = run(GameRules.create({ fighterId: 'yellow', fireClock: 180 }), { dt: 0 }).state;
  assert.equal(s.bullets[0].color, '#ffe85b');
});
test('defines equal-base fighters, keeps the catalog compatibility entry, and defaults to 蔚蓝风暴', () => {
  const { azure, silver, green, yellow } = GameRules.fighters;
  assert.equal(GameRules.fighters, FighterCatalog.fighters);
  assert.deepEqual([azure.speed, azure.bulletDamage], [silver.speed, silver.bulletDamage]);
  assert.deepEqual([azure.speed, azure.bulletDamage], [green.speed, green.bulletDamage]);
  assert.deepEqual([azure.speed, azure.bulletDamage], [yellow.speed, yellow.bulletDamage]);
  const s = GameRules.create();
  assert.equal(s.fighterId, 'azure');
  assert.equal(s.skillCharge, 0);
  assert.equal(s.skillCooldownMs, 0);
});
test('曜金流星 marks only its five-second skill-window shots as homing', () => {
  let r = run(GameRules.create({ fighterId: 'yellow', skillCharge: 100 }), {
    dt: 0,
    input: { skill: true },
  });
  assert.equal(r.state.homingMs, 5000);
  assert.equal(r.state.skillCooldownMs, 18000);
  assert.ok(r.events.some((e) => e.type === 'homing-activated'));
  r = run({ ...r.state, fireClock: 180, spreadMs: 8000 }, { dt: 0 });
  assert.equal(r.state.bullets.length, 3);
  assert.ok(r.state.bullets.every((b) => b.homing && b.color === '#ffe85b'));
  r = run({ ...r.state, homingMs: 0, fireClock: 180, bullets: [] }, { dt: 0 });
  assert.equal(r.state.bullets[0].homing, undefined);
});
test('曜金流星 smoothly turns homing bullets toward the nearest enemy, then Boss, and otherwise flies straight', () => {
  let s = GameRules.create({
    fighterId: 'yellow',
    bullets: [
      { x: 220, y: 500, w: 8, h: 17, vx: 0, vy: -560, damage: 1, color: '#ffe85b', homing: true },
    ],
    enemies: [
      { kind: 'normal', x: 350, y: 400, w: 38, h: 38, hp: 1, score: 100, speed: 0 },
      { kind: 'normal', x: 230, y: 200, w: 38, h: 38, hp: 1, score: 100, speed: 0 },
    ],
  });
  let r = run(s, { dt: 100 });
  assert.ok(r.state.bullets[0].vx > 0);
  assert.ok(r.state.bullets[0].vy < 0);
  s = GameRules.create({
    fighterId: 'yellow',
    bullets: [
      { x: 220, y: 500, w: 8, h: 17, vx: 0, vy: -560, damage: 1, color: '#ffe85b', homing: true },
    ],
    boss: {
      stage: 1,
      trigger: 10000,
      x: 350,
      y: 100,
      w: 160,
      h: 120,
      hp: 99,
      maxHp: 99,
      attackClock: 0,
      pattern: 0,
      phase: 0,
    },
  });
  r = run(s, { dt: 100 });
  assert.ok(r.state.bullets[0].vx > 0);
  s = GameRules.create({
    fighterId: 'yellow',
    bullets: [
      { x: 220, y: 500, w: 8, h: 17, vx: 0, vy: -560, damage: 1, color: '#ffe85b', homing: true },
    ],
  });
  r = run(s, { dt: 100 });
  assert.equal(r.state.bullets[0].vx, 0);
  assert.equal(r.state.bullets[0].vy, -560);
});
test('曜金流星 homing duration freezes while paused and existing homing bullets continue after it expires', () => {
  let s = GameRules.create({
    fighterId: 'yellow',
    homingMs: 1,
    bullets: [
      { x: 220, y: 500, w: 8, h: 17, vx: 0, vy: -560, damage: 1, color: '#ffe85b', homing: true },
    ],
    enemies: [{ kind: 'normal', x: 360, y: 400, w: 38, h: 38, hp: 1, score: 100, speed: 0 }],
  });
  let r = run(s, { dt: 16 });
  assert.equal(r.state.homingMs, 0);
  assert.equal(r.state.bullets[0].homing, true);
  assert.ok(r.state.bullets[0].vx > 0);
  r = run({ ...r.state, status: 'paused', homingMs: 4000 }, { dt: 2000 });
  assert.equal(r.state.homingMs, 4000);
});
test('青岚影忍 summons two half-size wingmen that inherit scatter and double fire', () => {
  let s = GameRules.create({ fighterId: 'green', skillCharge: 100 });
  let r = run(s, { dt: 0, input: { skill: true } });
  assert.equal(r.state.wingmenMs, 8000);
  assert.equal(r.state.skillCharge, 0);
  assert.equal(r.state.skillCooldownMs, 18000);
  assert.ok(r.events.some((e) => e.type === 'wingmen-activated'));
  r = run({ ...r.state, fireClock: 180, spreadMs: 8000 }, { dt: 0 });
  const support = r.state.bullets.filter((b) => b.support);
  assert.equal(r.state.bullets.length, 9);
  assert.equal(support.length, 6);
  assert.ok(
    support.every((b) => b.w === 4 && b.h === 8.5 && b.damage === 0.5 && b.color === '#65ff9a'),
  );
  r = run(
    GameRules.create({ fighterId: 'green', wingmenMs: 8000, doubleMs: 8000, fireClock: 90 }),
    { dt: 0 },
  );
  assert.equal(r.state.bullets.length, 3);
  assert.equal(r.state.bullets.filter((b) => b.support).length, 2);
  r = run({ ...r.state, wingmenMs: 8000 }, { dt: 1000 });
  assert.equal(r.state.wingmenMs, 7000);
  r = run({ ...r.state, status: 'paused' }, { dt: 2000 });
  assert.equal(r.state.wingmenMs, 7000);
});
test('银翼杀手 activates three seconds of stealth without clearing enemies', () => {
  let s = GameRules.create({
    fighterId: 'silver',
    player: { x: 210, y: 630, lives: 2 },
    skillCharge: 100,
    enemies: [{ kind: 'normal', x: 190, y: 300, w: 38, h: 38, hp: 1, score: 100, speed: 0 }],
    enemyBullets: [{ x: 235, y: 650, w: 8, h: 14, vx: 0, vy: 0 }],
  });
  let r = run(s, { dt: 0, input: { skill: true } });
  assert.equal(r.state.skillCharge, 0);
  assert.equal(r.state.skillCooldownMs, 18000);
  assert.equal(r.state.stealthMs, 3000);
  assert.equal(r.state.enemies.length, 1);
  assert.equal(r.state.player.lives, 2);
  assert.ok(r.events.some((e) => e.type === 'stealth-activated'));
  r = run(r.state, { dt: 1000 });
  assert.equal(r.state.stealthMs, 2000);
  assert.equal(r.state.skillCooldownMs, 17000);
  assert.equal(r.state.player.lives, 2);
  assert.equal(r.state.enemyBullets.length, 0);
  r = run({ ...r.state, status: 'paused' }, { dt: 2000 });
  assert.equal(r.state.stealthMs, 2000);
  assert.equal(r.state.skillCooldownMs, 17000);
});
test('consumes an enemy bullet once on collision', () => {
  let s = GameRules.create({
    player: { x: 210, y: 630, lives: 3 },
    enemyBullets: [{ x: 235, y: 650, w: 8, h: 14, vx: 0, vy: 0 }],
  });
  s = run(s).state;
  assert.equal(s.player.lives, 2);
  assert.equal(s.enemyBullets.length, 0);
});
test('spawns all three enemy kinds from deterministic rolls', () => {
  for (const [roll, kind] of [
    [0.2, 'normal'],
    [0.6, 'fast'],
    [0.9, 'elite'],
  ]) {
    let s = GameRules.create({ score: 500, spawnClock: 700 });
    s = run(s, { dt: 0, random: () => roll }).state;
    assert.equal(s.enemies[0].kind, kind);
  }
});
test('uses the documented four powerup drop ranges', () => {
  for (const [roll, kind] of [
    [0.024, 'shield'],
    [0.025, 'spread'],
    [0.055, 'double'],
    [0.09, 'heal'],
  ]) {
    let s = GameRules.create({
      bullets: [{ x: 200, y: 190, w: 8, h: 17, vx: 0, vy: 0 }],
      enemies: [{ kind: 'normal', x: 190, y: 180, w: 38, h: 38, hp: 1, score: 100, speed: 0 }],
    });
    s = run(s, { dt: 0, random: () => roll }).state;
    assert.equal(s.powerups[0].kind, kind);
  }
  let s = GameRules.create({
    bullets: [{ x: 200, y: 190, w: 8, h: 17, vx: 0, vy: 0 }],
    enemies: [{ kind: 'normal', x: 190, y: 180, w: 38, h: 38, hp: 1, score: 100, speed: 0 }],
  });
  s = run(s, { dt: 0, random: () => 0.1 }).state;
  assert.equal(s.powerups.length, 0);
});
test('healing restores one life, consumes at full life, and expires its effect', () => {
  let s = GameRules.create({
    player: { x: 210, y: 630, lives: 2 },
    powerups: [{ kind: 'heal', x: 220, y: 635, w: 28, h: 28, vy: 100 }],
  });
  let r = run(s, { dt: 0 });
  assert.equal(r.state.player.lives, 3);
  assert.equal(r.state.powerups.length, 0);
  assert.equal(r.state.healFlashMs, 700);
  assert.ok(r.events.some((e) => e.type === 'life-restored'));
  r = run(r.state, { dt: 700 });
  assert.equal(r.state.healFlashMs, 0);
  s = GameRules.create({
    player: { x: 210, y: 630, lives: 3 },
    powerups: [{ kind: 'heal', x: 220, y: 635, w: 28, h: 28, vy: 100 }],
  });
  r = run(s, { dt: 0 });
  assert.equal(r.state.player.lives, 3);
  assert.equal(r.state.powerups.length, 0);
  assert.equal(r.state.healFlashMs, 0);
  assert.ok(!r.events.some((e) => e.type === 'life-restored'));
});
test('charges 蔚蓝风暴 skill from regular kills and clears the extended local range', () => {
  let s = GameRules.create({
    player: { x: 210, y: 630 },
    bullets: [{ x: 200, y: 190, w: 8, h: 17, vx: 0, vy: 0 }],
    enemies: [{ kind: 'normal', x: 190, y: 180, w: 38, h: 38, hp: 1, score: 100, speed: 0 }],
  });
  let r = run(s, { dt: 0 });
  assert.equal(r.state.skillCharge, 2);
  s = GameRules.create({
    player: { x: 210, y: 630, lives: 1 },
    skillCharge: 100,
    enemies: [
      { kind: 'normal', x: 220, y: 630, w: 38, h: 38, hp: 1, score: 100, speed: 0 },
      { kind: 'fast', x: 430, y: 630, w: 30, h: 30, hp: 1, score: 150, speed: 0 },
    ],
    enemyBullets: [
      { x: 230, y: 650, w: 8, h: 14, vx: 0, vy: 0 },
      { x: 20, y: 20, w: 8, h: 14, vx: 0, vy: 0 },
    ],
    boss: {
      stage: 1,
      trigger: 10000,
      x: 160,
      y: 70,
      w: 160,
      h: 120,
      hp: 20,
      maxHp: 20,
      attackClock: 0,
      pattern: 0,
      phase: 0,
    },
  });
  r = run(s, { dt: 0, input: { skill: true } });
  assert.equal(r.state.score, 250);
  assert.equal(r.state.skillCharge, 0);
  assert.equal(r.state.skillCooldownMs, 18000);
  assert.ok(r.state.shockwaveFlashMs > 0);
  assert.equal(r.state.enemies.length, 0);
  assert.equal(r.state.enemyBullets.length, 1);
  assert.equal(r.state.player.lives, 1);
  assert.equal(r.state.boss.hp, 20);
  assert.equal(r.state.powerups.length, 0);
  assert.ok(r.events.some((e) => e.type === 'shockwave-released'));
});
test('uses a five-times-hull shockwave radius', () => {
  assert.equal(GameRules.constants.SHOCKWAVE_RANGE, 300);
});
test('enforces skill gates, weighted charge, cap, and paused cooldown', () => {
  for (const [kind, charge, w, h] of [
    ['fast', 3, 30, 30],
    ['elite', 5, 58, 52],
  ]) {
    let s = GameRules.create({
      bullets: [{ x: 200, y: 190, w: 8, h: 17, vx: 0, vy: 0 }],
      enemies: [{ kind, x: 190, y: 180, w, h, hp: 1, score: 100, speed: 0, phase: 0 }],
    });
    assert.equal(run(s, { dt: 0 }).state.skillCharge, charge);
  }
  let s = GameRules.create({ skillCharge: 99 });
  let r = run(s, { dt: 0, input: { skill: true } });
  assert.equal(r.state.skillCharge, 99);
  assert.equal(r.state.skillCooldownMs, 0);
  s = GameRules.create({ skillCharge: 100, skillCooldownMs: 1 });
  r = run(s, { dt: 0, input: { skill: true } });
  assert.equal(r.state.skillCharge, 100);
  assert.equal(r.state.skillCooldownMs, 1);
  s = GameRules.create({
    skillCharge: 96,
    bullets: [{ x: 200, y: 190, w: 8, h: 17, vx: 0, vy: 0 }],
    enemies: [
      { kind: 'elite', x: 190, y: 180, w: 58, h: 52, hp: 1, score: 350, speed: 0, phase: 0 },
    ],
  });
  assert.equal(run(s, { dt: 0 }).state.skillCharge, 100);
  s = GameRules.create({ status: 'paused', skillCooldownMs: 18000, shockwaveFlashMs: 520 });
  r = run(s, { dt: 2000 });
  assert.equal(r.state.skillCooldownMs, 18000);
  assert.equal(r.state.shockwaveFlashMs, 520);
});
test('triggers Boss 1 once, awards two thousand, and grants ranking eligibility', () => {
  let s = GameRules.create({ score: 10000 });
  let r = run(s, { dt: 0 });
  assert.equal(r.state.boss.stage, 1);
  assert.ok(r.events.some((e) => e.type === 'boss-started'));
  s = GameRules.create({
    score: 10000,
    boss: {
      stage: 1,
      trigger: 10000,
      x: 160,
      y: 70,
      w: 160,
      h: 120,
      hp: 1,
      maxHp: 1,
      attackClock: 0,
      pattern: 0,
      phase: 0,
    },
    bullets: [{ x: 200, y: 100, w: 8, h: 17, vx: 0, vy: 0 }],
  });
  r = run(s, { dt: 0 });
  assert.equal(r.state.score, 12000);
  assert.equal(r.state.rankEligible, true);
  assert.ok(r.events.some((e) => e.type === 'boss-defeated'));
  assert.ok(r.events.some((e) => e.type === 'ranking-unlocked'));
});
test('emits a run-ended event for death and final victory while paused time does not advance', () => {
  let s = GameRules.create({ elapsedMs: 1000, status: 'paused' });
  assert.equal(run(s, { dt: 2000 }).state.elapsedMs, 1000);
  s = GameRules.create({
    player: { x: 210, y: 630, lives: 1 },
    enemyBullets: [{ x: 235, y: 650, w: 8, h: 14, vx: 0, vy: 0 }],
  });
  let r = run(s);
  assert.equal(r.state.status, 'over');
  assert.ok(r.events.some((e) => e.type === 'run-ended' && e.reason === 'death'));
  s = GameRules.create({
    score: 100000,
    boss: {
      stage: 4,
      trigger: 100000,
      x: 160,
      y: 70,
      w: 160,
      h: 120,
      hp: 1,
      maxHp: 1,
      attackClock: 0,
      pattern: 0,
      phase: 0,
    },
    bullets: [{ x: 200, y: 100, w: 8, h: 17, vx: 0, vy: 0 }],
  });
  r = run(s, { dt: 0 });
  assert.equal(r.state.status, 'success');
  assert.ok(r.events.some((e) => e.type === 'run-ended' && e.reason === 'victory'));
});

test('银翼杀手瞬闪突袭 selects nearest ordinary target without starting cooldown until second phase', () => {
  const target = {
    kind: 'normal',
    id: 7,
    x: 200,
    y: 500,
    w: 38,
    h: 38,
    hp: 1,
    score: 100,
    speed: 0,
  };
  let r = run(GameRules.create({ fighterId: 'silver', enemies: [target] }), {
    dt: 0,
    input: { blink: true },
    random: () => 0,
  });
  assert.equal(r.state.blinkCooldownMs, 0);
  assert.equal(r.state.blinkMarker.targetId, 7);
  assert.equal(r.state.blinkMarker.targetKind, 'enemy');
  assert.equal(r.state.blinkMarker.locked, false);
  assert.equal(r.state.blinkMarker.remainingMs, 5000);
  assert.equal(r.state.score, 0);
  r = run(r.state, { dt: 200 });
  assert.equal(r.state.blinkMarker.locked, true);
  r = run(r.state, { dt: 0, input: { blink: true } });
  assert.equal(r.state.blinkCooldownMs, 15000);
});

test('银翼杀手等待目标进入活动区后才允许二段，并优先普通敌机', () => {
  const s = GameRules.create({
    fighterId: 'silver',
    enemies: [
      { kind: 'normal', id: 3, x: 220, y: 100, w: 38, h: 38, hp: 1, score: 100, speed: 0 },
      { kind: 'fast', id: 4, x: 330, y: 500, w: 30, h: 30, hp: 1, score: 150, speed: 0 },
    ],
  });
  let r = run(s, { dt: 0, input: { blink: true } });
  assert.equal(r.state.blinkMarker.targetId, 4);
  r = run(r.state, { dt: 500 });
  assert.equal(r.state.blinkMarker.locked, true);
  assert.equal(r.state.blinkMarker.inRange, true);
  r = run(r.state, { dt: 0, input: { blink: true } });
  assert.equal(
    r.state.enemies.some((enemy) => enemy.id === 4),
    false,
  );
  assert.equal(r.state.score, 150);
});

test('银翼标记锁定期间玩家子弹无法伤害目标，Boss目标二段只扣血不传送', () => {
  let s = GameRules.create({
    fighterId: 'silver',
    bullets: [{ x: 200, y: 360, w: 8, h: 17, vx: 0, vy: 0 }],
    enemies: [{ kind: 'elite', id: 5, x: 190, y: 360, w: 58, h: 52, hp: 3, score: 350, speed: 0 }],
    blinkMarker: {
      mode: 'assault',
      x: 214,
      y: 424,
      w: 10,
      h: 14,
      locked: true,
      inRange: true,
      lost: false,
      targetKind: 'enemy',
      targetId: 5,
      remainingMs: 4000,
      cooldownAfterMs: 15000,
    },
  });
  let r = run(s, { dt: 0 });
  assert.equal(r.state.enemies[0].hp, 3);
  s = GameRules.create({
    fighterId: 'silver',
    player: { x: 10, y: 630 },
    boss: {
      stage: 1,
      trigger: 10000,
      x: 160,
      y: 80,
      w: 160,
      h: 120,
      hp: 10,
      maxHp: 10,
      attackClock: 0,
      pattern: 0,
      phase: 0,
    },
    blinkMarker: {
      mode: 'assault',
      x: 235,
      y: 212,
      w: 10,
      h: 14,
      locked: true,
      inRange: false,
      lost: false,
      targetKind: 'boss',
      targetId: null,
      remainingMs: 4000,
      cooldownAfterMs: 15000,
    },
  });
  r = run(s, { dt: 0, input: { blink: true } });
  assert.equal(r.state.boss.hp, 7);
  assert.equal(r.state.player.x, 10);
  assert.equal(r.state.player.y, 630);
  assert.equal(r.state.blinkCooldownMs, 15000);
});

test('曜金流星星煌跃迁只放置原地标记并在二段后进入十秒冷却', () => {
  let s = GameRules.create({
    fighterId: 'yellow',
    player: { x: 120, y: 500 },
    enemies: [{ kind: 'normal', id: 1, x: 200, y: 200, w: 38, h: 38, hp: 1, score: 100, speed: 0 }],
  });
  let r = run(s, { dt: 0, input: { blink: true } });
  assert.equal(r.state.blinkMarker.noTarget, true);
  assert.equal(r.state.blinkMarker.mode, 'beacon');
  assert.equal(r.state.blinkMarker.targetId, null);
  assert.equal(r.state.blinkCooldownMs, 0);
  r = run(r.state, { dt: 0, input: { blink: true } });
  assert.equal(r.state.blinkMarker, null);
  assert.equal(r.state.blinkCooldownMs, 10000);
  s = GameRules.create({
    fighterId: 'azure',
    enemies: [{ kind: 'normal', id: 1, x: 200, y: 360, w: 38, h: 38, hp: 1, score: 100, speed: 0 }],
  });
  assert.equal(run(s, { dt: 0, input: { blink: true } }).state.blinkMarker, null);
});

test('银翼杀手二段在锁定后瞬移并造成三点伤害，只获得击杀分数', () => {
  const target = {
    kind: 'normal',
    id: 9,
    x: 200,
    y: 360,
    w: 38,
    h: 38,
    hp: 3,
    score: 100,
    speed: 0,
  };
  const s = GameRules.create({
    fighterId: 'silver',
    blinkCooldownMs: 9000,
    blinkMarker: {
      x: 214,
      y: 410,
      w: 10,
      h: 14,
      mode: 'assault',
      locked: true,
      lost: false,
      inRange: true,
      targetKind: 'enemy',
      targetId: 9,
      remainingMs: 4000,
    },
    enemies: [target],
    skillCharge: 20,
  });
  const r = run(s, { dt: 0, input: { blink: true } });
  assert.equal(r.state.blinkMarker, null);
  assert.equal(r.state.enemies.length, 0);
  assert.equal(r.state.score, 100);
  assert.equal(r.state.skillCharge, 20);
  assert.equal(r.state.player.y, 410);
  assert.ok(r.events.some((event) => event.type === 'blink-triggered' && event.hit));
});

test('目标先被击毁后，瞬闪仍可无伤位移；标记五秒过期且暂停冻结', () => {
  let s = GameRules.create({
    fighterId: 'yellow',
    blinkCooldownMs: 10000,
    blinkMarker: {
      x: 214,
      y: 410,
      w: 10,
      h: 14,
      locked: true,
      lost: false,
      targetId: 99,
      remainingMs: 4000,
    },
    skillCharge: 8,
  });
  let r = run(s, { dt: 0, input: { blink: true } });
  assert.equal(r.state.score, 0);
  assert.equal(r.state.skillCharge, 8);
  assert.equal(r.state.player.y, 410);
  assert.equal(r.state.blinkCooldownMs, 15000);
  s = GameRules.create({
    fighterId: 'yellow',
    status: 'paused',
    blinkCooldownMs: 10000,
    blinkMarker: {
      x: 1,
      y: 2,
      w: 10,
      h: 14,
      locked: true,
      lost: false,
      targetId: null,
      remainingMs: 4000,
    },
  });
  r = run(s, { dt: 6000 });
  assert.equal(r.state.blinkCooldownMs, 10000);
  assert.equal(r.state.blinkMarker.remainingMs, 4000);
  s = GameRules.create({
    fighterId: 'yellow',
    blinkMarker: {
      x: 1,
      y: 2,
      w: 10,
      h: 14,
      locked: false,
      lost: false,
      targetId: null,
      remainingMs: 1,
    },
  });
  assert.equal(run(s, { dt: 16 }).state.blinkMarker, null);
});

test('蔚蓝风暴潮涌屏障按 E 获得五秒护盾，未触发时冷却缩短五秒', () => {
  let r = run(GameRules.create({ fighterId: 'azure' }), { dt: 0, input: { blink: true } });
  assert.equal(r.state.shieldSkillMs, 5000);
  assert.equal(r.state.shieldSkillCooldownMs, 30000);
  assert.equal(r.state.shieldAvailable, true);
  r = run(r.state, { dt: 5000 });
  assert.equal(r.state.shieldSkillMs, 0);
  assert.equal(r.state.shieldSkillCooldownMs, 20000);
  assert.equal(r.state.shieldAvailable, false);
  r = run(GameRules.create({ fighterId: 'azure' }), { dt: 0, input: { blink: true } });
  r = run({ ...r.state, enemyBullets: [{ x: 235, y: 640, w: 8, h: 14, vx: 0, vy: 0 }] }, { dt: 0 });
  assert.equal(r.state.player.lives, 3);
  assert.equal(r.state.shieldSkillMs, 0);
  assert.equal(r.state.shieldSkillCooldownMs, 30000);
  assert.equal(r.state.shieldSkillArmed, false);
});

test('潮涌屏障暂停冻结，非蔚蓝风暴按 E 无效果', () => {
  let s = GameRules.create({
    fighterId: 'azure',
    status: 'paused',
    shieldSkillMs: 5000,
    shieldSkillCooldownMs: 30000,
    shieldSkillArmed: true,
  });
  let r = run(s, { dt: 6000, input: { blink: true } });
  assert.equal(r.state.shieldSkillMs, 5000);
  assert.equal(r.state.shieldSkillCooldownMs, 30000);
  s = GameRules.create({ fighterId: 'silver' });
  r = run(s, { dt: 0, input: { blink: true } });
  assert.equal(r.state.shieldSkillMs, 0);
  assert.equal(r.state.shieldSkillCooldownMs, 0);
});

test('无目标标记过期不会消耗冷却，且暂停冻结原地标记', () => {
  let s = GameRules.create({
    fighterId: 'yellow',
    blinkMarker: {
      x: 235,
      y: 616,
      w: 10,
      h: 14,
      targetId: null,
      locked: true,
      lost: false,
      noTarget: true,
      remainingMs: 4000,
      cooldownAfterMs: 10000,
    },
  });
  let r = run(s, { dt: 2000 });
  assert.equal(r.state.blinkMarker.remainingMs, 2000);
  assert.equal(r.state.blinkCooldownMs, 0);
  s = GameRules.create({
    fighterId: 'yellow',
    status: 'paused',
    blinkMarker: {
      x: 235,
      y: 616,
      w: 10,
      h: 14,
      targetId: null,
      locked: true,
      lost: false,
      noTarget: true,
      remainingMs: 4000,
      cooldownAfterMs: 10000,
    },
  });
  r = run(s, { dt: 5000 });
  assert.equal(r.state.blinkMarker.remainingMs, 4000);
  assert.equal(r.state.blinkCooldownMs, 0);
});
