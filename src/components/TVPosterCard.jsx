import { useState } from "react";
import { isTV } from "../utils/tvOptimizations";
import ProxiedImage from "./ProxiedImage";

/**
 * High-performance poster card for TV
 * Uses native HTML/CSS on TV for better performance
 */
export default function TVPosterCard({ item, onPress, isFocused }) {
  const [imageError, setImageError] = useState(false);
  const poster = item.stream_icon || item.cover || item.movie_image || item.backdrop_path || null;
  const ratingValue = item.tmdb_rating ?? item.rating;
  const ratingLabel =
    ratingValue != null && ratingValue !== ""
      ? typeof ratingValue === "number"
        ? ratingValue.toFixed(1)
        : ratingValue
      : null;

  const handleClick = () => {
    onPress(item);
  };

  // TV: Use native HTML/CSS for instant response
  if (isTV) {
    return (
      <div
        onClick={handleClick}
        style={{
          width: "200px",
          cursor: "pointer",
          outline: isFocused ? "2px solid #e94560" : "none",
          outlineOffset: "2px",
          borderRadius: "8px",
          transition: "transform 0.1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <div
          style={{
            width: "200px",
            aspectRatio: "2/3",
            borderRadius: "8px",
            backgroundColor: "#16213e",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {poster && !imageError ? (
            <img
              src={poster}
              alt={item.name}
              onError={() => setImageError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#16213e",
                fontSize: "32px",
              }}
            >
              🎬
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              zIndex: 4,
              backgroundColor: "rgba(0,0,0,0.65)",
              borderRadius: "4px",
              padding: "2px 5px",
            }}
          >
            <span
              style={{
                color: "#ccc",
                fontSize: "9px",
                fontWeight: "700",
                letterSpacing: "0.5px",
              }}
            >
              HD
            </span>
          </div>

          {ratingLabel && (
            <div
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                zIndex: 4,
                backgroundColor: "rgba(0,0,0,0.7)",
                borderRadius: "4px",
                padding: "2px 5px",
              }}
            >
              <span
                style={{ color: "#ffd700", fontSize: "9px", fontWeight: "700" }}
              >
                ⭐ {ratingLabel}
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            color: "#fff",
            fontSize: "13px",
            fontWeight: "600",
            marginTop: "10px",
            lineHeight: "17px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.name}
        </div>
      </div>
    );
  }

  // Desktop: Use Tamagui
  const { YStack, Text } = require("tamagui");
  const { View } = require("react-native");

  return (
    <YStack
      width={200}
      cursor="pointer"
      onPress={handleClick}
      pressStyle={{ opacity: 0.8 }}
      hoverStyle={{ scale: 1.03 }}
      animation="quick"
    >
      <YStack
        width={200}
        aspectRatio={2 / 3}
        borderRadius={8}
        backgroundColor="#16213e"
        overflow="hidden"
        position="relative"
      >
        <ProxiedImage
          source={{ uri: poster }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
          fallbackColor="#16213e"
        />
        <YStack
          position="absolute"
          top={8}
          right={8}
          zIndex={4}
          backgroundColor="rgba(0,0,0,0.65)"
          borderRadius={4}
          paddingHorizontal={5}
          paddingVertical={2}
        >
          <Text color="#ccc" fontSize={9} fontWeight="700" letterSpacing={0.5}>
            HD
          </Text>
        </YStack>
        {ratingLabel && (
          <YStack
            position="absolute"
            top={8}
            left={8}
            zIndex={4}
            backgroundColor="rgba(0,0,0,0.7)"
            borderRadius={4}
            paddingHorizontal={5}
            paddingVertical={2}
          >
            <Text color="#ffd700" fontSize={9} fontWeight="700">
              ⭐ {ratingLabel}
            </Text>
          </YStack>
        )}
      </YStack>
      <Text
        color="#fff"
        fontSize={13}
        fontWeight="600"
        marginTop={10}
        lineHeight={17}
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </YStack>
  );
}

