(function (root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  root.FighterCatalog = catalog;
})(globalThis, () => {
  const constants = Object.freeze({
    skillCooldown: 18000,
    shockwaveFlash: 520,
    stealthDuration: 3000,
    wingmenDuration: 8000,
    homingDuration: 5000,
    homingTurnRate: 4.8,
  });
  const noOp = () => {};
  const noShotDecoration = () => {};
  const noInvulnerability = () => false;
  const wingmanPositions = (state) => [
    { x: state.player.x - 16, y: state.player.y + 22 },
    { x: state.player.x + 46, y: state.player.y + 22 },
  ];

  const shockwaveRules = Object.freeze({
    tick(state, ms) {
      state.shockwaveFlashMs = Math.max(0, state.shockwaveFlashMs - ms);
    },
    activate({ state, events, inRange }) {
      state.shockwaveFlashMs = constants.shockwaveFlash;
      state.enemies = state.enemies.filter((enemy) => {
        if (!inRange(enemy)) return true;
        state.score += enemy.score;
        return false;
      });
      state.enemyBullets = state.enemyBullets.filter((bullet) => !inRange(bullet));
      events.push({ type: 'shockwave-released' });
    },
    afterVolley: noOp,
    decorateShot: noShotDecoration,
    isInvulnerable: noInvulnerability,
  });
  const stealthRules = Object.freeze({
    tick(state, ms) {
      state.stealthMs = Math.max(0, state.stealthMs - ms);
    },
    activate({ state, events }) {
      state.stealthMs = constants.stealthDuration;
      events.push({ type: 'stealth-activated' });
    },
    afterVolley: noOp,
    decorateShot: noShotDecoration,
    isInvulnerable: (state) => state.stealthMs > 0,
  });
  const wingmenRules = Object.freeze({
    tick(state, ms) {
      state.wingmenMs = Math.max(0, state.wingmenMs - ms);
    },
    activate({ state, events }) {
      state.wingmenMs = constants.wingmenDuration;
      events.push({ type: 'wingmen-activated' });
    },
    afterVolley({ state, addShot }) {
      if (state.wingmenMs <= 0) return;
      for (const wingman of wingmanPositions(state))
        addShot({ x: wingman.x + 13, y: wingman.y - 5, w: 4, h: 8.5, damage: 0.5, support: true });
    },
    decorateShot: noShotDecoration,
    isInvulnerable: noInvulnerability,
  });
  const homingRules = Object.freeze({
    tick(state, ms) {
      state.homingMs = Math.max(0, state.homingMs - ms);
    },
    activate({ state, events }) {
      state.homingMs = constants.homingDuration;
      events.push({ type: 'homing-activated' });
    },
    afterVolley: noOp,
    decorateShot({ state, shot }) {
      if (state.homingMs > 0) shot.homing = true;
    },
    isInvulnerable: noInvulnerability,
  });
  function fighter(data) {
    return Object.freeze({
      ...data,
      selection: Object.freeze({ ...data.selection }),
      visual: Object.freeze({ ...data.visual, effect: Object.freeze({ ...data.visual.effect }) }),
      rules: data.rules,
    });
  }
  const fighters = Object.freeze({
    azure: fighter({
      id: 'azure',
      name: '蔚蓝风暴',
      skillName: '冲击波',
      ability: 'shockwave',
      speed: 320,
      bulletDamage: 1,
      bulletColor: '#5ef',
      selection: {
        label: '蔚蓝风暴',
        description: '冲击波 · 范围清场',
        border: '#65e8ff',
        glow: '#38d8ff55',
        background: '#15365b',
      },
      visual: {
        spriteFile: 'player-ship.png',
        orientation: 0,
        effect: { kind: 'shockwave', color: '#57eaff' },
        activeState: null,
        activeLabel: null,
        statusClass: null,
      },
      rules: shockwaveRules,
    }),
    silver: fighter({
      id: 'silver',
      name: '银翼杀手',
      skillName: '隐匿',
      ability: 'stealth',
      speed: 320,
      bulletDamage: 1,
      bulletColor: '#dcecff',
      selection: {
        label: '银翼杀手',
        description: '隐匿 · 3 秒无敌',
        border: '#d8e4f0',
        glow: '#d9e9ff55',
        background: '#30384b',
      },
      visual: {
        spriteFile: 'player-silver-stealth.png',
        orientation: 180,
        effect: { kind: 'stealth', color: '#d9eeff' },
        activeState: 'stealthMs',
        activeLabel: '隐匿中',
        statusClass: 'stealth-active',
      },
      rules: stealthRules,
    }),
    green: fighter({
      id: 'green',
      name: '青岚影忍',
      skillName: '影分身援护',
      ability: 'wingmen',
      speed: 320,
      bulletDamage: 1,
      bulletColor: '#65ff9a',
      selection: {
        label: '青岚影忍',
        description: '影分身援护 · 双僚机支援',
        border: '#75ff9e',
        glow: '#58ff8d55',
        background: '#133d2d',
      },
      visual: {
        spriteFile: 'player-green-ninja.png',
        orientation: 0,
        effect: { kind: 'wingmen', color: '#65ff9a' },
        activeState: 'wingmenMs',
        activeLabel: '援护中',
        statusClass: 'wingmen-active',
      },
      rules: wingmenRules,
    }),
    yellow: fighter({
      id: 'yellow',
      name: '曜金流星',
      skillName: '耀斑追猎',
      ability: 'homing',
      speed: 320,
      bulletDamage: 1,
      bulletColor: '#ffe85b',
      selection: {
        label: '曜金流星',
        description: '耀斑追猎 · 5 秒自动追踪',
        border: '#ffe85b',
        glow: '#ffc75a66',
        background: '#55400d',
      },
      visual: {
        spriteFile: 'player-yellow-solar.png',
        orientation: 0,
        effect: { kind: 'homing', color: '#ffe85b' },
        activeState: 'homingMs',
        activeLabel: '追猎中',
        statusClass: 'homing-active',
      },
      rules: homingRules,
    }),
  });
  const ordered = Object.freeze([fighters.azure, fighters.silver, fighters.green, fighters.yellow]);
  return Object.freeze({ constants, fighters, list: () => ordered, get: (id) => fighters[id] });
});
