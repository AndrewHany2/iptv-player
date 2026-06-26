/**
 * Cross-platform UI primitives — web/TV implementation (raw DOM).
 *
 * Same prop API as the native primitives (and the old Tamagui surface) so
 * screens import the same names. Renders plain DOM elements — no Tamagui — so
 * the web/TV bundle stays light and old webOS Chromium has nothing to patch.
 *
 * `globalThis.__TV__` (set by tv/patch-index.js) is read directly rather than
 * via a hook so a grid of hundreds of cards pays no per-node context cost, and
 * so hover/animation effects are dropped on TV where they cause jank.
 */
import { forwardRef } from "react";
import { splitStyleProps, toWebStyle } from "./styleProps";

const isTV = () => typeof globalThis !== "undefined" && globalThis.__TV__ === true;

// Web-only-or-native-only props that should never reach the DOM element.
const DROP = ["pressStyle", "hoverStyle", "animation", "space", "onPress", "cursor"];

function clampStyle(numberOfLines) {
  if (!numberOfLines) return null;
  if (numberOfLines === 1) {
    return { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  }
  return {
    display: "-webkit-box", WebkitLineClamp: numberOfLines,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  };
}

function buildStack(defaultDirection) {
  return forwardRef(function Stack(props, ref) {
    const { styleProps, rest } = splitStyleProps(props);
    const { onPress, cursor, style, children, ...other } = rest;
    for (const k of DROP) delete other[k];

    const css = {
      display: "flex", flexDirection: defaultDirection,
      ...toWebStyle(styleProps),
      ...(onPress ? { cursor: cursor || "pointer" } : cursor ? { cursor } : null),
      ...style,
    };
    return <div ref={ref} onClick={onPress} style={css} {...other}>{children}</div>;
  });
}

export const YStack = buildStack("column");
export const XStack = buildStack("row");
export const Stack = buildStack("column");

export const Text = forwardRef(function Text(props, ref) {
  const { styleProps, rest } = splitStyleProps(props);
  const { style, children, numberOfLines, onPress, cursor, ...other } = rest;
  for (const k of DROP) delete other[k];
  const css = { margin: 0, ...toWebStyle(styleProps), ...clampStyle(numberOfLines), ...(cursor ? { cursor } : null), ...style };
  return <div ref={ref} onClick={onPress} style={css} {...other}>{children}</div>;
});

export const Input = forwardRef(function Input(props, ref) {
  const { styleProps, rest } = splitStyleProps(props);
  const { style, value, onChangeText, onChange, placeholderTextColor, ...other } = rest;
  for (const k of DROP) delete other[k];
  // Bridge RN's onChangeText to the DOM onChange.
  const handleChange = onChangeText ? (e) => onChangeText(e.target.value) : onChange;
  return (
    <input
      ref={ref}
      value={value}
      onChange={handleChange}
      style={{ outline: "none", border: "none", ...toWebStyle(styleProps), ...style }}
      {...other}
    />
  );
});

let keyframesInjected = false;
function ensureSpinKeyframes() {
  if (keyframesInjected || typeof document === "undefined") return;
  keyframesInjected = true;
  const el = document.createElement("style");
  el.textContent = "@keyframes _ui_spin{to{transform:rotate(360deg)}}";
  document.head.appendChild(el);
}

export const Spinner = forwardRef(function Spinner({ size = "small", color = "#6C5CE7", ...rest }, ref) {
  ensureSpinKeyframes();
  const d = size === "large" ? 36 : 20;
  // On TV animations are disabled globally; the ring still reads as a "loading" affordance.
  return (
    <div
      ref={ref}
      style={{
        width: d, height: d, borderRadius: "50%",
        border: `${Math.max(2, d / 10)}px solid rgba(255,255,255,0.18)`,
        borderTopColor: color,
        animation: isTV() ? undefined : "_ui_spin 0.8s linear infinite",
      }}
      {...rest}
    />
  );
});

export const ScrollView = forwardRef(function ScrollView(props, ref) {
  const { styleProps, rest } = splitStyleProps(props);
  const { style, children, horizontal, contentContainerStyle, onScroll,
    showsHorizontalScrollIndicator, showsVerticalScrollIndicator,
    scrollEventThrottle, removeClippedSubviews, ...other } = rest;
  for (const k of DROP) delete other[k];
  const css = {
    display: "flex",
    flexDirection: horizontal ? "row" : "column",
    overflowX: horizontal ? "auto" : "hidden",
    overflowY: horizontal ? "hidden" : "auto",
    // A flex-column scroller needs min-height:0 to actually scroll instead of
    // growing to content height and overflowing its parent. Safe default;
    // callers can still override via styleProps/style.
    ...(horizontal ? null : { minHeight: 0 }),
    ...toWebStyle(styleProps),
    ...style,
    ...contentContainerStyle,
  };
  // Translate the DOM scroll event into the RN ScrollView shape callers expect
  // (nativeEvent.contentOffset / layoutMeasurement / contentSize).
  const handleScroll = onScroll ? (e) => {
    const t = e.currentTarget;
    onScroll({
      nativeEvent: {
        contentOffset: { x: t.scrollLeft, y: t.scrollTop },
        layoutMeasurement: { width: t.clientWidth, height: t.clientHeight },
        contentSize: { width: t.scrollWidth, height: t.scrollHeight },
      },
    });
  } : undefined;
  return <div ref={ref} onScroll={handleScroll} style={css} {...other}>{children}</div>;
});
