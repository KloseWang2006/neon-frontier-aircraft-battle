(function (root, factory) {
  const catalog =
    typeof module === 'object' && module.exports
      ? require('./fighter-catalog.js')
      : root.FighterCatalog;
  const rules = factory(catalog);
  if (typeof module === 'object' && module.exports) module.exports = rules;
  root.GameRules = rules;
})(globalThis, (FighterCatalog) => {
  if (!FighterCatalog) throw new Error('FighterCatalog must load before GameRules');
  const W = 480,
    H = 720,
    TOP = 288,
    MAX_LIVES = 3,
    SKILL_MAX = 100,
    SKILL_COOLDOWN = FighterCatalog.constants.skillCooldown,
    SHOCKWAVE_RANGE = 300,
    SHOCKWAVE_FLASH = FighterCatalog.constants.shockwaveFlash,
    STEALTH_DURATION = FighterCatalog.constants.stealthDuration,
    WINGMEN_DURATION = FighterCatalog.constants.wingmenDuration,
    HOMING_DURATION = FighterCatalog.constants.homingDuration,
    HOMING_TURN_RATE = FighterCatalog.constants.homingTurnRate,
    BLINK_COOLDOWN = FighterCatalog.constants.blinkCooldown,
    BLINK_TRACKED_COOLDOWN = FighterCatalog.constants.blinkTrackedCooldown,
    BLINK_EMPTY_COOLDOWN = FighterCatalog.constants.blinkEmptyCooldown,
    BLINK_WINDOW = FighterCatalog.constants.blinkWindow,
    BLINK_DAMAGE = FighterCatalog.constants.blinkDamage,
    SHIELD_SKILL_DURATION = FighterCatalog.constants.shieldSkillDuration,
    SHIELD_SKILL_COOLDOWN = FighterCatalog.constants.shieldSkillCooldown,
    SHIELD_SKILL_REDUCTION = FighterCatalog.constants.shieldSkillReduction,
    SHADOW_STRIKE_COOLDOWN = FighterCatalog.constants.shadowStrikeCooldown,
    SHADOW_STRIKE_DURATION = FighterCatalog.constants.shadowStrikeDuration,
    SHADOW_STRIKE_DAMAGE = FighterCatalog.constants.shadowStrikeDamage,
    BLINK_TELEPORT_INVINCIBILITY = 300,
    PLAYER_HIT_INVINCIBILITY = 1000;
  const FIGHTERS = FighterCatalog.fighters;
  const PLAYER = { x: 210, y: 630, w: 60, h: 54, lives: MAX_LIVES, invincibleMs: 0 };
  const THRESHOLDS = [10000, 30000, 50000, 100000],
    BOSS_HP = [105, 170, 245, 330];
  const DIFFICULTY_BANDS = Object.freeze([
    Object.freeze({
      fromScore: 0,
      spawnInterval: 900,
      speeds: Object.freeze({ normal: 85, fast: 135, elite: 62 }),
      enemyFireInterval: 1100,
      enemyBulletSpeed: 205,
    }),
    Object.freeze({
      fromScore: 10000,
      spawnInterval: 700,
      speeds: Object.freeze({ normal: 95, fast: 155, elite: 68 }),
      enemyFireInterval: 900,
      enemyBulletSpeed: 235,
    }),
    Object.freeze({
      fromScore: 30000,
      spawnInterval: 650,
      speeds: Object.freeze({ normal: 102, fast: 167, elite: 74 }),
      enemyFireInterval: 825,
      enemyBulletSpeed: 250,
    }),
    Object.freeze({
      fromScore: 50000,
      spawnInterval: 600,
      speeds: Object.freeze({ normal: 110, fast: 180, elite: 80 }),
      enemyFireInterval: 750,
      enemyBulletSpeed: 260,
    }),
  ]);
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const clone = (s) => ({
    ...s,
    player: { ...s.player },
    bullets: s.bullets.map((v) => ({ ...v })),
    enemyBullets: s.enemyBullets.map((v) => ({ ...v })),
    enemies: s.enemies.map((v) => ({ ...v })),
    powerups: s.powerups.map((v) => ({ ...v })),
    boss: s.boss && { ...s.boss },
    blinkMarker: s.blinkMarker && { ...s.blinkMarker },
    blinkFlash: s.blinkFlash && { ...s.blinkFlash },
    shadowStrikes: s.shadowStrikes.map((v) => ({ ...v })),
    triggered: [...s.triggered],
    bossesDefeated: [...s.bossesDefeated],
  });

  function create(o = {}) {
    const fighterId = FIGHTERS[o.fighterId] ? o.fighterId : 'azure';
    const d = {
      fighterId,
      player: PLAYER,
      bullets: [],
      enemyBullets: [],
      enemies: [],
      powerups: [],
      boss: null,
      score: 0,
      status: 'running',
      elapsedMs: 0,
      fireClock: 0,
      spawnClock: 0,
      enemyFireClock: 0,
      nextId: 1,
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
      blinkCooldownMs: 0,
      blinkMarker: null,
      blinkFlash: null,
      shieldSkillCooldownMs: 0,
      shieldSkillMs: 0,
      shieldSkillArmed: false,
      shadowStrikeCooldownMs: 0,
      shadowStrikes: [],
      shieldAvailable: false,
      triggered: [],
      bossesDefeated: [],
      rankEligible: false,
    };
    return {
      ...d,
      ...o,
      fighterId,
      player: { ...PLAYER, ...(o.player || {}) },
      bullets: (o.bullets || []).map((v) => ({ ...v })),
      enemyBullets: (o.enemyBullets || []).map((v) => ({ ...v })),
      enemies: (o.enemies || []).map((v) => ({ ...v })),
      powerups: (o.powerups || []).map((v) => ({ ...v })),
      triggered: [...(o.triggered || [])],
      bossesDefeated: [...(o.bossesDefeated || [])],
      blinkMarker: o.blinkMarker ? { ...o.blinkMarker } : null,
      blinkFlash: o.blinkFlash ? { ...o.blinkFlash } : null,
      shadowStrikes: (o.shadowStrikes || []).map((v) => ({ ...v })),
      shieldSkillCooldownMs: Math.max(0, o.shieldSkillCooldownMs || 0),
      shieldSkillMs: Math.max(0, o.shieldSkillMs || 0),
      shadowStrikeCooldownMs: Math.max(0, o.shadowStrikeCooldownMs || 0),
      shieldSkillArmed: Boolean(o.shieldSkillArmed),
    };
  }

  function difficultyForScore(score) {
    return [...DIFFICULTY_BANDS].reverse().find((band) => score >= band.fromScore);
  }

  function enemy(kind, id, x, difficulty) {
    const q =
      kind === 'elite'
        ? { w: 58, h: 52, hp: 3, score: 350, speed: difficulty.speeds.elite }
        : kind === 'fast'
          ? { w: 30, h: 30, hp: 1, score: 150, speed: difficulty.speeds.fast }
          : { w: 38, h: 38, hp: 1, score: 100, speed: difficulty.speeds.normal };
    return { kind, id, x, y: -q.h, ...q, phase: 0 };
  }

  function spawn(s, random, difficulty) {
    const roll = random(),
      kind = roll > 0.82 ? 'elite' : roll > 0.55 ? 'fast' : 'normal',
      w = kind === 'elite' ? 58 : kind === 'fast' ? 30 : 38;
    s.enemies.push(enemy(kind, s.nextId++, 24 + random() * (W - w - 48), difficulty));
  }

  function powerupKind(r) {
    return r < 0.025 ? 'shield' : r < 0.055 ? 'spread' : r < 0.09 ? 'double' : 'heal';
  }

  function fighter(s) {
    return FighterCatalog.get(s.fighterId) || FIGHTERS.azure;
  }
  function chargeSkill(s, kind) {
    s.skillCharge = Math.min(
      SKILL_MAX,
      s.skillCharge + (kind === 'elite' ? 5 : kind === 'fast' ? 3 : 2),
    );
  }
  function inShockwaveRange(s, target) {
    const px = s.player.x + s.player.w / 2,
      py = s.player.y + s.player.h / 2,
      tx = target.x + target.w / 2,
      ty = target.y + target.h / 2;
    return Math.hypot(tx - px, ty - py) <= SHOCKWAVE_RANGE;
  }
  function addShot(s, { x, y, w = 8, h = 17, damage = fighter(s).bulletDamage, support = false }) {
    const b = { x, y, w, h, vx: 0, vy: -560, damage, color: fighter(s).bulletColor, support };
    fighter(s).rules.decorateShot({ state: s, shot: b });
    s.bullets.push(b);
    if (s.spreadMs > 0) s.bullets.push({ ...b, vx: -155, vy: -530 }, { ...b, vx: 155, vy: -530 });
  }

  function nearestHomingTarget(s, bullet) {
    if (s.enemies.length)
      return s.enemies.reduce((closest, enemy) => {
        const bx = bullet.x + bullet.w / 2,
          by = bullet.y + bullet.h / 2,
          dx = enemy.x + enemy.w / 2 - bx,
          dy = enemy.y + enemy.h / 2 - by;
        return !closest || dx * dx + dy * dy < closest.distance
          ? { target: enemy, distance: dx * dx + dy * dy }
          : closest;
      }, null).target;
    return s.boss;
  }
  function steerHomingBullet(s, bullet, ms) {
    if (!bullet.homing) return bullet;
    const target = nearestHomingTarget(s, bullet);
    if (!target) return bullet;
    const bx = bullet.x + bullet.w / 2,
      by = bullet.y + bullet.h / 2,
      tx = target.x + target.w / 2,
      ty = target.y + target.h / 2,
      desired = Math.atan2(ty - by, tx - bx),
      speed = Math.hypot(bullet.vx, bullet.vy) || 560,
      current = Math.atan2(bullet.vy, bullet.vx),
      raw = ((desired - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
      maxTurn = (HOMING_TURN_RATE * ms) / 1000,
      angle = current + Math.max(-maxTurn, Math.min(maxTurn, raw));
    return { ...bullet, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
  }

  function playerShot(s, events) {
    const rate = s.doubleMs > 0 ? 90 : 180;
    s.fireClock += s._dt;
    while (s.fireClock >= rate) {
      s.fireClock -= rate;
      addShot(s, { x: s.player.x + 26, y: s.player.y - 9 });
      fighter(s).rules.afterVolley({ state: s, addShot: (shot) => addShot(s, shot) });
      events.push({ type: 'player-volley' });
    }
  }

  function hurt(s, events) {
    if (s.player.invincibleMs > 0 || fighter(s).rules.isInvulnerable(s)) return;
    if (s.shieldAvailable) {
      s.shieldAvailable = false;
      s.shieldMs = 0;
      s.shieldSkillMs = 0;
      s.shieldSkillArmed = false;
      events.push({ type: 'shield-blocked' });
      return;
    }
    s.player.lives--;
    s.player.invincibleMs = PLAYER_HIT_INVINCIBILITY;
    events.push({ type: 'player-hit' });
    if (s.player.lives <= 0) s.status = 'over';
  }

  function defeatBoss(s, events, boss) {
    s.score += 2000;
    s.bossesDefeated.push(boss.trigger);
    s.boss = null;
    events.push({ type: 'boss-defeated', stage: boss.stage });
    if (boss.stage === 1) {
      s.rankEligible = true;
      events.push({ type: 'ranking-unlocked' });
    }
    if (boss.stage === 4) {
      s.status = 'success';
      events.push({ type: 'run-ended', reason: 'victory' });
    }
  }

  function shieldAbility(s) {
    return fighter(s).utility && fighter(s).utility.kind === 'shield' ? fighter(s).utility : null;
  }
  function tickShieldSkill(s, ms, events) {
    const wasArmed = s.shieldSkillArmed;
    s.shieldSkillCooldownMs = Math.max(0, s.shieldSkillCooldownMs - ms);
    s.shieldSkillMs = Math.max(0, s.shieldSkillMs - ms);
    if (wasArmed && s.shieldSkillMs === 0) {
      s.shieldSkillArmed = false;
      s.shieldAvailable = false;
      s.shieldMs = 0;
      s.shieldSkillCooldownMs = Math.max(0, s.shieldSkillCooldownMs - SHIELD_SKILL_REDUCTION);
      events.push({ type: 'shield-skill-expired', reducedCooldownMs: SHIELD_SKILL_REDUCTION });
    }
  }
  function activateShieldSkill(s, events) {
    const ability = shieldAbility(s);
    if (!ability || s.shieldSkillCooldownMs > 0 || s.shieldSkillMs > 0) return;
    s.shieldSkillCooldownMs = ability.cooldownMs;
    s.shieldSkillMs = ability.durationMs;
    s.shieldSkillArmed = true;
    s.shieldAvailable = true;
    s.shieldMs = ability.durationMs;
    events.push({ type: 'shield-skill-activated' });
  }

  function shadowStrikeAbility(s) {
    return fighter(s).utility && fighter(s).utility.kind === 'shadow-strike'
      ? fighter(s).utility
      : null;
  }
  function shadowStrikeTargets(s) {
    const px = s.player.x + s.player.w / 2,
      py = s.player.y + s.player.h / 2;
    return s.enemies
      .map((enemy) => ({
        enemy,
        distance: Math.hypot(enemy.x + enemy.w / 2 - px, enemy.y + enemy.h / 2 - py),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2)
      .map(({ enemy }) => enemy);
  }
  function addShadowStrike(
    s,
    ability,
    target,
    targetKind,
    offset,
    events,
    deferBossDefeat = false,
  ) {
    const fromX = s.player.x + s.player.w / 2 + offset,
      fromY = s.player.y + s.player.h / 2 + 8,
      hitX = target.x + target.w / 2,
      hitY = target.y + target.h / 2;
    s.shadowStrikes.push({
      fromX,
      fromY,
      hitX,
      hitY,
      targetKind,
      remainingMs: ability.durationMs,
      totalMs: ability.durationMs,
    });
    target.hp -= ability.damage;
    if (targetKind === 'enemy' && target.hp <= 0) {
      s.score += target.score;
      s.enemies = s.enemies.filter((enemy) => enemy !== target);
      events.push({ type: 'enemy-destroyed', kind: target.kind, source: 'shadow-strike' });
    }
    if (targetKind === 'boss' && target.hp <= 0 && !deferBossDefeat) defeatBoss(s, events, target);
  }
  function activateShadowStrike(s, events) {
    const ability = shadowStrikeAbility(s);
    if (!ability || s.shadowStrikeCooldownMs > 0 || s.shadowStrikes.length) return;
    const targets = shadowStrikeTargets(s);
    if (targets.length) {
      targets.forEach((target, index) =>
        addShadowStrike(s, ability, target, 'enemy', index === 0 ? -14 : 14, events),
      );
    } else if (s.boss) {
      const boss = s.boss;
      addShadowStrike(s, ability, boss, 'boss', -14, events, true);
      addShadowStrike(s, ability, boss, 'boss', 14, events, true);
      if (boss.hp <= 0) defeatBoss(s, events, boss);
    } else {
      return;
    }
    s.shadowStrikeCooldownMs = ability.cooldownMs;
    events.push({ type: 'shadow-strike-activated', targetCount: s.shadowStrikes.length });
  }

  function blinkAbility(s) {
    return fighter(s).utility && fighter(s).utility.kind === 'blink' ? fighter(s).utility : null;
  }
  function blinkMode(s) {
    const ability = blinkAbility(s);
    return ability && (ability.mode || (s.fighterId === 'yellow' ? 'beacon' : 'assault'));
  }
  function markerPoint(enemy) {
    return { x: enemy.x + enemy.w / 2 - 5, y: enemy.y + enemy.h + 12 };
  }
  function blinkLanding(s, point) {
    return {
      x: Math.max(0, Math.min(W - s.player.w, point.x + 5 - s.player.w / 2)),
      y: Math.max(TOP, Math.min(H - s.player.h, point.y)),
    };
  }
  function blinkTargetInRange(s, enemy) {
    const point = markerPoint(enemy),
      landing = blinkLanding(s, point),
      centerY = enemy.y + enemy.h / 2;
    return centerY >= TOP && centerY <= H && landing.y === point.y;
  }
  function blinkProtects(s, target, targetKind) {
    const marker = s.blinkMarker;
    const markerTargetKind =
      marker && (marker.targetKind || (marker.targetId != null ? 'enemy' : null));
    return Boolean(
      marker &&
        (marker.mode === 'assault' || (!marker.mode && blinkMode(s) === 'assault')) &&
        marker.locked &&
        !marker.lost &&
        markerTargetKind === targetKind &&
        (targetKind === 'boss' || marker.targetId === target.id),
    );
  }
  function tickBlinkMarker(s, ms, events) {
    const marker = s.blinkMarker;
    if (!marker) return;
    marker.remainingMs = Math.max(0, marker.remainingMs - ms);
    if (!marker.remainingMs) {
      const beacon =
        marker.mode === 'beacon' || (!marker.mode && blinkMode(s) === 'beacon') || marker.noTarget;
      if (beacon) {
        const ability = blinkAbility(s);
        s.blinkCooldownMs = Math.max(
          s.blinkCooldownMs,
          marker.cooldownAfterMs || (ability && ability.emptyCooldownMs) || BLINK_EMPTY_COOLDOWN,
        );
      }
      s.blinkMarker = null;
      events.push({ type: 'blink-expired' });
      return;
    }
    const target =
      marker.targetKind === 'boss'
        ? s.boss
        : marker.targetId == null
          ? null
          : s.enemies.find((enemy) => enemy.id === marker.targetId);
    if (!target) {
      if (
        marker.mode === 'beacon' ||
        (!marker.mode && blinkMode(s) === 'beacon') ||
        marker.noTarget
      )
        return;
      if (!marker.lost) events.push({ type: 'blink-target-lost' });
      marker.targetId = null;
      marker.lost = true;
      marker.locked = true;
      marker.inRange = true;
      return;
    }
    const point = markerPoint(target);
    if (marker.locked) {
      marker.x = point.x;
      marker.y = point.y;
      marker.inRange = marker.targetKind === 'boss' || blinkTargetInRange(s, target);
      return;
    }
    const dx = point.x - marker.x,
      dy = point.y - marker.y,
      distance = Math.hypot(dx, dy),
      step = (blinkAbility(s).markerSpeed * ms) / 1000;
    if (!distance || distance <= step) {
      marker.x = point.x;
      marker.y = point.y;
      marker.locked = true;
      marker.inRange = marker.targetKind === 'boss' || blinkTargetInRange(s, target);
      events.push({ type: 'blink-locked' });
    } else {
      marker.x += (dx / distance) * step;
      marker.y += (dy / distance) * step;
    }
  }
  function launchBlink(s, random, events) {
    const ability = blinkAbility(s);
    if (!ability || s.blinkCooldownMs > 0 || s.blinkMarker) return;
    const start = {
      x: s.player.x + s.player.w / 2 - 5,
      y: s.player.y - 14,
      w: 10,
      h: 14,
    };
    if (blinkMode(s) === 'beacon') {
      s.blinkMarker = {
        ...start,
        mode: 'beacon',
        targetId: null,
        targetKind: null,
        locked: true,
        lost: false,
        noTarget: true,
        inRange: true,
        remainingMs: ability.windowMs,
        cooldownAfterMs: ability.emptyCooldownMs,
      };
      events.push({ type: 'blink-idle' });
      return;
    }
    const playerX = s.player.x + s.player.w / 2,
      playerY = s.player.y + s.player.h / 2,
      ordinary = s.enemies
        .map((enemy) => ({
          enemy,
          distance: Math.hypot(enemy.x + enemy.w / 2 - playerX, enemy.y + enemy.h / 2 - playerY),
        }))
        .sort((a, b) => a.distance - b.distance),
      target = ordinary.length ? ordinary[0].enemy : s.boss,
      targetKind = target === s.boss && target ? 'boss' : target ? 'enemy' : null;
    if (!target) return;
    s.blinkMarker = {
      ...start,
      mode: 'assault',
      targetId: targetKind === 'enemy' ? target.id : null,
      targetKind,
      locked: false,
      lost: false,
      noTarget: false,
      inRange: false,
      remainingMs: ability.windowMs,
      cooldownAfterMs: ability.trackedCooldownMs,
    };
    events.push({ type: 'blink-launched', targetId: target.id });
  }
  function triggerBlink(s, events) {
    const ability = blinkAbility(s),
      marker = s.blinkMarker;
    if (!ability || !marker || !marker.locked) return;
    const targetKind = marker.targetKind || (marker.targetId != null ? 'enemy' : null);
    const target =
        targetKind === 'boss'
          ? s.boss
          : marker.targetId == null
            ? null
            : s.enemies.find((enemy) => enemy.id === marker.targetId),
      from = { x: s.player.x + s.player.w / 2, y: s.player.y + s.player.h / 2 },
      assault = marker.mode ? marker.mode === 'assault' : blinkMode(s) === 'assault',
      targetReady =
        !assault ||
        marker.lost ||
        targetKind === 'boss' ||
        (target && (marker.inRange ?? blinkTargetInRange(s, target)));
    if (assault && !targetReady) return;
    const destination =
      assault && target && targetKind === 'boss'
        ? { x: s.player.x, y: s.player.y }
        : blinkLanding(s, target ? markerPoint(target) : marker);
    s.player.x = destination.x;
    s.player.y = destination.y;
    if (!assault)
      s.player.invincibleMs = Math.max(s.player.invincibleMs, BLINK_TELEPORT_INVINCIBILITY);
    let hitTarget = null;
    if (assault && target && targetKind === 'enemy') {
      target.hp -= ability.damage;
      hitTarget = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
      if (target.hp <= 0) {
        s.score += target.score;
        s.enemies = s.enemies.filter((enemy) => enemy !== target);
        events.push({ type: 'enemy-destroyed', kind: target.kind, source: 'blink' });
      }
    } else if (assault && target && targetKind === 'boss') {
      target.hp -= ability.damage;
      hitTarget = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
      if (target.hp <= 0) {
        defeatBoss(s, events, target);
      }
    }
    s.blinkCooldownMs = marker.cooldownAfterMs || ability.trackedCooldownMs;
    s.blinkFlash = {
      fromX: from.x,
      fromY: from.y,
      toX: s.player.x + s.player.w / 2,
      toY: s.player.y + s.player.h / 2,
      hitX: hitTarget && hitTarget.x,
      hitY: hitTarget && hitTarget.y,
      remainingMs: ability.flashMs,
      totalMs: ability.flashMs,
    };
    s.blinkMarker = null;
    events.push({
      type: 'blink-triggered',
      hit: Boolean(target && assault),
      targetKind,
    });
  }

  function step(state, { dt = 16, input = {}, random = Math.random } = {}) {
    if (state.status !== 'running') return { state, events: [] };
    const s = clone(state),
      events = [],
      ms = dt;
    s._dt = ms;
    s.elapsedMs += ms;
    s.shieldMs = Math.max(0, s.shieldMs - ms);
    s.spreadMs = Math.max(0, s.spreadMs - ms);
    s.doubleMs = Math.max(0, s.doubleMs - ms);
    s.healFlashMs = Math.max(0, s.healFlashMs - ms);
    s.skillCooldownMs = Math.max(0, s.skillCooldownMs - ms);
    tickShieldSkill(s, ms, events);
    s.blinkCooldownMs = Math.max(0, s.blinkCooldownMs - ms);
    s.shadowStrikeCooldownMs = Math.max(0, s.shadowStrikeCooldownMs - ms);
    s.shadowStrikes = s.shadowStrikes
      .map((strike) => ({ ...strike, remainingMs: Math.max(0, strike.remainingMs - ms) }))
      .filter((strike) => strike.remainingMs > 0);
    if (s.blinkFlash) {
      s.blinkFlash.remainingMs = Math.max(0, s.blinkFlash.remainingMs - ms);
      if (!s.blinkFlash.remainingMs) s.blinkFlash = null;
    }
    fighter(s).rules.tick(s, ms);
    if (!s.shieldMs) s.shieldAvailable = false;
    s.player.invincibleMs = Math.max(0, s.player.invincibleMs - ms);
    const hasAnalogMove = Number.isFinite(input.moveX) && Number.isFinite(input.moveY);
    let moveX = hasAnalogMove ? input.moveX : (input.left ? -1 : 0) + (input.right ? 1 : 0),
      moveY = hasAnalogMove ? input.moveY : (input.up ? -1 : 0) + (input.down ? 1 : 0),
      speedScale = hasAnalogMove
        ? Math.max(1, Math.min(2.25, Number(input.moveSpeedScale) || 1))
        : 1;
    if (hasAnalogMove) {
      const magnitude = Math.hypot(moveX, moveY);
      if (magnitude > 1) {
        moveX /= magnitude;
        moveY /= magnitude;
      }
    }
    const dx = (moveX * fighter(s).speed * speedScale * ms) / 1000,
      dy = (moveY * fighter(s).speed * speedScale * ms) / 1000;
    s.player.x = Math.max(0, Math.min(W - s.player.w, s.player.x + dx));
    s.player.y = Math.max(TOP, Math.min(H - s.player.h, s.player.y + dy));
    playerShot(s, events);
    s.bullets = s.bullets
      .map((b) => {
        const steered = steerHomingBullet(s, b, ms);
        return {
          ...steered,
          x: steered.x + (steered.vx * ms) / 1000,
          y: steered.y + (steered.vy * ms) / 1000,
        };
      })
      .filter((b) => b.y > -30 && b.x > -30 && b.x < W + 30);
    s.enemyBullets = s.enemyBullets
      .map((b) => ({ ...b, x: b.x + (b.vx * ms) / 1000, y: b.y + (b.vy * ms) / 1000 }))
      .filter((b) => b.y < H + 30);

    if (!s.boss) {
      const trigger = THRESHOLDS.find((v) => s.score >= v && !s.triggered.includes(v));
      if (trigger) {
        const i = THRESHOLDS.indexOf(trigger);
        s.triggered.push(trigger);
        s.enemies = [];
        s.enemyBullets = [];
        s.boss = {
          stage: i + 1,
          trigger,
          x: 160,
          y: 65,
          w: 160,
          h: 120,
          hp: BOSS_HP[i],
          maxHp: BOSS_HP[i],
          attackClock: 0,
          pattern: 0,
          phase: 0,
        };
        events.push({ type: 'boss-started', stage: i + 1 });
      } else {
        const difficulty = difficultyForScore(s.score);
        s.spawnClock += ms;
        if (s.spawnClock >= difficulty.spawnInterval) {
          s.spawnClock = 0;
          spawn(s, random, difficulty);
        }
        s.enemies = s.enemies.map((e) => {
          const phase = (e.phase || 0) + ms / 300;
          return {
            ...e,
            phase,
            y: e.y + (e.speed * ms) / 1000,
            x: e.kind === 'fast' ? e.x + (Math.sin(phase) * 42 * ms) / 1000 : e.x,
          };
        });
        s.enemyFireClock += ms;
        if (
          s.score >= 300 &&
          s.enemies.length &&
          s.enemyFireClock >= difficulty.enemyFireInterval
        ) {
          s.enemyFireClock = 0;
          const e = s.enemies[Math.floor(random() * s.enemies.length)],
            cx = e.x + e.w / 2;
          s.enemyBullets.push({
            x: cx - 4,
            y: e.y + e.h,
            w: 8,
            h: 14,
            vx: (s.player.x + 30 - cx) * 0.28,
            vy: difficulty.enemyBulletSpeed,
          });
          events.push({ type: 'enemy-volley' });
        }
      }
    } else {
      const b = s.boss;
      b.phase += ms;
      b.x = 160 + Math.sin(b.phase / 900) * 75;
      b.attackClock += ms;
      if (b.attackClock >= 1050) {
        b.attackClock = 0;
        b.pattern = 1 - b.pattern;
        const n = b.pattern ? 6 : 3;
        for (let i = 0; i < n; i++)
          s.enemyBullets.push({
            x: b.x + 76,
            y: b.y + 110,
            w: 8,
            h: 14,
            vx: (i - (n - 1) / 2) * 55,
            vy: 230 + b.stage * 12,
          });
        events.push({ type: 'boss-volley', stage: b.stage });
      }
    }

    tickBlinkMarker(s, ms, events);

    const used = new Set(),
      dead = new Set();
    for (let bi = 0; bi < s.bullets.length; bi++) {
      const b = s.bullets[bi];
      if (s.boss && hit(b, s.boss)) {
        if (blinkProtects(s, s.boss, 'boss')) continue;
        used.add(bi);
        if ((s.boss.hp -= b.damage ?? 1) <= 0) {
          const boss = s.boss;
          defeatBoss(s, events, boss);
        }
        continue;
      }
      for (let ei = 0; ei < s.enemies.length; ei++) {
        const e = s.enemies[ei];
        if (dead.has(ei) || !hit(b, e)) continue;
        if (blinkProtects(s, e, 'enemy')) continue;
        used.add(bi);
        if ((e.hp -= b.damage ?? 1) <= 0) {
          dead.add(ei);
          s.score += e.score;
          chargeSkill(s, e.kind);
          events.push({ type: 'enemy-destroyed', kind: e.kind, source: 'bullet' });
          const r = random();
          if (r < 0.1)
            s.powerups.push({ kind: powerupKind(r), x: e.x, y: e.y, w: 28, h: 28, vy: 100 });
        }
        break;
      }
    }
    s.bullets = s.bullets.filter((_, i) => !used.has(i));
    s.enemies = s.enemies.filter((e, i) => !dead.has(i) && e.y < H + 65);
    if (input.skill && s.skillCharge >= SKILL_MAX && s.skillCooldownMs === 0) {
      s.skillCharge = 0;
      s.skillCooldownMs = SKILL_COOLDOWN;
      fighter(s).rules.activate({
        state: s,
        events,
        inRange: (target) => !blinkProtects(s, target, 'enemy') && inShockwaveRange(s, target),
      });
    }
    tickBlinkMarker(s, 0, events);
    if (input.blink) {
      if (blinkAbility(s)) {
        if (s.blinkMarker) triggerBlink(s, events);
        else launchBlink(s, random, events);
      } else if (shadowStrikeAbility(s)) activateShadowStrike(s, events);
      else activateShieldSkill(s, events);
    }
    for (const b of s.enemyBullets)
      if (hit(b, s.player)) {
        hurt(s, events);
        b.consumed = true;
      }
    s.enemyBullets = s.enemyBullets.filter((b) => !b.consumed);
    for (const e of s.enemies)
      if (hit(e, s.player)) {
        hurt(s, events);
        e.y = 999;
      }
    s.enemies = s.enemies.filter((e) => e.y < H + 65);
    s.powerups = s.powerups
      .map((p) => ({ ...p, y: p.y + (p.vy * ms) / 1000 }))
      .filter((p) => p.y < H + 30);
    for (const p of s.powerups)
      if (hit(p, s.player)) {
        events.push({ type: 'powerup-collected', kind: p.kind });
        if (p.kind === 'shield') {
          s.shieldMs = 8000;
          s.shieldAvailable = true;
        } else if (p.kind === 'spread') s.spreadMs = 8000;
        else if (p.kind === 'double') s.doubleMs = 8000;
        else if (s.player.lives < MAX_LIVES) {
          s.player.lives++;
          s.healFlashMs = 700;
          events.push({ type: 'life-restored' });
        }
        p.taken = true;
      }
    s.powerups = s.powerups.filter((p) => !p.taken);
    if (s.status === 'over') events.push({ type: 'run-ended', reason: 'death' });
    delete s._dt;
    return { state: s, events };
  }

  return {
    create,
    step,
    fighters: FIGHTERS,
    constants: {
      W,
      H,
      TOP,
      MAX_LIVES,
      SKILL_MAX,
      SKILL_COOLDOWN,
      SHOCKWAVE_RANGE,
      SHOCKWAVE_FLASH,
      STEALTH_DURATION,
      WINGMEN_DURATION,
      HOMING_DURATION,
      HOMING_TURN_RATE,
      BLINK_COOLDOWN,
      BLINK_TRACKED_COOLDOWN,
      BLINK_EMPTY_COOLDOWN,
      BLINK_WINDOW,
      BLINK_DAMAGE,
      SHIELD_SKILL_DURATION,
      SHIELD_SKILL_COOLDOWN,
      SHIELD_SKILL_REDUCTION,
      SHADOW_STRIKE_COOLDOWN,
      SHADOW_STRIKE_DURATION,
      SHADOW_STRIKE_DAMAGE,
      BLINK_TELEPORT_INVINCIBILITY,
      PLAYER_HIT_INVINCIBILITY,
      DIFFICULTY_BANDS,
    },
  };
});
