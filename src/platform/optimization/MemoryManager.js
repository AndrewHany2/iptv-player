/**
 * LRU cache for TV — evicts the least-recently-used entry when capacity is reached.
 * Used by ContentService and TV screens to cap in-memory data (channel lists, category
 * item sets, etc.) so the app stays within the ~300 MB WebOS budget.
 */
export class MemoryManager {
  constructor(maxEntries = 100) {
    this._cache = new Map();
    this._maxEntries = maxEntries;
  }

  set(key, value) {
    if (this._cache.has(key)) this._cache.delete(key);
    else if (this._cache.size >= this._maxEntries) this._evictLRU();
    this._cache.set(key, value);
  }

  get(key) {
    if (!this._cache.has(key)) return undefined;
    // Re-insert to mark as recently used.
    const value = this._cache.get(key);
    this._cache.delete(key);
    this._cache.set(key, value);
    return value;
  }

  has(key) { return this._cache.has(key); }
  delete(key) { this._cache.delete(key); }
  clear() { this._cache.clear(); }
  get size() { return this._cache.size; }

  _evictLRU() {
    // Map preserves insertion order; the first entry is the least recently used.
    const lruKey = this._cache.keys().next().value;
    this._cache.delete(lruKey);
  }
}
