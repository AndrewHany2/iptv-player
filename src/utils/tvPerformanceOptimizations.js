/**
 * TV Performance Optimizations
 * Additional optimizations to reduce lag on TV hardware
 */

// Debounce function for expensive operations
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for frequent events
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Request idle callback polyfill
export const requestIdleCallback =
  window.requestIdleCallback ||
  function (cb) {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };

// Cancel idle callback polyfill
export const cancelIdleCallback =
  window.cancelIdleCallback ||
  function (id) {
    clearTimeout(id);
  };

// Optimize images for TV
export function optimizeImage(url, options = {}) {
  const { width = 300, quality = 75 } = options;

  // If it's already a data URL or blob, return as-is
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // For TV, we want smaller images
  // This is a placeholder - implement actual image optimization if needed
  return url;
}

// Lazy load images with IntersectionObserver
export class LazyImageLoader {
  constructor(options = {}) {
    this.options = {
      rootMargin: "200px",
      threshold: 0.01,
      ...options,
    };

    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      this.options,
    );

    this.images = new Map();
  }

  observe(img, src) {
    this.images.set(img, src);
    this.observer.observe(img);
  }

  unobserve(img) {
    this.images.delete(img);
    this.observer.unobserve(img);
  }

  handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = this.images.get(img);

        if (src && img.src !== src) {
          img.src = src;
          this.unobserve(img);
        }
      }
    });
  }

  disconnect() {
    this.observer.disconnect();
    this.images.clear();
  }
}

// Reduce layout thrashing
export class BatchedDOMUpdates {
  constructor() {
    this.reads = [];
    this.writes = [];
    this.scheduled = false;
  }

  read(fn) {
    this.reads.push(fn);
    this.schedule();
  }

  write(fn) {
    this.writes.push(fn);
    this.schedule();
  }

  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      // Execute all reads first
      this.reads.forEach((fn) => fn());
      this.reads = [];

      // Then execute all writes
      this.writes.forEach((fn) => fn());
      this.writes = [];

      this.scheduled = false;
    });
  }
}

// Memory management
export class MemoryManager {
  constructor(maxItems = 100) {
    this.cache = new Map();
    this.maxItems = maxItems;
    this.accessOrder = [];
  }

  set(key, value) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
      const oldest = this.accessOrder.shift();
      this.cache.delete(oldest);
    }

    this.cache.set(key, value);
    this.updateAccessOrder(key);
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    this.updateAccessOrder(key);
    return this.cache.get(key);
  }

  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }
}

// Optimize scroll performance
export function optimizeScroll(element, callback) {
  let ticking = false;

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        callback();
        ticking = false;
      });
      ticking = true;
    }
  };

  element.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    element.removeEventListener("scroll", handleScroll);
  };
}

// Reduce reflows/repaints
export function batchStyleUpdates(elements, styles) {
  // Read phase
  const computedStyles = elements.map((el) => ({
    el,
    computed: window.getComputedStyle(el),
  }));

  // Write phase
  requestAnimationFrame(() => {
    elements.forEach((el, i) => {
      Object.assign(el.style, styles[i]);
    });
  });
}

// Virtual scrolling helper
export class VirtualScroller {
  constructor(options = {}) {
    this.itemHeight = options.itemHeight || 100;
    this.containerHeight = options.containerHeight || 600;
    this.buffer = options.buffer || 3;
    this.items = [];
    this.scrollTop = 0;
  }

  setItems(items) {
    this.items = items;
  }

  getVisibleRange(scrollTop) {
    this.scrollTop = scrollTop;

    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.ceil(
      (scrollTop + this.containerHeight) / this.itemHeight,
    );

    const bufferedStart = Math.max(0, startIndex - this.buffer);
    const bufferedEnd = Math.min(this.items.length, endIndex + this.buffer);

    return {
      start: bufferedStart,
      end: bufferedEnd,
      items: this.items.slice(bufferedStart, bufferedEnd),
      offsetY: bufferedStart * this.itemHeight,
      totalHeight: this.items.length * this.itemHeight,
    };
  }
}

