import { TVOptimizations } from "../platform/optimization/TVOptimizations";

export const isTV = (() => {
  if (globalThis.window === undefined) return false;
  return (
    globalThis.__TV__ ||
    /webOS|Web0S|Tizen|SmartTV/i.test(globalThis.navigator.userAgent)
  );
})();

export const getConfig = () =>
  isTV
    ? { shelfPageSize: 8, gridPageSize: 20, enableVirtualization: true, disableAnimations: true }
    : { shelfPageSize: 12, gridPageSize: 40, enableVirtualization: false, disableAnimations: false };

export function applyTVOptimizations() {
  if (!isTV) return;
  TVOptimizations.apply();
}

// Auto-apply (TVOptimizations.js handles this itself, but keep backward-compat trigger)
if (isTV && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyTVOptimizations);
  } else {
    applyTVOptimizations();
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.__TV__ = globalThis.__TV__ ?? isTV;
}
