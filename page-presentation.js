(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PagePresentation = api;
})(globalThis, () => {
  const fixedAssets = Object.freeze({
    normal: 'enemy-normal.png',
    fast: 'enemy-fast.png',
    elite: 'enemy-elite.png',
    boss: 'boss-ship.png',
    shield: 'power-shield.png',
    spread: 'power-spread.png',
    double: 'power-double-fire.png',
    heal: 'power-heal.png',
    star: 'starfield.png',
  });
  const pad = (n) => String(n || 0).padStart(6, '0');
  const formatTime = (n) => {
    const seconds = Math.floor((n || 0) / 1000);
    return (
      String(Math.floor(seconds / 60)).padStart(2, '0') +
      ':' +
      String(seconds % 60).padStart(2, '0') +
      '.' +
      (Math.floor((n || 0) / 100) % 10)
    );
  };

  function create({ document, canvas, catalog, onIntent }) {
    if (!document || !canvas || !catalog)
      throw new Error('document, canvas, and catalog are required');
    const $ = (selector) => document.querySelector(selector),
      context = canvas.getContext('2d'),
      listeners = [],
      images = {},
      ImageCtor = (document.defaultView && document.defaultView.Image) || globalThis.Image;
    let current = null,
      localOverlay = null,
      modalKey = '';
    const emit = (intent) => {
      if (typeof onIntent === 'function') onIntent(intent);
    };
    const bind = (element, type, listener) => {
      if (!element) return;
      element.addEventListener(type, listener);
      listeners.push(() => element.removeEventListener(type, listener));
    };
    const load = (file) => {
      if (!ImageCtor) return null;
      const image = new ImageCtor();
      image.src = 'assets/' + file;
      return image;
    };
    for (const [key, file] of Object.entries(fixedAssets)) images[key] = load(file);
    for (const fighter of catalog.list()) images[fighter.id] = load(fighter.visual.spriteFile);

    function renderFighterOptions() {
      const options = $('#fighterOptions');
      if (!options) return;
      options.innerHTML = catalog
        .list()
        .map(
          (fighter) =>
            `<button class="fighter-choice" data-fighter="${fighter.id}" type="button" style="--fighter-rotation:${fighter.visual.orientation}deg;--fighter-border:${fighter.selection.border};--fighter-glow:${fighter.selection.glow};--fighter-background:${fighter.selection.background}"><img src="assets/${fighter.visual.spriteFile}" alt="${fighter.selection.label}预览"><span><strong>${fighter.selection.label}</strong><small>${fighter.selection.description}</small></span></button>`,
        )
        .join('');
      options
        .querySelectorAll('[data-fighter]')
        .forEach((button) =>
          bind(button, 'click', () =>
            emit({ type: 'select-fighter', fighterId: button.dataset.fighter }),
          ),
        );
    }

    function renderRank(board) {
      const rank = $('#rank');
      if (rank)
        rank.innerHTML =
          (board || [])
            .map(
              (record, index) =>
                `<li>${index + 1}<span>${record.id}</span><b>${pad(record.score)}</b><span>${formatTime(record.time)}</span></li>`,
            )
            .join('') || '<li>尚无记录</li>';
    }

    function renderHud(snapshot) {
      const state = snapshot.game,
        view = snapshot.view,
        fighter = catalog.get(state.fighterId),
        stateName =
          state.status === 'running' ? 'running' : state.status === 'paused' ? 'paused' : 'ready',
        skillReady = state.skillCharge >= 100 && state.skillCooldownMs === 0,
        selectable = state.status === 'ready',
        activeMs = fighter.visual.activeState ? state[fighter.visual.activeState] : 0;
      $('#score').textContent = pad(state.score);
      $('#best').textContent = pad(snapshot.best);
      $('#lives').textContent =
        '♥'.repeat(state.player.lives) + '♡'.repeat(3 - state.player.lives);
      $('#timer').textContent = formatTime(state.elapsedMs);
      const status = $('#state');
      status.textContent =
        stateName === 'running' ? '火力全开' : stateName === 'paused' ? '已暂停' : '等待起飞';
      status.className = 'state-' + stateName;
      for (const [key, id] of [
        ['shieldMs', 'shield'],
        ['spreadMs', 'spread'],
        ['doubleMs', 'double'],
      ]) {
        const item = $('#' + id);
        item.textContent = state[key] ? (state[key] / 1000).toFixed(1) + 's' : '未激活';
        if (item.parentElement) item.parentElement.className = 'buff buff-' + id;
      }
      $('#skillName').textContent = fighter.skillName;
      $('#skillCharge').textContent = state.skillCharge + ' / 100';
      $('#skillMeter').style.width = (state.skillCharge / 100) * 100 + '%';
      const skillStatus = $('#skillStatus');
      skillStatus.textContent =
        activeMs > 0
          ? fighter.visual.activeLabel + ' ' + (activeMs / 1000).toFixed(1) + 's'
          : skillReady
            ? '可释放'
            : state.skillCooldownMs > 0
              ? '冷却 ' + (state.skillCooldownMs / 1000).toFixed(1) + 's'
              : '充能中';
      skillStatus.className =
        activeMs > 0 ? fighter.visual.statusClass : skillReady ? 'shockwave-ready' : '';
      const skillButton = $('#skillButton');
      skillButton.textContent = 'Q · 充能技 · ' + fighter.skillName;
      skillButton.disabled = !skillReady;
      const blinkCard = $('#blinkCard'),
        blinkButton = $('#blinkButton'),
        blinkStatus = $('#blinkStatus'),
        blinkMarker = state.blinkMarker,
        blinkAbility = fighter.utility && fighter.utility.kind === 'blink' ? fighter.utility : null;
      const mode = blinkAbility
        ? blinkAbility.mode || (state.fighterId === 'yellow' ? 'beacon' : 'assault')
        : null;
      if (blinkCard) {
        blinkCard.hidden = !blinkAbility;
        blinkCard.className = blinkAbility
          ? 'blink-card ' + (mode === 'assault' ? 'blink-card-silver' : 'blink-card-yellow')
          : 'blink-card';
      }
      if (blinkAbility && blinkButton && blinkStatus) {
        const remaining = blinkMarker ? (blinkMarker.remainingMs / 1000).toFixed(1) + 's' : '',
          assault = mode === 'assault',
          status = assault
            ? blinkMarker
              ? !blinkMarker.locked
                ? '追踪中 ' + remaining
                : blinkMarker.lost
                  ? '标记失效 ' + remaining
                  : blinkMarker.targetKind === 'boss'
                    ? 'Boss锁定 · 可突袭'
                    : blinkMarker.inRange
                      ? '可瞬闪 ' + remaining
                      : '目标锁定，等待进入活动区 ' + remaining
              : state.blinkCooldownMs > 0
                ? '冷却 ' + (state.blinkCooldownMs / 1000).toFixed(1) + 's'
                : '搜寻目标'
            : blinkMarker
              ? '可跃迁 ' + remaining
              : state.blinkCooldownMs > 0
                ? '冷却 ' + (state.blinkCooldownMs / 1000).toFixed(1) + 's'
                : '可标记';
        $('#blinkName').textContent = blinkAbility.name;
        blinkStatus.textContent = status;
        blinkStatus.className =
          blinkMarker && blinkMarker.locked && (!assault || blinkMarker.inRange)
            ? 'blink-locked'
            : state.blinkCooldownMs
              ? 'blink-cooldown'
              : 'blink-ready';
        blinkButton.textContent = assault
          ? 'E · 普通技 · ' + (blinkMarker && blinkMarker.locked ? '二段瞬闪' : blinkAbility.name)
          : 'E · 普通技 · ' + blinkAbility.name;
        blinkButton.disabled = assault
          ? blinkMarker
            ? !blinkMarker.locked ||
              (!blinkMarker.inRange && blinkMarker.targetKind !== 'boss' && !blinkMarker.lost)
            : state.blinkCooldownMs > 0
          : !blinkMarker && state.blinkCooldownMs > 0;
      }
      const shieldCard = $('#shieldCard'),
        shieldButton = $('#shieldButton'),
        shieldStatus = $('#shieldSkillStatus'),
        shieldAbility =
          fighter.utility && fighter.utility.kind === 'shield' ? fighter.utility : null;
      if (shieldCard) shieldCard.hidden = !shieldAbility;
      if (shieldAbility && shieldButton && shieldStatus) {
        const status =
          state.shieldSkillMs > 0
            ? '屏障中 ' + (state.shieldSkillMs / 1000).toFixed(1) + 's'
            : state.shieldSkillCooldownMs > 0
              ? '冷却 ' + (state.shieldSkillCooldownMs / 1000).toFixed(1) + 's'
              : '可释放';
        $('#shieldSkillName').textContent = shieldAbility.name;
        shieldStatus.textContent = status;
        shieldStatus.className =
          state.shieldSkillMs > 0
            ? 'shield-skill-active'
            : state.shieldSkillCooldownMs > 0
              ? 'shield-skill-cooldown'
              : 'shield-skill-ready';
        shieldButton.textContent = 'E · 普通技 · ' + shieldAbility.name;
        shieldButton.disabled = state.shieldSkillMs > 0 || state.shieldSkillCooldownMs > 0;
      }
      const shadowStrikeCard = $('#shadowStrikeCard'),
        shadowStrikeButton = $('#shadowStrikeButton'),
        shadowStrikeStatus = $('#shadowStrikeStatus'),
        shadowStrikeAbility =
          fighter.utility && fighter.utility.kind === 'shadow-strike' ? fighter.utility : null;
      if (shadowStrikeCard) shadowStrikeCard.hidden = !shadowStrikeAbility;
      if (shadowStrikeAbility && shadowStrikeButton && shadowStrikeStatus) {
        const active = state.shadowStrikes && state.shadowStrikes.length > 0,
          cooldown = state.shadowStrikeCooldownMs || 0,
          status = active
            ? '影刃出击'
            : cooldown > 0
              ? '冷却 ' + (cooldown / 1000).toFixed(1) + 's'
              : '可突袭';
        $('#shadowStrikeName').textContent = shadowStrikeAbility.name;
        shadowStrikeStatus.textContent = status;
        shadowStrikeStatus.className = active
          ? 'shadow-strike-active'
          : cooldown > 0
            ? 'shadow-strike-cooldown'
            : 'shadow-strike-ready';
        shadowStrikeButton.textContent = 'E · 普通技 · ' + shadowStrikeAbility.name;
        shadowStrikeButton.disabled = active || cooldown > 0;
      }
      document.querySelectorAll('[data-fighter]').forEach((button) => {
        const chosen = button.dataset.fighter === state.fighterId;
        button.classList.toggle('selected', chosen);
        if (button.setAttribute) button.setAttribute('aria-pressed', String(chosen));
        button.disabled = !selectable;
      });
      $('#notice').textContent = view.notice || '';
      renderRank(snapshot.board);
    }

    function sprite(image, x, y, w, h, color) {
      if (image && image.complete && image.naturalWidth) {
        context.save();
        context.globalCompositeOperation = 'screen';
        context.drawImage(image, x, y, w, h);
        context.restore();
      } else {
        context.fillStyle = color;
        context.fillRect(x, y, w, h);
      }
    }
    function drawShockwave(state, fighter) {
      if (fighter.visual.effect.kind !== 'shockwave' || state.shockwaveFlashMs <= 0) return;
      const t = 1 - state.shockwaveFlashMs / catalog.constants.shockwaveFlash,
        cx = state.player.x + 30,
        cy = state.player.y + 28,
        r = 300 * t,
        color = fighter.visual.effect.color;
      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = 0.75 * (1 - t) + 0.15;
      context.strokeStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 22;
      context.lineWidth = 5 - 2 * t;
      context.beginPath();
      context.arc(cx, cy, r, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 0.22 * (1 - t);
      context.fillStyle = '#68b6ff';
      context.beginPath();
      context.arc(cx, cy, r, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    function drawStealth(state, fighter) {
      if (fighter.visual.effect.kind !== 'stealth' || state.stealthMs <= 0) return;
      const t = state.stealthMs / catalog.constants.stealthDuration,
        cx = state.player.x + 30,
        cy = state.player.y + 27,
        color = fighter.visual.effect.color;
      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = 0.18 + 0.25 * t;
      context.strokeStyle = color;
      context.shadowColor = '#9edfff';
      context.shadowBlur = 18;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(cx, cy, 38 + (1 - t) * 12, 0, Math.PI * 2);
      context.stroke();
      for (let index = 0; index < 8; index++) {
        const angle = (index * Math.PI) / 4 + t * 5;
        context.fillStyle = '#d5f3ff';
        context.fillRect(cx + Math.cos(angle) * 42, cy + Math.sin(angle) * 34, 2, 2);
      }
      context.restore();
    }
    function drawWingmen(state, fighter) {
      if (fighter.visual.effect.kind !== 'wingmen' || state.wingmenMs <= 0) return;
      const positions = [
          { x: state.player.x - 16, y: state.player.y + 22 },
          { x: state.player.x + 46, y: state.player.y + 22 },
        ],
        t = state.wingmenMs / catalog.constants.wingmenDuration,
        color = fighter.visual.effect.color;
      context.save();
      context.globalCompositeOperation = 'screen';
      context.strokeStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 15;
      context.globalAlpha = 0.35 + 0.35 * t;
      for (const position of positions) {
        context.beginPath();
        context.moveTo(position.x + 15, position.y + 25);
        context.lineTo(position.x + 15, position.y + 44);
        context.stroke();
        sprite(images[fighter.id], position.x, position.y, 30, 27, color);
      }
      context.restore();
    }
    function drawShadowStrikes(state, fighter) {
      if (
        !fighter.utility ||
        fighter.utility.kind !== 'shadow-strike' ||
        !(state.shadowStrikes && state.shadowStrikes.length)
      )
        return;
      const color = fighter.utility.color;
      context.save();
      context.globalCompositeOperation = 'screen';
      context.strokeStyle = color;
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 22;
      for (const strike of state.shadowStrikes) {
        const t = 1 - strike.remainingMs / strike.totalMs,
          x = strike.fromX + (strike.hitX - strike.fromX) * t,
          y = strike.fromY + (strike.hitY - strike.fromY) * t;
        context.globalAlpha = 0.28 + (1 - t) * 0.58;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(strike.fromX, strike.fromY);
        context.lineTo(x, y);
        context.stroke();
        context.globalAlpha = 0.72 + (1 - t) * 0.2;
        sprite(images[fighter.id], x - 15, y - 14, 30, 27, color);
        context.globalAlpha = 0.8 * (1 - t);
        context.lineWidth = 4;
        context.beginPath();
        context.arc(strike.hitX, strike.hitY, 14 + t * 22, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    }
    function drawHoming(state, fighter) {
      if (fighter.visual.effect.kind !== 'homing' || state.homingMs <= 0) return;
      const t = state.homingMs / catalog.constants.homingDuration,
        cx = state.player.x + 30,
        cy = state.player.y + 27,
        color = fighter.visual.effect.color;
      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = 0.32 + 0.32 * t;
      context.strokeStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 20;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(cx, cy, 39 + (1 - t) * 18, 0, Math.PI * 2);
      context.stroke();
      for (let index = 0; index < 8; index++) {
        const angle = (index * Math.PI) / 4 + (1 - t) * 4;
        context.fillStyle = '#fff5a5';
        context.fillRect(cx + Math.cos(angle) * 48, cy + Math.sin(angle) * 48, 3, 3);
      }
      const target =
        state.enemies.reduce(
          (closest, enemy) =>
            !closest ||
            Math.hypot(enemy.x + enemy.w / 2 - cx, enemy.y + enemy.h / 2 - cy) <
              Math.hypot(closest.x + closest.w / 2 - cx, closest.y + closest.h / 2 - cy)
              ? enemy
              : closest,
          null,
        ) || state.boss;
      if (target) {
        context.globalAlpha = 0.65;
        context.strokeStyle = '#fff08a';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(
          target.x + target.w / 2,
          target.y + target.h / 2,
          Math.max(target.w, target.h) * 0.65,
          0,
          Math.PI * 2,
        );
        context.stroke();
      }
      context.restore();
    }
    function drawBlink(state, fighter) {
      if (!fighter.utility || fighter.utility.kind !== 'blink') return;
      const marker = state.blinkMarker,
        color = fighter.utility.color;
      if (marker) {
        const mx = marker.x + marker.w / 2,
          my = marker.y + marker.h / 2;
        context.save();
        context.globalCompositeOperation = 'screen';
        context.strokeStyle = color;
        context.fillStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 18;
        context.globalAlpha = marker.locked ? 0.9 : 0.75;
        context.beginPath();
        context.moveTo(mx, marker.y);
        context.lineTo(marker.x + marker.w, marker.y + marker.h);
        context.lineTo(marker.x, marker.y + marker.h);
        context.closePath();
        context.fill();
        context.globalAlpha = 0.3;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(mx, my, 16 + Math.sin(performance.now() / 90) * 3, 0, Math.PI * 2);
        context.stroke();
        if (marker.locked) {
          context.globalAlpha = 0.8;
          context.beginPath();
          context.arc(mx, my, 25, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }
      if (state.blinkFlash) {
        const flash = state.blinkFlash,
          t = flash.remainingMs / flash.totalMs;
        context.save();
        context.globalCompositeOperation = 'screen';
        context.globalAlpha = 0.8 * t;
        context.strokeStyle = color;
        context.shadowColor = color;
        context.shadowBlur = 24;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(flash.fromX, flash.fromY);
        context.lineTo(flash.toX, flash.toY);
        context.stroke();
        context.beginPath();
        context.arc(flash.toX, flash.toY, 18 + (1 - t) * 32, 0, Math.PI * 2);
        context.stroke();
        if (flash.hitX != null) {
          context.beginPath();
          context.arc(flash.hitX, flash.hitY, 12 + (1 - t) * 18, 0, Math.PI * 2);
          context.stroke();
        }
        context.restore();
      }
    }
    function drawShieldSkill(state, fighter) {
      if (!fighter.utility || fighter.utility.kind !== 'shield' || state.shieldSkillMs <= 0) return;
      const t = state.shieldSkillMs / fighter.utility.durationMs,
        cx = state.player.x + 30,
        cy = state.player.y + 28,
        color = fighter.utility.color;
      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = 0.25 + 0.45 * t;
      context.strokeStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 24;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(cx, cy, 44 + (1 - t) * 9, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 0.25 * t;
      context.fillStyle = color;
      context.beginPath();
      context.arc(cx, cy, 38 + (1 - t) * 8, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    function drawPlayer(state, fighter) {
      const image = images[fighter.id],
        rotation = fighter.visual.orientation;
      if (image && image.complete && image.naturalWidth && rotation) {
        context.save();
        context.globalCompositeOperation = 'screen';
        context.translate(state.player.x + 30, state.player.y + 27);
        context.rotate((rotation * Math.PI) / 180);
        context.drawImage(image, -30, -27, 60, 54);
        context.restore();
        return;
      }
      sprite(image, state.player.x, state.player.y, 60, 54, fighter.bulletColor);
    }
    function draw(state) {
      const fighter = catalog.get(state.fighterId);
      context.fillStyle = '#05061a';
      context.fillRect(0, 0, 480, 720);
      if (images.star && images.star.complete) {
        context.globalAlpha = 0.5;
        context.drawImage(images.star, 0, 0, 480, 720);
        context.globalAlpha = 1;
      }
      for (const bullet of state.bullets) {
        if (bullet.homing) {
          context.save();
          context.globalCompositeOperation = 'screen';
          context.strokeStyle = bullet.color || '#ffe85b';
          context.shadowColor = bullet.color || '#ffe85b';
          context.shadowBlur = 10;
          context.lineWidth = 2;
          context.globalAlpha = 0.6;
          context.beginPath();
          context.moveTo(bullet.x + bullet.w / 2, bullet.y + bullet.h);
          context.lineTo(
            bullet.x + bullet.w / 2 - bullet.vx * 0.025,
            bullet.y + bullet.h - bullet.vy * 0.025,
          );
          context.stroke();
          context.restore();
        }
        sprite(null, bullet.x, bullet.y, bullet.w, bullet.h, bullet.color || '#5ef');
      }
      for (const bullet of state.enemyBullets)
        sprite(null, bullet.x, bullet.y, bullet.w, bullet.h, '#f5c');
      for (const enemy of state.enemies)
        sprite(images[enemy.kind], enemy.x, enemy.y, enemy.w, enemy.h, '#d5f');
      for (const powerup of state.powerups)
        sprite(
          images[powerup.kind],
          powerup.x,
          powerup.y,
          powerup.w,
          powerup.h,
          powerup.kind === 'heal' ? '#71ff96' : '#fd6',
        );
      if (state.boss) {
        sprite(images.boss, state.boss.x, state.boss.y, state.boss.w, state.boss.h, '#f5c');
        context.fillStyle = '#261338';
        context.fillRect(118, 18, 244, 8);
        context.fillStyle = '#f35bd8';
        context.fillRect(120, 20, (240 * state.boss.hp) / state.boss.maxHp, 4);
      }
      if (state.shieldAvailable) {
        context.strokeStyle = '#58e7ff';
        context.lineWidth = 2;
        context.shadowColor = '#58e7ff';
        context.shadowBlur = 12;
        context.beginPath();
        context.arc(state.player.x + 30, state.player.y + 28, 40, 0, Math.PI * 2);
        context.stroke();
        context.shadowBlur = 0;
      }
      if (state.healFlashMs > 0) {
        const t = state.healFlashMs / 700;
        context.save();
        context.globalAlpha = 0.25 + 0.55 * t;
        context.strokeStyle = '#71ff96';
        context.lineWidth = 3;
        context.shadowColor = '#71ff96';
        context.shadowBlur = 18;
        context.beginPath();
        context.arc(state.player.x + 30, state.player.y + 28, 42 + (1 - t) * 18, 0, Math.PI * 2);
        context.stroke();
        context.font = 'bold 16px PingFang SC, sans-serif';
        context.textAlign = 'center';
        context.fillStyle = '#b8ffc8';
        context.fillText('生命 +1', state.player.x + 30, state.player.y - 14 - (1 - t) * 12);
        context.restore();
      }
      drawStealth(state, fighter);
      drawWingmen(state, fighter);
      drawShadowStrikes(state, fighter);
      drawHoming(state, fighter);
      drawBlink(state, fighter);
      drawShieldSkill(state, fighter);
      if (
        fighter.rules.isInvulnerable(state) ||
        !state.player.invincibleMs ||
        Math.floor(state.player.invincibleMs / 80) % 2 === 0
      ) {
        context.save();
        if (fighter.rules.isInvulnerable(state)) context.globalAlpha = 0.34;
        drawPlayer(state, fighter);
        context.restore();
      }
      drawShockwave(state, fighter);
    }

    function showModal(key, markup, bindControls) {
      const overlay = $('#overlay'),
        modal = $('#modal');
      overlay.hidden = false;
      if (modalKey === key) return;
      modalKey = key;
      modal.innerHTML = markup;
      bindControls();
    }
    function hideModal() {
      const overlay = $('#overlay');
      overlay.hidden = true;
      modalKey = 'hidden';
    }
    function renderModal(snapshot) {
      const view = snapshot.view;
      if (view.overlay === 'ended') {
        localOverlay = null;
        const key = `ended:${view.endReason}:${snapshot.game.score}:${snapshot.game.elapsedMs}:${view.canRegister}`;
        showModal(
          key,
          `<h2>${view.endReason === 'victory' ? '通关成功' : '任务结束'}</h2><p>得分 ${pad(snapshot.game.score)} · 用时 ${formatTime(snapshot.game.elapsedMs)}</p>${view.canRegister ? '<div class="register-form"><label for="pid">Player ID</label><input id="pid" placeholder="输入你的代号"><button class="btn main" id="save">登记成绩</button></div>' : ''}<button class="btn modal-secondary" id="again">重新开始</button>`,
          () => {
            bind($('#again'), 'click', () => emit({ type: 'restart' }));
            const save = $('#save'),
              idInput = $('#pid');
            if (save) bind(save, 'click', () => emit({ type: 'register', id: idInput.value }));
          },
        );
        return;
      }
      if (localOverlay === 'rank') {
        showModal(
          'rank',
          '<h2>排行榜</h2>' +
            ($('#rank').outerHTML || '') +
            '<button class="btn" id="close">关闭</button>',
          () =>
            bind($('#close'), 'click', () => {
              localOverlay = 'closed';
              hideModal();
            }),
        );
        return;
      }
      if (localOverlay === 'closed') {
        hideModal();
        return;
      }
      if (view.overlay === 'ready') {
        showModal(
          'ready',
          '<h2>准备起飞？</h2><button class="btn main" id="go">启动战机</button>',
          () => bind($('#go'), 'click', () => emit({ type: 'start' })),
        );
        return;
      }
      hideModal();
    }
    function render(snapshot) {
      current = snapshot;
      renderHud(snapshot);
      draw(snapshot.game);
      renderModal(snapshot);
    }

    renderFighterOptions();
    bind($('#pause'), 'click', () => emit({ type: 'toggle-pause' }));
    bind($('#restart'), 'click', () => emit({ type: 'restart' }));
    bind($('#skillButton'), 'click', () => emit({ type: 'skill' }));
    bind($('#blinkButton'), 'click', () => emit({ type: 'blink' }));
    bind($('#shieldButton'), 'click', () => emit({ type: 'blink' }));
    bind($('#shadowStrikeButton'), 'click', () => emit({ type: 'blink' }));
    bind($('#rankBtn'), 'click', () => {
      localOverlay = 'rank';
      renderModal(current);
    });
    document.querySelectorAll('[data-k]').forEach((button) => {
      const direction = button.dataset.k,
        off = () => emit({ type: 'direction', direction, pressed: false });
      bind(button, 'pointerdown', (event) => {
        event.preventDefault();
        emit({ type: 'direction', direction, pressed: true });
      });
      bind(button, 'pointerup', off);
      bind(button, 'pointerleave', off);
      bind(button, 'pointercancel', off);
    });
    return {
      render,
      destroy() {
        listeners.splice(0).forEach((remove) => remove());
      },
    };
  }
  return Object.freeze({ create });
});
