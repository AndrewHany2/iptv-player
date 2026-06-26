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

import { resolveAction } from './keys';

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
    const action = resolveAction(e);
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
