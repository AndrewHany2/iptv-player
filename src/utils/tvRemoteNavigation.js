/**
 * TV Remote Navigation System
 * Handles D-pad navigation (Up, Down, Left, Right, Enter, Back)
 * for TV remote controls on webOS, Tizen, and other Smart TV platforms
 */

export class TVRemoteNavigation {
  constructor() {
    this.focusableElements = [];
    this.currentFocusIndex = 0;
    this.isActive = false;
    this.keyHandler = null;
    this.focusClass = "tv-focused";
    this.navigationMode = "auto"; // 'auto', 'grid', 'list', 'horizontal'
    this.gridColumns = 4;
  }

  /**
   * Initialize TV remote navigation
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    this.focusClass = options.focusClass || "tv-focused";
    this.navigationMode = options.mode || "auto";
    this.gridColumns = options.gridColumns || 4;

    this.updateFocusableElements();
    this.attachKeyboardListener();
    this.isActive = true;

    // Focus first element
    if (this.focusableElements.length > 0) {
      this.setFocus(0);
    }
  }

  /**
   * Clean up and remove listeners
   */
  destroy() {
    this.isActive = false;
    this.removeFocus();
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
  }

  /**
   * Update the list of focusable elements
   */
  updateFocusableElements() {
    // Find all focusable elements
    const selector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
      ".tv-focusable:not(.tv-disabled)",
    ].join(", ");

