# Multi-Platform Release Pipeline — Design

**Date:** 2026-07-01
**Status:** Approved (design), pending implementation plan

## Goal

Add a GitHub Actions release pipeline that produces **downloadable artifacts**
for every platform the IPTV player targets. No store submission. Triggered
either by pushing a version tag (full release) or by manual dispatch (rebuild a
single platform).

## Constraints & context

- Repo: `AndrewHany2/iptv-player` on GitHub (SSH host alias `github-personal`).
- No CI currently exists (`.github/workflows/` is empty).
- Only credential available: **`EXPO_TOKEN`**.
  - No Apple Developer account → iOS cannot produce an installable `.ipa`.
  - No Google Play keystore → EAS auto-manages one for free (fine for APK).
  - No desktop code-signing certs → desktop artifacts are unsigned.
- Existing build scripts (from `package.json`):
  - Web: `expo export --platform web --clear` → `dist/`
  - Electron: `build:electron` → `electron-builder --config electron/builder.json`
    (Win NSIS / macOS dmg / Linux AppImage → `electron/release/`)
  - TV: `build:tv` (`EXPO_PUBLIC_TV=1 expo export ... --output-dir tv/dist`
    + `node tv/patch-index.js`); packaged for webOS via `ares-package` (see
    `deploy:lg`).
  - Mobile: EAS (`eas build --platform ios --profile preview|production`).

## Structure

A single workflow file: `.github/workflows/release.yml`.

```yaml
on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      platform:
        description: Platform to build
        type: choice
        options: [all, android, web, desktop, tv, ios]
        default: all
```

- **Tag push (`v*`)** → build all release platforms, create a **GitHub Release**
  for the tag, and upload every artifact to it.
- **Manual dispatch** → build only the selected platform; upload results as
  **workflow run artifacts** (downloadable from the Actions tab). No GitHub
  Release is created (there is no tag).
- Each platform is an independent job gated by:
  `if: inputs.platform == 'all' || inputs.platform == '<name>'`
  (on tag push, `inputs.platform` is empty → treat as `all`).
- Jobs run in parallel and are isolated: one platform failing does not block the
  others. The `release` job gathers whatever artifacts succeeded.
- `concurrency` group per ref cancels superseded runs.
- Node dependency caching via `actions/setup-node` with `cache: npm`.

### Version derivation

- Tag push: version = tag name with leading `v` stripped (e.g. `v1.2.0` → `1.2.0`).
- Dispatch: version = `version` field read from `app.json`, suffixed with the
  short commit SHA (e.g. `1.0.0-abc1234`) so dispatch artifacts are traceable.

## Per-platform jobs

| Job | Runner | Command(s) | Artifact |
|---|---|---|---|
| **android** | `ubuntu-latest` | `eas build -p android --profile preview --non-interactive --wait --json`; download built APK from the returned artifact URL | `iptv-player-android-<ver>.apk` (signed, EAS-managed keystore) |
| **web** | `ubuntu-latest` | `npm run build:web`; zip `dist/` | `iptv-player-web-<ver>.zip` |
| **desktop** | matrix: `macos-latest`, `windows-latest`, `ubuntu-latest` | `npm run build:electron` with code signing disabled (`CSC_IDENTITY_AUTO_DISCOVERY=false`) | `.dmg` / `.exe` (NSIS) / `.AppImage` from `electron/release/` |
| **tv** | `ubuntu-latest` | `npm i -g @webosose/ares-cli`; `npm run build:tv`; copy `tv/dist/*` → `tv/packaging/lg/`; `ares-package tv/packaging/lg -o out` | `iptv-player-<ver>.ipk` |
| **ios** | `macos-latest` | `eas build -p ios --profile simulator --non-interactive --wait` (unsigned simulator build) | `iptv-player-ios-SIMULATOR-<ver>.tar.gz` |
| **release** | `ubuntu-latest` | `needs` all build jobs (`if: always()`, tag-only); download all artifacts; `gh release create <tag> --generate-notes` and upload assets | GitHub Release |

### iOS handling (decided: option B)

The iOS job is **dispatch-only**: it is excluded from `all` / tag releases and
runs only when a manual dispatch explicitly selects `platform: ios`. This keeps
tag releases from shipping a confusing simulator-only artifact, while the job is
wired up so that adding an Apple Developer account later (switch profile from
`simulator` to `preview`/`production`) is the only change needed to produce a
real signed `.ipa`.

Implementation note: the `ios` job's `if` condition is
`inputs.platform == 'ios'` only (no `all` branch, no tag branch).

## Config changes

1. **`eas.json`**
   - `preview` profile: add `"android": { "buildType": "apk" }` so it emits an
     installable APK rather than an `.aab`.
   - New `simulator` profile: `{ "ios": { "simulator": true } }` for the
     unsigned iOS simulator build.
2. **Repo secret**: add `EXPO_TOKEN` (used by `android` and `ios` jobs).
   `GITHUB_TOKEN` is provided automatically to the `release` job.
3. **No source-code changes** — the pipeline reuses existing npm scripts.

## Error handling

- Build jobs are independent; a failure in one platform does not cancel others
  (no `fail-fast` coupling; desktop matrix uses `fail-fast: false`).
- The `release` job runs with `if: always()` on tag builds and uploads only the
  artifacts that were successfully produced, so a partial release is still
  published (with a note of what is present).
- EAS build steps use `--non-interactive --wait`; a failed/cancelled EAS build
  fails only its own job.

## Testing / validation

- Validate `release.yml` syntax with `actionlint` (or a dry parse) before commit.
- First real validation: push a throwaway tag (e.g. `v0.0.1-test`) or run a
  manual dispatch per platform and confirm each artifact is produced and
  downloadable. Delete the test release/tag afterward.
- Confirm the Android APK installs on a device and the `.ipk` sideloads to the
  LG simulator/device (`ares-install`).

## Out of scope

- Store submission (App Store / Play Store / any app store).
- Code signing / notarization for desktop and iOS.
- Auto-update / release-channel infrastructure.
- Web deploy to a host (artifact only; deploy target not yet chosen).
