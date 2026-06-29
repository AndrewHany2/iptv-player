# TV Aurora Refresh — Design

**Date:** 2026-06-29
**Branch:** `aurora-cinematic`
**Status:** Approved design, pending implementation plan
**Related:** [`2026-06-29-aurora-cinematic-design.md`](./2026-06-29-aurora-cinematic-design.md) (web/native Aurora), [`2026-06-29-resilient-player-design.md`](./2026-06-29-resilient-player-design.md) (the player being restyled)

## Goal

Bring the **Aurora Cinematic** visual identity (already shipped on web/native) to the **TV** screens, translated into **performance-cheap, TV-safe primitives**. This is a visual refresh that keeps current layouts; it is **not** a layout restructure and **not** a color overhaul (the TV palette is already Aurora-colored). The single biggest win is a **consistent, high-visibility focus treatment** suited to a 10-foot remote-driven UI.

A secondary, explicit goal: **honor the TV performance budget** — the budget that [`tvl.css`](../../../src/styles/tvl.css) already promises in its header but quietly violates today.

## Context & Constraints

- **TV is the web build.** `npm run build:tv` runs `expo export --platform web` into `tv/dist`, then `tv/patch-index.js` babel-transpiles the bundle (template literals, optional chaining, nullish coalescing, logical-assignment) down for **old webOS / Tizen Chromium**.
- **Screen variant swap.** `usePlatform()` returns `isTV` (UA: `webOS|Web0S|Tizen|SmartTV`, or `globalThis.__TV__`). [`AppNavigator.web.jsx`](../../../src/navigation/AppNavigator.web.jsx) selects `.tv.jsx` screen variants when `_isTV`: Live, Movies, Series, History, Accounts.
- **Styling today.** Shared base [`src/styles/tvl.css`](../../../src/styles/tvl.css) + per-screen `*.tv.css`. Header states the budget: *"No transitions · No transforms · No gradients · No hover · No shadows."* Remote nav is custom `keydown` handling + `FocusManager`; grids use `VirtualGridTV`; there is an LRU `MemoryManager` and `TVOptimizations`.
- **Palette is already Aurora.** `#0A0E1A` bg, `#6C5CE7` indigo, `#22D3EE` cyan, `#141A2E`/`#1B2236` surfaces, `#28324E` border, `#EAF0FF`/`#B8C0DA`/`#7A86A8` text. So the work is consistency + hierarchy + focus + token extraction + perf enforcement, **not** recoloring.
- **Existing budget violations to fix:** `box-shadow` on `.tvl-det-hero-thumb` ([tvl.css:290](../../../src/styles/tvl.css#L290)); a `border-color 0.15s` transition in [SeriesScreen.tv.css:81](../../../src/screens/SeriesScreen.tv.css#L81); audit gradient fills used as backgrounds (the hairline gradient is the one sanctioned exception).
- **Player is shared.** The TV video player is [`VideoPlayerScreen.web.jsx`](../../../src/screens/VideoPlayerScreen.web.jsx), used for both web and TV. It already branches heavily on `isTV` (a dedicated render branch at line 1536; remote-key handling at lines 1135–1256) and is styled entirely with inline `style={}` objects (zero CSS classes) using design tokens.

## Decisions (from brainstorming)

1. **Goal:** visual identity match — TV-safe Aurora, current layouts kept.
2. **Scope:** all five TV screens (Live, Movies, Series, History, Accounts) + the TV nav chrome + the player's TV UI.
3. **Perf budget:** **stay strict** — no transitions, transforms, blur/backdrop-filter, or box-shadow on TV. Express Aurora via color, the gradient hairline, borders/outlines, and typography. Focus = instant swap.
4. **Player:** **restyle the TV UI, keep every feature.** Only the `isTV` branch + TV control overlay are retouched; all playback logic, remote handling, resume, recovery, and the `!isTV` web path are untouched.
5. **Approach:** Approach A (shared token foundation) + Approach C focus upgrade. Focus indicator = **cyan border + outline + tint fill + brighter text**, unified across every focusable element.

## Architecture

### 1. Foundation — `--aurora-*` CSS variable layer

Define the full TV-safe system once as CSS custom properties at the top of [`tvl.css`](../../../src/styles/tvl.css) (on `:root` or `.tvl-screen`), then refactor every `*.tv.css` rule and the player's `isTV` inline styles to consume them. This removes scattered literal hex, guarantees one palette, and makes the perf budget enforceable in one place.

```css
:root {
  /* surfaces */
  --a-bg: #0A0E1A;
  --a-surface: #141A2E;
  --a-surface-2: #1B2236;
  --a-border: #28324E;
  /* accents */
  --a-indigo: #6C5CE7;
  --a-cyan: #22D3EE;
  --a-danger: #E5484D;
  /* text */
  --a-text: #EAF0FF;
  --a-text-dim: #B8C0DA;
  --a-muted: #7A86A8;
  /* signature flourish — the ONE sanctioned gradient */
  --a-hairline: linear-gradient(100deg, #6C5CE7, #22D3EE);
  /* geometry */
  --a-radius: 14px;
  --a-radius-sm: 10px;
  --a-inset: 64px;            /* ~5% title-safe overscan */
  /* focus */
  --a-focus-ring: #22D3EE;
  --a-focus-fill: rgba(34, 211, 238, 0.14);
  /* type scale */
  --a-fs-screen: 28px;        /* screen titles */
  --a-fs-hero: 36px;          /* detail hero title */
  --a-fs-card: 20px;          /* category card */
  --a-fs-body: 16px;
  --a-fs-meta: 13px;
}
```

Inline-styled surfaces (player) reference the same numeric values via the existing `tokens.js` import path, keeping web/native/TV palettes from drifting. (CSS variables are not consumed from JS; the player branch uses the matching token constants so the values stay identical.)

### 2. Focus treatment — the signature upgrade

One universal focus rule, applied identically to category cards, poster cards, channel cards, list/episode rows, buttons, and player controls:

- `border: 2px solid var(--a-focus-ring)`
- `outline: 2px solid var(--a-focus-ring); outline-offset: 2px`
- `background: var(--a-focus-fill)` (subtle cyan tint)
- focused title/label text brightened to `--a-text` / `#fff`
- **instant** — no transition

This promotes today's strongest state (`.tvl-card--on`) to *the* shared focus token. The category grid (currently border-only) and the nav tabs are upgraded to match, so focus reads identically everywhere. Rationale: with glow/transform/animation banned, the focus indicator is the single most important legibility element on a 10-foot screen, so it must be loud and uniform.

### 3. Per-screen application

Each screen keeps its current structure; only styling is refactored onto tokens + the unified focus.

- **Live TV** (`.tvl-cat-*`, `.tvl-ch-*` in [tvl.css](../../../src/styles/tvl.css) + [LiveTVScreen.tv.css](../../../src/screens/LiveTVScreen.tv.css)): category + channel cards adopt unified focus; `LIVE` badge restyled with cyan token; logo placeholders use `--a-border`.
- **Movies / Series** ([MoviesScreen.tv.css](../../../src/screens/MoviesScreen.tv.css), [SeriesScreen.tv.css](../../../src/screens/SeriesScreen.tv.css)): poster grid spacing/ratios normalized to shared tokens; detail-overlay hero (`.tvl-det-*`) hierarchy cleaned via the type scale; Series season/episode rows adopt unified focus; the `.tvl-det-hero-thumb` `box-shadow` is replaced with a flat `--a-border` edge; the `0.15s` transition removed.
- **History & Accounts** ([HistoryScreen.tv.jsx](../../../src/screens/HistoryScreen.tv.jsx) + [HistoryScreen.tv.css](../../../src/screens/HistoryScreen.tv.css), [AccountsScreen.tv.jsx](../../../src/screens/AccountsScreen.tv.jsx) + [AccountsScreen.tv.css](../../../src/screens/AccountsScreen.tv.css)): continue-watching cards, account list, and forms move onto tokens + unified focus; buttons use the shared `.tvl-btn` family.
- **Nav chrome** (TV nav rail/bar in [AppNavigator.web.jsx](../../../src/navigation/AppNavigator.web.jsx)): tab focus state unified with the rest; gradient hairline retained as the signature flourish.

### 4. Player restyle (features frozen)

Only the `if (isTV)` render branch ([VideoPlayerScreen.web.jsx:1536](../../../src/screens/VideoPlayerScreen.web.jsx#L1536)) and its TV control overlay are retouched — inline `style={}` objects swapped to Aurora token values: control-bar surface (`--a-surface-2`), progress/seek bar in cyan, focused control = unified cyan border + fill, type scale applied.

**Explicitly NOT changed:** hls.js wiring / `useResilientPlayback`; the recovery machine; remote key handling (lines 1135–1256); resume / auto-resume logic; stats overlay behavior; channel zap; the `!isTV` (web/desktop) render path. No feature added or removed; remote interaction identical.

### 5. Performance guardrails

- **The enforced ban is the GPU-expensive set:** no `transition`, `transform`, `filter`, `backdrop-filter`, or `box-shadow` on any TV element. (The `tvl.css` header's blanket "No gradients" was overly broad — *static* gradients do not animate and are cheap to paint once; the expensive properties are the ones listed here.) Remove current violations: the hero-thumb `box-shadow` and the Series `0.15s` transition.
- **Allowed:** flat fills, borders/outlines, **static gradient fills** (the signature hairline + the primary `.tvl-btn`), the existing spinner `@keyframes` (loading state only), `object-fit` images with `loading="lazy"`.
- **No new runtime cost:** the refresh is CSS / inline-style only — no new DOM nodes, no new JS, no new effects. `VirtualGridTV`, `MemoryManager`, and `TVOptimizations` are untouched.

## Components / Units of Work

| Unit | File(s) | Responsibility |
|------|---------|----------------|
| Token foundation | `src/styles/tvl.css` (top) | Single source of `--aurora-*` vars + universal focus rule |
| Live TV restyle | `tvl.css` (`.tvl-cat/ch`), `LiveTVScreen.tv.css` | Consume tokens; unified focus |
| Movies restyle | `MoviesScreen.tv.css` | Consume tokens; detail hero hierarchy; remove shadow |
| Series restyle | `SeriesScreen.tv.css` | Consume tokens; episode rows focus; remove `0.15s` transition |
| History restyle | `HistoryScreen.tv.css` (+ inline in `.jsx`) | Consume tokens; unified focus |
| Accounts restyle | `AccountsScreen.tv.css` (+ inline in `.jsx`) | Consume tokens; unified focus |
| Nav chrome | `AppNavigator.web.jsx` (TV branch) | Unified tab focus; keep hairline |
| Player TV UI | `VideoPlayerScreen.web.jsx` (`isTV` branch only) | Aurora inline styles; features frozen |

Each unit is independent (one screen's CSS does not affect another's), communicates only through the shared token variables, and can be verified on its own screen.

## Error Handling / Edge Cases

- **Old Chromium CSS-variable support:** webOS/Tizen Chromium versions in scope support CSS custom properties (Chromium 49+); `var()` is safe. If a target device predates that, the fallback is to inline literal values — but no such device is currently targeted.
- **Focus on virtualized grids:** `VirtualGridTV` already drives `focusIndex`; the focus *style* change is purely visual and does not alter scroll/focus math.
- **Player regression risk:** mitigated by confining edits to the `isTV` branch and inline style objects only; the `!isTV` path is byte-stable.

## Testing & Verification

- `npm test` — all 164 tests stay green (styling-only change, no logic touched).
- `npm run build:web` — exits 0.
- `npm run build:tv` — transpiles + `patch-index.js` runs clean.
- **Manual (real TV hardware, user-driven):** a per-screen checklist will ship with the implementation plan, covering: focus visibility across the room on every focusable element; no jank on grid scroll / channel paging; detail overlays legible; player controls + remote behavior unchanged; no visible shadow/blur/animation regressions.

## Out of Scope (YAGNI)

- Layout/UX restructure (no new Hero/shelf/side-rail on TV).
- Any change to web or native screens.
- Any player feature change, new remote key, or playback-logic edit.
- New animations, glows, or effects.
- Touching `VirtualGridTV`, `MemoryManager`, `TVOptimizations`, or content services.
