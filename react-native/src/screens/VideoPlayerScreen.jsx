import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useApp } from '../context/AppContext';
import iptvApi from '../services/iptvApi';

export default function VideoPlayerScreen({ navigation }) {
  const { currentVideo, closeVideo, updateWatchProgress, addToWatchHistory, playVideo } = useApp();
  const progressIntervalRef = useRef(null);
  const hasAddedToHistory = useRef(false);

  const player = useVideoPlayer(
    currentVideo ? { uri: currentVideo.url } : null,
    (p) => {
      if (!currentVideo) return;
      if (currentVideo.startTime && currentVideo.startTime > 0) {
        p.currentTime = currentVideo.startTime;
      }
      p.play();
    }
  );

  // Add to watch history once per video (VOD only)
  useEffect(() => {
    if (!currentVideo || hasAddedToHistory.current) return;
    if (currentVideo.type !== 'live') {
      hasAddedToHistory.current = true;
      addToWatchHistory({ ...currentVideo, currentTime: currentVideo.startTime || 0 });
    }
  }, [currentVideo?.url]);

  // Reset history tracking on video change
  useEffect(() => {
    hasAddedToHistory.current = false;
  }, [currentVideo?.url]);

  // Progress tracking every 10 seconds
  useEffect(() => {
    if (!player || !currentVideo || currentVideo.type === 'live') return;

    const subscription = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = setInterval(() => {
          if (player && currentVideo) {
            updateWatchProgress(
              currentVideo.streamId,
              currentVideo.type,
              player.currentTime,
              player.duration || 0
            );
          }
        }, 10000);
      }
    });

    return () => {
      subscription?.remove();
      clearInterval(progressIntervalRef.current);
    };
  }, [currentVideo?.url, player]);

  // Auto-play next episode when current ends
  const getNextEpisode = useCallback(() => {
    if (!currentVideo || currentVideo.type !== 'series' || !currentVideo.seriesSeasons) return null;
    const { seriesSeasons } = currentVideo;
    const allEpisodes = Object.keys(seriesSeasons)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((sNum) =>
        [...(seriesSeasons[String(sNum)] || [])]
          .sort((a, b) => Number(a.episode_num) - Number(b.episode_num))
          .map((ep) => ({ ...ep, seasonNum: String(sNum) }))
      );
    const currentIdx = allEpisodes.findIndex(
      (ep) => String(ep.id) === String(currentVideo.streamId)
    );
    if (currentIdx === -1 || currentIdx >= allEpisodes.length - 1) return null;
    const next = allEpisodes[currentIdx + 1];
    return { episode: next, seasonNum: next.seasonNum };
  }, [currentVideo]);

  const handleNextEpisode = useCallback(() => {
    const next = getNextEpisode();
    if (!next) return;
    const { episode, seasonNum } = next;
    const streamUrl = iptvApi.buildStreamUrl('series', episode.id, episode.container_extension || 'mp4');
    const epNum = String(episode.episode_num).padStart(2, '0');
    const sNum = String(seasonNum).padStart(2, '0');
    const episodeName = `${currentVideo.seriesName} - S${sNum}E${epNum}`;
    playVideo({
      type: 'series',
      streamId: episode.id,
      seriesId: currentVideo.seriesId,
      seriesName: currentVideo.seriesName,
      name: episodeName,
      url: streamUrl,
      seasonNum,
      episodeNum: episode.episode_num,
      seriesSeasons: currentVideo.seriesSeasons,
    });
  }, [getNextEpisode, currentVideo, playVideo]);

  useEffect(() => {
    if (!player || !currentVideo) return;
    const subscription = player.addListener('playToEnd', () => {
      if (currentVideo.type === 'series') {
        const next = getNextEpisode();
        if (next) {
          handleNextEpisode();
          return;
        }
      }
    });
    return () => subscription?.remove();
  }, [player, currentVideo?.url, handleNextEpisode, getNextEpisode]);

  const handleClose = useCallback(() => {
    // Save final progress before closing
    if (player && currentVideo && currentVideo.type !== 'live') {
      updateWatchProgress(
        currentVideo.streamId,
        currentVideo.type,
        player.currentTime,
        player.duration || 0
      );
    }
    clearInterval(progressIntervalRef.current);
    closeVideo();
    navigation.goBack();
  }, [player, currentVideo, updateWatchProgress, closeVideo, navigation]);

  // If context was cleared, go back
  useEffect(() => {
    if (!currentVideo) {
      navigation.goBack();
    }
  }, [currentVideo]);

  if (!currentVideo || !player) return null;

  const nextEpisode = getNextEpisode();

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
      />

      {/* Top overlay: title + controls */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{currentVideo.name}</Text>
          {nextEpisode && (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNextEpisode}>
              <Text style={styles.nextBtnText}>Next ▶</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(233,69,96,0.9)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  title: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    backgroundColor: 'rgba(233,69,96,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
