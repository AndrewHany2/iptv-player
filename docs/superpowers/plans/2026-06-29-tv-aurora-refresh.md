# TV Aurora Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Aurora Cinematic visual identity to the TV screens + TV video-player UI using a shared CSS-variable token layer and one unified, high-visibility focus treatment, while honoring a strict TV performance budget and freezing all player features.

**Architecture:** TV is the web build (`expo export --platform web` → `tv/dist` → `tv/patch-index.js` transpiles for old webOS/Tizen Chromium). `usePlatform().isTV` makes `AppNavigator.web.jsx` swap in `.tv.jsx` screen variants. All TV styling lives in `src/styles/tvl.css` (shared base) + per-screen `*.tv.css`; the player's TV UI is inline `style={}` objects gated by `isTV`. This plan adds an `--a-*` token block + a single canonical focus rule to `tvl.css`, then refactors each screen's CSS and the player's TV branch to consume them.

**Tech Stack:** React 19, react-native-web, plain CSS (custom properties), inline style objects, design tokens in `src/ui/tokens.js`. Tests: `node --test` (164 tests). Builds: `npm run build:web`, `npm run build:tv`.

## Global Constraints

- **TV performance budget (hard):** NO `transition`, `transform`, `filter`, `backdrop-filter`, or `box-shadow` on any element rendered on TV. Allowed: flat fills, borders/outlines, **static** gradient fills (the signature hairline + primary buttons), the existing `@keyframes tvl-spin`/`spin` (loading only), `object-fit` images with `loading="lazy"`.
- **Palette is fixed (already Aurora):** `#0A0E1A` bg, `#141A2E`/`#1B2236` surfaces, `#28324E` border, `#6C5CE7` indigo, `#22D3EE` cyan, `#EAF0FF`/`#B8C0DA`/`#7A86A8` text, `#E5484D` danger, `#ffd700` rating gold. Do NOT introduce new colors — only extract these to `--a-*` variables.
- **Unified focus = cyan border + outline + tint fill + brighter text, instant.** Exact rule: `border-color:var(--a-focus-ring); outline:2px solid var(--a-focus-ring); outline-offset:2px; background:var(--a-focus-fill); color:var(--a-text);` Every focusable TV element uses this — no per-screen focus variants.
- **Player features frozen:** Do NOT touch hls.js wiring, `useResilientPlayback`, the recovery machine, remote-key handling (lines ~1135–1256), resume/auto-resume, channel zap, or the StatsOverlay behavior. Do NOT touch the `!isTV` (web/desktop) render path. Player edits are limited to: the `TV` style object (`src/screens/VideoPlayerScreen.web.jsx:244-360`, used only by the `isTV` branch) and the `isTV`-conditioned styling of the shared `liveToast`.
- **No new colors literal in JS:** the player branch references token constants from `src/ui/tokens.js` (already imported: `colors`, `accentAlpha`, `fonts`, `radii`), keeping values identical to web/native. CSS variables are NOT read from JS.
- **Commit after every task.** Run `npm test` (expect 164 pass) before each commit. The change is styling-only; if any test fails, you broke something unrelated — stop and investigate.

**Spec:** `docs/superpowers/specs/2026-06-29-tv-aurora-refresh-design.md`

---

## File Structure

| File | Responsibility | Tasks |
|------|----------------|-------|
| `src/styles/tvl.css` | Token foundation (`:root` `--a-*` vars), canonical focus rule, shared base styles → tokens, remove shadow violation | 1 |
| `src/screens/LiveTVScreen.tv.css` | Channel grid styles → tokens; drop redundant focus decls | 2 |
| `src/screens/MoviesScreen.tv.css` | Movie grid + detail + letter bar + buttons → tokens; drop redundant focus decls | 3 |
| `src/screens/SeriesScreen.tv.css` | Series grid + seasons + episodes + letter bar → tokens; drop redundant focus decls; remove `0.15s` transition | 4 |
| `src/screens/HistoryScreen.tv.css` | Continue-watching / home → tokens; drop redundant focus decls | 5 |
| `src/screens/AccountsScreen.tv.css` | Account list/forms → tokens; drop redundant focus decls | 5 |
| `src/screens/VideoPlayerScreen.web.jsx` | `TV` style object + `liveToast` → cyan progress, gate blur/shadow, remove TV-only transitions | 6 |
| (verification only) `src/navigation/AppNavigator.web.jsx` | Nav focus already uses `colors.accent2`; confirm, no code change | 7 |

