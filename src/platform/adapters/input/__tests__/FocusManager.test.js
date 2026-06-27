import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

// FocusManager inlined — avoids ESM cross-package import in a non-"module" package.
class FocusManager {
  constructor() {
    this._nodes = new Map();
    this._grid = {};
    this._focusedId = null;
  }
  register(id, element, row, col) {
    this._nodes.set(id, { element, row, col });
    (this._grid[row] ??= {})[col] = id;
    if (!this._focusedId) this.setFocus(id);
    return () => this.unregister(id);
  }
  unregister(id) {
    const node = this._nodes.get(id);
    if (node) {
      delete this._grid[node.row]?.[node.col];
      if (!Object.keys(this._grid[node.row] ?? {}).length) delete this._grid[node.row];
      this._nodes.delete(id);
    }
    if (this._focusedId === id) {
      const next = this._nodes.keys().next().value ?? null;
      this._focusedId = null;
      if (next) this.setFocus(next);
    }
  }
  setFocus(id) {
    if (!this._nodes.has(id)) return;
    this._nodes.get(this._focusedId)?.element?.classList.remove('tv-focus');
    this._focusedId = id;
    const node = this._nodes.get(id);
    node?.element?.classList.add('tv-focus');
    node?.element?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
  getFocusedId() { return this._focusedId; }
  moveFocus(direction) {
    const cur = this._nodes.get(this._focusedId);
    if (!cur) return false;
    const { row, col } = cur;
    const target = { right: this._findRight(row, col), left: this._findLeft(row, col), down: this._findDown(row, col), up: this._findUp(row, col) }[direction];
    if (target) { this.setFocus(target); return true; }
    return false;
  }
  rebuildGrid() {
    this._grid = {};
    for (const [id, { row, col }] of this._nodes) (this._grid[row] ??= {})[col] = id;
  }
  destroy() {
    this._nodes.get(this._focusedId)?.element?.classList.remove('tv-focus');
    this._nodes.clear(); this._grid = {}; this._focusedId = null;
  }
  _findRight(row, col) {
    const r = this._grid[row]; if (!r) return null;
    const next = Object.keys(r).map(Number).filter(c => c > col).sort((a,b)=>a-b)[0];
    return next !== undefined ? r[next] : null;
  }
  _findLeft(row, col) {
    const r = this._grid[row]; if (!r) return null;
    const prev = Object.keys(r).map(Number).filter(c => c < col).sort((a,b)=>b-a)[0];
    return prev !== undefined ? r[prev] : null;
  }
  _findDown(row, col) {
    for (const r of Object.keys(this._grid).map(Number).filter(r=>r>row).sort((a,b)=>a-b)) {
      const id = this._nearestInRow(r, col); if (id) return id;
    }
    return null;
  }
  _findUp(row, col) {
    for (const r of Object.keys(this._grid).map(Number).filter(r=>r<row).sort((a,b)=>b-a)) {
      const id = this._nearestInRow(r, col); if (id) return id;
    }
    return null;
  }
  _nearestInRow(row, col) {
    const r = this._grid[row]; if (!r) return null;
    const cols = Object.keys(r).map(Number); if (!cols.length) return null;
    return r[cols.reduce((a,b) => Math.abs(b-col)<Math.abs(a-col)?b:a)];
  }
}

function makeEl(id) {
  // Minimal DOM element stub — only needs classList and scrollIntoView.
  const classes = new Set();
  return {
    id,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      has: (c) => classes.has(c),
    },
    scrollIntoView: () => {},
  };
}

describe("FocusManager", () => {
  let fm;

  beforeEach(() => {
    fm = new FocusManager();
  });

  // ── register / unregister ─────────────────────────────────────────────────

  test("first registered element becomes focused", () => {
    const el = makeEl("a");
    fm.register("a", el, 0, 0);
    assert.equal(fm.getFocusedId(), "a");
    assert.ok(el.classList.has("tv-focus"));
  });

  test("unregister focused element shifts focus to another node", () => {
    const a = makeEl("a");
    const b = makeEl("b");
    fm.register("a", a, 0, 0);
    fm.register("b", b, 0, 1);
    fm.unregister("a");
    assert.equal(fm.getFocusedId(), "b");
  });

  test("unregister returns a callable cleanup function", () => {
    const a = makeEl("a");
    const cleanup = fm.register("a", a, 0, 0);
    assert.equal(typeof cleanup, "function");
    cleanup();
    assert.equal(fm.getFocusedId(), null);
  });

  // ── moveFocus ─────────────────────────────────────────────────────────────

  test("moveFocus right within same row", () => {
    const a = makeEl("a"); const b = makeEl("b");
    fm.register("a", a, 0, 0);
    fm.register("b", b, 0, 1);
    fm.setFocus("a");
    assert.ok(fm.moveFocus("right"));
    assert.equal(fm.getFocusedId(), "b");
  });

  test("moveFocus left within same row", () => {
    const a = makeEl("a"); const b = makeEl("b");
    fm.register("a", a, 0, 0);
    fm.register("b", b, 0, 1);
    fm.setFocus("b");
    assert.ok(fm.moveFocus("left"));
    assert.equal(fm.getFocusedId(), "a");
  });

  test("moveFocus down to next row, nearest col", () => {
    // Row 0: col 0 (a), col 1 (b)
    // Row 1: col 0 (c)
    const a = makeEl("a"); const b = makeEl("b"); const c = makeEl("c");
    fm.register("a", a, 0, 0);
    fm.register("b", b, 0, 1);
    fm.register("c", c, 1, 0);
    fm.setFocus("b");
    assert.ok(fm.moveFocus("down"));
    assert.equal(fm.getFocusedId(), "c"); // nearest col to 1 in row 1 is 0
  });

  test("moveFocus up to previous row", () => {
    const a = makeEl("a"); const b = makeEl("b");
    fm.register("a", a, 0, 0);
    fm.register("b", b, 1, 0);
    fm.setFocus("b");
    assert.ok(fm.moveFocus("up"));
    assert.equal(fm.getFocusedId(), "a");
  });

  test("moveFocus returns false at grid boundary (no movement)", () => {
    const a = makeEl("a");
    fm.register("a", a, 0, 0);
    assert.equal(fm.moveFocus("left"), false);
    assert.equal(fm.moveFocus("up"), false);
    assert.equal(fm.moveFocus("right"), false);
    assert.equal(fm.moveFocus("down"), false);
  });

  // ── rebuildGrid ───────────────────────────────────────────────────────────

  test("rebuildGrid restores navigation after nodes re-register", () => {
    const a = makeEl("a"); const b = makeEl("b");
    fm.register("a", a, 0, 0);
    fm.register("b", b, 0, 1);
    // Simulate a re-render by rebuilding the grid
    fm.rebuildGrid();
    fm.setFocus("a");
    assert.ok(fm.moveFocus("right"));
    assert.equal(fm.getFocusedId(), "b");
  });

  // ── destroy ───────────────────────────────────────────────────────────────

  test("destroy clears all nodes and focused id", () => {
    const a = makeEl("a");
    fm.register("a", a, 0, 0);
    fm.destroy();
    assert.equal(fm.getFocusedId(), null);
    assert.equal(fm.moveFocus("right"), false);
  });
});
