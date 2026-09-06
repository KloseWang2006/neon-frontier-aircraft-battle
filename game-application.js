(function (root, factory) {
  const commonJS = typeof module === 'object' && module.exports;
  const api = factory(
    commonJS ? require('./run-session.js') : root.RunSession,
    commonJS ? require('./game-rules.js') : root.GameRules,
    commonJS ? require('./fighter-catalog.js') : root.FighterCatalog,
    commonJS ? require('./page-presentation.js') : root.PagePresentation,
  );
  if (commonJS) module.exports = api;
  else root.GameApplication = api;
})(globalThis, (RunSession, GameRules, FighterCatalog, PagePresentation) => {
  // Browser and test clocks share request(callback)/cancel(id). All sequencing stays here.
  function create({
    document,
    window,
    storage,
    audio,
    presentationFactory = PagePresentation.create,
    clock = {
      request: (fn) => window.requestAnimationFrame(fn),
      cancel: (id) => window.cancelAnimationFrame(id),
    },
    random = Math.random,
  }) {
    let session = RunSession.create({ rules: GameRules, storage });
    let touchTarget = null,
      last = 0,
      frameId = null,
      destroyed = false;
    const heldKeys = new Set(),
      buttons = new Set(),
      pending = new Set(),
      removers = [];
    const keyMap = {
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right',
      ArrowUp: 'up',
      w: 'up',
      W: 'up',
      ArrowDown: 'down',
      s: 'down',
      S: 'down',
    };
    const presentation = presentationFactory({
      document,
      canvas: document.querySelector?.('#game'),
      catalog: FighterCatalog,
      onIntent: dispatch,
    });
    function render() {
      presentation.render({
        game: session.game,
        view: session.view,
        best: session.best,
        board: session.board,
        soundEnabled: audio.isEnabled(),
      });
    }
    function clearInput() {
      touchTarget = null;
      heldKeys.clear();
      buttons.clear();
      pending.clear();
    }
    function frameInput() {
      const directions = new Set([...heldKeys].map((key) => keyMap[key]));
      const input = Object.fromEntries(
        ['left', 'right', 'up', 'down'].map((name) => [
          name,
          directions.has(name) || buttons.has(name),
        ]),
      );
      input.skill = pending.has('skill');
      input.blink = pending.has('blink');
      if (!touchTarget) return input;
      const player = session.game.player;
      const dx = touchTarget.x - (player.x + 30),
        dy = touchTarget.y - (player.y + 28);
      const distance = Math.hypot(dx, dy);
      if (distance <= 12) return input;
      const rawX = Number(input.right) - Number(input.left) + dx / distance;
      const rawY = Number(input.down) - Number(input.up) + dy / distance;
      const magnitude = Math.hypot(rawX, rawY) || 1;
      return {
        ...input,
        moveX: rawX / magnitude,
        moveY: rawY / magnitude,
        moveSpeedScale: 1 + Math.min(1, (distance - 12) / 168) * 1.25,
      };
    }
    function dispatch(intent) {
      if (destroyed) return;
      audio.unlock();
      if (presentation.isControlsLocked() && ['restart', 'toggle-pause'].includes(intent.type)) {
        render();
        return;
      }
      const wasStatus = session.game.status;
      switch (intent.type) {
        case 'start':
        case 'restart':
          clearInput();
          session =
            intent.type === 'start' ? RunSession.start(session) : RunSession.restart(session);
          break;
        case 'toggle-pause':
          session = RunSession.togglePause(session);
          if (session.game.status !== 'running') clearInput();
          if (wasStatus === 'running') audio.play('pause');
          if (wasStatus === 'paused') audio.play('resume');
          break;
        case 'mobile-menu':
          clearInput();
          if (wasStatus === 'running') {
            session = RunSession.togglePause(session);
            audio.play('pause');
          }
          break;
        case 'toggle-sound':
          if (audio.toggle()) {
            audio.unlock();
            audio.play('resume');
          }
          break;
        case 'select-fighter':
          session = RunSession.selectFighter(session, intent.fighterId);
          break;
        case 'skill':
        case 'blink':
          if (wasStatus === 'running') pending.add(intent.type);
          break;
        case 'direction':
          if (['left', 'right', 'up', 'down'].includes(intent.direction)) {
            if (intent.pressed) buttons.add(intent.direction);
            else buttons.delete(intent.direction);
          }
          break;
        case 'touch-target':
          if (
            wasStatus === 'running' &&
            Number.isFinite(intent.point?.x) &&
            Number.isFinite(intent.point?.y)
          ) {
            touchTarget = {
              x: Math.max(0, Math.min(480, intent.point.x)),
              y: Math.max(288, Math.min(666, intent.point.y)),
            };
          }
          break;
        case 'touch-end':
          touchTarget = null;
          break;
        case 'register': {
          const next = RunSession.register(session, intent.id);
          if (next !== session) clearInput();
          session = next;
          break;
        }
      }
      render();
    }
    function bind(target, name, fn) {
      target.addEventListener(name, fn);
      removers.push(() => target.removeEventListener(name, fn));
    }
    bind(document, 'keydown', (event) => {
      audio.unlock();
      const skill = event.key?.toLowerCase();
      if (skill === 'q' || skill === 'e') {
        if (!event.repeat) dispatch({ type: skill === 'q' ? 'skill' : 'blink' });
        event.preventDefault();
        return;
      }
      if (keyMap[event.key]) {
        heldKeys.add(event.key);
        event.preventDefault();
      }
      if (event.code === 'Space') {
        event.preventDefault();
        dispatch({ type: 'toggle-pause' });
      }
    });
    bind(document, 'keyup', (event) => heldKeys.delete(event.key));
    bind(window, 'blur', clearInput);
    bind(window, 'beforeunload', destroy);
    function loop(now) {
      if (destroyed) return;
      const dt = Math.min(34, now - last || 16);
      last = now;
      if (session.game.status === 'running') {
        session = RunSession.advance(session, { dt, input: frameInput(), random });
        audio.consume(session.events);
        pending.clear();
        if (session.game.status !== 'running') clearInput();
      }
      render();
      if (!destroyed) frameId = clock.request(loop);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      clock.cancel(frameId);
      removers.splice(0).forEach((remove) => remove());
      clearInput();
      presentation.destroy();
      audio.destroy();
    }
    render();
    frameId = clock.request(loop);
    return Object.freeze({ dispatch, destroy });
  }
  return Object.freeze({ create });
});
