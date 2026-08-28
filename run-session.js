(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RunSession = api;
})(globalThis, () => {
  function create({ rules, storage }) {
    return {
      rules,
      storage,
      game: rules.create({ status: 'ready' }),
      best: storage.loadHigh(),
      board: storage.loadBoard(),
      events: [],
      view: { overlay: 'ready', notice: null, noticeMs: 0, canRegister: false, endReason: null },
    };
  }
  function fresh(s) {
    return {
      ...s,
      game: s.rules.create({ fighterId: s.game.fighterId }),
      events: [],
      view: { overlay: null, notice: null, noticeMs: 0, canRegister: false, endReason: null },
    };
  }
  function start(s) {
    return fresh(s);
  }
  function restart(s) {
    return fresh(s);
  }
  function selectFighter(s, fighterId) {
    if (s.game.status !== 'ready' || !s.rules.fighters[fighterId]) return s;
    return {
      ...s,
      game: s.rules.create({ status: 'ready', fighterId }),
      view: { ...s.view, overlay: 'ready' },
    };
  }
  function togglePause(s) {
    if (s.game.status === 'running')
      return { ...s, events: [], game: { ...s.game, status: 'paused' } };
    if (s.game.status === 'paused')
      return { ...s, events: [], game: { ...s.game, status: 'running' } };
    return s;
  }
  function advance(s, frame = {}) {
    if (s.game.status !== 'running')
      return {
        ...s,
        events: [],
        view: {
          ...s.view,
          noticeMs: Math.max(0, s.view.noticeMs - (frame.dt || 16)),
          notice: s.view.noticeMs > (frame.dt || 16) ? s.view.notice : null,
        },
      };
    const r = s.rules.step(s.game, frame);
    let view = { ...s.view, noticeMs: Math.max(0, s.view.noticeMs - (frame.dt || 16)) };
    if (!view.noticeMs) view.notice = null;
    for (const e of r.events) {
      if (e.type === 'ranking-unlocked')
        view = { ...view, notice: '已解锁上榜资格', noticeMs: 2000 };
      if (e.type === 'run-ended')
        view = {
          ...view,
          overlay: 'ended',
          canRegister: r.state.rankEligible,
          endReason: e.reason,
        };
    }
    const best = s.storage.saveHigh(Math.max(s.best, r.state.score));
    return { ...s, game: r.state, best, view, events: r.events };
  }
  function register(s, id) {
    const clean = String(id || '').trim();
    if (!s.view.canRegister || !clean) return s;
    const board = s.storage.saveBoard([
      ...s.board,
      { id: clean, score: s.game.score, time: s.game.elapsedMs },
    ]);
    return { ...fresh({ ...s, board }), board };
  }
  return { create, start, restart, selectFighter, togglePause, advance, register };
});
