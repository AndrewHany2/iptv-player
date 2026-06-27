import { useCallback, useRef } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable } from "react-native";
import PosterCard from "./PosterCard.native";

/**
 * Horizontal content rail — native. Lazy-loads its items on first layout
 * (onVisible) and paginates on horizontal scroll (onLoadMore). View-only; all
 * data/state comes from the feature hook (e.g. useMovies).
 */
export default function ContentShelf({
  title, count, items, hasMore, loadingMore, manual,
  onVisible, onPress, onTitlePress, onLoadMore, renderItem,
}) {
  const hasLoaded = useRef(false);
  const handleLayout = useCallback(() => {
    if (!hasLoaded.current && items === null && !manual) {
      hasLoaded.current = true;
      onVisible?.();
    }
  }, [items, manual, onVisible]);

  if (items !== null && !items.length) return null;

  return (
    <View style={{ paddingTop: 20, paddingBottom: 8 }} onLayout={handleLayout}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 }}>
        <Pressable onPress={() => onTitlePress?.()}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", letterSpacing: -0.3 }}>
            {title} <Text style={{ color: "#6C5CE7", fontSize: 16 }}>›</Text>
          </Text>
        </Pressable>
        {count != null && <Text style={{ color: "#555", fontSize: 13, fontWeight: "500" }}>{count}</Text>}
      </View>

      {items === null ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 18 }}>
          <ActivityIndicator size="small" color="#6C5CE7" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          removeClippedSubviews
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          scrollEventThrottle={200}
          onScroll={(e) => {
            if (!hasMore || loadingMore) return;
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            if (contentSize.width - contentOffset.x - layoutMeasurement.width < 400) onLoadMore?.();
          }}
        >
          {items.map((item) => (renderItem
            ? renderItem(item)
            : <PosterCard key={String(item.stream_id ?? item.id)} item={item} onPress={onPress} />))}
          {loadingMore && (
            <View style={{ width: 60, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="small" color="#6C5CE7" />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