    this.focusableElements = Array.from(
      document.querySelectorAll(selector),
    ).filter((el) => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        el.offsetParent !== null
      );
    });
  }

  /**
   * Attach keyboard event listener for TV remote
   */
  attachKeyboardListener() {
    this.keyHandler = (e) => {
      if (!this.isActive) return;

      const key = e.key || e.keyCode;
      let handled = false;

      // Map key codes to actions
      switch (key) {
        case "ArrowUp":
        case 38:
          handled = this.navigateUp();
          break;
        case "ArrowDown":
        case 40:
          handled = this.navigateDown();
          break;
        case "ArrowLeft":
        case 37:
          handled = this.navigateLeft();
          break;
        case "ArrowRight":
        case 39:
          handled = this.navigateRight();
          break;
        case "Enter":
        case 13:
          handled = this.handleEnter();
          break;
        case "Escape":
        case 27:
        case 461: // webOS back button
        case 10009: // Tizen back button
          handled = this.handleBack();
          break;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("keydown", this.keyHandler);
  }

  /**
   * Navigate up
   */
  navigateUp() {
    this.updateFocusableElements();

    if (this.navigationMode === "grid") {
      return this.navigateGridUp();
    } else if (this.navigationMode === "list") {
      return this.navigatePrevious();
    } else {
      // Auto mode: find element above
      return this.navigateDirection("up");
    }
  }

  /**
   * Navigate down
   */
  navigateDown() {
    this.updateFocusableElements();

    if (this.navigationMode === "grid") {
      return this.navigateGridDown();
    } else if (this.navigationMode === "list") {
      return this.navigateNext();
    } else {
      // Auto mode: find element below
      return this.navigateDirection("down");
    }
  }

  /**
   * Navigate left
   */
  navigateLeft() {
    this.updateFocusableElements();

    if (
      this.navigationMode === "horizontal" ||
      this.navigationMode === "grid"
    ) {
      return this.navigatePrevious();
    } else {
      return this.navigateDirection("left");
    }
  }

  /**
   * Navigate right
   */
  navigateRight() {
    this.updateFocusableElements();

    if (
      this.navigationMode === "horizontal" ||
      this.navigationMode === "grid"
    ) {
      return this.navigateNext();
    } else {
      return this.navigateDirection("right");
    }
  }

  /**
   * Navigate to previous element
   */
  navigatePrevious() {
    if (this.focusableElements.length === 0) return false;

    const newIndex = this.currentFocusIndex - 1;
    if (newIndex >= 0) {
      this.setFocus(newIndex);
      return true;
    }
    return false;
  }

  /**
   * Navigate to next element
   */
  navigateNext() {
    if (this.focusableElements.length === 0) return false;

    const newIndex = this.currentFocusIndex + 1;
    if (newIndex < this.focusableElements.length) {
      this.setFocus(newIndex);
      return true;
    }
    return false;
  }

  /**
   * Navigate in grid (up)
   */
  navigateGridUp() {
    const newIndex = this.currentFocusIndex - this.gridColumns;
    if (newIndex >= 0) {
      this.setFocus(newIndex);
      return true;
    }
    return false;
  }

  /**
   * Navigate in grid (down)
   */
  navigateGridDown() {
    const newIndex = this.currentFocusIndex + this.gridColumns;
    if (newIndex < this.focusableElements.length) {
      this.setFocus(newIndex);
      return true;
    }
    return false;
  }

  /**
   * Navigate in a specific direction (spatial navigation)
   */
  navigateDirection(direction) {
    if (this.focusableElements.length === 0) return false;

    const currentEl = this.focusableElements[this.currentFocusIndex];
    if (!currentEl) return false;

    const currentRect = currentEl.getBoundingClientRect();
    let bestElement = null;
    let bestDistance = Infinity;
    let bestIndex = -1;

    this.focusableElements.forEach((el, index) => {
      if (index === this.currentFocusIndex) return;

      const rect = el.getBoundingClientRect();
      const isInDirection = this.isInDirection(currentRect, rect, direction);

      if (isInDirection) {
        const distance = this.calculateDistance(currentRect, rect, direction);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestElement = el;
          bestIndex = index;
        }
      }
    });

    if (bestElement) {
      this.setFocus(bestIndex);
      return true;
    }

    return false;
  }

  /**
   * Check if target is in the specified direction from source
   */
  isInDirection(sourceRect, targetRect, direction) {
    const threshold = 10; // pixels of overlap tolerance

    switch (direction) {
      case "up":
        return targetRect.bottom <= sourceRect.top + threshold;
      case "down":
        return targetRect.top >= sourceRect.bottom - threshold;
      case "left":
        return targetRect.right <= sourceRect.left + threshold;
      case "right":
        return targetRect.left >= sourceRect.right - threshold;
      default:
        return false;
    }
  }

  /**
   * Calculate distance between two elements in a direction
   */
  calculateDistance(sourceRect, targetRect, direction) {
    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    let primaryDistance, secondaryDistance;

    switch (direction) {
      case "up":
      case "down":
        primaryDistance = Math.abs(targetCenterY - sourceCenterY);
        secondaryDistance = Math.abs(targetCenterX - sourceCenterX);
        break;
      case "left":
      case "right":
        primaryDistance = Math.abs(targetCenterX - sourceCenterX);
        secondaryDistance = Math.abs(targetCenterY - sourceCenterY);
        break;
      default:
        return Infinity;
    }

    // Weight primary direction more heavily
    return primaryDistance + secondaryDistance * 0.3;
  }

  /**
   * Handle Enter key press
   */
  handleEnter() {
    const currentEl = this.focusableElements[this.currentFocusIndex];
    if (currentEl) {
      currentEl.click();
      return true;
    }
    return false;
  }

  /**
   * Handle Back button press
   */
  handleBack() {
    // Dispatch custom event for back button
    const event = new CustomEvent("tvback", { bubbles: true });
    document.dispatchEvent(event);
    return true;
  }

  /**
   * Set focus to element at index
   */
  setFocus(index) {
    this.removeFocus();

    if (index >= 0 && index < this.focusableElements.length) {
      this.currentFocusIndex = index;
      const element = this.focusableElements[index];

      element.classList.add(this.focusClass);
      element.focus();

      // Scroll into view if needed
      element.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });

      // Dispatch custom event
      const event = new CustomEvent("tvfocus", {
        detail: { element, index },
        bubbles: true,
      });
      element.dispatchEvent(event);
    }
  }

  /**
   * Remove focus from current element
   */
  removeFocus() {
    const currentEl = this.focusableElements[this.currentFocusIndex];
    if (currentEl) {
      currentEl.classList.remove(this.focusClass);
    }
  }

  /**
   * Set navigation mode
   */
  setMode(mode, options = {}) {
    this.navigationMode = mode;
    if (options.gridColumns) {
      this.gridColumns = options.gridColumns;
    }
  }

  /**
   * Focus specific element
   */
  focusElement(element) {
    const index = this.focusableElements.indexOf(element);
    if (index !== -1) {
      this.setFocus(index);
    }
  }

  /**
   * Focus first element
   */
  focusFirst() {
    this.updateFocusableElements();
    if (this.focusableElements.length > 0) {
      this.setFocus(0);
    }
  }

  /**
   * Focus last element
   */
  focusLast() {
    this.updateFocusableElements();
    if (this.focusableElements.length > 0) {
      this.setFocus(this.focusableElements.length - 1);
    }
  }
}

// Create singleton instance
export const tvRemoteNav = new TVRemoteNavigation();

// Export helper hook for React components
export function useTVRemoteNavigation(options = {}) {
  const init = () => {
    tvRemoteNav.init(options);
  };

  const destroy = () => {
    tvRemoteNav.destroy();
  };

  const setMode = (mode, modeOptions) => {
    tvRemoteNav.setMode(mode, modeOptions);
  };

  const updateElements = () => {
    tvRemoteNav.updateFocusableElements();
  };

  return {
    init,
    destroy,
    setMode,
    updateElements,
    focusFirst: () => tvRemoteNav.focusFirst(),
    focusLast: () => tvRemoteNav.focusLast(),
    focusElement: (el) => tvRemoteNav.focusElement(el),
  };
}

// Made with Bob
