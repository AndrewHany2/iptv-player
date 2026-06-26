import { memo } from "react";
import { View, Image, Text, Pressable, StyleSheet } from "react-native";

/**
 * Poster card — native. Shared across Movies/Series/LiveTV grids and shelves.
 * Accepts the raw IPTV item; reads the same fields the old inline cards did.
 */
function PosterCardNative({ item, onPress, width = 130 }) {
  const poster = item.stream_icon || item.cover || item.movie_image || null;
  const ratingValue = item.tmdb_rating ?? item.rating;
  const ratingLabel = ratingValue != null && ratingValue !== ""
    ? (typeof ratingValue === "number" ? ratingValue.toFixed(1) : ratingValue)
    : null;

  return (
    <Pressable onPress={() => onPress?.(item)} style={({ pressed }) => [{ width }, pressed && { opacity: 0.8 }]}>
      <View style={[styles.poster, { width, height: (width * 3) / 2 }]}>
        {poster
          ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#141A2E" }]} />}
        <View style={[styles.badge, { right: 8 }]}>
          <Text style={styles.badgeText}>HD</Text>
        </View>
        {ratingLabel && (
          <View style={[styles.badge, styles.ratingBadge, { left: 8 }]}>
            <Text style={styles.ratingText}>⭐ {ratingLabel}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={styles.title}>{item.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  poster: { borderRadius: 14, backgroundColor: "#141A2E", overflow: "hidden", position: "relative" },
  badge: { position: "absolute", top: 8, zIndex: 4, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  ratingBadge: { backgroundColor: "rgba(0,0,0,0.7)" },
  badgeText: { color: "#ccc", fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  ratingText: { color: "#ffd700", fontSize: 9, fontWeight: "700" },
  title: { color: "#fff", fontSize: 12, fontWeight: "600", marginTop: 8, lineHeight: 16 },
});

export default memo(PosterCardNative);
