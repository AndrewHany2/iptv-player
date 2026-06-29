import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

// Reference design resolution — all sizes in the app are authored at this.
const DESIGN_WIDTH  = 1920;
const DESIGN_HEIGHT = 1080;

// TVs never resize and native screens are effectively fixed for our purposes, so
// there we keep the original snapshot-on-startup behaviour (no listener churn,
// no per-frame work in a grid of hundreds of cards). Only web/desktop, where the
// user can drag the window edge, recompute the scale on resize.
const IS_REACTIVE =
  Platform.OS === 'web' &&
  !(typeof globalThis !== 'undefined' && globalThis.__TV__ === true);

// Uniform scale factor: whichever axis is the tighter fit governs.
// Do NOT divide by PixelRatio — Dimensions already returns CSS logical pixels
// on web (DPR is handled by the browser). On LG TV (DPR=1, viewport=1280)
// and on native (where PixelRatio may vary), this gives the right result.
// Native phones/tablets are NOT 1920-wide: scaling the 1920×1080 design against
// a ~390pt phone yields ~0.2×, which shrinks every ss()-sized shared screen
// (Auth, Profiles, Accounts, detail overlays) to an unreadable ~20%. So on
// native we scale against a mobile reference width instead, clamped to a sane
// band so the design-time pixel sizes render ~1× on a typical phone and adapt
// gently for small (SE) / large (Pro Max / tablet) screens. Web + webOS TV keep
// the 1920×1080 reference (large-screen UIs authored at that resolution).
const MOBILE_REF_WIDTH = 420;

function computeScale() {
  const { width, height } = Dimensions.get('window');
  if (Platform.OS !== 'web') {
    const s = width / MOBILE_REF_WIDTH;
    return Math.min(Math.max(s, 0.85), 1.3);
  }
  return Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
}

// Live scale. On native/TV this is frozen at module load; on web it is updated
// by the listeners wired below. `ss(n)` always reads this latest value.
let SCALE = computeScale();

// Subscribers re-rendered when SCALE changes (web/desktop only). Kept in a Set so
// useScale() instances can register/unregister cleanly.
const subscribers = new Set();

function recompute() {
  const next = computeScale();
  if (next === SCALE) return;
  SCALE = next;
  for (const notify of subscribers) notify(SCALE);
}

if (IS_REACTIVE) {
  // RN-Web maps Dimensions 'change' onto window resize, but we also listen on
  // window directly as a belt-and-braces guard for environments (Electron) where
  // the RN shim's debounce can lag.
  Dimensions.addEventListener('change', recompute);
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('resize', recompute);
  }
}

/**
 * Scale a design-time measurement to the current screen.
 *
 * Usage:
 *   fontSize={ss(28)}   // 28pt at 1080p → correct physical px on any TV
 *   padding={ss(48)}
 *
 * Reads the live SCALE, so on web it reflects the latest window size. Call sites
 * that want to RE-RENDER on resize should also subscribe via useScale().
 *
 * @param {number} size  Size at 1920×1080 reference resolution.
 * @returns {number}     CSS pixel value for the current screen.
 */
export const ss = (size) => Math.round(size * SCALE);

// Verbose alias for readability in non-UI contexts.
export const scaleSize = ss;

/**
 * React hook returning the current scale factor and re-rendering the consumer
 * when the window resizes (web/desktop). On native/TV the scale is frozen, so
 * this returns a stable value and never re-renders.
 *
 * Usage:
 *   const scale = useScale();          // re-renders on resize
 *   const pad = ss(48);                // reads the same live SCALE
 *
 * @returns {number} The current uniform scale factor.
 */
export function useScale() {
  const [scale, setScale] = useState(SCALE);

  useEffect(() => {
    if (!IS_REACTIVE) return undefined;
    // Sync immediately in case SCALE changed between initial render and effect.
    setScale(SCALE);
    subscribers.add(setScale);
    return () => {
      subscribers.delete(setScale);
    };
  }, []);

  return scale;
}
