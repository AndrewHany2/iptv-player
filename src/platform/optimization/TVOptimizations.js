export class TVOptimizations {
  static apply() {
    if (typeof document === "undefined") return;

    this._disableAnimations();
    this._enableHardwareAcceleration();
    this._optimizeRendering();
    this._simplifyStyles();
    this._optimizeImages();
    this._disableTextSelection();

    document.documentElement.style.scrollBehavior = "auto";
    document.body.setAttribute("data-tv", "true");

    const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    if (/webOS|Web0S/i.test(ua)) document.body.setAttribute("data-platform", "webos");
    else if (/Tizen/i.test(ua)) document.body.setAttribute("data-platform", "tizen");
  }

  static _disableAnimations() {
    const s = document.createElement("style");
    s.id = "tv-opt-animations";
    s.textContent = `
      *, *::before, *::after {
        animation: none !important;
        animation-duration: 0s !important;
        transition: none !important;
        transition-duration: 0s !important;
      }
      /* Allow a single fast outline pulse for focus feedback */
      .tv-focused { outline: 3px solid #e94560 !important; outline-offset: 4px !important; }
    `;
    document.head.appendChild(s);
  }

  static _enableHardwareAcceleration() {
    const s = document.createElement("style");
    s.id = "tv-opt-hw";
    s.textContent = `
      .tv-card, .tv-shelf-rail, .tv-grid, .tv-channel-grid,
      .tvl-card, .tvl-scroll, .tvl-cat-grid, .tvl-mov-grid {
        will-change: transform;
        transform: translateZ(0);
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
    `;
    document.head.appendChild(s);
  }

  static _optimizeRendering() {
    const s = document.createElement("style");
    s.id = "tv-opt-rendering";
    s.textContent = `
      .tv-shelf, .tvl-screen { contain: layout style paint; }
      .tv-card, .tvl-card    { contain: layout style; }
      .tv-grid, .tvl-mov-grid, .tvl-cat-grid { contain: layout; }

      .tv-shelf-rail, .tvl-scroll {
        overflow-x: auto;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        scroll-behavior: auto;
      }
    `;
    document.head.appendChild(s);
  }

  static _simplifyStyles() {
    const s = document.createElement("style");
    s.id = "tv-opt-styles";
    s.textContent = `
      * {
        box-shadow: none !important;
        text-shadow: none !important;
        filter: none !important;
      }
      *:hover {
        transform: none !important;
        scale: 1 !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(s);
  }

  static _optimizeImages() {
    const s = document.createElement("style");
    s.id = "tv-opt-images";
    s.textContent = `
      img {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        will-change: auto;
      }
      img[loading="lazy"] { content-visibility: auto; }
    `;
    document.head.appendChild(s);
  }

  static _disableTextSelection() {
    const s = document.createElement("style");
    s.id = "tv-opt-selection";
    s.textContent = `
      * { user-select: none; -webkit-user-select: none; }
      input, textarea { user-select: text; -webkit-user-select: text; }
    `;
    document.head.appendChild(s);
  }
}

// Auto-apply on TV platforms
if (typeof window !== "undefined") {
  const isTV =
    globalThis.__TV__ ||
    /webOS|Web0S|Tizen|SmartTV/i.test(navigator.userAgent);

  if (isTV) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => TVOptimizations.apply());
    } else {
      TVOptimizations.apply();
    }
  }
}
