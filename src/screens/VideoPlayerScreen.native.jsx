import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Modal, StatusBar, Platform, TouchableOpacity, AppState } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as ScreenOrientation from "expo-screen-orientation";
import { YStack, XStack, Text, ScrollView, Spinner } from "tamagui";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import { createExpoVideoDriver } from "../playback/drivers/expoVideoDriver";
import { useResilientPlayback } from "../playback/useResilientPlayback";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayerScreen({ navigation }) {
  const { currentVideo, closeVideo, updateWatchProgress, addToWatchHistory, playVideo, flushProgress } = useApp();
  const progressIntervalRef = useRef(null);
  const hasAddedToHistory = useRef(false);

  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef(null);

  const isLive = currentVideo?.type === "live";

  // The expo-video player instance. The resilient-playback hook now owns the
  // initial load/seek/play (it drives load via the driver), so the init
  // callback only mirrors the player object — no auto-play here to avoid racing
  // the recovery machine's LOAD.
  const player = useVideoPlayer(
    currentVideo ? { uri: currentVideo.url } : null,
    () => {}
  );

  // Wrap the expo-video player in the engine-agnostic driver and feed it to the
  // shared recovery brain. The driver is stable for the lifetime of the player
  // instance; recreate it if the player object changes.
  const driver = useMemo(() => (player ? createExpoVideoDriver(player) : null), [player]);

  const playback = useResilientPlayback({
    driver,
    source: currentVideo ? { uri: currentVideo.url } : null,
    isLive,
    startTime: currentVideo?.startTime || 0,
    // AUTH-refresh hook. The recovery machine calls this once on a 401/403 before
    // retrying; a no-op here means the scheduled retry simply re-requests the same
    // signed URL (which forces a fresh handshake). A real credential-refresh would
    // live in AppContext (out of scope for this change) and re-issue the URL.
    refreshCredentials: () => {},
  });

  const isLoading = playback.status === "idle" || playback.status === "loading";
  const isRecovering = playback.isRecovering;
  const isFatal = playback.isFatal;

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => { resetControlsTimer(); return () => clearTimeout(controlsTimerRef.current); }, []);

  // Keep the screen awake while a video is mounted and lock to landscape;
  // restore both on unmount. Wrapped in try/catch so a missing native module
  // (e.g. a stripped build) never crashes playback.
  useEffect(() => {
    activateKeepAwakeAsync().catch(() => {});
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      try { deactivateKeepAwake(); } catch {}
      ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  // Flush watch progress when the app is backgrounded/inactivated — this is
  // the most common resume-loss case on mobile (the unmount cleanup never runs
  // when the OS suspends or kills the app). Push the current position first.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "background" && state !== "inactive") return;
      if (player && currentVideo && currentVideo.type !== "live") {
        updateWatchProgress(currentVideo.streamId, currentVideo.type, player.currentTime, Number.isFinite(player.duration) ? player.duration : 0);
      }
      flushProgress();
    });
    return () => sub.remove();
  }, [player, currentVideo, updateWatchProgress, flushProgress]);

  // Track discovery + the VOD progress interval. The recovery hook owns
  // loading/error/reconnecting state now, so this listener no longer touches
  // loading — it only mirrors available audio/subtitle tracks and (re)starts
  // the periodic progress write when the stream becomes ready.
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay") {
        try {
          if (player.availableAudioTracks?.length > 0) { setAudioTracks(player.availableAudioTracks); setSelectedAudio(player.audioTrack ?? null); }
          if (player.availableSubtitleTracks?.length > 0) setSubtitleTracks(player.availableSubtitleTracks);
        } catch {}
        if (currentVideo && currentVideo.type !== "live") {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = setInterval(() => {
            if (player && currentVideo) updateWatchProgress(currentVideo.streamId, currentVideo.type, player.currentTime, Number.isFinite(player.duration) ? player.duration : 0);
          }, 10000);
        }
      }
    });
    return () => { sub?.remove(); clearInterval(progressIntervalRef.current); };
  }, [player, currentVideo?.url, updateWatchProgress]);

  useEffect(() => {
    if (!currentVideo || hasAddedToHistory.current) return;
    if (currentVideo.type !== "live") {
      hasAddedToHistory.current = true;
      addToWatchHistory({ ...currentVideo, currentTime: currentVideo.startTime || 0 });
    }
  }, [currentVideo?.url]);

  useEffect(() => {
    hasAddedToHistory.current = false;
    setSpeed(1); setAudioTracks([]); setSubtitleTracks([]); setSelectedAudio(null); setSelectedSubtitle(null);
  }, [currentVideo?.url]);

  const getNextEpisode = useCallback(() => {
    if (!currentVideo || currentVideo.type !== "series" || !currentVideo.seriesSeasons) return null;
    const allEpisodes = Object.keys(currentVideo.seriesSeasons).map(Number).sort((a, b) => a - b)
      .flatMap((sNum) => [...(currentVideo.seriesSeasons[String(sNum)] || [])].sort((a, b) => Number(a.episode_num) - Number(b.episode_num)).map((ep) => ({ ...ep, seasonNum: String(sNum) })));
    const currentIdx = allEpisodes.findIndex((ep) => String(ep.id) === String(currentVideo.streamId));
    if (currentIdx === -1 || currentIdx >= allEpisodes.length - 1) return null;
    const next = allEpisodes[currentIdx + 1];
    return { episode: next, seasonNum: next.seasonNum };
  }, [currentVideo]);

  const handleNextEpisode = useCallback(() => {
    const next = getNextEpisode();
    if (!next) return;
    const { episode, seasonNum } = next;
    const streamUrl = iptvApi.buildStreamUrl("series", episode.id, episode.container_extension || "mp4");
    const epNum = String(episode.episode_num).padStart(2, "0");
    const sNum = String(seasonNum).padStart(2, "0");
    playVideo({ type: "series", streamId: episode.id, seriesId: currentVideo.seriesId, seriesName: currentVideo.seriesName, name: `${currentVideo.seriesName} - S${sNum}E${epNum}`, url: streamUrl, seasonNum, episodeNum: episode.episode_num, seriesSeasons: currentVideo.seriesSeasons });
  }, [getNextEpisode, currentVideo, playVideo]);

  useEffect(() => {
    if (!player || !currentVideo) return;
    const sub = player.addListener("playToEnd", () => { if (currentVideo.type === "series" && getNextEpisode()) handleNextEpisode(); });
    return () => sub?.remove();
  }, [player, currentVideo?.url, handleNextEpisode, getNextEpisode]);

  const handleClose = useCallback(() => {
    if (player && currentVideo && currentVideo.type !== "live") updateWatchProgress(currentVideo.streamId, currentVideo.type, player.currentTime, Number.isFinite(player.duration) ? player.duration : 0);
    // Push the position synchronously rather than waiting on the debounce.
    flushProgress();
    clearInterval(progressIntervalRef.current);
    closeVideo();
    navigation.goBack();
  }, [player, currentVideo, updateWatchProgress, flushProgress, closeVideo, navigation]);

  const handleSpeedChange = (rate) => { if (player) { player.playbackRate = rate; setSpeed(rate); } setShowSpeedMenu(false); };
  const handleAudioChange = (track) => { try { if (player) player.audioTrack = track; setSelectedAudio(track); } catch {} setShowAudioMenu(false); };
  const handleSubtitleChange = (track) => { try { if (player) player.subtitleTrack = track; setSelectedSubtitle(track); } catch {} setShowSubtitleMenu(false); };

  useEffect(() => { if (!currentVideo) navigation.goBack(); }, [currentVideo]);

  if (!currentVideo || !player) return null;

  const nextEpisode = getNextEpisode();
  const topPadding = Platform.OS === "ios" ? 12 : 8;

  return (
    <YStack flex={1} backgroundColor="#000">
      <StatusBar hidden />

      {/* Video + tap-to-show-controls area */}
      <YStack position="absolute" top={0} left={0} right={0} bottom={0} onPress={resetControlsTimer}>
        <VideoView player={player} style={{ flex: 1 }} nativeControls={!isLoading && !isFatal} allowsFullscreen allowsPictureInPicture />
      </YStack>

      {/* Loading overlay */}
      {isLoading && !isFatal && (
        <YStack position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="center" alignItems="center" backgroundColor="rgba(0,0,0,0.5)" pointerEvents="none">
          <Spinner size="large" color="#6C5CE7" />
          <Text color="#fff" marginTop={10} fontSize={14}>Loading stream...</Text>
        </YStack>
      )}

      {/* Reconnecting badge — subtle, shown while the recovery machine is retrying */}
      {isRecovering && !isFatal && (
        <XStack position="absolute" bottom={16} right={16} backgroundColor="rgba(108, 92, 231,0.92)" paddingHorizontal={14} paddingVertical={8} borderRadius={8} alignItems="center" gap={8} pointerEvents="none" zIndex={30}>
          <Spinner size="small" color="#fff" />
          <Text color="#fff" fontSize={13} fontWeight="600">Reconnecting…</Text>
        </XStack>
      )}

      {/* Fatal error screen — mirrors the web player's error overlay */}
      {isFatal && (
        <YStack position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="center" alignItems="center" backgroundColor="rgba(0,0,0,0.85)" gap={10} zIndex={40}>
          <Text color="#fff" fontSize={20} fontWeight="700">Failed to load stream</Text>
          <Text color="#7A86A8" fontSize={14}>
            {playback.fatalReason === "GONE"
              ? "This stream is no longer available."
              : playback.fatalReason === "AUTH_EXPIRED"
                ? "Stream unavailable. The server rejected the connection."
                : "The stream could not be played."}
          </Text>
          <XStack gap={16} marginTop={8}>
            <YStack backgroundColor="rgba(255,255,255,0.15)" paddingHorizontal={28} paddingVertical={12} borderRadius={10} borderWidth={1} borderColor="rgba(255,255,255,0.2)" cursor="pointer" onPress={() => playback.retry()} pressStyle={{ opacity: 0.7 }}>
              <Text color="#fff" fontSize={15} fontWeight="600">Retry</Text>
            </YStack>
            <YStack backgroundColor="rgba(108, 92, 231,0.9)" paddingHorizontal={28} paddingVertical={12} borderRadius={10} cursor="pointer" onPress={handleClose} pressStyle={{ opacity: 0.8 }}>
              <Text color="#fff" fontSize={15} fontWeight="600">Close</Text>
            </YStack>
          </XStack>
        </YStack>
      )}

      {/* Top controls bar */}
      {showControls && (
        <YStack position="absolute" top={0} left={0} right={0} paddingTop={topPadding} pointerEvents="box-none">
          <XStack alignItems="center" paddingHorizontal={12} paddingVertical={8} backgroundColor="rgba(0,0,0,0.7)" flexWrap="wrap" gap={8}>
            <YStack width={34} height={34} backgroundColor="rgba(108, 92, 231,0.9)" borderRadius={17} justifyContent="center" alignItems="center" cursor="pointer" onPress={handleClose} pressStyle={{ opacity: 0.8 }}>
              <Text color="#fff" fontSize={14} fontWeight="700">✕</Text>
            </YStack>

            <Text color="#fff" fontSize={14} fontWeight="600" flex={1} minWidth={60} numberOfLines={1}>{currentVideo.name}</Text>

            <YStack backgroundColor="rgba(255,255,255,0.15)" paddingHorizontal={10} paddingVertical={6} borderRadius={8} borderWidth={1} borderColor="rgba(255,255,255,0.2)" cursor="pointer" onPress={() => { setShowSpeedMenu(true); setShowAudioMenu(false); setShowSubtitleMenu(false); }} pressStyle={{ opacity: 0.7 }}>
              <Text color="#fff" fontSize={12} fontWeight="600">▶ {speed}x</Text>
            </YStack>

            {audioTracks.length > 1 && (
              <YStack backgroundColor="rgba(255,255,255,0.15)" paddingHorizontal={10} paddingVertical={6} borderRadius={8} borderWidth={1} borderColor="rgba(255,255,255,0.2)" cursor="pointer" onPress={() => { setShowAudioMenu(true); setShowSpeedMenu(false); setShowSubtitleMenu(false); }} pressStyle={{ opacity: 0.7 }}>
                <Text color="#fff" fontSize={12} fontWeight="600">♪ Audio</Text>
              </YStack>
            )}

            {subtitleTracks.length > 0 && (
              <YStack backgroundColor="rgba(255,255,255,0.15)" paddingHorizontal={10} paddingVertical={6} borderRadius={8} borderWidth={1} borderColor="rgba(255,255,255,0.2)" cursor="pointer" onPress={() => { setShowSubtitleMenu(true); setShowSpeedMenu(false); setShowAudioMenu(false); }} pressStyle={{ opacity: 0.7 }}>
                <Text color="#fff" fontSize={12} fontWeight="600">CC</Text>
              </YStack>
            )}

            {nextEpisode && (
              <YStack backgroundColor="rgba(108, 92, 231,0.9)" paddingHorizontal={12} paddingVertical={6} borderRadius={8} cursor="pointer" onPress={handleNextEpisode} pressStyle={{ opacity: 0.8 }}>
                <Text color="#fff" fontSize={12} fontWeight="600">Next ▶</Text>
              </YStack>
            )}
          </XStack>
        </YStack>
      )}

      {/* Speed Menu */}
      <Modal visible={showSpeedMenu} transparent animationType="fade" onRequestClose={() => setShowSpeedMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }} activeOpacity={1} onPress={() => setShowSpeedMenu(false)}>
          <YStack backgroundColor="#1B2236" borderRadius={14} padding={8} width={220} maxHeight={350} borderWidth={1} borderColor="#28324E">
            <Text color="#7A86A8" fontSize={12} fontWeight="600" textAlign="center" paddingVertical={8} borderBottomWidth={1} borderBottomColor="#28324E" marginBottom={4}>Playback Speed</Text>
            <ScrollView>
              {SPEEDS.map((rate) => (
                <YStack key={rate} paddingVertical={12} paddingHorizontal={16} borderRadius={8} backgroundColor={speed === rate ? "rgba(108, 92, 231,0.2)" : "transparent"} cursor="pointer" onPress={() => handleSpeedChange(rate)} pressStyle={{ opacity: 0.7 }}>
                  <Text color={speed === rate ? "#6C5CE7" : "#7A86A8"} fontSize={15} fontWeight={speed === rate ? "700" : "400"}>{rate}x{rate === 1 ? " (Normal)" : ""}</Text>
                </YStack>
              ))}
            </ScrollView>
          </YStack>
        </TouchableOpacity>
      </Modal>

      {/* Audio Menu */}
      <Modal visible={showAudioMenu} transparent animationType="fade" onRequestClose={() => setShowAudioMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }} activeOpacity={1} onPress={() => setShowAudioMenu(false)}>
          <YStack backgroundColor="#1B2236" borderRadius={14} padding={8} width={220} maxHeight={350} borderWidth={1} borderColor="#28324E">
            <Text color="#7A86A8" fontSize={12} fontWeight="600" textAlign="center" paddingVertical={8} borderBottomWidth={1} borderBottomColor="#28324E" marginBottom={4}>Audio Track</Text>
            <ScrollView>
              {audioTracks.map((track, idx) => (
                <YStack key={idx} paddingVertical={12} paddingHorizontal={16} borderRadius={8} backgroundColor={selectedAudio === track ? "rgba(108, 92, 231,0.2)" : "transparent"} cursor="pointer" onPress={() => handleAudioChange(track)} pressStyle={{ opacity: 0.7 }}>
                  <Text color={selectedAudio === track ? "#6C5CE7" : "#7A86A8"} fontSize={15} fontWeight={selectedAudio === track ? "700" : "400"}>{track.language || track.label || `Track ${idx + 1}`}</Text>
                </YStack>
              ))}
            </ScrollView>
          </YStack>
        </TouchableOpacity>
      </Modal>

      {/* Subtitle Menu */}
      <Modal visible={showSubtitleMenu} transparent animationType="fade" onRequestClose={() => setShowSubtitleMenu(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }} activeOpacity={1} onPress={() => setShowSubtitleMenu(false)}>
          <YStack backgroundColor="#1B2236" borderRadius={14} padding={8} width={220} maxHeight={350} borderWidth={1} borderColor="#28324E">
            <Text color="#7A86A8" fontSize={12} fontWeight="600" textAlign="center" paddingVertical={8} borderBottomWidth={1} borderBottomColor="#28324E" marginBottom={4}>Subtitles</Text>
            <ScrollView>
              <YStack paddingVertical={12} paddingHorizontal={16} borderRadius={8} backgroundColor={selectedSubtitle === null ? "rgba(108, 92, 231,0.2)" : "transparent"} cursor="pointer" onPress={() => handleSubtitleChange(null)} pressStyle={{ opacity: 0.7 }}>
                <Text color={selectedSubtitle === null ? "#6C5CE7" : "#7A86A8"} fontSize={15} fontWeight={selectedSubtitle === null ? "700" : "400"}>Off</Text>
              </YStack>
              {subtitleTracks.map((track, idx) => (
                <YStack key={idx} paddingVertical={12} paddingHorizontal={16} borderRadius={8} backgroundColor={selectedSubtitle === track ? "rgba(108, 92, 231,0.2)" : "transparent"} cursor="pointer" onPress={() => handleSubtitleChange(track)} pressStyle={{ opacity: 0.7 }}>
                  <Text color={selectedSubtitle === track ? "#6C5CE7" : "#7A86A8"} fontSize={15} fontWeight={selectedSubtitle === track ? "700" : "400"}>{track.language || track.label || `Track ${idx + 1}`}</Text>
                </YStack>
              ))}
            </ScrollView>
          </YStack>
        </TouchableOpacity>
      </Modal>
    </YStack>
  );
}