The canonical focus rule in Task 1 lists every `--on`/`--focused` selector across all screens. Each per-screen task (2–5) then **removes** that screen's own focus-state declarations so the shared rule owns them (CSS import order is `tvl.css` first, then the screen file, so leaving them would override the shared rule).

---

### Task 1: Token foundation + canonical focus rule (`tvl.css`)

**Files:**
- Modify: `src/styles/tvl.css` (add `:root` block at top; add canonical focus rule; convert this file's literal hex to `var(--a-*)`; remove `box-shadow` on line ~290)
- Test: existing `node --test` suite (no new test file — styling change)

**Interfaces:**
- Produces: CSS custom properties `--a-bg, --a-surface, --a-surface-2, --a-border, --a-indigo, --a-cyan, --a-danger, --a-text, --a-text-dim, --a-muted, --a-rating, --a-hairline, --a-radius, --a-radius-sm, --a-inset, --a-focus-ring, --a-focus-fill, --a-fs-screen, --a-fs-hero, --a-fs-card, --a-fs-body, --a-fs-meta` on `:root`. A single canonical focus rule applied to the selector list below. Later tasks (2–6) consume these and rely on the focus rule existing.

- [ ] **Step 1: Add the `:root` token block** at the very top of `src/styles/tvl.css` (before the `.tvl-screen` rule):

```css
/* ── Aurora TV tokens — single source of truth (TV-safe: no effects) ──────── */
:root {
  --a-bg: #0A0E1A;
  --a-surface: #141A2E;
  --a-surface-2: #1B2236;
  --a-border: #28324E;
  --a-indigo: #6C5CE7;
  --a-cyan: #22D3EE;
  --a-danger: #E5484D;
  --a-text: #EAF0FF;
  --a-text-dim: #B8C0DA;
  --a-muted: #7A86A8;
  --a-rating: #ffd700;
  --a-hairline: linear-gradient(100deg, #6C5CE7, #22D3EE);
  --a-radius: 14px;
  --a-radius-sm: 10px;
  --a-inset: 64px;
  --a-focus-ring: #22D3EE;
  --a-focus-fill: rgba(34, 211, 238, 0.12);
  --a-fs-screen: 28px;
  --a-fs-hero: 36px;
  --a-fs-card: 20px;
  --a-fs-body: 16px;
  --a-fs-meta: 13px;
}
```

- [ ] **Step 2: Add the canonical focus rule** at the end of `src/styles/tvl.css`. This lists every focusable selector across all screens (some classes live in other files but CSS is global once imported):

```css
/* ── Canonical focus — the ONE focus treatment for all TV elements ────────── */
.tvl-cat-card--on,
.tvl-card--on,
.tvl-ch-card--on,
.tvl-det-hero-btn--on,
.tvl-mov-btn--on,
.tvl-letter-btn--focused,
.tvl-season-btn--on,
.tvl-episode--on,
.tvl-det-act-btn--on {
  border-color: var(--a-focus-ring);
  outline: 2px solid var(--a-focus-ring);
  outline-offset: 2px;
  background: var(--a-focus-fill);
  color: var(--a-text);
}
```

- [ ] **Step 3: Convert this file's literal hex to tokens and remove the shadow.** In `src/styles/tvl.css`, replace the literal colors with `var(--a-*)` and delete the `box-shadow` declaration on `.tvl-det-hero-thumb`. Apply these edits:
  - `.tvl-screen`: `background: #0A0E1A;` → `background: var(--a-bg);`, `color: #EAF0FF;` → `color: var(--a-text);`
  - `.tvl-topbar`: `border-bottom: 1px solid #28324E;` → `border-bottom: 1px solid var(--a-border);`; `padding: 24px 64px;` → `padding: 24px var(--a-inset);`
  - `.tvl-topbar::after`: `background: linear-gradient(100deg, #6C5CE7, #22D3EE);` → `background: var(--a-hairline);`
  - `.tvl-topbar-back`: `color: #6C5CE7;` → `color: var(--a-indigo);`
  - `.tvl-topbar-count`: `color: #7A86A8;` → `color: var(--a-muted);`
  - `.tvl-center`: `color: #7A86A8;` → `color: var(--a-muted);`
  - `.tvl-spinner`: `border: 4px solid #28324E;` → `border: 4px solid var(--a-border);`; `border-top-color: #22D3EE;` → `border-top-color: var(--a-cyan);`
  - `.tvl-btn`: `background: linear-gradient(100deg, #6C5CE7, #22D3EE);` → `background: var(--a-hairline);`; `border-radius: 14px;` → `border-radius: var(--a-radius);`
  - `.tvl-btn-ghost`: `background: #1B2236;` → `var(--a-surface-2)`; `border: 2px solid #28324E;` → `2px solid var(--a-border)`; `color: #EAF0FF;` → `var(--a-text)`
  - `.tvl-btn-danger`: `background: #E5484D;` → `background: var(--a-danger);`
  - `.tvl-cat-grid`: `gap: 20px;` keep; `padding: 36px 64px;` → `padding: 36px var(--a-inset);`
  - `.tvl-cat-card`: `padding: 32px 24px;` keep; `background: #141A2E;` → `var(--a-surface)`; `border: 2px solid #28324E;` → `2px solid var(--a-border)`; `border-radius: 14px;` → `var(--a-radius)`; `font-size: 20px;` → `var(--a-fs-card)`; `color: #B8C0DA;` → `var(--a-text-dim)`
  - **Delete** the entire `.tvl-cat-card--on { … }` block (lines ~164-168) — the canonical rule now owns it.
  - `.tvl-card`: `border-radius: 14px;` → `var(--a-radius)`
  - **Delete** the entire `.tvl-card--on { … }` block — canonical rule owns it. (Keep `.tvl-card--on .tvl-card-title { color: #fff; }` — that is a child-brighten, not the focus box; leave as-is.)
  - `.tvl-card-img`: `background: #141A2E;` → `var(--a-surface)`
  - `.tvl-card-ph`: `color: #28324E;` → `var(--a-border)`
  - `.tvl-card-rating`: `color: #ffd700;` → `var(--a-rating)`
  - `.tvl-card-title`: `color: #EAF0FF;` → `var(--a-text)`
  - `.tvl-det-hero`, `.tvl-det-hero-thumb` background `#0A0E1A`/`#1B2236` → `var(--a-bg)`/`var(--a-surface-2)`
  - **`.tvl-det-hero-thumb`: DELETE the line `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);`** (budget violation). Change `border: 3px solid rgba(255,255,255,0.15);` → `border: 3px solid var(--a-border);`
  - `.tvl-det-hero-title`: `font-size: 36px;` → `var(--a-fs-hero)`; `color: #fff;` keep (`#fff` is intentional pure white for the hero title)
  - `.tvl-det-tag`: `color: #7A86A8;` → `var(--a-muted)`
  - `.tvl-det-tag--alert`: `border-color: #6C5CE7; color: #6C5CE7;` → `var(--a-indigo)` for both
  - `.tvl-det-rating`: `color: #ffd700;` → `var(--a-rating)`
  - `.tvl-det-hero-btn--saved`: `border-color: #6C5CE7;` → `var(--a-indigo)`
  - **Delete** the `.tvl-det-hero-btn--on { … }` block — canonical rule owns it.
  - `.tvl-det-hero-plot`, `.tvl-det-body`, `.tvl-det-body-crew`: `#7A86A8` → `var(--a-muted)`; `.tvl-det-body` `background: #0A0E1A;` → `var(--a-bg)`
  - `.tvl-det-body-plot`: `border-left: 4px solid #6C5CE7;` → `var(--a-indigo)`; `border-radius: 12px;` → `var(--a-radius-sm)`

  Leave `#fff` literals where pure white is intentional (hero title, focused titles, button text), and leave `rgba(...)` overlays/tints that have no token. Do not change layout numbers except the `--a-inset` and radius swaps shown.

- [ ] **Step 4: Run the test suite**

Run: `npm test`
Expected: all tests pass (baseline 164). No new tests — this is CSS.

- [ ] **Step 5: Build to verify CSS is valid and TV transpile is clean**

Run: `npm run build:web`
Expected: exits 0.
Run: `npm run build:tv`
Expected: prints `Transpiling index-….js …` and exits 0.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tvl.css
git commit -m "feat(tv): Aurora token foundation + canonical focus rule"
```

---

### Task 2: Live TV channel grid → tokens (`LiveTVScreen.tv.css`)

**Files:**
- Modify: `src/screens/LiveTVScreen.tv.css`

**Interfaces:**
- Consumes: `--a-*` tokens and the canonical `.tvl-ch-card--on` focus rule from Task 1.

- [ ] **Step 1: Convert literal hex to tokens and remove the redundant focus block.** Apply:
  - `.tvl-ch-card`: `border-radius: 14px;` → `var(--a-radius)`; `background: #141A2E;` → `var(--a-surface)`
  - **Delete** the entire `.tvl-ch-card--on { … }` block (lines ~27-33) — Task 1's canonical rule owns focus. (Keep `.tvl-ch-card--on .tvl-ch-name { color: #fff; }`.)
  - `.tvl-ch-logo`: `background: #0A0E1A;` → `var(--a-bg)`
  - `.tvl-ch-ph`: `color: #28324E;` → `var(--a-border)`
  - `.tvl-ch-live`: `background: #6C5CE7;` → `var(--a-indigo)`
  - `.tvl-ch-name`: `color: #EAF0FF;` → `var(--a-text)`
  - The grid `padding: 24px 64px;` (both `.tvl-ch-grid` and `.tvl-ch-grid-window`) → `padding: 24px var(--a-inset);`

- [ ] **Step 2: Run tests** — `npm test` → all pass.
- [ ] **Step 3: Build** — `npm run build:web` → exits 0.
- [ ] **Step 4: Commit**

```bash
git add src/screens/LiveTVScreen.tv.css
git commit -m "feat(tv): Live TV channel grid onto Aurora tokens"
```

---

### Task 3: Movies screen → tokens (`MoviesScreen.tv.css`)

**Files:**
- Modify: `src/screens/MoviesScreen.tv.css`

**Interfaces:**
- Consumes: `--a-*` tokens + canonical focus rule (`.tvl-mov-btn--on`, `.tvl-letter-btn--focused`) from Task 1.

- [ ] **Step 1: Convert hex to tokens, drop redundant focus decls.** Apply:
  - `.tvl-mov-grid` and `.tvl-mov-grid-window`: `padding: 24px 64px;` → `padding: 24px var(--a-inset);`
  - `.tvl-mov-poster-col`: `background: #0A0E1A;` → `var(--a-bg)`; `border-right: 1px solid #28324E;` → `var(--a-border)`
  - `.tvl-mov-poster-col .tvl-det-poster-ph`: `color: #28324E;` → `var(--a-border)`
  - `.tvl-mov-btn`: `background: #1B2236;` → `var(--a-surface-2)`; `border: 2px solid #28324E;` → `2px solid var(--a-border)`; `border-radius: 10px;` → `var(--a-radius-sm)`
  - **Delete** the `.tvl-mov-btn--on { … }` block — canonical rule owns it.
  - `.tvl-mov-btn--ghost`: `color: #7A86A8;` → `var(--a-muted)`
  - `.tvl-mov-plot`: `border-left: 4px solid #6C5CE7;` → `var(--a-indigo)`; `border-radius: 12px;` → `var(--a-radius-sm)`
  - `.tvl-mov-crew`: `color: #7A86A8;` → `var(--a-muted)`
  - `.tvl-letter-bar`: `padding: 8px 64px;` → `padding: 8px var(--a-inset);`; `border-bottom: 1px solid #28324E;` → `var(--a-border)`
  - `.tvl-letter-btn`: `color: #EAF0FF;` → `var(--a-text)`; **keep** `transition: none;` (it's an explicit no-op disabling any inherited transition — budget-safe; leave it).
  - **Delete** the `.tvl-letter-btn--focused { … }` block — canonical rule owns focus.
  - `.tvl-letter-btn--active`: `border-color: #6C5CE7; color: #6C5CE7;` → `var(--a-indigo)`; `background: #1B2236;` → `var(--a-surface-2)`

- [ ] **Step 2: Run tests** — `npm test` → all pass.
- [ ] **Step 3: Build** — `npm run build:web` → exits 0.
- [ ] **Step 4: Commit**

```bash
git add src/screens/MoviesScreen.tv.css
git commit -m "feat(tv): Movies screen onto Aurora tokens"
```

---

### Task 4: Series screen → tokens + remove transition (`SeriesScreen.tv.css`)

**Files:**
- Modify: `src/screens/SeriesScreen.tv.css`

**Interfaces:**
- Consumes: `--a-*` tokens + canonical focus rule (`.tvl-season-btn--on`, `.tvl-episode--on`, `.tvl-det-act-btn--on`, `.tvl-letter-btn--focused`) from Task 1.

- [ ] **Step 1: Convert hex to tokens, drop redundant focus decls, remove the `0.15s` transition.** Apply:
  - `.tvl-ser-grid` and `.tvl-ser-grid-window`: `padding: 24px 64px;` → `padding: 24px var(--a-inset);`
  - `.tvl-letter-bar`: `padding: 8px 64px;` → `padding: 8px var(--a-inset);`; `border-bottom: 1px solid #28324E;` → `var(--a-border)`
  - `.tvl-letter-btn`: `color: #EAF0FF;` → `var(--a-text)`; keep `transition: none;`
  - **Delete** the `.tvl-letter-btn--focused { … }` block — canonical rule owns focus.
  - `.tvl-letter-btn--active`: `#6C5CE7` → `var(--a-indigo)` (both); `background: #1B2236;` → `var(--a-surface-2)`
  - `.tvl-det-act-btn`: `border: 2px solid #28324E;` → `var(--a-border)`; `background: #1B2236;` → `var(--a-surface-2)`; `color: #7A86A8;` → `var(--a-muted)`; **DELETE the line `transition: border-color 0.15s;`** (budget violation).
  - **Delete** the `.tvl-det-act-btn--on { … }` block — canonical rule owns focus.
  - `.tvl-ser-trailer`: `border-bottom: 1px solid #28324E;` → `var(--a-border)`
  - `.tvl-seasons-row`: `border-bottom: 1px solid #28324E;` → `var(--a-border)`
  - `.tvl-season-btn`: `background: #141A2E;` → `var(--a-surface)`; `border: 2px solid #28324E;` → `var(--a-border)`; `color: #7A86A8;` → `var(--a-muted)`
  - **Delete** the `.tvl-season-btn--on { … }` block — canonical rule owns focus.
  - `.tvl-episode`: leave `border: 2px solid transparent;` (base) as-is.
  - **Delete** the `.tvl-episode--on { … }` block — canonical rule owns focus.
  - `.tvl-ep-badge`: `background: #6C5CE7;` → `var(--a-indigo)`
  - `.tvl-ep-plot`, `.tvl-ep-dur`: `color: #7A86A8;` → `var(--a-muted)`
  - `.tvl-ep-play`: `color: #6C5CE7;` → `var(--a-indigo)`

- [ ] **Step 2: Run tests** — `npm test` → all pass.
- [ ] **Step 3: Build** — `npm run build:web` → exits 0.
- [ ] **Step 4: Commit**

```bash
git add src/screens/SeriesScreen.tv.css
git commit -m "feat(tv): Series screen onto Aurora tokens; drop transition"
```

---

### Task 5: History & Accounts → tokens (`HistoryScreen.tv.css`, `AccountsScreen.tv.css`)

**Files:**
- Modify: `src/screens/HistoryScreen.tv.css`
- Modify: `src/screens/AccountsScreen.tv.css`

**Interfaces:**
- Consumes: `--a-*` tokens + canonical focus rule from Task 1.

- [ ] **Step 1: Read both files to enumerate their literal hex and focus-state classes.**

Run: `grep -nE "#[0-9A-Fa-f]{6}|--on|--focused|box-shadow|transition|transform|filter|backdrop" src/screens/HistoryScreen.tv.css src/screens/AccountsScreen.tv.css`

- [ ] **Step 2: For each file, apply the same mechanical conversions used in Tasks 1–4:**
  - Replace every palette hex with its `var(--a-*)` equivalent per the Global Constraints palette map (`#0A0E1A`→`--a-bg`, `#141A2E`→`--a-surface`, `#1B2236`→`--a-surface-2`, `#28324E`→`--a-border`, `#6C5CE7`→`--a-indigo`, `#22D3EE`→`--a-cyan`, `#E5484D`→`--a-danger`, `#EAF0FF`→`--a-text`, `#B8C0DA`→`--a-text-dim`, `#7A86A8`→`--a-muted`, `#ffd700`→`--a-rating`). Leave `#fff`/`#000`/`rgba(...)` literals.
  - Replace horizontal screen padding `… 64px` (the title-safe inset) with `… var(--a-inset)`.
  - Replace `border-radius: 14px` → `var(--a-radius)`, `border-radius: 10px` → `var(--a-radius-sm)` where present.
  - For any focus/selected-state class found in Step 1 (a `--on`/`--focused`/`--active` *focus ring*, NOT a semantic "active filter" indigo state): if it represents keyboard focus, **delete its border/outline/background focus declarations and add the class selector to the canonical focus rule in `src/styles/tvl.css`** (append the selector to the comma list from Task 1, Step 2). If a class is a non-focus state (e.g. an "active/saved" indigo indicator like `.tvl-letter-btn--active`), only tokenize its colors — do NOT fold it into the canonical focus rule.
  - Remove any `box-shadow`, `transition` (other than `transition: none`), `transform`, `filter`, or `backdrop-filter` you find — these violate the budget. If removing one changes a hover effect, that is acceptable: TV has no pointer hover.

- [ ] **Step 3: Run tests** — `npm test` → all pass.
- [ ] **Step 4: Build** — `npm run build:web` → exits 0; `npm run build:tv` → exits 0.
- [ ] **Step 5: Commit**

```bash
git add src/screens/HistoryScreen.tv.css src/screens/AccountsScreen.tv.css src/styles/tvl.css
git commit -m "feat(tv): History & Accounts onto Aurora tokens"
```

---

### Task 6: Player TV UI restyle (`VideoPlayerScreen.web.jsx`)

**Files:**
- Modify: `src/screens/VideoPlayerScreen.web.jsx` — the `TV` style object (lines ~244-360) and the `liveToast` style (lines ~1490-1526). NOTHING else.

**Interfaces:**
- Consumes: existing imports `colors` (has `.accent` indigo, `.accent2` cyan, `.text`, `.surface2`), `accentAlpha`, `fonts`, `radii`, `GLOW_WEB`, and the in-scope `isTV` boolean.
- Produces: no exported surface change. Pure visual + budget edits inside the `isTV` path.

- [ ] **Step 1: Make the TV progress bar cyan and remove the TV-only width tween.** In the `TV` object, edit `progressFill`:

```js
  progressFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: colors.accent2,
  }),
```

(Was `background: colors.accent` + `transition: "width 0.5s linear"`; cyan matches the Aurora focus accent and the transition is dropped for the budget. The bar still updates on every `timeupdate`.)

- [ ] **Step 2: Remove the controls fade transition (TV-only) while keeping show/hide.** In the `TV` object, edit `controls`:

```js
  controls: (visible) => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.85) 100%)",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
  }),
```

(Dropped `transition: "opacity 0.3s ease"`. Controls still toggle on `showTvControls`/auto-hide — the feature is intact; only the animated fade is gone, per the strict budget. The static gradient scrim stays — static gradients are allowed.)

- [ ] **Step 3: Gate the reconnecting toast's blur + shadow off for TV.** The `liveToast` is shared; on TV, blur/shadow violate the budget. Edit the toast's outer `<div style={{…}}>` (around line 1492) so the expensive props are conditional on `!isTV`:

Replace these three lines inside the style object:

```js
        backgroundColor: "rgba(12,16,24,0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${accentAlpha(0.35)}`,
        boxShadow: GLOW_WEB,
```

with:

```js
        backgroundColor: isTV ? colors.surface2 : "rgba(12,16,24,0.55)",
        backdropFilter: isTV ? undefined : "blur(12px)",
        WebkitBackdropFilter: isTV ? undefined : "blur(12px)",
        border: `1px solid ${accentAlpha(0.35)}`,
        boxShadow: isTV ? undefined : GLOW_WEB,
```

(On TV: opaque `surface2` fill, no blur, no glow. On web: unchanged. The cyan spinner ring and "Reconnecting" copy are untouched — the recovery feature is intact.)

- [ ] **Step 4: Verify no other player edits.** Confirm the diff touches only the `TV` object and the `liveToast` style block.

Run: `git diff --stat src/screens/VideoPlayerScreen.web.jsx`
Expected: one file changed; a small number of lines (roughly 8–12), all within the regions above.

- [ ] **Step 5: Run tests** — `npm test` → all pass (player logic untouched).
- [ ] **Step 6: Build** — `npm run build:web` → exits 0; `npm run build:tv` → exits 0.
- [ ] **Step 7: Commit**

```bash
git add src/screens/VideoPlayerScreen.web.jsx
git commit -m "feat(tv): Aurora player UI — cyan progress, drop TV blur/shadow/transitions"
```

---

### Task 7: Final verification + nav-chrome confirmation + budget sweep

**Files:**
- Verify only: `src/navigation/AppNavigator.web.jsx` (nav focus already uses `colors.accent2`; no edit expected)

**Interfaces:**
- Consumes: all prior tasks.

- [ ] **Step 1: Confirm nav chrome already meets the unified-focus spec.** The TV nav is the shared `TopNav`/`NavLink` in `AppNavigator.web.jsx`; keyboard focus already renders a cyan ring (`backgroundColor: colors.accent2` in `NavLink`, `borderColor: colors.accent2` on the icon buttons).

Run: `grep -n "accent2" src/navigation/AppNavigator.web.jsx`
Expected: focus states reference `colors.accent2`. If true, **no code change** — record it. If a nav focus state uses a non-cyan color, change only that value to `colors.accent2`.

- [ ] **Step 2: Budget sweep — confirm no perf-banned property survives on TV CSS.**

Run: `grep -nE "box-shadow|backdrop-filter|filter:|transform:|transition:[^n]" src/styles/tvl.css src/screens/*.tv.css`
Expected: no matches **except** `transition: none;` (allowed no-ops) and the spinner `@keyframes` `transform: rotate(...)` inside `@keyframes tvl-spin` (loading only — allowed). Any other hit is a violation — remove it.

- [ ] **Step 3: Confirm no stray palette hex remains in TV CSS** (optional consistency check):

Run: `grep -nE "#(0A0E1A|141A2E|1B2236|28324E|6C5CE7|22D3EE|E5484D|EAF0FF|B8C0DA|7A86A8)" src/styles/tvl.css src/screens/*.tv.css`
Expected: no matches (all extracted to `--a-*`). `#fff`, `#000`, `#ffd700`-as-`--a-rating`, and `rgba(...)` literals are fine and not flagged here.

- [ ] **Step 4: Full test + build gate.**

Run: `npm test`
Expected: 164 tests pass.
Run: `npm run build:web`
Expected: exits 0.
Run: `npm run build:tv`
Expected: transpiles + patches, exits 0.

- [ ] **Step 5: Manual TV-hardware verification checklist (user-driven).** Deploy with `npm run deploy:lg` (or load `tv/dist`) and confirm on the device:
  - [ ] Live TV: category grid + channel grid — focused item shows the cyan border + outline + tint, clearly visible across the room; D-pad scrolling is smooth (no jank).
  - [ ] Movies: poster grid, letter bar, detail overlay (hero title/meta/buttons legible; poster has a flat border, no shadow); play works.
  - [ ] Series: poster grid, seasons row, episodes list — focus consistent; season/episode selection works.
  - [ ] History & Accounts: cards/list/forms focus consistent; account add/select works.
  - [ ] Nav bar: tab + icon focus shows cyan; gradient hairline visible.
  - [ ] Player: controls show/hide on remote; progress bar is cyan and tracks; ◀◀/▶▶ seek, OK play/pause, ▲▼ channel, `i` stats all work; "Reconnecting" toast appears flat (no blur/glow) when a stream drops; close returns to the grid.
  - [ ] No visible animation/glow/shadow regressions; no perceptible input lag.

- [ ] **Step 6: Commit any sweep fixes** (only if Steps 1–3 required a change):

```bash
git add -A
git commit -m "fix(tv): budget sweep + nav focus confirmation"
```

---

## Self-Review Notes

- **Spec coverage:** Foundation (Task 1), all five screens (Tasks 2–5), nav chrome (Task 7 Step 1), player restyle (Task 6), perf guardrails (Task 1 shadow removal, Task 4 transition removal, Task 6 blur/shadow/transition, Task 7 sweep), verification (Task 7). All spec sections mapped.
- **Focus unification:** canonical rule defined once (Task 1) and every screen's redundant focus block is explicitly deleted in its task — no drift, no override conflict.
- **Player freeze:** Task 6 confines edits to the `TV` style object + `liveToast`, with a `git diff --stat` guard (Step 4) to catch accidental scope creep.
- **No placeholders:** every CSS/JS edit shows the exact before/after value; the only "enumerate then apply" step (Task 5) is a mechanical map already fully specified in Global Constraints + Tasks 1–4.
