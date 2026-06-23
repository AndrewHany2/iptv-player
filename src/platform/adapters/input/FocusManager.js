/**
 * Spatial D-pad focus manager for TV grids.
 *
 * Call register() for each focusable element with its logical row/col position.
 * moveFocus(direction) finds the nearest neighbour in the given direction using
 * the sparse 2-D grid and O(rows) nearest-neighbour search.
 */
export class FocusManager {
  constructor() {
    this._nodes = new Map();   // id → { element, row, col }
    this._grid = {};           // { [row]: { [col]: id } }
    this._focusedId = null;
  }

  /**
   * Register a focusable element.
   * @returns {() => void} Unregister function — call it when the element unmounts.
   */
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
      if (!Object.keys(this._grid[node.row] ?? {}).length)
        delete this._grid[node.row];
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
    const prev = this._nodes.get(this._focusedId);
    prev?.element?.classList.remove('tv-focus');
    this._focusedId = id;
    const next = this._nodes.get(id);
    next?.element?.classList.add('tv-focus');
    next?.element?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  getFocusedId() {
    return this._focusedId;
  }

  /**
   * Move focus in a direction. Returns true if focus changed.
   */
  moveFocus(direction) {
    const cur = this._nodes.get(this._focusedId);
    if (!cur) return false;
    const { row, col } = cur;
    let targetId = null;

    switch (direction) {
      case 'right': targetId = this._findRight(row, col); break;
      case 'left':  targetId = this._findLeft(row, col);  break;
      case 'down':  targetId = this._findDown(row, col);  break;
      case 'up':    targetId = this._findUp(row, col);    break;
    }

    if (targetId) { this.setFocus(targetId); return true; }
    return false;
  }

  rebuildGrid() {
    this._grid = {};
    for (const [id, { row, col }] of this._nodes) {
      (this._grid[row] ??= {})[col] = id;
    }
  }

  destroy() {
    this._nodes.get(this._focusedId)?.element?.classList.remove('tv-focus');
    this._nodes.clear();
    this._grid = {};
    this._focusedId = null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  _findRight(row, col) {
    const r = this._grid[row];
    if (!r) return null;
    const next = Object.keys(r).map(Number).filter(c => c > col).sort((a, b) => a - b)[0];
    return next !== undefined ? r[next] : null;
  }

  _findLeft(row, col) {
    const r = this._grid[row];
    if (!r) return null;
    const prev = Object.keys(r).map(Number).filter(c => c < col).sort((a, b) => b - a)[0];
    return prev !== undefined ? r[prev] : null;
  }

  _findDown(row, col) {
    const rows = Object.keys(this._grid).map(Number).filter(r => r > row).sort((a, b) => a - b);
    for (const r of rows) {
      const id = this._nearestInRow(r, col);
      if (id) return id;
    }
    return null;
  }

  _findUp(row, col) {
    const rows = Object.keys(this._grid).map(Number).filter(r => r < row).sort((a, b) => b - a);
    for (const r of rows) {
      const id = this._nearestInRow(r, col);
      if (id) return id;
    }
    return null;
  }

  _nearestInRow(row, col) {
    const r = this._grid[row];
    if (!r) return null;
    const cols = Object.keys(r).map(Number);
    if (!cols.length) return null;
    const nearest = cols.reduce((a, b) => Math.abs(b - col) < Math.abs(a - col) ? b : a);
    return r[nearest];
  }
}
