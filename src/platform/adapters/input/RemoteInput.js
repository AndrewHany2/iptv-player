/**
 * Centralised remote-control keydown handler for TV.
 *
 * Wraps a FocusManager and lets callers register custom handlers for any
 * action (left/right/up/down/enter/back). Unregistered directional keys are
 * routed to the FocusManager automatically.
 *
 * Usage:
 *   const remote = new RemoteInput(focusManager);
 *   remote.on('enter', () => openSelected());
 *   remote.on('back', () => navigation.goBack());
 *   remote.enable();
 *   // cleanup:
 *   remote.destroy();
 */

const KEY_CODES = {
  37: 'left', 38: 'up', 39: 'right', 40: 'down',
  13: 'enter',
  27: 'back', 461: 'back', 10009: 'back', 8: 'back',
};
const KEY_NAMES = {
  ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down',
  Enter: 'enter',
  Escape: 'back',
};

export class RemoteInput {
  constructor(focusManager = null) {
    this._fm = focusManager;
    this._handlers = new Map();
    this._enabled = false;
    this._bound = this._onKeyDown.bind(this);
  }

  /** Attach a handler for an action ('left'|'right'|'up'|'down'|'enter'|'back'). */
  on(action, handler) {
    this._handlers.set(action, handler);
    return this;
  }

  off(action) {
    this._handlers.delete(action);
    return this;
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;
    document.addEventListener('keydown', this._bound);
  }

  disable() {
    if (!this._enabled) return;
    this._enabled = false;
    document.removeEventListener('keydown', this._bound);
  }

  /** Disable and remove all handlers. */
  destroy() {
    this.disable();
    this._handlers.clear();
  }

  _onKeyDown(e) {
    const action = KEY_NAMES[e.key] ?? KEY_CODES[e.keyCode] ?? KEY_CODES[e.which];
    if (!action) return;
    e.preventDefault();

    const handler = this._handlers.get(action);
    if (handler) {
      handler(e);
      return;
    }

    // Default: route directional keys to FocusManager.
    if (this._fm && ['left', 'right', 'up', 'down'].includes(action)) {
      this._fm.moveFocus(action);
    }
  }
}
