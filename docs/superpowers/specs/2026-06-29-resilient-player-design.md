# Resilient, Fully-Featured IPTV Player — Design

**Date:** 2026-06-29
**Status:** Approved (Approach A). Resilience first, then options. All platforms (native, web, TV).

## Goal
A best-in-class IPTV player: deep customizable option set + bulletproof network handling that *keeps playing through* errors. Two engines today — hls.js (`<video>`) on web/TV, `expo-video` on native — must share one recovery brain and a consistent option set.

## Approach A — shared resilience core + per-engine drivers
The recovery logic lives in one engine-agnostic, unit-testable state machine that talks to thin driver adapters. Both player screens become thin shells.

### Module layout — `src/playback/`
- `drivers/types.js` — `PlayerDriver` interface (JSDoc contract).
- `drivers/hlsDriver.js` — web/TV: wraps hls.js + `<video>`.
- `drivers/expoVideoDriver.js` — native: wraps `expo-video`.
- `recoveryMachine.js` — PURE reducer `(state, event) -> {state, effects}`. Unit-tested.
- `backoff.js` — exponential backoff + jitter; quality-downgrade ladder. Unit-tested.
- `errorClassifier.js` — raw error -> `ErrorClass`. Unit-tested.
- `useResilientPlayback.js` — wires driver + recoveryMachine + watchdogs + offline.
- `usePlayerPreferences.js` — per-stream + global prefs (storage-backed).
- `useResumePosition.js` — reads `watchHistory` from AppContext (single source of truth).
- `components/` — `ReconnectingBadge`, `StatsOverlay`, `ResumePrompt`, `OptionSheet`, `SettingsMenu`.

### Driver interface (uniform)
`load(source,{startTime,isLive})`, `play/pause/seek`, getters `currentTime/duration/buffered/isLive`, `setQualityCap/getQualityLevels`, audio/subtitle track get+set, events `onStatus/onProgress/onStall/onError(raw)/onQualitySwitch`. The brain never imports hls.js or expo-video.

## Phase 1 — Resilience (the "continuing algorithm")
Pure reducer states: `idle → loading → playing ⇄ buffering → recovering → (playing | fatal)`.
- **Stall watchdog:** `currentTime` not advancing for N ms (not user-paused) → `buffering`; persists → `recovering`.
- **Recovering = retry loop:** exponential backoff + jitter, capped (1→2→4→8→max 15s), **retry indefinitely** until success or user exits. Live → re-sync to live edge; VOD → seek back to saved `currentTime`.
- **Adaptive downgrade:** K consecutive buffering events in a window → step quality cap down one rung; sustained stable → step up. Bounded by user manual cap (Auto / 1080 / 720 / 480 / data-saver).
- **Offline awareness:** offline (`navigator.onLine` / NetInfo) → enter recovering, suppress retries until online, resume at saved position.
- **Initial-load watchdog:** stuck `loading` past timeout → recoverable retry.
- **Fatal only when truly dead:** 404/removed or final auth failure after one credential refresh → `fatal` (error screen + manual Retry). Everything else keeps trying.

### Error taxonomy → response
| Class | Trigger | Response |
|---|---|---|
| TRANSIENT_NETWORK | timeout, dropped segment, 5xx, fetch fail | backoff retry, keep position/edge |
| STALL | buffer underrun, time not advancing | watchdog → recover; counts toward downgrade |
| AUTH_EXPIRED | 401/403 on live | refresh stream URL/credentials once → retry; still 403 → fatal |
| MEDIA_DECODE | hls media error / decode | recoverMediaError (web) / re-init (native), capped |
| OFFLINE | offline | pause retries, auto-resume on reconnect |
| GONE | 404, manifest removed | fatal + manual retry |

Native gets this entire layer for the first time. Web's ad-hoc HLS recovery is replaced by the shared machine so all platforms behave identically.

## Phase 2 — Options ("everything a user needs")
1. **Resume + remembered prefs:** "Resume / Start over" prompt on reopen (from `watchHistory`); remember quality cap, audio track, subtitle track, aspect ratio, speed (per-stream where meaningful, else global) via `usePlayerPreferences`.
2. **Subtitle & audio tuning:** subtitle styling (size/color/background/position) + subtitle delay offset; audio delay/sync offset.
3. **Mobile gestures + PiP/Cast:** swipe brightness/volume, double-tap seek, long-press 2x, on-screen seek indicator; Picture-in-Picture, AirPlay/Chromecast, background audio, sleep timer.
4. **Stats + live extras:** stats overlay (resolution, bitrate, buffer health, dropped frames, connection); live-TV channel zap up/down, EPG now/next, jump to last channel.

## Testing
- `node:test` unit tests for `recoveryMachine`, `backoff`, `errorClassifier` (pure). Cover: backoff sequence + jitter bounds, indefinite-retry transitions, downgrade ladder up/down, offline suppress/resume, fatal classification, live-edge vs VOD-resume effect selection.
- Driver/integration verified via `npm run build:web` (compile) + manual device/TV passes.

## Risk notes
- Web player already works with subtle live-recovery logic — integration is the high-risk step; build pure core + tests first, integrate carefully, keep web build green.
- `expo-keep-awake` currently transitive — add explicitly if needed for native.
