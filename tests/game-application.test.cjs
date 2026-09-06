const assert = require('node:assert/strict');
const test = require('node:test');
const Application = require('../game-application.js');
const Storage = require('../game-storage.js');

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    fire(type, event = {}) {
      for (const fn of listeners.get(type) || []) fn({ preventDefault() {}, ...event });
    },
    count() {
      return [...listeners.values()].reduce((n, set) => n + set.size, 0);
    },
  };
}
function harness({ random = () => 0.5 } = {}) {
  const document = eventTarget(),
    window = eventTarget(),
    frames = new Map();
  let nextId = 0,
    now = 0,
    snapshot,
    locked = false,
    renders = 0,
    enabled = true;
  const heard = [],
    lifecycle = [];
  const audio = {
    unlock() {
      lifecycle.push('unlock');
    },
    consume(events) {
      heard.push(...structuredClone(events));
    },
    play(name) {
      heard.push({ type: name });
    },
    isEnabled: () => enabled,
    toggle: () => (enabled = !enabled),
    destroy() {
      lifecycle.push('audio-destroy');
    },
  };
  const app = Application.create({
    document,
    window,
    storage: Storage.adapter(Storage.memory()),
    audio,
    presentationFactory: () => ({
      render(value) {
        snapshot = structuredClone(value);
        renders++;
      },
      isControlsLocked: () => locked,
      destroy() {
        lifecycle.push('presentation-destroy');
      },
    }),
    clock: {
      request(fn) {
        frames.set(++nextId, fn);
        return nextId;
      },
      cancel(id) {
        frames.delete(id);
      },
    },
    random,
  });
  return {
    app,
    document,
    window,
    heard,
    lifecycle,
    get snapshot() {
      return snapshot;
    },
    get renders() {
      return renders;
    },
    get pending() {
      return frames.size;
    },
    lock(value) {
      locked = value;
    },
    tick(ms = 16) {
      now += ms;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((fn) => fn(now));
    },
  };
}

test('启动会清空准备阶段输入，随后真实推进会话，不抛触控重置异常', () => {
  const h = harness();
  assert.equal(h.snapshot.game.status, 'ready');
  assert.equal(h.pending, 1);
  h.app.dispatch({ type: 'direction', direction: 'left', pressed: true });
  h.app.dispatch({ type: 'start' });
  const x = h.snapshot.game.player.x;
  h.tick();
  assert.equal(h.snapshot.game.status, 'running');
  assert.equal(h.snapshot.game.elapsedMs, 16);
  assert.equal(h.snapshot.game.player.x, x);
  assert.equal(h.pending, 1);
  h.app.destroy();
});

test('重开保留机体，清除触点与待释放技能；开局后选机锁定', () => {
  const h = harness();
  h.app.dispatch({ type: 'select-fighter', fighterId: 'yellow' });
  h.app.dispatch({ type: 'start' });
  h.app.dispatch({ type: 'select-fighter', fighterId: 'green' });
  h.app.dispatch({ type: 'touch-target', point: { x: 480, y: 288 } });
  h.app.dispatch({ type: 'blink' });
  h.app.dispatch({ type: 'restart' });
  h.tick();
  assert.equal(h.snapshot.game.fighterId, 'yellow');
  assert.equal(h.snapshot.game.player.x, 210);
  assert.equal(h.snapshot.game.player.y, 630);
  assert.equal(h.snapshot.game.blinkMarker, null);
  assert.equal(h.snapshot.game.elapsedMs, 16);
  h.app.destroy();
});

