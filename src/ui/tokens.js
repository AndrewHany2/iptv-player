/**
 * Aurora design tokens — the single source of truth for the app's visual identity.
 *
 * Authored once here and consumed by JS (the cross-platform primitives, native
 * StyleSheet, and any new component). The heavily-shared legacy CSS uses the
 * same values as LITERAL hex (not CSS `var()`) so old webOS Chromium — which
 * can't be assumed to support custom properties — renders correctly at zero
 * runtime cost. Keep CSS literals in sync with the values below.
 */
import { Platform } from "react-native";

export const colors = {
  bg: "#0A0E1A",        // midnight — app background
  surface: "#141A2E",   // slate — cards, bars
  surface2: "#1B2236",  // elevated — modals, inputs, chips
  border: "#28324E",    // hairlines / card borders
  accent: "#6C5CE7",    // indigo — primary actions, active state
  accent2: "#22D3EE",   // cyan — focus ring, gradient end
  text: "#EAF0FF",      // ice — primary text
  muted: "#7A86A8",     // steel — secondary text
  faint: "#4A5575",     // dimmer steel — placeholders, disabled text
  danger: "#E5484D",    // red — destructive actions, errors
  success: "#6ABF69",   // green — confirmations, online state
  rating: "#FFD700",    // gold — star ratings
};

/** Accent (indigo) at a given alpha — focus glows, hover washes, scrims.
 *  e.g. accentAlpha(0.18) → 'rgba(108,92,231,0.18)'. Keep in sync with accent. */
export const accentAlpha = (a) => "rgba(108,92,231," + a + ")";

/** Static gradient — used for the nav band and active/selected states.
 *  Never animated (TV strips animations and would jank). */
export const gradient = {
  css: "linear-gradient(100deg, #6C5CE7, #22D3EE)",
  from: "#6C5CE7",
  to: "#22D3EE",
  angle: 100,
};

export const radii = { sm: 8, md: 14, lg: 20, card: 10, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const fonts = {
  // Display (titles, eyebrows) → Space Grotesk; body → Inter. System fallback
  // keeps the UI legible if a webfont fails to load on TV.
  display: 'SpaceGrotesk, "Space Grotesk", -apple-system, "Segoe UI", Roboto, sans-serif',
  body: 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif',
};

// Type ramp, authored at the 1920×1080 reference — pass through ss() at call
// sites that need to scale on TV/web (see src/utils/scaleSize.js).
export const fontSizes = { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, xxl: 40 };

// String weights so they drop straight into both CSS and RN style (RN wants
// strings; CSS accepts them).
export const fontWeights = { regular: "400", medium: "600", bold: "700" };

export const lineHeights = { tight: 1.2, normal: 1.4, relaxed: 1.6 };

// Stacking order for layered surfaces. Keep gaps so ad-hoc values can slot
// between tiers without renumbering.
export const zIndex = { base: 0, dropdown: 100, overlay: 1000, modal: 1100, toast: 1200 };

/** Elevation presets. Platform-aware: native uses iOS shadow* + Android
 *  elevation; web/TV return an empty object because the legacy CSS owns box-shadow
 *  there (and TV strips shadows for perf), so spreading these is a safe no-op. */
export const shadows = {
  card: Platform.select({
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    default: {},
  }),
  modal: Platform.select({
    native: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    default: {},
  }),
};

export default {
  colors, gradient, radii, space, fonts,
  fontSizes, fontWeights, lineHeights, zIndex, shadows, accentAlpha,
};
