# TV Remote Navigation Implementation Guide

## Overview

This guide explains how to implement TV remote control navigation (D-pad) for all screens in the IPTV player app.

## Features

- **D-pad Navigation**: Arrow keys (Up, Down, Left, Right)
- **Enter Key**: Select/activate focused element
- **Back Button**: Navigate back (Escape, webOS 461, Tizen 10009)
- **Spatial Navigation**: Automatically finds nearest element in direction
- **Grid Navigation**: Optimized for poster grids
- **List Navigation**: Optimized for vertical lists
- **Visual Feedback**: Red outline and scale effect on focused elements
- **Smooth Scrolling**: Auto-scroll to keep focused element visible

## Quick Start

### 1. Import the Hook

```javascript
import { useTVRemoteNavigation } from "../utils/tvRemoteNavigation";
import "../styles/tvRemoteFocus.css";
```

### 2. Initialize in Component

```javascript
export default function YourScreen({ navigation }) {
  const tvNav = useTVRemoteNavigation();

  useEffect(() => {
    // Initialize with mode
    tvNav.init({
      mode: 'auto', // 'auto', 'grid', 'list', 'horizontal'
      gridColumns: 4 // for grid mode
    });

    // Handle back button
    const handleBack = () => {
      // Your back logic
      navigation.goBack();
    };

    document.addEventListener('tvback', handleBack);

    return () => {
      tvNav.destroy();
      document.removeEventListener('tvback', handleBack);
    };
  }, []);

  // Update when content changes
  useEffect(() => {
    setTimeout(() => tvNav.updateElements(), 100);
  }, [yourStateVariable]);

  return (
    // Your JSX
  );
}
```

## Navigation Modes

### Auto Mode (Default)

Spatial navigation - finds nearest element in pressed direction.

```javascript
tvNav.init({ mode: "auto" });
```

**Best for**: Mixed layouts, complex UIs

### Grid Mode

Navigates in a grid pattern with fixed columns.

```javascript
tvNav.init({
  mode: "grid",
  gridColumns: 4,
});
```

**Best for**: Poster grids, image galleries

### List Mode

Vertical list navigation (Up/Down only).

```javascript
tvNav.init({ mode: "list" });
```

**Best for**: Settings lists, account lists, episode lists

### Horizontal Mode

Horizontal navigation (Left/Right only).

```javascript
tvNav.init({ mode: "horizontal" });
```

**Best for**: Shelves, carousels, tabs

## Making Elements Focusable

Elements are automatically focusable if they are:

- `<button>` (not disabled)
- `<a>` with href
- `<input>`, `<select>`, `<textarea>` (not disabled)
- Elements with `tabindex` (not -1)
- Elements with class `tv-focusable` (not `tv-disabled`)

### Example

```jsx
<button onClick={handleClick}>
  Click Me
</button>

<div className="tv-focusable" onClick={handleClick}>
  Custom Focusable
</div>

<div className="tv-focusable tv-disabled">
  Disabled (not focusable)
</div>
```

## Focus Styles

The `.tv-focused` class is automatically applied to the focused element.

### Default Focus Style

```css
.tv-focused {
  outline: 3px solid #e50914;
  outline-offset: 4px;
  box-shadow: 0 0 0 6px rgba(229, 9, 20, 0.3);
  transform: scale(1.05);
  z-index: 10;
}
```

### Custom Focus Styles

Override for specific elements:

```css
.my-custom-element.tv-focused {
  outline-color: blue;
  transform: scale(1.1);
}
```

## Complete Example: Movies Screen

```javascript
import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useTVRemoteNavigation } from "../utils/tvRemoteNavigation";
import "../styles/tvRemoteFocus.css";
import "./MoviesScreen.tv.css";

export default function MoviesScreenTV({ navigation }) {
  const { users, activeUserId, playVideo } = useApp();
  const [currentView, setCurrentView] = useState("shelves"); // 'shelves', 'category', 'detail'
  const tvNav = useTVRemoteNavigation();

  // Initialize TV navigation
  useEffect(() => {
    tvNav.init({ mode: "auto" });

    const handleBack = () => {
      if (currentView === "detail") {
        setCurrentView("category");
      } else if (currentView === "category") {
        setCurrentView("shelves");
      } else {
        navigation.goBack();
      }
    };

    document.addEventListener("tvback", handleBack);

    return () => {
      tvNav.destroy();
      document.removeEventListener("tvback", handleBack);
    };
  }, [currentView]);

  // Update focusable elements when view changes
  useEffect(() => {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      tvNav.updateElements();

      // Change mode based on view
      if (currentView === "category") {
        tvNav.setMode("grid", { gridColumns: 5 });
      } else {
        tvNav.setMode("auto");
      }
    }, 100);
  }, [currentView]);

  return <div className="tv-screen">{/* Your content */}</div>;
}
```