test('键盘、方向按钮独立合并；同方向多键不会被一次松开抵消', () => {
  const h = harness();
  h.app.dispatch({ type: 'start' });
  h.document.fire('keydown', { key: 'a' });
  h.document.fire('keydown', { key: 'ArrowLeft' });
  h.document.fire('keyup', { key: 'a' });
  h.app.dispatch({ type: 'direction', direction: 'left', pressed: true });
  h.app.dispatch({ type: 'direction', direction: 'left', pressed: false });
  h.tick();
  assert.equal(h.snapshot.game.player.x, 204.88);
  h.document.fire('keyup', { key: 'ArrowLeft' });
  h.app.dispatch({ type: 'direction', direction: 'up', pressed: true });
  h.document.fire('keydown', { key: 'd' });
  h.tick();
  assert.equal(h.snapshot.game.player.x, 210);
  assert.equal(h.snapshot.game.player.y, 624.88);
  h.window.fire('blur');
  const player = h.snapshot.game.player;
  h.tick();
  assert.equal(h.snapshot.game.player.x, player.x);
  assert.equal(h.snapshot.game.player.y, player.y);
  h.app.destroy();
});

test('手机触点保留停止区、最高速度和斜向归一化；松手不取消键盘', () => {
  const h = harness();
  h.app.dispatch({ type: 'start' });
  h.app.dispatch({ type: 'touch-target', point: { x: 252, y: 658 } });
  h.tick();
  assert.equal(h.snapshot.game.player.x, 210);
  h.app.dispatch({ type: 'touch-target', point: { x: 240, y: 400 } });
  h.tick();
  assert.ok(Math.abs(h.snapshot.game.player.y - 618.48) < 1e-8);
  const before = h.snapshot.game.player;
  h.app.dispatch({ type: 'touch-target', point: { x: 480, y: 288 } });
  h.tick();
  assert.ok(
    Math.abs(
      Math.hypot(h.snapshot.game.player.x - before.x, h.snapshot.game.player.y - before.y) - 11.52,
    ) < 1e-8,
  );
  h.app.dispatch({ type: 'touch-end' });
  const stopped = h.snapshot.game.player;
  h.tick();
  assert.equal(h.snapshot.game.player.x, stopped.x);
  h.document.fire('keydown', { key: 'd' });
  h.app.dispatch({ type: 'touch-end' });
  h.tick();
  assert.ok(Math.abs(h.snapshot.game.player.x - stopped.x - 5.12) < 1e-8);
  h.app.destroy();
});

test('暂停冻结位置、技能冷却和时间，恢复后不重放待消费技能', () => {
  const h = harness();
  h.app.dispatch({ type: 'start' });
  h.app.dispatch({ type: 'blink' });
  h.tick();
  assert.ok(h.snapshot.game.shieldSkillCooldownMs > 0);
  h.app.dispatch({ type: 'touch-target', point: { x: 480, y: 288 } });
  h.app.dispatch({ type: 'skill' });
  h.app.dispatch({ type: 'toggle-pause' });
  const before = h.snapshot;
  h.tick(1000);
  assert.deepEqual(h.snapshot.game, before.game);
  h.app.dispatch({ type: 'toggle-pause' });
  h.tick();
  assert.equal(h.snapshot.game.player.x, before.game.player.x);
  assert.equal(h.snapshot.game.elapsedMs, before.game.elapsedMs + 16);
  h.app.destroy();
});

test('E 单次指令同帧合并、长按不触发二段，下次独立按下才跃迁', () => {
  const h = harness();
  h.app.dispatch({ type: 'select-fighter', fighterId: 'yellow' });
  h.app.dispatch({ type: 'start' });
  h.document.fire('keydown', { key: 'E', repeat: false });
  h.app.dispatch({ type: 'blink' });
  h.tick();
  assert.ok(h.snapshot.game.blinkMarker);
  h.document.fire('keydown', { key: 'E', repeat: true });
  h.tick();
  assert.ok(h.snapshot.game.blinkMarker);
  h.tick();
  assert.ok(h.snapshot.game.blinkMarker);
  h.document.fire('keyup', { key: 'E' });
  h.document.fire('keydown', { key: 'e', repeat: false });
  h.tick();
  assert.equal(h.snapshot.game.blinkMarker, null);
  assert.equal(h.snapshot.game.blinkCooldownMs, 10000);
  h.app.destroy();
});

