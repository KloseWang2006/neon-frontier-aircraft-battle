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
    HOMING_TURN_RATE = FighterCatalog.constants.homingTurnRate;
  const FIGHTERS = FighterCatalog.fighters;
  const PLAYER = { x: 210, y: 630, w: 60, h: 54, lives: MAX_LIVES, invincibleMs: 0 };
  const THRESHOLDS = [10000, 30000, 50000, 100000],
    BOSS_HP = [105, 170, 245, 330];
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const clone = (s) => ({
    ...s,
    player: { ...s.player },
    bullets: s.bullets.map((v) => ({ ...v })),
    enemyBullets: s.enemyBullets.map((v) => ({ ...v })),
    enemies: s.enemies.map((v) => ({ ...v })),
    powerups: s.powerups.map((v) => ({ ...v })),
    boss: s.boss && { ...s.boss },
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
    };
  }

  function enemy(kind, id, x) {
    const q =
      kind === 'elite'
        ? { w: 58, h: 52, hp: 3, score: 350, speed: 68 }
        : kind === 'fast'
          ? { w: 30, h: 30, hp: 1, score: 150, speed: 155 }
          : { w: 38, h: 38, hp: 1, score: 100, speed: 95 };
    return { kind, id, x, y: -q.h, ...q, phase: 0 };
  }

  function spawn(s, random) {
    const roll = random(),
      kind = roll > 0.82 ? 'elite' : roll > 0.55 ? 'fast' : 'normal',
      w = kind === 'elite' ? 58 : kind === 'fast' ? 30 : 38;
    s.enemies.push(enemy(kind, s.nextId++, 24 + random() * (W - w - 48)));
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

  function playerShot(s) {
    const rate = s.doubleMs > 0 ? 90 : 180;
    s.fireClock += s._dt;
    while (s.fireClock >= rate) {
      s.fireClock -= rate;
      addShot(s, { x: s.player.x + 26, y: s.player.y - 9 });
      fighter(s).rules.afterVolley({ state: s, addShot: (shot) => addShot(s, shot) });
    }
  }

  function hurt(s) {
    if (s.player.invincibleMs > 0 || fighter(s).rules.isInvulnerable(s)) return;
    if (s.shieldAvailable) {
      s.shieldAvailable = false;
      s.shieldMs = 0;
      return;
    }
    s.player.lives--;
    s.player.invincibleMs = 750;
    if (s.player.lives <= 0) s.status = 'over';
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
    fighter(s).rules.tick(s, ms);
    if (!s.shieldMs) s.shieldAvailable = false;
    s.player.invincibleMs = Math.max(0, s.player.invincibleMs - ms);
    const dx = (((input.left ? -1 : 0) + (input.right ? 1 : 0)) * fighter(s).speed * ms) / 1000,
      dy = (((input.up ? -1 : 0) + (input.down ? 1 : 0)) * fighter(s).speed * ms) / 1000;
    s.player.x = Math.max(0, Math.min(W - s.player.w, s.player.x + dx));
    s.player.y = Math.max(TOP, Math.min(H - s.player.h, s.player.y + dy));
    playerShot(s);
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
        s.spawnClock += ms;
        if (s.spawnClock >= 700) {
          s.spawnClock = 0;
          spawn(s, random);
        }
        s.enemies = s.enemies.map((e) => ({
          ...e,
          y: e.y + (e.speed * ms) / 1000,
          x: e.kind === 'fast' ? e.x + (Math.sin((e.phase += ms / 300)) * 42 * ms) / 1000 : e.x,
        }));
        s.enemyFireClock += ms;
        if (s.score >= 300 && s.enemies.length && s.enemyFireClock >= 900) {
          s.enemyFireClock = 0;
          const e = s.enemies[Math.floor(random() * s.enemies.length)],
            cx = e.x + e.w / 2;
          s.enemyBullets.push({
            x: cx - 4,
            y: e.y + e.h,
            w: 8,
            h: 14,
            vx: (s.player.x + 30 - cx) * 0.28,
            vy: 235,
          });
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
      }
    }

    const used = new Set(),
      dead = new Set();
    for (let bi = 0; bi < s.bullets.length; bi++) {
      const b = s.bullets[bi];
      if (s.boss && hit(b, s.boss)) {
        used.add(bi);
        if ((s.boss.hp -= b.damage ?? 1) <= 0) {
          const boss = s.boss;
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
        continue;
      }
      for (let ei = 0; ei < s.enemies.length; ei++) {
        const e = s.enemies[ei];
        if (dead.has(ei) || !hit(b, e)) continue;
        used.add(bi);
        if ((e.hp -= b.damage ?? 1) <= 0) {
          dead.add(ei);
          s.score += e.score;
          chargeSkill(s, e.kind);
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
        inRange: (target) => inShockwaveRange(s, target),
      });
    }
    for (const b of s.enemyBullets)
      if (hit(b, s.player)) {
        hurt(s);
        b.consumed = true;
      }
    s.enemyBullets = s.enemyBullets.filter((b) => !b.consumed);
    for (const e of s.enemies)
      if (hit(e, s.player)) {
        hurt(s);
        e.y = 999;
      }
    s.enemies = s.enemies.filter((e) => e.y < H + 65);
    s.powerups = s.powerups
      .map((p) => ({ ...p, y: p.y + (p.vy * ms) / 1000 }))
      .filter((p) => p.y < H + 30);
    for (const p of s.powerups)
      if (hit(p, s.player)) {
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
    },
  };
});
