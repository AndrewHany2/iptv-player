import { useState, useEffect } from "react";
import { View, SectionList } from "react-native";
import { YStack, XStack, Text, ScrollView, Spinner } from "tamagui";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import ProxiedImage from "./ProxiedImage";
import { usePlatform } from "../platform";

const FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

const getTrailerUrl = (t) => {
  if (!t) return null;
  const m = t.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  if (/^[A-Za-z0-9_-]{11}$/.test(t.trim()))
    return `https://www.youtube-nocookie.com/embed/${t.trim()}`;
  return null;
};

const getEpisodeNumber = (ep) => {
  let num = ep.episode_num;
  if (ep.title) {
    const m = ep.title.match(/S\d+E(\d+)/i) || ep.title.match(/E(\d+)/i);
    if (m?.[1]) num = m[1];
  }
  return num;
};

export default function SeriesDetail({ item, onBack, onPlayEpisode }) {
  const { isTV } = usePlatform();
  const { watchHistory, isInMyList, addToMyList, removeFromMyList } = useApp();
  const [info, setInfo] = useState(null);
  const [episodes, setEpisodes] = useState({});
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  const seriesId = item.seriesId ?? item.id ?? item.series_id;
  const seriesName = item.seriesName || item.name;
  const cover = item.cover || item.stream_icon || item.movie_image || null;

  const historyEntry = watchHistory.find(
    (h) => h.type === "series" && String(h.seriesId) === String(seriesId),
  );

  const inFav = isInMyList("series", seriesId);
  const toggleFav = () => {
    if (inFav) removeFromMyList(`mylist_series_${seriesId}`);
    else
      addToMyList({
        type: "series",
        streamId: seriesId,
        seriesId,
        name: seriesName,
        cover,
      });
  };

  useEffect(() => {
    setInfo(null);
    setEpisodes({});
    setShowEpisodes(false);
    setShowTrailer(false);
    iptvApi
      .getSeriesInfo(seriesId)
      .then((result) => {
        setInfo(result.info || {});
        setEpisodes(result.episodes || {});
      })
      .catch(() => setInfo({}));
  }, [seriesId]);

  const isLoading = info === null;

  // TV / keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" || e.keyCode === 27) {
        if (showEpisodes) setShowEpisodes(false);
        else onBack();
      } else if (
        (e.key === "Enter" || e.keyCode === 13) &&
        !showEpisodes &&
        !isLoading
      ) {
        if (historyEntry) handleContinue();
        else setShowEpisodes(true);
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [showEpisodes, isLoading, historyEntry]);
  const data = info || {};
  const rawBp = data.backdrop_path;
  let backdropFromApi = null;
  if (Array.isArray(rawBp)) backdropFromApi = rawBp[0];
  else if (typeof rawBp === "string") backdropFromApi = rawBp;
  const backdrop = cover || backdropFromApi || data.cover;
  const year = (data.release_date || data.releasedate || "").slice(0, 4);
  const trailer = getTrailerUrl(data.youtube_trailer);

  const handleEpisodePress = (ep, seasonNum) => {
    const epNum = getEpisodeNumber(ep);
    const url = iptvApi.buildStreamUrl(
      "series",
      ep.id,
      ep.container_extension || "mp4",
    );
    const epHistory = watchHistory.find(
      (h) => h.type === "series" && String(h.streamId) === String(ep.id),
    );
    onPlayEpisode({
      type: "series",
      streamId: ep.id,
      seriesId,
      seriesName,
      name: `${seriesName} — S${String(seasonNum).padStart(2, "0")}E${String(epNum).padStart(2, "0")}`,
      url,
      cover,
      seasonNum,
      episodeNum: epNum,
      seriesSeasons: episodes,
      startTime: epHistory?.currentTime || 0,
    });
  };

  const handleContinue = () => {
    const url =
      historyEntry.url ||
      iptvApi.buildStreamUrl("series", historyEntry.streamId, "mp4");
    onPlayEpisode({
      ...historyEntry,
      url,
      startTime: historyEntry.currentTime || 0,
    });
  };

  // ── Episodes view ─────────────────────────────────────────────────────────
  if (showEpisodes) {
    const sections = Object.keys(episodes)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((num) => ({
        title: `Season ${num}`,
        seasonNum: num,
        data: episodes[num] || [],
      }));

    // TV-specific sizing for episode list
    const epBackSize = isTV ? 20 : 14;
    const epTitleSize = isTV ? 28 : 20;
    const epHeaderSize = isTV ? 22 : 15;
    const epNumSize = isTV ? 18 : 12;
    const epNameSize = isTV ? 20 : 14;
    const epDurationSize = isTV ? 16 : 12;
    const epDescSize = isTV ? 18 : 13;
    const epPadH = isTV ? 80 : 48;

    return (
      <YStack flex={1} backgroundColor="#0f0f23">
        <XStack
          alignItems="center"
          gap={isTV ? 20 : 14}
          paddingHorizontal={epPadH}
          paddingVertical={isTV ? 28 : 18}
          borderBottomWidth={isTV ? 2 : 1}
          borderBottomColor="#2a2a4e"
        >
          <YStack
            paddingVertical={isTV ? 12 : 8}
            paddingHorizontal={isTV ? 20 : 14}
            backgroundColor="#1a1a2e"
            borderRadius={isTV ? 12 : 8}
            cursor="pointer"
            onPress={() => setShowEpisodes(false)}
            pressStyle={{ opacity: 0.8 }}
          >
            <Text
              color="#e94560"
              fontSize={epBackSize}
              fontWeight={isTV ? "700" : "600"}
            >
              ← Back
            </Text>
          </YStack>
          <Text
            color="#fff"
            fontSize={epTitleSize}
            fontWeight="700"
            flex={1}
            numberOfLines={1}
          >
            {seriesName}
          </Text>
        </XStack>
        <SectionList
          sections={sections}
          keyExtractor={(ep) => String(ep.id)}
          contentContainerStyle={{
            paddingHorizontal: epPadH,
            paddingVertical: isTV ? 24 : 12,
            paddingBottom: 80,
          }}
          renderSectionHeader={({ section: { title } }) => (
            <YStack
              backgroundColor="#16213e"
              paddingHorizontal={isTV ? 20 : 14}
              paddingVertical={isTV ? 16 : 10}
              marginBottom={isTV ? 12 : 6}
              marginTop={isTV ? 20 : 12}
              borderRadius={isTV ? 12 : 8}
            >
              <Text color="#e94560" fontSize={epHeaderSize} fontWeight="700">
                {title}
              </Text>
            </YStack>
          )}
          renderItem={({ item: ep, section }) => (
            <YStack
              backgroundColor="#1a1a2e"
              borderRadius={isTV ? 14 : 10}
              padding={isTV ? 20 : 12}
              marginBottom={isTV ? 12 : 6}
              borderWidth={isTV ? 2 : 1}
              borderColor="#2a2a4e"
              cursor="pointer"
              onPress={() => handleEpisodePress(ep, section.seasonNum)}
              pressStyle={{ opacity: 0.8 }}
              hoverStyle={{ borderColor: "#e94560" }}
              animation="quick"
            >
              <XStack
                alignItems="center"
                marginBottom={isTV && ep.info?.plot ? 12 : 0}
              >
                <YStack
                  backgroundColor="#e94560"
                  borderRadius={isTV ? 10 : 6}
                  paddingHorizontal={isTV ? 14 : 8}
                  paddingVertical={isTV ? 8 : 4}
                  marginRight={isTV ? 16 : 12}
                >
                  <Text color="#fff" fontSize={epNumSize} fontWeight="700">
                    E{getEpisodeNumber(ep)}
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text
                    color="#fff"
                    fontSize={epNameSize}
                    fontWeight={isTV ? "700" : "600"}
                    numberOfLines={1}
                  >
                    {ep.title || "Untitled"}
                  </Text>
                  {!!ep.info?.duration && (
                    <Text
                      color="#888"
                      fontSize={epDurationSize}
                      marginTop={isTV ? 6 : 2}
                    >
                      {ep.info.duration}
                    </Text>
                  )}
                </YStack>
                <Text
                  color="#e94560"
                  fontSize={isTV ? 24 : 16}
                  marginLeft={isTV ? 16 : 8}
                >
                  ▶
                </Text>
              </XStack>
              {isTV && ep.info?.plot && (
                <Text
                  color="#aaa"
                  fontSize={epDescSize}
                  lineHeight={isTV ? 28 : 20}
                  numberOfLines={2}
                  marginTop={8}
                >
                  {ep.info.plot}
                </Text>
              )}
            </YStack>
          )}
        />
      </YStack>
    );
  }

  // TV-specific sizing
  const heroHeight = isTV ? 700 : 520;
  const titleSize = isTV ? 56 : 40;
  const backSize = isTV ? 22 : 14;
  const metaSize = isTV ? 18 : 12;
  const ratingSize = isTV ? 20 : 13;
  const buttonTextSize = isTV ? 22 : 15;
  const buttonPadH = isTV ? 40 : 28;
  const buttonPadV = isTV ? 20 : 13;
  const descSize = isTV ? 24 : 15;
  const descLineHeight = isTV ? 38 : 24;
  const castSize = isTV ? 20 : 14;
  const castLineHeight = isTV ? 32 : 20;
  const sectionPadH = isTV ? 80 : 48;

  // ── Hero / detail view ────────────────────────────────────────────────────
  return (
    <ScrollView
      flex={1}
      backgroundColor="#0f0f23"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      <YStack
        width="100%"
        height={heroHeight}
        position="relative"
        overflow="hidden"
      >
        <ProxiedImage
          source={{ uri: backdrop }}
          style={FILL}
          resizeMode="cover"
          fallbackColor="#16213e"
        />
        {/* CSS gradient — keep as raw View; Tamagui doesn't forward the `background` CSS prop */}
        <View
          style={[
            FILL,
            {
              background:
                "linear-gradient(to top, #0f0f23 0%, rgba(15,15,35,0.6) 55%, rgba(15,15,35,0.15) 100%)",
            },
          ]}
        />

        <YStack
          position="absolute"
          top={isTV ? 40 : 20}
          left={sectionPadH}
          zIndex={10}
          paddingVertical={isTV ? 14 : 8}
          paddingHorizontal={isTV ? 24 : 14}
          backgroundColor="rgba(0,0,0,0.55)"
          borderRadius={isTV ? 12 : 8}
          cursor="pointer"
          onPress={onBack}
          pressStyle={{ opacity: 0.8 }}
        >
          <Text
            color="#e94560"
            fontSize={backSize}
            fontWeight={isTV ? "700" : "600"}
          >
            ← Back
          </Text>
        </YStack>

        <YStack
          position="absolute"
          bottom={0}
          left={sectionPadH}
          right={sectionPadH}
          zIndex={5}
          paddingBottom={isTV ? 60 : 40}
        >
          <Text
            color="#fff"
            fontSize={titleSize}
            fontWeight="900"
            letterSpacing={isTV ? -1.5 : -1}
            marginBottom={isTV ? 20 : 12}
          >
            {seriesName}
          </Text>

          {isLoading ? (
            <Spinner color="#e94560" marginVertical={12} />
          ) : (
            <XStack
              alignItems="center"
              gap={8}
              marginBottom={14}
              flexWrap="wrap"
            >
              {year ? (
                <YStack
                  borderWidth={isTV ? 2 : 1}
                  borderColor="#3a3a5e"
                  borderRadius={isTV ? 8 : 4}
                  paddingHorizontal={isTV ? 14 : 8}
                  paddingVertical={isTV ? 8 : 3}
                >
                  <Text
                    color="#aaa"
                    fontSize={metaSize}
                    fontWeight={isTV ? "600" : "400"}
                  >
                    {year}
                  </Text>
                </YStack>
              ) : null}
              {data.genre ? (
                <YStack
                  borderWidth={isTV ? 2 : 1}
                  borderColor="#3a3a5e"
                  borderRadius={isTV ? 8 : 4}
                  paddingHorizontal={isTV ? 14 : 8}
                  paddingVertical={isTV ? 8 : 3}
                >
                  <Text
                    color="#aaa"
                    fontSize={metaSize}
                    fontWeight={isTV ? "600" : "400"}
                  >
                    {data.genre.split(",")[0].trim()}
                  </Text>
                </YStack>
              ) : null}
              {data.rating ? (
                <Text
                  color="#ffd700"
                  fontSize={ratingSize}
                  fontWeight={isTV ? "700" : "600"}
                >
                  ⭐ {Number.parseFloat(data.rating).toFixed(1)}
                </Text>
              ) : null}
            </XStack>
          )}

          <XStack alignItems="center" gap={12} flexWrap="wrap">
            {historyEntry && (
              <YStack
                backgroundColor="#fff"
                paddingHorizontal={buttonPadH}
                paddingVertical={buttonPadV}
                borderRadius={isTV ? 12 : 8}
                cursor="pointer"
                onPress={handleContinue}
                pressStyle={{ opacity: 0.85 }}
                hoverStyle={{ opacity: 0.9 }}
                animation="quick"
              >
                <Text color="#000" fontSize={buttonTextSize} fontWeight="700">
                  {"▶  Continue"}
                  {historyEntry.seasonNum
                    ? ` S${historyEntry.seasonNum}E${String(historyEntry.episodeNum).padStart(2, "0")}`
                    : ""}
                </Text>
              </YStack>
            )}
            <YStack
              backgroundColor={historyEntry ? "rgba(40,40,60,0.85)" : "#fff"}
              paddingHorizontal={historyEntry ? (isTV ? 36 : 22) : buttonPadH}
              paddingVertical={buttonPadV}
              borderRadius={isTV ? 12 : 8}
              borderWidth={historyEntry ? (isTV ? 2 : 1) : 0}
              borderColor="#3a3a5e"
              cursor="pointer"
              onPress={() => setShowEpisodes(true)}
              pressStyle={{ opacity: 0.8 }}
              hoverStyle={{ borderColor: "#fff" }}
              animation="quick"
            >
              <Text
                color={historyEntry ? "#fff" : "#000"}
                fontSize={buttonTextSize}
                fontWeight={historyEntry ? "600" : "700"}
              >
                ☰ Browse Episodes
              </Text>
            </YStack>
            {!isLoading && !!trailer && (
              <YStack
                backgroundColor="rgba(40,40,60,0.85)"
                paddingHorizontal={isTV ? 36 : 22}
                paddingVertical={buttonPadV}
                borderRadius={isTV ? 12 : 8}
                borderWidth={isTV ? 2 : 1}
                borderColor="#3a3a5e"
                cursor="pointer"
                onPress={() => setShowTrailer((v) => !v)}
                pressStyle={{ opacity: 0.8 }}
                hoverStyle={{ borderColor: "#fff" }}
                animation="quick"
              >
                <Text color="#fff" fontSize={buttonTextSize} fontWeight="600">
                  {showTrailer ? "✕  Close Trailer" : "🎬  Watch Trailer"}
                </Text>
              </YStack>
            )}
            <YStack
              backgroundColor={
                inFav ? "rgba(233,69,96,0.15)" : "rgba(40,40,60,0.85)"
              }
              paddingHorizontal={isTV ? 36 : 22}
              paddingVertical={buttonPadV}
              borderRadius={isTV ? 12 : 8}
              borderWidth={isTV ? 2 : 1}
              borderColor={inFav ? "#e94560" : "#3a3a5e"}
              cursor="pointer"
              onPress={toggleFav}
              pressStyle={{ opacity: 0.8 }}
              hoverStyle={{ borderColor: "#e94560" }}
              animation="quick"
            >
              <Text color="#fff" fontSize={buttonTextSize} fontWeight="600">
                {inFav ? "♥  Saved" : "♡  Add to Favorites"}
              </Text>
            </YStack>
          </XStack>
        </YStack>
      </YStack>

      {showTrailer && !!trailer && (
        <YStack
          paddingHorizontal={sectionPadH}
          paddingTop={isTV ? 32 : 8}
          paddingBottom={isTV ? 40 : 24}
        >
          <iframe
            title={`${seriesName} trailer`}
            src={`${trailer}?autoplay=1&rel=0&modestbranding=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              width: "100%",
              height: isTV ? 600 : 420,
              border: "none",
              borderRadius: isTV ? 16 : 8,
              backgroundColor: "#000",
            }}
          />
        </YStack>
      )}

      {(data.plot ||
        data.description ||
        data.overview ||
        data.cast ||
        data.director) && (
        <YStack
          paddingHorizontal={sectionPadH}
          paddingTop={isTV ? 40 : 24}
          gap={isTV ? 20 : 10}
        >
          {(data.plot || data.description || data.overview) && (
            <Text
              color="#ccc"
              fontSize={descSize}
              lineHeight={descLineHeight}
              marginBottom={isTV ? 20 : 12}
            >
              {data.plot || data.description || data.overview}
            </Text>
          )}
          {data.cast && (
            <Text color="#aaa" fontSize={castSize} lineHeight={castLineHeight}>
              <Text color="#fff" fontWeight="700" fontSize={isTV ? 22 : 14}>
                Cast:{" "}
              </Text>
              {data.cast}
            </Text>
          )}
          {data.director && (
            <Text color="#aaa" fontSize={castSize} lineHeight={castLineHeight}>
              <Text color="#fff" fontWeight="700" fontSize={isTV ? 22 : 14}>
                Director:{" "}
              </Text>
              {data.director}
            </Text>
          )}
        </YStack>
      )}
    </ScrollView>
  );
}