test('说明锁定拦截按钮与 Space；移动菜单暂停，重绘不恢复会话', () => {
  const h = harness();
  h.lock(true);
  h.app.dispatch({ type: 'restart' });
  assert.equal(h.snapshot.game.status, 'ready');
  h.lock(false);
  h.app.dispatch({ type: 'start' });
  h.tick();
  h.app.dispatch({ type: 'mobile-menu' });
  const elapsed = h.snapshot.game.elapsedMs;
  h.lock(true);
  h.document.fire('keydown', { key: ' ', code: 'Space' });
  h.app.dispatch({ type: 'restart' });
  h.tick();
  assert.equal(h.snapshot.game.status, 'paused');
  assert.equal(h.snapshot.game.elapsedMs, elapsed);
  h.lock(false);
  h.tick();
  assert.equal(h.snapshot.game.status, 'paused');
  h.document.fire('keydown', { key: ' ', code: 'Space' });
  h.tick();
  assert.equal(h.snapshot.game.status, 'running');
  h.app.destroy();
});

test('只消费推进帧事件，普通重绘不会补播音效，时钟保持单循环', () => {
  const h = harness();
  h.app.dispatch({ type: 'start' });
  for (let i = 0; i < 15; i++) h.tick();
  const count = h.heard.length;
  assert.ok(count > 0);
  h.app.dispatch({ type: 'direction', direction: 'left', pressed: false });
  assert.equal(h.heard.length, count);
  assert.equal(h.pending, 1);
  const elapsed = h.snapshot.game.elapsedMs;
  h.tick(1000);
  assert.equal(h.snapshot.game.elapsedMs, elapsed + 34);
  h.app.dispatch({ type: 'toggle-sound' });
  assert.equal(h.snapshot.soundEnabled, false);
  h.app.dispatch({ type: 'toggle-sound' });
  assert.equal(h.snapshot.soundEnabled, true);
  h.app.destroy();
});

test('销毁可重复执行并取消循环与监听，之后操作无效果', () => {
  const h = harness();
  h.app.dispatch({ type: 'start' });
  h.tick();
  const renders = h.renders;
  h.window.fire('beforeunload');
  h.app.destroy();
  assert.equal(h.pending, 0);
  assert.equal(h.document.count(), 0);
  assert.equal(h.window.count(), 0);
  h.app.dispatch({ type: 'restart' });
  h.document.fire('keydown', { key: 'd' });
  h.tick();
  assert.equal(h.renders, renders);
  assert.equal(h.lifecycle.filter((v) => v === 'audio-destroy').length, 1);
  assert.equal(h.lifecycle.filter((v) => v === 'presentation-destroy').length, 1);
});

test('Q 不缓存未充满时的请求且忽略长按，真实击杀充满后首次按下只释放一次', () => {
  // 固定敌机与护盾掉落，通过正常击杀取得能量，不改写快照或替换规则。
  const h = harness({ random: () => 0.01 });
  h.app.dispatch({ type: 'start' });
  h.document.fire('keydown', { key: 'q', repeat: false });
  h.app.dispatch({ type: 'direction', direction: 'left', pressed: true });
  h.app.dispatch({ type: 'direction', direction: 'up', pressed: true });
  for (let i = 0; i < 3000 && h.snapshot.game.skillCharge < 100; i++) {
    if (i === 80) {
      h.app.dispatch({ type: 'direction', direction: 'left', pressed: false });
      h.app.dispatch({ type: 'direction', direction: 'up', pressed: false });
    }
    if (i % 60 === 0) h.app.dispatch({ type: 'blink' });
    h.document.fire('keydown', { key: 'q', repeat: true });
    h.tick();
  }
  assert.equal(h.snapshot.game.status, 'running');
  assert.equal(h.snapshot.game.skillCharge, 100);
  assert.equal(h.heard.filter((e) => e.type === 'shockwave-released').length, 0);
  h.document.fire('keyup', { key: 'q' });
  h.document.fire('keydown', { key: 'Q', repeat: false });
  h.app.dispatch({ type: 'skill' });
  h.tick();
  assert.equal(h.snapshot.game.skillCharge, 0);
  assert.equal(h.snapshot.game.skillCooldownMs, 18000);
  h.tick();
  assert.equal(h.heard.filter((e) => e.type === 'shockwave-released').length, 1);
  h.app.destroy();
});
