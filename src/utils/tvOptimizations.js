/**
 * TV Performance Optimizations
 * Detects TV platform and provides optimized settings
 */

export const isTV = (() => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return ua.includes("webOS") || ua.includes("Web0S") || ua.includes("Tizen") || ua.includes("SmartTV");
})();

// Detect specific TV platform
const tvPlatform = (() => {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent;
  if (ua.includes("webOS") || ua.includes("Web0S")) return "webos";
  if (ua.includes("Tizen")) return "tizen";
  if (ua.includes("SmartTV")) return "smarttv";
  return "unknown";
})();

const TV_CONFIG = {
  shelfPageSize: 8,
  gridPageSize: 20,
  disableAnimations: true,
};

const DESKTOP_CONFIG = {
  shelfPageSize: 12,
  gridPageSize: 40,
  disableAnimations: false,
};

// Get config based on platform
export const getConfig = () => (isTV ? TV_CONFIG : DESKTOP_CONFIG);


// Apply TV-specific optimizations to DOM
export function applyTVOptimizations() {
  if (!isTV || typeof document === "undefined") return;

  console.log("🚀 Applying TV performance optimizations...");
  console.log("Platform:", tvPlatform);

  // Set platform attribute for CSS
  document.body.setAttribute("data-platform", tvPlatform);
  document.body.setAttribute("data-tv", "true");

  // Disable smooth scrolling on TV
  document.documentElement.style.scrollBehavior = "auto";

  // Inject performance CSS
  const style = document.createElement("style");
  style.id = "tv-performance-optimizations";
  style.textContent = `
    /* TV Performance Optimizations */
    
    /* Faster animations */
    * {
      animation-duration: 0.1s !important;
      transition-duration: 0.1s !important;
    }
    
    /* Ultra-fast focus transitions */
    .tv-focused {
      transition: transform 0.08s ease, outline 0.04s ease !important;
    }
    
    /* Hardware acceleration */
    .tv-poster,
    .tv-channel,
    .tv-history-item,
    .tv-accounts-item,
    .tv-episode {
      will-change: transform;
      transform: translateZ(0);
      backface-visibility: hidden;
    }
    
    /* Simpler shadows */
    .tv-focused {
      box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.5) !important;
    }
    
    /* Disable hover on TV */
    @media (hover: none) {
      *:hover {
        transform: none !important;
        box-shadow: none !important;
      }
    }
    
    /* Optimize images */
    img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    
    /* Reduce repaints */
    .tv-shelf-rail,
    .tv-grid,
    .tv-channel-grid {
      contain: layout style paint;
    }
    
    /* Disable text selection */
    * {
      user-select: none;
      -webkit-user-select: none;
    }
    
    /* Input fields should allow selection */
    input, textarea {
      user-select: text;
      -webkit-user-select: text;
    }
  `;
  document.head.appendChild(style);

  console.log("✅ TV optimizations applied successfully");
}

// Initialize on load
if (isTV && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyTVOptimizations);
  } else {
    applyTVOptimizations();
  }
}

// Set global flags
if (typeof globalThis !== "undefined") {
  globalThis.__TV__ = isTV;
  globalThis.__TV_PLATFORM__ = tvPlatform;
}

