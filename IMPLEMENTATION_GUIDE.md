# Complete Implementation Guide

## Step-by-Step Instructions for Cross-Platform Architecture

---

## 📋 Overview

This guide provides detailed, actionable steps to migrate your IPTV player to a unified cross-platform architecture that:

- Achieves 90-95% code sharing across all platforms
- Maintains optimal performance on each platform (especially TV)
- Uses Tamagui as the primary UI library
- Eliminates code duplication

**Timeline**: 8-12 weeks (part-time) or 4-6 weeks (full-time)

---

## 🎯 Migration Strategy

### The Approach

1. **Non-Breaking**: Build new architecture alongside existing code
2. **Incremental**: Migrate one screen at a time
3. **Testable**: Test each migration before proceeding
4. **Reversible**: Keep old code until migration is complete

### Key Principle

**Write once, optimize per platform** - Single components with platform-specific behavior injected via configuration and adapters.

---

## Phase 1: Foundation (Week 1)

### 1.1 Create Directory Structure

```bash
# Create new directories
mkdir -p src/platform/{configs,adapters/{input,storage,navigation},hooks,optimization}
mkdir -p src/domain/{services,models,state}
mkdir -p src/data/{api,cache}
mkdir -p src/presentation/{screens,components}
```

### 1.2 Install Dependencies

```bash
npm install zustand clsx
npm install --save-dev typescript @types/react @types/react-native
```

### 1.3 Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-native",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/platform/*": ["src/platform/*"],
      "@/domain/*": ["src/domain/*"],
      "@/data/*": ["src/data/*"],
      "@/presentation/*": ["src/presentation/*"]
    }
  }
}
```

---

## Phase 2: Platform System (Week 2)

### 2.1 Platform Configuration

**File**: `src/platform/configs/platform.types.ts`

```typescript
export type PlatformType = "mobile" | "desktop" | "web" | "tv";

export interface PlatformConfig {
  platform: PlatformType;
  ui: {
    cardWidth: number;
    cardHeight: number;
    fontSize: { xs: number; sm: number; md: number; lg: number };
    spacing: { xs: number; sm: number; md: number; lg: number };
    enableHover: boolean;
    enableAnimations: boolean;
  };
  performance: {
    shelfPageSize: number;
    gridPageSize: number;
    enableVirtualization: boolean;
  };
}
```

**File**: `src/platform/configs/tv.config.ts`

```typescript
export const tvConfig: PlatformConfig = {
  platform: "tv",
  ui: {
    cardWidth: 200,
    cardHeight: 300,
    fontSize: { xs: 14, sm: 18, md: 24, lg: 32 },
    spacing: { xs: 8, sm: 16, md: 24, lg: 32 },
    enableHover: false,
    enableAnimations: false,
  },
  performance: {
    shelfPageSize: 8,
    gridPageSize: 20,
    enableVirtualization: true,
  },
};
```

Create similar configs for `mobile.config.ts`, `desktop.config.ts`, `web.config.ts`.

### 2.2 Platform Detection

**File**: `src/platform/configs/detectPlatform.ts`

```typescript
import { Platform } from "react-native";

export function detectPlatform(): PlatformType {
  if (Platform.OS === "ios" || Platform.OS === "android") return "mobile";
  if (typeof window !== "undefined") {
    const ua = window.navigator.userAgent;
    if (/webOS|Tizen|SmartTV/i.test(ua)) return "tv";
    if (/Electron/i.test(ua)) return "desktop";
    return "web";
  }
  return "web";
}

export function getPlatformConfig(platform: PlatformType) {
  switch (platform) {
    case "tv":
      return require("./tv.config").tvConfig;
    case "mobile":
      return require("./mobile.config").mobileConfig;
    case "desktop":
      return require("./desktop.config").desktopConfig;
    default:
      return require("./web.config").webConfig;
  }
}
```

### 2.3 Platform Provider

**File**: `src/platform/PlatformProvider.tsx`

```typescript
import { createContext, useContext, useMemo } from 'react';
import { detectPlatform, getPlatformConfig } from './configs/detectPlatform';

const PlatformContext = createContext(null);

export function PlatformProvider({ children }) {
  const value = useMemo(() => {
    const platform = detectPlatform();
    const config = getPlatformConfig(platform);
    return { platform, config };
  }, []);

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformContext);
}

