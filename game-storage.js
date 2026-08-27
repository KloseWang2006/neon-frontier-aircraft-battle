(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GameStorage = api;
})(globalThis, () => {
  const HIGH = 'aircraft-battle-high-score-v1',
    BOARD = 'aircraft-battle-clear-rank-v1';
  const valid = (v) =>
    v &&
    typeof v.id === 'string' &&
    v.id.trim() &&
    Number.isFinite(v.score) &&
    Number.isFinite(v.time) &&
    v.score >= 0 &&
    v.time >= 0;
  const sort = (a) =>
    a
      .filter(valid)
      .map((v) => ({ id: v.id.trim().slice(0, 16), score: v.score, time: v.time }))
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, 10);
  const parse = (v) => {
    try {
      return Array.isArray(JSON.parse(v || '[]')) ? JSON.parse(v || '[]') : [];
    } catch {
      return [];
    }
  };
  function memory(initial = {}) {
    const d = { ...initial };
    return {
      getItem: (k) => d[k] ?? null,
      setItem: (k, v) => {
        d[k] = String(v);
      },
    };
  }
  function loadBoard(store) {
    return sort(parse(store.getItem(BOARD)));
  }
  function saveBoard(store, entries) {
    const board = sort(entries);
    store.setItem(BOARD, JSON.stringify(board));
    return board;
  }
  function loadHigh(store) {
    const n = Number(store.getItem(HIGH));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function saveHigh(store, score) {
    const n = Math.max(loadHigh(store), score);
    store.setItem(HIGH, String(n));
    return n;
  }
  function adapter(store) {
    return {
      loadBoard: () => loadBoard(store),
      saveBoard: (v) => saveBoard(store, v),
      loadHigh: () => loadHigh(store),
      saveHigh: (v) => saveHigh(store, v),
    };
  }
  return { HIGH, BOARD, memory, adapter, loadBoard, saveBoard, loadHigh, saveHigh };
});
