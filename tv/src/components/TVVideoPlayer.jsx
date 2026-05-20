import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const ASPECT_RATIOS = [
  { value: "default", label: "Default" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "fill", label: "Fill" },
  { value: "stretch", label: "Stretch" },
];

// Settings panel state machine
// null → no panel  |  'menu' → main list  |  'quality'/'speed'/'audio'/'subtitles'/'aspect' → sub-list
const MENU_ITEMS = ["quality", "speed", "audio", "subtitles", "aspect"];

const TVVideoPlayer = () => {
  const { currentVideo, closeVideo, updateWatchProgress, addToWatchHistory, playVideo } = useApp();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const lastUrlRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const controlsTimerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekDelta, setSeekDelta] = useState(null);

  // Quality
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  // Speed
  const [playbackRate, setPlaybackRate] = useState(1);
  // Audio
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState(0);
  // Subtitles
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState(-1);
  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState("default");
  // Settings panel
  const [settingsPanel, setSettingsPanel] = useState(null); // null | 'menu' | 'quality' | ...
  const [menuFocusIdx, setMenuFocusIdx] = useState(0);

  const stopProgress = useCallback(() => {
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    if (!settingsPanel) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [settingsPanel]);

  const handleClose = useCallback(() => {
    const video = videoRef.current;
    if (video && currentVideo) {
      updateWatchProgress(currentVideo.streamId, currentVideo.type, video.currentTime,
        Number.isFinite(video.duration) ? video.duration : 0);
    }
    stopProgress();
    closeVideo();
  }, [currentVideo, updateWatchProgress, stopProgress, closeVideo]);

  // Init HLS
  useEffect(() => {
    if (!currentVideo || !videoRef.current) return;
    if (lastUrlRef.current === currentVideo.url) return;
    lastUrlRef.current = currentVideo.url;

    const video = videoRef.current;
    const rawUrl = currentVideo.url;
    const url = currentVideo.type === "live" && rawUrl.endsWith(".ts")
      ? rawUrl.replace(/\.ts$/, ".m3u8") : rawUrl;
    const isHls = url.includes(".m3u8");

    setIsLoading(true);
    setError(null);
    setIsPaused(false);
    setQualityLevels([]);
    setSelectedLevel(-1);
    setPlaybackRate(1);
    setAudioTracks([]);
    setSelectedAudioTrack(0);
    setSubtitleTracks([]);
    setSelectedSubtitleTrack(-1);
    setAspectRatio("default");
    setSettingsPanel(null);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const onMetadata = () => {
      setIsLoading(false);
      if (currentVideo.startTime > 0) video.currentTime = currentVideo.startTime;
      video.play().catch(console.error);
    };

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 90 });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setQualityLevels(hls.levels);
        if (currentVideo.startTime > 0) video.currentTime = currentVideo.startTime;
        video.play().catch(console.error);
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        setAudioTracks([...hls.audioTracks]);
        setSelectedAudioTrack(Math.max(hls.audioTrack, 0));
      });
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, data) => setSelectedAudioTrack(data.id));
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => setSubtitleTracks([...hls.subtitleTracks]));
      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_e, data) => setSelectedSubtitleTrack(data.id));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) { setError("Stream error: " + data.type); setIsLoading(false); }
      });
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", onMetadata, { once: true });
    }

    if (currentVideo.type !== "live") {
      addToWatchHistory({ ...currentVideo, currentTime: currentVideo.startTime || 0 });
    }

    return () => {
      stopProgress();
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      video.removeEventListener("loadedmetadata", onMetadata);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.url]);

  useEffect(() => { if (!currentVideo) lastUrlRef.current = null; }, [currentVideo]);

  // Video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;
    const onPlay = () => {
      setIsPaused(false);
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        if (video && !video.paused) {
          setCurrentTime(video.currentTime);
          updateWatchProgress(currentVideo.streamId, currentVideo.type, video.currentTime,
            Number.isFinite(video.duration) ? video.duration : 0);
        }
      }, 10000);
    };
    const onPause = () => {
      setIsPaused(true);
      updateWatchProgress(currentVideo.streamId, currentVideo.type, video.currentTime,
        Number.isFinite(video.duration) ? video.duration : 0);
    };
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => { if (Number.isFinite(video.duration)) setDuration(video.duration); };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      if (hlsRef.current) return;
      setError("Failed to load video");
      setIsLoading(false);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [currentVideo, updateWatchProgress]);

  // Settings panel navigation
  const openSettingsMenu = useCallback(() => {
    setSettingsPanel("menu");
    setMenuFocusIdx(0);
    clearTimeout(controlsTimerRef.current);
    setShowControls(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsPanel(null);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const getMenuItems = useCallback(() => {
    const items = [];
    if (qualityLevels.length > 1) items.push("quality");
    items.push("speed");
    if (audioTracks.length > 1) items.push("audio");
    if (subtitleTracks.length > 0) items.push("subtitles");
    items.push("aspect");
    return items;
  }, [qualityLevels, audioTracks, subtitleTracks]);

  const getMenuLabel = (item) => {
    switch (item) {
      case "quality": return `Quality: ${selectedLevel === -1 ? "Auto" : qualityLevels[selectedLevel]?.height + "p"}`;
      case "speed": return `Speed: ${playbackRate}x`;
      case "audio": return `Audio: ${audioTracks[selectedAudioTrack]?.name || "Track " + (selectedAudioTrack + 1)}`;
      case "subtitles": return `Subtitles: ${selectedSubtitleTrack === -1 ? "Off" : subtitleTracks[selectedSubtitleTrack]?.name || "Track " + (selectedSubtitleTrack + 1)}`;
      case "aspect": return `Aspect: ${aspectRatio === "default" ? "Default" : aspectRatio}`;
      default: return item;
    }
  };

  const getSubItems = (panel) => {
    switch (panel) {
      case "quality":
        return [
          { label: "Auto", value: -1 },
          ...[...qualityLevels].map((l, i) => ({ label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`, value: i }))
            .sort((a, b) => (b.value === -1 ? -1 : 0) || (qualityLevels[b.value]?.height || 0) - (qualityLevels[a.value]?.height || 0)),
        ];
      case "speed":
        return SPEEDS.map((s) => ({ label: `${s}x`, value: s }));
      case "audio":
        return audioTracks.map((t, i) => ({ label: t.name || `Track ${i + 1}`, value: i }));
      case "subtitles":
        return [{ label: "Off", value: -1 }, ...subtitleTracks.map((t, i) => ({ label: t.name || `Track ${i + 1}`, value: i }))];
      case "aspect":
        return ASPECT_RATIOS.map((a) => ({ label: a.label, value: a.value }));
      default:
        return [];
    }
  };

  const getCurrentSubValue = (panel) => {
    switch (panel) {
      case "quality": return selectedLevel;
      case "speed": return playbackRate;
      case "audio": return selectedAudioTrack;
      case "subtitles": return selectedSubtitleTrack;
      case "aspect": return aspectRatio;
      default: return null;
    }
  };

  const applySubItem = (panel, value) => {
    const video = videoRef.current;
    switch (panel) {
      case "quality":
        if (hlsRef.current) { hlsRef.current.currentLevel = value; setSelectedLevel(value); }
        break;
      case "speed":
        if (video) { video.playbackRate = value; setPlaybackRate(value); }
        break;
      case "audio":
        if (hlsRef.current) { hlsRef.current.audioTrack = value; setSelectedAudioTrack(value); }
        break;
      case "subtitles":
        if (hlsRef.current) { hlsRef.current.subtitleTrack = value; setSelectedSubtitleTrack(value); }
        break;
      case "aspect":
        setAspectRatio(value);
        break;
      default:
    }
    setSettingsPanel("menu");
  };

  // Settings panel key handler
  const handleSettingsKey = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (settingsPanel === "menu") {
      const items = getMenuItems();
      if (e.key === "ArrowDown") setMenuFocusIdx((i) => Math.min(i + 1, items.length - 1));
      else if (e.key === "ArrowUp") setMenuFocusIdx((i) => Math.max(i - 1, 0));
      else if (e.key === "Enter") setSettingsPanel(items[menuFocusIdx]);
      else if (e.key === "Escape" || e.key === "Backspace") closeSettings();
      return;
    }
    const subItems = getSubItems(settingsPanel);
    const curIdx = subItems.findIndex((s) => s.value === getCurrentSubValue(settingsPanel));
    if (e.key === "ArrowDown") setMenuFocusIdx(Math.min(Math.max(curIdx, 0) + 1, subItems.length - 1));
    else if (e.key === "ArrowUp") setMenuFocusIdx(Math.max(Math.max(curIdx, 0) - 1, 0));
    else if (e.key === "Enter") applySubItem(settingsPanel, subItems[menuFocusIdx]?.value ?? subItems[curIdx]?.value);
    else if (e.key === "Escape" || e.key === "Backspace") setSettingsPanel("menu");
  }, [settingsPanel, menuFocusIdx, getMenuItems, closeSettings]);

  // Playback key handler
  const handlePlaybackKey = useCallback((e, video) => {
    showControlsTemporarily();
    switch (e.key) {
      case " ":
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (video.paused) video.play(); else video.pause();
        break;
      case "Escape":
        e.preventDefault();
        handleClose();
        break;
      case "ArrowLeft":
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        setSeekDelta(-10);
        setTimeout(() => setSeekDelta(null), 800);
        break;
      case "ArrowRight":
        e.preventDefault();
        video.currentTime = Number.isFinite(video.duration)
          ? Math.min(video.duration, video.currentTime + 10)
          : video.currentTime + 10;
        setSeekDelta(+10);
        setTimeout(() => setSeekDelta(null), 800);
        break;
      case "ArrowUp":
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        break;
      case "ArrowDown":
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        break;
      case "s":
      case "S":
        openSettingsMenu();
        break;
      default:
    }
  }, [handleClose, showControlsTemporarily, openSettingsMenu]);

  // Keyboard handling
  useEffect(() => {
    const onKey = (e) => {
      if (!currentVideo || !videoRef.current) return;
      if (settingsPanel) { handleSettingsKey(e); return; }
      handlePlaybackKey(e, videoRef.current);
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [currentVideo, settingsPanel, handleSettingsKey, handlePlaybackKey]);

  useEffect(() => {
    if (currentVideo) showControlsTemporarily();
  }, [currentVideo, showControlsTemporarily]);

  const getNextEpisode = useCallback(() => {
    if (currentVideo?.type !== "series" || !currentVideo?.seriesSeasons) return null;
    const allEps = Object.keys(currentVideo.seriesSeasons).map(Number).sort((a, b) => a - b)
      .flatMap((s) => [...(currentVideo.seriesSeasons[String(s)] || [])]
        .sort((a, b) => Number(a.episode_num) - Number(b.episode_num))
        .map((ep) => ({ ...ep, seasonNum: String(s) })));
    const curIdx = allEps.findIndex((ep) => String(ep.id) === String(currentVideo.streamId));
    if (curIdx === -1 || curIdx >= allEps.length - 1) return null;
    return allEps[curIdx + 1];
  }, [currentVideo]);

  const handleNextEpisode = useCallback(() => {
    const next = getNextEpisode();
    if (!next) return;
    const url = iptvApi.buildStreamUrl("series", next.id, next.container_extension || "mp4");
    const sNum = String(next.seasonNum).padStart(2, "0");
    const epNum = String(next.episode_num).padStart(2, "0");
    playVideo({
      type: "series", streamId: next.id, seriesId: currentVideo.seriesId,
      seriesName: currentVideo.seriesName,
      name: `${currentVideo.seriesName} — S${sNum}E${epNum}`,
      url, seasonNum: next.seasonNum, episodeNum: next.episode_num,
      seriesSeasons: currentVideo.seriesSeasons,
    });
  }, [getNextEpisode, currentVideo, playVideo]);

  const getAspectStyle = () => {
    switch (aspectRatio) {
      case "16:9": return { width: "auto", height: "100%", maxWidth: "100%", aspectRatio: "16/9", objectFit: "fill" };
      case "4:3": return { width: "auto", height: "100%", maxWidth: "100%", aspectRatio: "4/3", objectFit: "fill" };
      case "fill": return { objectFit: "cover" };
      case "stretch": return { objectFit: "fill" };
      default: return {};
    }
  };

  const formatTime = (s) => {
    if (!Number.isFinite(s) || s <= 0) return "";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const nextEp = getNextEpisode();
  const menuItems = getMenuItems();

  if (!currentVideo) return null;

  return (
    <section className="tv-player" aria-label="Video player">
      {/* Transparent click-catcher to show controls on mouse click */}
      <button type="button" className="tv-player-click-catcher" aria-label="Show controls"
        onClick={showControlsTemporarily} />
      <video ref={videoRef} className="tv-player-video" autoPlay playsInline
        crossOrigin="anonymous" style={getAspectStyle()}>
        <track kind="captions" />
      </video>

      {isLoading && (
        <div className="tv-player-loading">
          <div className="tv-spinner" />
          <p>Loading stream…</p>
        </div>
      )}

      {error && (
        <div className="tv-player-error">
          <p>Failed to load stream</p>
          <p className="tv-player-error-detail">{error}</p>
          <button type="button" className="tv-btn tv-btn-primary" onClick={handleClose}>Close</button>
        </div>
      )}

      {seekDelta && (
        <div className="tv-seek-indicator">
          {seekDelta > 0 ? `+${seekDelta}s ▶▶` : `◀◀ ${seekDelta}s`}
        </div>
      )}

      {/* Settings panel */}
      {settingsPanel && (
        <div className="tv-settings-panel">
          <div className="tv-settings-header">
            {settingsPanel === "menu" ? "⚙ Settings" : `⚙ ${settingsPanel.charAt(0).toUpperCase() + settingsPanel.slice(1)}`}
          </div>
          <div className="tv-settings-list">
            {settingsPanel === "menu"
              ? menuItems.map((item, idx) => (
                <div key={item}
                  className={`tv-settings-item ${idx === menuFocusIdx ? "focused" : ""}`}>
                  {getMenuLabel(item)} ›
                </div>
              ))
              : getSubItems(settingsPanel).map((sub, idx) => {
                const curVal = getCurrentSubValue(settingsPanel);
                const isActive = sub.value === curVal;
                return (
                  <div key={sub.value}
                    className={`tv-settings-item ${isActive ? "active" : ""} ${idx === menuFocusIdx ? "focused" : ""}`}>
                    {isActive ? "✓ " : "  "}{sub.label}
                  </div>
                );
              })}
          </div>
          <div className="tv-settings-hints">↑↓ Navigate  •  Enter: Select  •  Esc: Back</div>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`tv-player-controls ${showControls && !settingsPanel ? "visible" : ""}`}>
        <div className="tv-player-top">
          <span className="tv-player-title">{currentVideo.name}</span>
          <div className="tv-player-actions">
            <button type="button" className="tv-player-btn" onClick={openSettingsMenu}>⚙ S</button>
            {nextEp && (
              <button type="button" className="tv-player-btn" onClick={handleNextEpisode}>Next ▶</button>
            )}
            <button type="button" className="tv-player-btn tv-player-close" onClick={handleClose}>✕ Close</button>
          </div>
        </div>

        {duration > 0 && (
          <div className="tv-player-bottom">
            <span className="tv-player-time">{formatTime(currentTime)}</span>
            <div className="tv-player-progress">
              <div className="tv-player-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="tv-player-time">{formatTime(duration)}</span>
          </div>
        )}

        <div className="tv-player-hints">
          {isPaused ? "⏸ Paused" : "▶ Playing"} &nbsp;|&nbsp;
          Enter: Play/Pause &nbsp;|&nbsp; ← → Seek 10s &nbsp;|&nbsp;
          ↑ ↓ Volume &nbsp;|&nbsp; S: Settings &nbsp;|&nbsp; Esc: Close
        </div>
      </div>
    </section>
  );
};

export default TVVideoPlayer;