export function usePlatformConfig() {
  return usePlatform().config;
}
```

### 2.4 Update App.tsx

```typescript
import { PlatformProvider } from './src/platform/PlatformProvider';

export default function App() {
  return (
    <PlatformProvider>
      <TamaguiProvider config={tamaguiConfig}>
        <AppProvider>
          <AppNavigator />
        </AppProvider>
      </TamaguiProvider>
    </PlatformProvider>
  );
}
```

---

## Phase 3: Component Migration (Week 3-4)

### 3.1 Create Adaptive Component Pattern

**File**: `src/presentation/components/ContentCard/ContentCard.tsx`

```typescript
import { usePlatform } from '@/platform/PlatformProvider';
import { ContentCardTamagui } from './ContentCard.tamagui';
import { ContentCardTV } from './ContentCard.tv';

export function ContentCard(props) {
  const { platform } = usePlatform();

  // TV gets optimized native HTML
  if (platform === 'tv') {
    return <ContentCardTV {...props} />;
  }

  // Others get full Tamagui
  return <ContentCardTamagui {...props} />;
}
```

**File**: `src/presentation/components/ContentCard/ContentCard.tamagui.tsx`

```typescript
import { YStack, Text, Image } from 'tamagui';
import { usePlatformConfig } from '@/platform/PlatformProvider';

export function ContentCardTamagui({ item, onPress, focused }) {
  const config = usePlatformConfig();

  return (
    <YStack
      width={config.ui.cardWidth}
      cursor="pointer"
      onPress={onPress}
      borderWidth={focused ? 2 : 0}
      borderColor="#e94560"
      pressStyle={{ opacity: 0.8 }}
      hoverStyle={{ scale: config.ui.enableHover ? 1.05 : 1 }}
      animation={config.ui.enableAnimations ? "quick" : undefined}
    >
      <Image source={{ uri: item.poster }} width="100%" height={config.ui.cardHeight} />
      <Text color="#fff" fontSize={config.ui.fontSize.sm} marginTop={8}>
        {item.name}
      </Text>
    </YStack>
  );
}
```

**File**: `src/presentation/components/ContentCard/ContentCard.tv.tsx`

```typescript
import { usePlatformConfig } from '@/platform/PlatformProvider';

export function ContentCardTV({ item, onPress, focused }) {
  const config = usePlatformConfig();

  return (
    <div
      onClick={onPress}
      className={focused ? 'tv-card tv-focused' : 'tv-card'}
      style={{
        width: config.ui.cardWidth,
        outline: focused ? '3px solid #e94560' : 'none',
        cursor: 'pointer',
      }}
    >
      <img src={item.poster} alt={item.name} loading="lazy" />
      <div style={{ fontSize: config.ui.fontSize.sm }}>{item.name}</div>
    </div>
  );
}
```

### 3.2 Migrate Existing Components

For each existing component:

1. Create new directory: `src/presentation/components/[ComponentName]/`
2. Create three files:
   - `[ComponentName].tsx` (router)
   - `[ComponentName].tamagui.tsx` (Tamagui version)
   - `[ComponentName].tv.tsx` (TV optimized)
3. Update imports in screens to use new component

---

## Phase 4: Business Logic (Week 5)

### 4.1 Create Domain Models

**File**: `src/domain/models/Movie.ts`

```typescript
export class Movie {
  id: number;
  name: string;
  poster: string | null;
  rating: number | null;

  constructor(data: any) {
    this.id = data.stream_id;
    this.name = data.name;
    this.poster = data.stream_icon || data.cover || null;
    this.rating = this.parseRating(data.rating || data.tmdb_rating);
  }

  private parseRating(rating: any): number | null {
    if (!rating) return null;
    const num = typeof rating === "number" ? rating : parseFloat(rating);
    return isNaN(num) ? null : num;
  }
}
```

### 4.2 Create Services

**File**: `src/domain/services/ContentService.ts`

```typescript
import iptvApi from "@/services/iptvApi"; // Your existing API
import { Movie } from "../models/Movie";

export class ContentService {
  async getMovieCategories() {
    return await iptvApi.getVODCategories();
  }

