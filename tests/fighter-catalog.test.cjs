const assert = require('node:assert/strict');
const test = require('node:test');
const FighterCatalog = require('../fighter-catalog.js');

test('lists the four selectable fighters with complete visual and skill descriptions', () => {
  const fighters = FighterCatalog.list();
  assert.deepEqual(
    fighters.map((f) => f.id),
    ['azure', 'silver', 'green', 'yellow'],
  );
  for (const fighter of fighters) {
    assert.equal(FighterCatalog.get(fighter.id), fighter);
    assert.equal(fighter.speed, 320);
    assert.equal(fighter.bulletDamage, 1);
    assert.ok(fighter.selection.label);
    assert.ok(fighter.selection.description);
    assert.match(fighter.visual.spriteFile, /^player-.*\.png$/);
    assert.ok(fighter.skillName);
    assert.equal(typeof fighter.rules.activate, 'function');
    assert.equal(typeof fighter.rules.tick, 'function');
    assert.equal(typeof fighter.rules.afterVolley, 'function');
  }
  assert.equal(FighterCatalog.get('missing'), undefined);
  assert.deepEqual(FighterCatalog.get('azure').utility, {
    kind: 'shield',
    name: '潮涌屏障',
    key: 'E',
    durationMs: 5000,
    cooldownMs: 30000,
    reductionMs: 5000,
    color: '#57eaff',
  });
  assert.deepEqual(
    [
      FighterCatalog.get('yellow').utility.trackedCooldownMs,
      FighterCatalog.get('yellow').utility.emptyCooldownMs,
    ],
    [15000, 10000],
  );
});

test('keeps skill visual descriptors separate from the pure ability rules', () => {
  assert.deepEqual(FighterCatalog.get('azure').visual.effect, {
    kind: 'shockwave',
    color: '#57eaff',
  });
  assert.deepEqual(FighterCatalog.get('silver').visual.effect, {
    kind: 'stealth',
    color: '#d9eeff',
  });
  assert.deepEqual(FighterCatalog.get('green').visual.effect, {
    kind: 'wingmen',
    color: '#65ff9a',
  });
  assert.deepEqual(FighterCatalog.get('yellow').visual.effect, {
    kind: 'homing',
    color: '#ffe85b',
  });
  assert.equal(FighterCatalog.constants.homingDuration, 5000);
});
