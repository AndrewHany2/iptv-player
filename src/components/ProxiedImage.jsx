import { useState } from "react";
import { Image, View, Text } from "react-native";

/**
 * Simplified Image component - loads directly for performance
 * Shows placeholder on error
 */
export default function ProxiedImage({
  source,
  style,
  resizeMode = "cover",
  fallbackColor = "#141A2E",
  showPlaceholder = true,
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setHasError(true);
  };

  const handleLoad = () => {
    setHasError(false);
  };

  // Show placeholder if no URL or error occurred
  if (!source?.uri || hasError) {
    if (!showPlaceholder) return null;

    return (
      <View style={[style, { backgroundColor: fallbackColor, justifyContent: "center", alignItems: "center" }]} {...props}>
        <Text style={{ color: "#555", fontSize: 32 }}>🎬</Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
}