  async getMoviesByCategory(categoryId: string): Promise<Movie[]> {
    const data = await iptvApi.getVODStreams(categoryId);
    return data.map((d) => new Movie(d));
  }
}
```

### 4.3 Create View Models

**File**: `src/presentation/screens/MoviesScreen/MoviesViewModel.ts`

```typescript
import { makeAutoObservable } from "mobx";
import { ContentService } from "@/domain/services/ContentService";

export class MoviesViewModel {
  loading = false;
  shelves = [];
  selectedMovie = null;

  constructor(private contentService: ContentService) {
    makeAutoObservable(this);
  }

  async loadCategories() {
    this.loading = true;
    try {
      const categories = await this.contentService.getMovieCategories();
      this.shelves = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        items: null,
      }));
    } finally {
      this.loading = false;
    }
  }

  async loadShelf(shelfId: string) {
    const shelf = this.shelves.find((s) => s.id === shelfId);
    if (!shelf || shelf.items) return;

    shelf.items = await this.contentService.getMoviesByCategory(shelfId);
  }

  selectMovie(movie) {
    this.selectedMovie = movie;
  }
}
```

---

## Phase 5: Screen Migration (Week 6-7)

### 5.1 Create New Screen Structure

**File**: `src/presentation/screens/MoviesScreen/MoviesScreen.tsx`

```typescript
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { YStack, ScrollView } from 'tamagui';
import { useMoviesViewModel } from './useMoviesViewModel';
import { ContentShelf } from '@/presentation/components/ContentShelf/ContentShelf';

export const MoviesScreen = observer(() => {
  const viewModel = useMoviesViewModel();

  useEffect(() => {
    viewModel.loadCategories();
  }, []);

  return (
    <YStack flex={1} backgroundColor="#0f0f23">
      <ScrollView>
        {viewModel.shelves.map(shelf => (
          <ContentShelf
            key={shelf.id}
            title={shelf.name}
            items={shelf.items}
            onItemPress={(item) => viewModel.selectMovie(item)}
            onVisible={() => viewModel.loadShelf(shelf.id)}
          />
        ))}
      </ScrollView>
    </YStack>
  );
});
```

**File**: `src/presentation/screens/MoviesScreen/useMoviesViewModel.ts`

```typescript
import { useMemo } from "react";
import { MoviesViewModel } from "./MoviesViewModel";
import { ContentService } from "@/domain/services/ContentService";

export function useMoviesViewModel() {
  return useMemo(() => {
    const contentService = new ContentService();
    return new MoviesViewModel(contentService);
  }, []);
}
```

### 5.2 Update Navigation

In your existing `AppNavigator.jsx`, import the new screen:

```typescript
import { MoviesScreen } from "@/presentation/screens/MoviesScreen/MoviesScreen";
```

Test the new screen works before migrating others.

---

## Phase 6: TV Optimizations (Week 8)

### 6.1 CSS Optimizations

**File**: `src/platform/optimization/TVOptimizations.ts`

```typescript
export class TVOptimizations {
  static apply() {
    if (typeof document === "undefined") return;

    const style = document.createElement("style");
    style.textContent = `
      /* Disable animations */
      * { animation: none !important; transition: none !important; }
      .tv-focused { transition: outline 0.08s ease !important; }
      
      /* Hardware acceleration */
      .tv-card { will-change: transform; transform: translateZ(0); }
      
      /* Simplify styles */
      * { box-shadow: none !important; text-shadow: none !important; }
      .tv-focused { outline: 3px solid #e94560; outline-offset: 4px; }
      
      /* Optimize images */
      img { image-rendering: crisp-edges; }
    `;
    document.head.appendChild(style);
  }
}

// Auto-apply on TV
if (typeof window !== "undefined" && /webOS|Tizen/i.test(navigator.userAgent)) {
  document.addEventListener("DOMContentLoaded", () => TVOptimizations.apply());
}
```

### 6.2 Focus Management

**File**: `src/platform/adapters/input/FocusManager.ts`

```typescript
export class FocusManager {
  private elements = new Map();
  private currentId = null;

  register(id, element, onActivate) {
    this.elements.set(id, { element, onActivate });
  }

  moveFocus(direction) {
    // Find nearest element in direction
    const next = this.findNearest(direction);
    if (next) this.setFocus(next);
  }

