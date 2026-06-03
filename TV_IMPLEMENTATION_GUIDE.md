# TV Native HTML Implementation Guide

## ✅ Completed

- Movies Screen (MoviesScreen.tv.jsx + CSS)
- TV optimization utilities
- Image proxy system
- Performance configurations

## 📋 Remaining Screens to Convert

### 1. Series Screen

**File:** `src/screens/SeriesScreen.tv.jsx` + `SeriesScreen.tv.css`

**Key Changes:**

- Copy structure from MoviesScreen.tv.jsx
- Replace movie-specific logic with series logic
- Use `iptvApi.getSeriesCategories()` and `iptvApi.getSeries()`
- Handle seasons/episodes in detail view
- Same poster card component (reusable)

**Implementation:**

```javascript
// Similar to MoviesScreen.tv.jsx but with:
- getSeries() instead of getVODStreams()
- Handle series_id instead of stream_id
- Add season/episode selection in detail view
```

### 2. LiveTV Screen

**File:** `src/screens/LiveTVScreen.tv.jsx` + `LiveTVScreen.tv.css`

**Key Changes:**

- Use channel cards instead of posters
- Show channel logos (smaller, 40x40px)
- Display EPG info if available
- Simpler layout (list view works better for channels)
- Add favorites toggle

**Implementation:**

```javascript
// Channel Card Component
function ChannelCard({ item, onPress }) {
  return (
    <div className="tv-channel-card" onClick={() => onPress(item)}>
      <div className="tv-channel-logo">
        {item.logo ? (
          <img src={item.logo} alt={item.name} />
        ) : (
          <div className="tv-channel-abbrev">{getAbbrev(item.name)}</div>
        )}
      </div>
      <div className="tv-channel-info">
        <div className="tv-channel-name">{item.name}</div>
        {epg && <div className="tv-channel-epg">{epg.title}</div>}
      </div>
      <button className="tv-channel-fav">♥</button>
    </div>
  );
}
```

### 3. History/My List Screen

**File:** `src/screens/HistoryScreen.tv.jsx` + `HistoryScreen.tv.css`

**Key Changes:**

- Show watch history and favorites
- Group by type (movies, series, live)
- Show progress bars for partially watched content
- Resume playback functionality

**Implementation:**

```javascript
// History Item Component
function HistoryItem({ item, onPress, onRemove }) {
  const progress = (item.currentTime / item.duration) * 100;

  return (
    <div className="tv-history-item" onClick={() => onPress(item)}>
      <div className="tv-history-poster">
        <img src={item.cover} alt={item.name} />
        {progress > 0 && (
          <div className="tv-history-progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="tv-history-info">
        <div className="tv-history-name">{item.name}</div>
        <div className="tv-history-type">{item.type}</div>
      </div>
      <button
        className="tv-history-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item);
        }}
      >
        ×
      </button>
    </div>
  );
}
```

## 🎨 Shared CSS Patterns

### Common Styles (create `src/screens/tv-common.css`)

```css
/* Reusable TV styles */
.tv-screen {
  width: 100%;
  height: 100vh;
  background-color: #0f0f23;
  color: #fff;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  overflow: hidden;
}

.tv-btn {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.1s;
  font-family: inherit;
}

.tv-btn:hover {
  opacity: 0.9;
}
.tv-btn:active {
  opacity: 0.85;
}

.tv-btn-primary {
  background: #e94560;
  color: #fff;
}

.tv-btn-secondary {
  background: rgba(40, 40, 60, 0.85);
  color: #fff;
  border: 1px solid #3a3a5e;
}

.tv-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #2a2a4e;
  border-top-color: #e94560;
  border-radius: 50%;
  animation: tv-spin 0.8s linear infinite;
}

@keyframes tv-spin {
  to {
    transform: rotate(360deg);
  }
}
```

## 🔧 Update Navigator

Update `src/navigation/AppNavigator.web.jsx`:

```javascript
import LiveTVScreenWeb from "../screens/LiveTVScreen.web";
import LiveTVScreenTV from "../screens/LiveTVScreen.tv";
import SeriesScreenWeb from "../screens/SeriesScreen.web";
import SeriesScreenTV from "../screens/SeriesScreen.tv";
import HistoryScreenWeb from "../screens/HistoryScreen.web";
import HistoryScreenTV from "../screens/HistoryScreen.tv";
import { isTV } from "../utils/tvOptimizations";

const LiveTVScreen = isTV ? LiveTVScreenTV : LiveTVScreenWeb;
const SeriesScreen = isTV ? SeriesScreenTV : SeriesScreenWeb;
const HistoryScreen = isTV ? HistoryScreenTV : HistoryScreenWeb;
```

## 📝 Implementation Checklist

### For Each Screen:

- [ ] Create `.tv.jsx` file with native HTML/React
- [ ] Create `.tv.css` file with optimized styles
- [ ] Use native `<button>` elements
- [ ] Use native `<img>` tags
- [ ] Implement loading states
- [ ] Add error handling
- [ ] Test on TV hardware
- [ ] Update navigator imports

### Performance Guidelines:

1. **No Tamagui** - Pure HTML/CSS only
2. **Native Elements** - Use `<button>`, `<img>`, `<div>`
3. **CSS Transitions** - Keep under 0.2s
4. **Lazy Loading** - Use IntersectionObserver
5. **Virtual Scrolling** - Load 20-40 items at a time
6. **Direct Images** - No proxy (already handled)
7. **Minimal State** - Reduce React re-renders

### CSS Performance Tips:

```css
/* Good - Hardware accelerated */
.element {
  transform: translateX(10px);
  opacity: 0.9;
}

/* Bad - Causes reflow */
.element {
  left: 10px;
  width: calc(100% - 20px);
}

/* Good - Simple transitions */
.button {
  transition: opacity 0.1s;
}

/* Bad - Complex transitions */
.button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 🚀 Quick Start Template

Use this template for any new TV screen:

```javascript
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import "./ScreenName.tv.css";

export default function ScreenNameTV({ navigation }) {
  const { users, activeUserId } = useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (activeUserId) load();
  }, [activeUserId]);

  const load = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    setLoading(true);
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      const result = await iptvApi.getSomeData();
      setData(result || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="tv-screen">
        <div className="tv-loading">
          <div className="tv-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-screen">
      <div className="tv-content">{/* Your content here */}</div>
    </div>
  );
}
```

## 📊 Expected Performance

After converting all screens:

| Screen  | Load Time | Button Response | Scroll FPS |
| ------- | --------- | --------------- | ---------- |
| Movies  | 2-3s      | <50ms           | 30-45fps   |
| Series  | 2-3s      | <50ms           | 30-45fps   |
| LiveTV  | 1-2s      | <50ms           | 45-60fps   |
| History | <1s       | <50ms           | 45-60fps   |

## 🎯 Priority Order

1. **LiveTV** (most used, simplest)
2. **Series** (similar to Movies)
3. **History** (least complex)

## 💡 Tips

- Reuse CSS classes across screens
- Keep components simple (no complex state)
- Test on actual TV hardware frequently
- Use Chrome DevTools with CPU throttling
- Monitor memory usage
- Profile with React DevTools

## 🐛 Common Issues

**Issue:** Images still slow
**Fix:** Ensure using native `<img>` not React Native Image

**Issue:** Buttons still laggy
**Fix:** Use native `<button>` with onClick, not Tamagui

**Issue:** Scrolling janky
**Fix:** Use `will-change: transform` sparingly, remove animations

**Issue:** Memory leaks
**Fix:** Clean up event listeners in useEffect cleanup

## ✅ Testing Checklist

- [ ] Buttons respond instantly (<50ms)
- [ ] Images load without lag
- [ ] Scrolling is smooth (30+ fps)
- [ ] No console errors
- [ ] Memory usage stable
- [ ] Works with remote control
- [ ] Keyboard navigation works
- [ ] Back button functions correctly

## 📚 Resources

- Movies Screen: `src/screens/MoviesScreen.tv.jsx` (reference implementation)
- CSS Styles: `src/screens/MoviesScreen.tv.css` (reference styles)
- Utilities: `src/utils/tvOptimizations.js`
- Navigator: `src/navigation/AppNavigator.web.jsx`