## Advanced Features

### Manual Focus Control

```javascript
// Focus first element
tvNav.focusFirst();

// Focus last element
tvNav.focusLast();

// Focus specific element
const element = document.querySelector(".my-element");
tvNav.focusElement(element);
```

### Change Mode Dynamically

```javascript
// Switch to grid mode
tvNav.setMode("grid", { gridColumns: 4 });

// Switch to list mode
tvNav.setMode("list");
```

### Listen to Focus Events

```javascript
useEffect(() => {
  const handleFocus = (e) => {
    console.log("Focused element:", e.detail.element);
    console.log("Focus index:", e.detail.index);
  };

  document.addEventListener("tvfocus", handleFocus);

  return () => {
    document.removeEventListener("tvfocus", handleFocus);
  };
}, []);
```

## Platform-Specific Key Codes

The navigation system handles multiple key codes for different platforms:

| Action | Standard        | webOS | Tizen |
| ------ | --------------- | ----- | ----- |
| Up     | ArrowUp (38)    | 38    | 38    |
| Down   | ArrowDown (40)  | 40    | 40    |
| Left   | ArrowLeft (37)  | 37    | 37    |
| Right  | ArrowRight (39) | 39    | 39    |
| Enter  | Enter (13)      | 13    | 13    |
| Back   | Escape (27)     | 461   | 10009 |

## Best Practices

### 1. Initialize Early

Initialize TV navigation in the first `useEffect` to ensure it's ready before user interaction.

### 2. Update on Content Changes

Call `tvNav.updateElements()` whenever your content changes (new items loaded, view switched, etc.).

### 3. Clean Up

Always call `tvNav.destroy()` in the cleanup function to remove event listeners.

### 4. Use Appropriate Modes

- **Shelves**: `auto` mode
- **Grids**: `grid` mode with correct column count
- **Lists**: `list` mode
- **Horizontal scrolling**: `horizontal` mode

### 5. Handle Back Button

Always implement back button handling for proper navigation flow.

### 6. Test on Real Devices

Test on actual TV hardware (webOS, Tizen) as behavior may differ from browser.

## Troubleshooting

### Focus Not Working

1. Check if elements are focusable (button, input, or `.tv-focusable`)
2. Ensure elements are visible (not `display: none`)
3. Call `tvNav.updateElements()` after content loads

### Wrong Navigation Direction

1. Verify navigation mode is appropriate for your layout
2. Check element positioning (spatial navigation uses getBoundingClientRect)
3. Try switching to a different mode

### Back Button Not Working

1. Ensure you're listening to `tvback` event
2. Check platform-specific key codes are handled
3. Verify event listener is attached before user interaction

### Focus Styles Not Showing

1. Import `tvRemoteFocus.css`
2. Check CSS specificity (may need `!important`)
3. Verify `.tv-focused` class is being applied

## Integration Checklist

- [ ] Import `useTVRemoteNavigation` hook
- [ ] Import `tvRemoteFocus.css` styles
- [ ] Initialize in `useEffect` with appropriate mode
- [ ] Handle back button with `tvback` event
- [ ] Update elements on content changes
- [ ] Clean up in return function
- [ ] Test all navigation directions
- [ ] Test Enter key activation
- [ ] Test Back button navigation
- [ ] Verify focus styles are visible
- [ ] Test on actual TV hardware

## Example Implementations

All TV screens have been updated with remote navigation:

- ✅ `MoviesScreen.tv.jsx` - Auto mode with grid for categories
- ✅ `SeriesScreen.tv.jsx` - Auto mode with list for episodes
- ✅ `LiveTVScreen.tv.jsx` - Grid mode for channels
- ✅ `HistoryScreen.tv.jsx` - List mode for history items
- ✅ `AccountsScreen.tv.jsx` - List mode for accounts

Refer to these files for complete working examples.
