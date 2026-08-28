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
    blinkCooldown: 10000,
    blinkTrackedCooldown: 15000,
    blinkEmptyCooldown: 10000,
    blinkWindow: 5000,
    blinkMarkerSpeed: 820,
    blinkDamage: 3,
    blinkFlash: 460,
    shieldSkillDuration: 5000,
    shieldSkillCooldown: 30000,
    shieldSkillReduction: 5000,
    shadowStrikeCooldown: 12000,
    shadowStrikeDuration: 450,
    shadowStrikeDamage: 2,
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
      utility: data.utility && Object.freeze({ ...data.utility }),
      guide:
        data.guide &&
        Object.freeze({
          q: Object.freeze([...data.guide.q]),
          e: Object.freeze([...data.guide.e]),
        }),
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
      utility: {
        kind: 'shield',
        name: '潮涌屏障',
        key: 'E',
        durationMs: constants.shieldSkillDuration,
        cooldownMs: constants.shieldSkillCooldown,
        reductionMs: constants.shieldSkillReduction,
        color: '#57eaff',
      },
      guide: {
        q: [
          '充满 100 能量且 18 秒冷却结束后释放。',
          '清除半径 300 内的普通敌机与敌方子弹（含 Boss 子弹），不会伤害 Boss。',
          '清除获得原分数，但不掉强化包、不为下一次 Q 充能。',
        ],
        e: [
          '立即获得 5 秒护盾，基础冷却 30 秒，不消耗 Q 能量。',
          '护盾抵挡一次敌弹或撞机后立即消失；若自然结束且未触发，剩余冷却额外减少 5 秒。',
        ],
      },
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
      utility: {
        kind: 'blink',
        mode: 'assault',
        name: '瞬闪突袭',
        key: 'E',
        trackedCooldownMs: constants.blinkTrackedCooldown,
        windowMs: constants.blinkWindow,
        markerSpeed: constants.blinkMarkerSpeed,
        damage: constants.blinkDamage,
        flashMs: constants.blinkFlash,
        color: '#d9eeff',
      },
      guide: {
        q: [
          '充满 100 能量且 18 秒冷却结束后释放，获得 3 秒隐匿无敌。',
          '敌弹命中仍会消失；自动射击、敌人攻击与 Boss 战照常进行。',
        ],
        e: [
          '发射定位标记锁定最近的普通、快速或精英敌机；场上没有三类敌机时才锁定 Boss。',
          '标记目标暂时免疫玩家伤害；普通目标进入活动区后可二段瞬移并造成 3 点伤害。',
          'Boss 二段只造成 3 点伤害、不传送；二段后冷却 15 秒，无目标不进入冷却。',
        ],
      },
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
      utility: {
        kind: 'shadow-strike',
        name: '影刃双袭',
        key: 'E',
        cooldownMs: constants.shadowStrikeCooldown,
        durationMs: constants.shadowStrikeDuration,
        damage: constants.shadowStrikeDamage,
        color: '#65ff9a',
      },
      guide: {
        q: [
          '充满 100 能量且 18 秒冷却结束后，召唤两架持续 8 秒的后方僚机。',
          '主机每次射击时，僚机各发射一枚半尺寸、0.5 伤害的绿色支援弹。',
          '散射弹与双倍火力会同步强化僚机射击。',
        ],
        e: [
          '召唤两道约 0.45 秒的影分身，优先突袭最近至多两架不同的普通敌机，各造成 2 点伤害。',
          '没有普通敌机时，两道影分身共同攻击 Boss，合计造成 4 点伤害；无目标不触发冷却。',
          '冷却 12 秒；击杀只计分，不掉强化包、不增加 Q 能量，也不会影响 Q 僚机。',
        ],
      },
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
      utility: {
        kind: 'blink',
        mode: 'beacon',
        name: '星煌跃迁',
        key: 'E',
        cooldownMs: constants.blinkCooldown,
        trackedCooldownMs: constants.blinkTrackedCooldown,
        emptyCooldownMs: constants.blinkEmptyCooldown,
        windowMs: constants.blinkWindow,
        markerSpeed: constants.blinkMarkerSpeed,
        damage: constants.blinkDamage,
        flashMs: constants.blinkFlash,
        color: '#ffe85b',
      },
      guide: {
        q: [
          '充满 100 能量且 18 秒冷却结束后，接下来 5 秒发射的金色子弹获得追踪。',
          '每发子弹优先平滑追踪最近普通敌机；没有普通敌机时追踪 Boss；无目标时直线飞行。',
          '散射弹与双倍火力照常叠加，已发射的追踪弹会持续追击到命中或离场。',
        ],
        e: [
          '在机头部署一个持续 5 秒的金色空间标记；再次按 E 传送到标记位置。',
          '不锁定敌机、不造成伤害、不清弹；二段完成后冷却 10 秒，标记自然消失不进冷却。',
        ],
      },
      rules: homingRules,
    }),
  });
  const ordered = Object.freeze([fighters.azure, fighters.silver, fighters.green, fighters.yellow]);
  return Object.freeze({ constants, fighters, list: () => ordered, get: (id) => fighters[id] });
});
