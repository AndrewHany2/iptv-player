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
export const tvPlatform = (() => {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent;
  if (ua.includes("webOS") || ua.includes("Web0S")) return "webos";
  if (ua.includes("Tizen")) return "tizen";
  if (ua.includes("SmartTV")) return "smarttv";
  return "unknown";
})();

// TV-optimized settings
export const TV_CONFIG = {
  // Disable heavy features on TV
  disableTMDB: true, // Don't fetch TMDB data (slow API calls)
  disableAnimations: true, // Disable Tamagui animations
  reducedItemsPerPage: true, // Show fewer items per page
  disablePrefetch: true, // Don't prefetch data
  simplifiedUI: true, // Use simpler UI components

  // Optimized pagination
  shelfPageSize: 8, // Fewer items per shelf
  gridPageSize: 20, // Fewer items in grid view

  // Performance settings
  removeClippedSubviews: true, // Remove off-screen views
  maxToRenderPerBatch: 5, // Render fewer items at once
  windowSize: 3, // Smaller render window

  // Additional performance optimizations
  focusTransitionSpeed: 100, // Fast focus transitions (ms)
  scrollDebounce: 50, // Debounce scroll events (ms)
  resizeDebounce: 100, // Debounce resize events (ms)
  maxCachedItems: 50, // Limit cached items
  enableVirtualScrolling: true, // Use virtual scrolling
  reducedMotion: true, // Reduce motion for performance
};

// Desktop/Electron settings (full features)
export const DESKTOP_CONFIG = {
  disableTMDB: false,
  disableAnimations: false,
  reducedItemsPerPage: false,
  disablePrefetch: false,
  simplifiedUI: false,

  shelfPageSize: 12,
  gridPageSize: 40,

  removeClippedSubviews: false,
  maxToRenderPerBatch: 10,
  windowSize: 5,

  focusTransitionSpeed: 200,
  scrollDebounce: 100,
  resizeDebounce: 200,
  maxCachedItems: 100,
  enableVirtualScrolling: false,
  reducedMotion: false,
};

// Get config based on platform
export const getConfig = () => (isTV ? TV_CONFIG : DESKTOP_CONFIG);

// Check if feature should be enabled
export const shouldUseTMDB = () => !isTV || !TV_CONFIG.disableTMDB;
export const shouldAnimate = () => !isTV || !TV_CONFIG.disableAnimations;
export const shouldPrefetch = () => !isTV || !TV_CONFIG.disablePrefetch;

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

// Log platform info
console.log("Platform:", isTV ? `TV (${tvPlatform})` : "Desktop");
console.log("Config:", getConfig());

// Made with Bob