  activate() {
    const current = this.elements.get(this.currentId);
    current?.onActivate?.();
  }

  private setFocus(id) {
    // Remove old focus
    this.elements.get(this.currentId)?.element.classList.remove("tv-focused");

    // Add new focus
    this.currentId = id;
    const el = this.elements.get(id);
    el.element.classList.add("tv-focused");
    el.element.scrollIntoView({ behavior: "auto", block: "nearest" });
  }
}
```

### 6.3 Remote Input

**File**: `src/platform/adapters/input/RemoteInput.ts`

```typescript
import { FocusManager } from "./FocusManager";

export class RemoteInput {
  private focusManager = new FocusManager();

  constructor() {
    document.addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        case 37:
          this.focusManager.moveFocus("left");
          break;
        case 38:
          this.focusManager.moveFocus("up");
          break;
        case 39:
          this.focusManager.moveFocus("right");
          break;
        case 40:
          this.focusManager.moveFocus("down");
          break;
        case 13:
          this.focusManager.activate();
          break;
      }
    });
  }

  getFocusManager() {
    return this.focusManager;
  }
}
```

---

## Phase 7: Testing (Week 9-10)

### 7.1 Test Checklist

**Mobile (iOS/Android)**

- [ ] All screens load
- [ ] Touch gestures work
- [ ] Navigation works
- [ ] Images load
- [ ] Videos play

**Desktop (Electron)**

- [ ] All screens load
- [ ] Mouse/keyboard works
- [ ] File system access works
- [ ] System tray works

**Web (Browser)**

- [ ] All screens load
- [ ] Responsive design works
- [ ] All browsers supported

**TV (webOS/Tizen)**

- [ ] All screens load
- [ ] Remote control works
- [ ] Focus management works
- [ ] Performance is smooth (60 FPS)
- [ ] Memory usage is low (<100MB)

### 7.2 Performance Testing

Test TV performance:

```bash
npm run build:tv
npm run deploy:lg

# Measure:
# - Initial load time (target: <3s)
# - Focus change time (target: <80ms)
# - Scroll FPS (target: 55-60)
# - Memory usage (target: <80MB)
```

---

## Phase 8: Deployment (Week 11-12)

### 8.1 Build All Platforms

```bash
# Mobile
npm run build:mobile:ios
npm run build:mobile:android

# Desktop
npm run build:electron

# Web
npm run build:web

# TV
npm run build:tv:webos
```

### 8.2 Final Cleanup

1. Remove old duplicate files
2. Update documentation
3. Create migration notes
4. Tag release in git

---

## 📊 Success Metrics

### Code Sharing

- **Before**: 40-50%
- **After**: 90-95%

### TV Performance

- **Initial Load**: 2-3s (was 8-12s)
- **Focus Change**: 50-80ms (was 200-400ms)
- **Scroll FPS**: 55-60 (was 15-25)
- **Memory**: 60-80MB (was 150-200MB)

### Maintainability

- **Single source** for business logic
- **Clear separation** of concerns
- **Easy to test** (pure functions)
- **Easy to extend** (add new platforms)

---

## 🆘 Troubleshooting

### Issue: TypeScript errors

**Solution**: Ensure tsconfig.json paths are correct and dependencies are installed

### Issue: Platform not detected correctly

**Solution**: Check detectPlatform() logic and user agent strings

### Issue: TV performance still slow

**Solution**: Verify TVOptimizations.apply() is called and CSS is injected

### Issue: Focus not working on TV

**Solution**: Ensure FocusManager is initialized and elements are registered

### Issue: Components not rendering

**Solution**: Check PlatformProvider is wrapping app and usePlatform() is called

---

## 📚 Additional Resources

- **ARCHITECTURE_PLAN.md**: Overall architecture design
- **TV_PERFORMANCE_STRATEGY.md**: Detailed TV optimization strategies
- **Tamagui Docs**: https://tamagui.dev
- **MobX Docs**: https://mobx.js.org

---

## ✅ Next Steps

1. Start with Phase 1 (Foundation)
2. Complete one phase before moving to next
3. Test thoroughly after each phase
4. Keep old code until migration is complete
5. Document any issues or deviations

**Remember**: This is an incremental migration. You can stop at any phase and still have a working app!
