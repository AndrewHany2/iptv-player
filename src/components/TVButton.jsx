import { isTV } from "../utils/tvOptimizations";

/**
 * High-performance button for TV
 * Uses native HTML button on TV, Tamagui on desktop
 */
export default function TVButton({
  children,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style = {},
  className = "",
  ...props
}) {
  const handleClick = (e) => {
    if (disabled || loading) return;
    onPress?.(e);
  };

  // TV: Use native HTML button for instant response
  if (isTV) {
    const baseStyle = {
      padding: "12px 24px",
      borderRadius: "8px",
      border: "none",
      cursor: disabled || loading ? "not-allowed" : "pointer",
      fontSize: "15px",
      fontWeight: "600",
      transition: "opacity 0.1s",
      opacity: disabled || loading ? 0.5 : 1,
      fontFamily: "system-ui, -apple-system, sans-serif",
      ...style,
    };

    const variantStyles = {
      primary: {
        background: "#fff",
        color: "#000",
      },
      secondary: {
        background: "rgba(40,40,60,0.85)",
        color: "#fff",
        border: "1px solid #3a3a5e",
      },
      danger: {
        background: "#e94560",
        color: "#fff",
      },
      ghost: {
        background: "transparent",
        color: "#fff",
        border: "1px solid #3a3a5e",
      },
    };

    return (
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={className}
        style={{ ...baseStyle, ...variantStyles[variant] }}
        {...props}
      >
        {loading ? "..." : children}
      </button>
    );
  }

  // Desktop: Use Tamagui (imported dynamically to avoid issues)
  const { YStack, Text } = require("tamagui");

  const variantProps = {
    primary: {
      backgroundColor: "#fff",
      color: "#000",
    },
    secondary: {
      backgroundColor: "rgba(40,40,60,0.85)",
      borderWidth: 1,
      borderColor: "#3a3a5e",
      color: "#fff",
    },
    danger: {
      backgroundColor: "#e94560",
      color: "#fff",
    },
    ghost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "#3a3a5e",
      color: "#fff",
    },
  };

  return (
    <YStack
      paddingHorizontal={24}
      paddingVertical={12}
      borderRadius={8}
      cursor={disabled || loading ? "not-allowed" : "pointer"}
      onPress={handleClick}
      opacity={disabled || loading ? 0.5 : 1}
      pressStyle={{ opacity: 0.85 }}
      hoverStyle={{ opacity: 0.9 }}
      animation="quick"
      {...variantProps[variant]}
      {...props}
    >
      <Text fontSize={15} fontWeight="600" color={variantProps[variant].color}>
        {loading ? "..." : children}
      </Text>
    </YStack>
  );
}

// Made with Bob
