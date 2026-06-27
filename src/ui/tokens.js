/**
 * Aurora design tokens — the single source of truth for the app's visual identity.
 *
 * Authored once here and consumed by JS (the cross-platform primitives, native
 * StyleSheet, and any new component). The heavily-shared legacy CSS uses the
 * same values as LITERAL hex (not CSS `var()`) so old webOS Chromium — which
 * can't be assumed to support custom properties — renders correctly at zero
 * runtime cost. Keep CSS literals in sync with the values below.
 */
export const colors = {
  bg: "#0A0E1A",        // midnight — app background
  surface: "#141A2E",   // slate — cards, bars
  surface2: "#1B2236",  // elevated — modals, inputs, chips
  border: "#28324E",    // hairlines / card borders
  accent: "#6C5CE7",    // indigo — primary actions, active state
  accent2: "#22D3EE",   // cyan — focus ring, gradient end
  text: "#EAF0FF",      // ice — primary text
  muted: "#7A86A8",     // steel — secondary text
};

/** Static gradient — used for the nav band and active/selected states.
 *  Never animated (TV strips animations and would jank). */
export const gradient = {
  css: "linear-gradient(100deg, #6C5CE7, #22D3EE)",
  from: "#6C5CE7",
  to: "#22D3EE",
  angle: 100,
};

export const radii = { sm: 8, md: 14, lg: 20, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const fonts = {
  // Display (titles, eyebrows) → Space Grotesk; body → Inter. System fallback
  // keeps the UI legible if a webfont fails to load on TV.
  display: 'SpaceGrotesk, "Space Grotesk", -apple-system, "Segoe UI", Roboto, sans-serif',
  body: 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif',
};

export default { colors, gradient, radii, space, fonts };
