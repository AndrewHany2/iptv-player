/**
 * Cross-platform UI primitives — native (iOS/Android) implementation.
 *
 * These replace the small Tamagui surface the screens used
 * (YStack/XStack/Stack/Text/Input/Spinner/ScrollView) with plain React Native
 * primitives, while keeping Tamagui's inline style-prop API so migrating a
 * screen is a mechanical import swap. See ./styleProps.js for the prop plumbing.
 */
import { forwardRef } from "react";
import {
  View, Text as RNText, TextInput, Pressable,
  ActivityIndicator, ScrollView as RNScrollView,
} from "react-native";
import { splitStyleProps } from "./styleProps";
import { colors } from "./tokens";

// Behavioural props that are web-only no-ops on native (cursor/hover/animation).
const DROP = new Set(["cursor", "hoverStyle", "animation", "space"]);

function buildStack(defaultDirection) {
  return forwardRef(function Stack(props, ref) {
    const { styleProps, rest } = splitStyleProps(props);
    const { onPress, pressStyle, style, children, ...other } = rest;
    for (const k of DROP) delete other[k];

    const base = { flexDirection: defaultDirection, ...styleProps };
    const composed = [base, style];

    if (onPress) {
      return (
        <Pressable
          ref={ref}
          onPress={onPress}
          style={({ pressed }) => [...composed, pressed && (pressStyle ?? { opacity: 0.8 })]}
          {...other}
        >
          {children}
        </Pressable>
      );
    }
    return <View ref={ref} style={composed} {...other}>{children}</View>;
  });
}

export const YStack = buildStack("column");
export const XStack = buildStack("row");
export const Stack = buildStack("column");

export const Text = forwardRef(function Text(props, ref) {
  const { styleProps, rest } = splitStyleProps(props);
  const { style, children, numberOfLines, onPress, ...other } = rest;
  for (const k of DROP) delete other[k];
  return (
    <RNText ref={ref} numberOfLines={numberOfLines} onPress={onPress} style={[styleProps, style]} {...other}>
      {children}
    </RNText>
  );
});

export const Input = forwardRef(function Input(props, ref) {
  const { styleProps, rest } = splitStyleProps(props);
  const { style, placeholderTextColor, ...other } = rest;
  for (const k of DROP) delete other[k];
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? colors.muted}
      style={[styleProps, style]}
      {...other}
    />
  );
});

export const Spinner = forwardRef(function Spinner({ size = "small", color = colors.accent, ...rest }, ref) {
  const mapped = size === "large" ? "large" : "small";
  return <ActivityIndicator ref={ref} size={mapped} color={color} {...rest} />;
});

export const ScrollView = forwardRef(function ScrollView(props, ref) {
  const { styleProps, rest } = splitStyleProps(props);
  const { style, children, ...other } = rest;
  for (const k of DROP) delete other[k];
  return (
    <RNScrollView ref={ref} style={[styleProps, style]} {...other}>
      {children}
    </RNScrollView>
  );
});