// Disable animations on TV for performance
export function disableAnimationsOnTV() {
  if (typeof document === "undefined") return;

  const style = document.createElement("style");
  style.textContent = `
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  `;
  document.head.appendChild(style);

  return () => {
    document.head.removeChild(style);
  };
}

// Optimize focus transitions
export function optimizeFocusTransitions() {
  if (typeof document === "undefined") return;

  const style = document.createElement("style");
  style.textContent = `
    .tv-focused {
      transition: transform 0.1s ease, outline 0.05s ease !important;
    }
    
    .tv-poster.tv-focused,
    .tv-channel.tv-focused,
    .tv-history-item.tv-focused {
      transition: transform 0.15s ease !important;
    }
  `;
  document.head.appendChild(style);

  return () => {
    document.head.removeChild(style);
  };
}

// Reduce DOM complexity
export function simplifyDOM() {
  if (typeof document === "undefined") return;

  // Remove unnecessary elements
  const removeSelectors = [".debug-info", ".dev-tools", "[data-debug]"];

  removeSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.remove());
  });
}

// Optimize event listeners
export class OptimizedEventManager {
  constructor() {
    this.listeners = new Map();
  }

  add(element, event, handler, options = {}) {
    const key = `${event}-${element}`;

    if (this.listeners.has(key)) {
      this.remove(element, event);
    }

    const optimizedHandler = options.throttle
      ? throttle(handler, options.throttle)
      : options.debounce
        ? debounce(handler, options.debounce)
        : handler;

    element.addEventListener(event, optimizedHandler, {
      passive: true,
      ...options,
    });
    this.listeners.set(key, { element, event, handler: optimizedHandler });
  }

  remove(element, event) {
    const key = `${event}-${element}`;
    const listener = this.listeners.get(key);

    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler);
      this.listeners.delete(key);
    }
  }

  removeAll() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners.clear();
  }
}

// Performance monitoring
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
    };
    this.lastTime = performance.now();
    this.frames = 0;
    this.monitoring = false;
  }

  start() {
    this.monitoring = true;
    this.measure();
  }

  stop() {
    this.monitoring = false;
  }

  measure() {
    if (!this.monitoring) return;

    const currentTime = performance.now();
    this.frames++;

    if (currentTime >= this.lastTime + 1000) {
      this.metrics.fps = Math.round(
        (this.frames * 1000) / (currentTime - this.lastTime),
      );
      this.metrics.frameTime = Math.round(
        (currentTime - this.lastTime) / this.frames,
      );

      if (performance.memory) {
        this.metrics.memoryUsage = Math.round(
          performance.memory.usedJSHeapSize / 1048576,
        );
      }

      this.frames = 0;
      this.lastTime = currentTime;

      // Log if performance is poor
      if (this.metrics.fps < 30) {
        console.warn("Low FPS detected:", this.metrics.fps);
      }
    }

    requestAnimationFrame(() => this.measure());
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

// Initialize all TV optimizations
export function initTVOptimizations() {
  console.log("Initializing TV performance optimizations...");

  // Optimize focus transitions
  const cleanupFocus = optimizeFocusTransitions();

  // Simplify DOM
  simplifyDOM();

  // Set up performance monitoring
  const monitor = new PerformanceMonitor();
  monitor.start();

  // Log initial metrics
  setTimeout(() => {
    const metrics = monitor.getMetrics();
    console.log("TV Performance Metrics:", metrics);
  }, 2000);

  return () => {
    if (cleanupFocus) cleanupFocus();
    monitor.stop();
  };
}

// Export singleton instances
export const lazyImageLoader = new LazyImageLoader();
export const batchedDOM = new BatchedDOMUpdates();
export const memoryManager = new MemoryManager(50);
export const eventManager = new OptimizedEventManager();
export const performanceMonitor = new PerformanceMonitor();

// Made with Bob
