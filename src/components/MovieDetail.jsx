import { useState, useEffect, memo } from "react";
import { Image, Linking, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack, XStack, Text, ScrollView, Spinner } from "tamagui";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

const GradientOverlay = memo(() => (
  <View style={FILL} pointerEvents="none">
    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: "45%", backgroundColor: "rgba(0,0,0,0.82)" }} />
  </View>
));

const getTrailerUrl = (t) => {
  if (!t) return null;
  const m = t.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
  if (/^[A-Za-z0-9_-]{11}$/.test(t.trim())) return `https://www.youtube.com/watch?v=${t.trim()}`;
  return null;
};

export default function MovieDetail({ item, onBack, onPlay }) {
  const { watchHistory, isInMyList, addToMyList, removeFromMyList } = useApp();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);

  const streamId = item.stream_id ?? item.streamId;
  const name = item.name;
  const cover = item.stream_icon || item.cover || item.movie_image || null;

  const historyEntry = watchHistory.find(
    (h) => h.type === "movies" && String(h.streamId) === String(streamId)
  );
  const resumeTime = historyEntry?.currentTime || 0;

  const inFav = isInMyList("movies", streamId);
  const toggleFav = () => {
    if (inFav) removeFromMyList(`mylist_movies_${streamId}`);
    else addToMyList({ type: "movies", streamId, name, cover });
  };

  useEffect(() => {
    setInfo(null);
    iptvApi.getVODInfo(streamId).then(setInfo).catch(() => setInfo({}));
  }, [streamId]);

  const isLoading = info === null;
  const data = info?.info || {};
  const backdrop = data.backdrop_path?.[0] || data.cover_big || cover;
  const year = (data.releasedate || data.release_date || "").slice(0, 4);
  const trailer = getTrailerUrl(data.youtube_trailer);

  // TV / keyboard navigation
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e) => {
      if (e.key === "Escape" || e.keyCode === 27) onBack();
      else if ((e.key === "Enter" || e.keyCode === 13) && !isLoading) {
        handlePlay(resumeTime > 0 ? resumeTime : 0);
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [resumeTime, isLoading]);

  const handlePlay = (startTime) => {
    const url = iptvApi.buildStreamUrl("movie", streamId, item.container_extension || "mp4");
    onPlay({ type: "movies", streamId, name, url, cover, startTime });
  };

  return (
    <ScrollView flex={1} backgroundColor="#0A0E1A" contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <YStack width="100%" height={420} position="relative">
        {backdrop
          ? <Image source={{ uri: backdrop }} style={FILL} resizeMode="cover" />
          : <View style={[FILL, { backgroundColor: "#141A2E" }]} />}
        <GradientOverlay />

        <YStack position="absolute" top={insets.top + 8} left={16} zIndex={10} paddingVertical={8} paddingHorizontal={14} backgroundColor="rgba(0,0,0,0.55)" borderRadius={8} cursor="pointer" onPress={onBack} pressStyle={{ opacity: 0.8 }}>
          <Text color="#6C5CE7" fontSize={14} fontWeight="600">← Back</Text>
        </YStack>

        <YStack position="absolute" bottom={0} left={16} right={16} zIndex={5} paddingBottom={24}>
          <Text color="#fff" fontSize={28} fontWeight="900" letterSpacing={-0.5} marginBottom={10}>{name}</Text>

          {isLoading ? (
            <Spinner color="#6C5CE7" marginVertical={12} />
          ) : (
            <XStack alignItems="center" gap={8} marginBottom={16} flexWrap="wrap">
              {year ? <YStack borderWidth={1} borderColor="#28324E" borderRadius={4} paddingHorizontal={8} paddingVertical={3}><Text color="#7A86A8" fontSize={12}>{year}</Text></YStack> : null}
              {data.genre ? <YStack borderWidth={1} borderColor="#28324E" borderRadius={4} paddingHorizontal={8} paddingVertical={3}><Text color="#7A86A8" fontSize={12}>{data.genre.split(",")[0].trim()}</Text></YStack> : null}
              {data.rating ? <Text color="#ffd700" fontSize={13} fontWeight="600">⭐ {parseFloat(data.rating).toFixed(1)}</Text> : null}
              {data.age ? <YStack borderWidth={1} borderColor="#6C5CE7" borderRadius={4} paddingHorizontal={8} paddingVertical={3}><Text color="#6C5CE7" fontSize={12}>{data.age}</Text></YStack> : null}
            </XStack>
          )}

          <XStack alignItems="center" gap={10} flexWrap="wrap">
            {resumeTime > 0 ? (
              <>
                <YStack backgroundColor="#fff" paddingHorizontal={24} paddingVertical={12} borderRadius={8} cursor="pointer" onPress={() => handlePlay(resumeTime)} pressStyle={{ opacity: 0.85 }} hoverStyle={{ opacity: 0.9 }} animation="quick">
                  <Text color="#000" fontSize={15} fontWeight="700">▶  Continue</Text>
                </YStack>
                <YStack backgroundColor="rgba(40,40,60,0.85)" paddingHorizontal={20} paddingVertical={12} borderRadius={8} borderWidth={1} borderColor="#28324E" cursor="pointer" onPress={() => handlePlay(0)} pressStyle={{ opacity: 0.8 }} hoverStyle={{ borderColor: "#fff" }} animation="quick">
                  <Text color="#fff" fontSize={15} fontWeight="600">↺  From Start</Text>
                </YStack>
              </>
            ) : (
              <YStack backgroundColor="#fff" paddingHorizontal={24} paddingVertical={12} borderRadius={8} cursor="pointer" onPress={() => handlePlay(0)} pressStyle={{ opacity: 0.85 }} hoverStyle={{ opacity: 0.9 }} animation="quick">
                <Text color="#000" fontSize={15} fontWeight="700">▶  Play Now</Text>
              </YStack>
            )}
            {!isLoading && !!trailer && (
              <YStack backgroundColor="rgba(40,40,60,0.85)" paddingHorizontal={20} paddingVertical={12} borderRadius={8} borderWidth={1} borderColor="#28324E" cursor="pointer" onPress={() => Linking.openURL(trailer)} pressStyle={{ opacity: 0.8 }} hoverStyle={{ borderColor: "#fff" }} animation="quick">
                <Text color="#fff" fontSize={15} fontWeight="600">🎬  Trailer</Text>
              </YStack>
            )}
            <YStack
              backgroundColor={inFav ? "rgba(108, 92, 231,0.15)" : "rgba(40,40,60,0.85)"}
              paddingHorizontal={20}
              paddingVertical={12}
              borderRadius={8}
              borderWidth={1}
              borderColor={inFav ? "#6C5CE7" : "#28324E"}
              cursor="pointer"
              onPress={toggleFav}
              pressStyle={{ opacity: 0.8 }}
              hoverStyle={{ borderColor: "#6C5CE7" }}
              animation="quick"
            >
              <Text color="#fff" fontSize={15} fontWeight="600">{inFav ? "♥  Saved" : "♡  Favorites"}</Text>
            </YStack>
          </XStack>
        </YStack>
      </YStack>

      {/* Meta */}
      {(data.description || data.plot || data.overview || data.cast || data.director) ? (
        <YStack paddingHorizontal={16} paddingTop={20} gap={10}>
          {(data.description || data.plot || data.overview) ? (
            <Text color="#7A86A8" fontSize={14} lineHeight={22} marginBottom={10}>
              {data.description || data.plot || data.overview}
            </Text>
          ) : null}
          {data.cast ? <Text color="#7A86A8" fontSize={13} lineHeight={20}><Text color="#fff" fontWeight="700">Cast  </Text>{data.cast}</Text> : null}
          {data.director ? <Text color="#7A86A8" fontSize={13} lineHeight={20}><Text color="#fff" fontWeight="700">Director  </Text>{data.director}</Text> : null}
        </YStack>
      ) : null}
    </ScrollView>
  );
}
