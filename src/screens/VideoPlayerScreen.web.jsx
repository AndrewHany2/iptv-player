import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import { isTV } from "../utils/tvOptimizations";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const ASPECT_RATIOS = [
  { value: "default", label: "Default" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "fill", label: "Fill" },
  { value: "stretch", label: "Stretch" },
];

// LG webOS remote key codes
const TV_KEYS = {
  PLAY: 415,
  PAUSE: 19,
  STOP: 413,
  FF: 417,
  REW: 412,
  BACK: new Set([27, 461, 10009, 8]),
};

const S = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    backgroundColor: "rgba(0,0,0,0.85)",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    minWidth: 60,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  videoWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
  },
  btn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  closeBtn: {
    backgroundColor: "rgba(233,69,96,0.9)",
    border: "none",
    color: "#fff",
    borderRadius: "50%",
    width: 32,
    height: 32,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    backgroundColor: "rgba(233,69,96,0.9)",
    border: "none",
    color: "#fff",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  dropdown: { position: "relative" },
  menu: {
    position: "absolute",
    top: "110%",
    right: 0,
    backgroundColor: "#1a1a2e",
    border: "1px solid #2a2a4e",
    borderRadius: 8,
    padding: 4,
    minWidth: 130,
    zIndex: 100,
    maxHeight: 220,
    overflowY: "auto",
  },
  menuItem: (active) => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    border: "none",
    padding: "9px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    color: active ? "#e94560" : "#ccc",
    fontWeight: active ? 700 : 400,
    backgroundColor: active ? "rgba(233,69,96,0.12)" : "transparent",
  }),
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#fff",
    gap: 10,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    color: "#fff",
    gap: 10,
  },
  footer: {
    padding: "4px 12px",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#666",
    fontSize: 11,
    flexShrink: 0,
  },
};

// ── TV-specific styles ────────────────────────────────────────────────────────
const TV = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 9999,
    overflow: "hidden",
  },
  controls: (visible) => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.85) 100%)",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.3s ease",
    pointerEvents: visible ? "auto" : "none",
  }),
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "28px 48px 20px",
    flexShrink: 0,
  },
  closeBtn: {
    background: "rgba(233,69,96,0.9)",
    border: "none",
    color: "#fff",
    borderRadius: "50%",
    width: 52,
    height: 52,
    fontSize: 22,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: "#fff",
    fontSize: 26,
    fontWeight: 700,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  nextBtn: {
    background: "rgba(233,69,96,0.9)",
    border: "none",
    color: "#fff",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  playIcon: {
    fontSize: 80,
    color: "rgba(255,255,255,0.9)",
    textShadow: "0 0 40px rgba(0,0,0,0.8)",
  },
  bottomBar: {
    padding: "0 48px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  timeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#fff",
    fontSize: 20,
    fontWeight: 600,
  },
  progressTrack: {
    height: 6,
    background: "rgba(255,255,255,0.25)",
    borderRadius: 3,
    overflow: "hidden",
    cursor: "pointer",
  },
  progressFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "#e94560",
    borderRadius: 3,
    transition: "width 0.5s linear",
  }),
  seekHint: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },
};

function fmtTime(s) {
  if (!s || !Number.isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VideoPlayerScreen() {
  const {
    currentVideo,
    closeVideo,
    updateWatchProgress,
    addToWatchHistory,
    playVideo,
  } = useApp();

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressRef = useRef(null);
  const lastUrlRef = useRef(null);
  const controlsTimerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [openMenu, setOpenMenu] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
  const [aspectRatio, setAspectRatio] = useState("default");

  // TV-specific state
  const [tvControlsVisible, setTvControlsVisible] = useState(true);
  const [tvPaused, setTvPaused] = useState(false);
  const [tvCurrentTime, setTvCurrentTime] = useState(0);
  const [tvDuration, setTvDuration] = useState(0);

  const hlsRecoveryRef = useRef({ networkRetries: 0, mediaRetries: 0 });
  const reloadCountRef = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [liveError, setLiveError] = useState(false);
  const autoReloadTimerRef = useRef(null);

  const qualityRef = useRef(null);
  const speedRef = useRef(null);
  const audioRef = useRef(null);
  const subtitleRef = useRef(null);
  const aspectRef = useRef(null);

  const stopProgress = useCallback(() => {
    clearInterval(progressRef.current);
    progressRef.current = null;
  }, []);

  const reloadStream = useCallback(() => {
    clearTimeout(autoReloadTimerRef.current);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) videoRef.current.src = "";
    lastUrlRef.current = null;
    hlsRecoveryRef.current = { networkRetries: 0, mediaRetries: 0 };
    setIsLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const handleRetry = useCallback(() => {
    reloadCountRef.current = 0;
    setError(null);
    reloadStream();
  }, [reloadStream]);

  const handleClose = useCallback(() => {
    const video = videoRef.current;
    if (video && currentVideo) {
      updateWatchProgress(
        currentVideo.streamId,
        currentVideo.type,
        video.currentTime,
        Number.isFinite(video.duration) ? video.duration : 0,
      );
    }
    stopProgress();
    closeVideo();
  }, [currentVideo, updateWatchProgress, stopProgress, closeVideo]);

  // Show TV controls and restart hide timer
  const showTvControls = useCallback(() => {
    setTvControlsVisible(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(
      () => setTvControlsVisible(false),
      4000,
    );
  }, []);

  // HLS init
  useEffect(() => {
    if (!currentVideo || !videoRef.current) return;
    if (lastUrlRef.current === currentVideo.url) return;
    lastUrlRef.current = currentVideo.url;

    const video = videoRef.current;
    const rawUrl = currentVideo.url;
    const url =
      currentVideo.type === "live" && rawUrl.endsWith(".ts")
        ? rawUrl.replace(/\.ts$/, ".m3u8")
        : rawUrl;
    const isHls = url.includes(".m3u8");

    setIsLoading(true);
    setError(null);
    setQualityLevels([]);
    setSelectedLevel(-1);
    setOpenMenu(null);
    hlsRecoveryRef.current = { networkRetries: 0, mediaRetries: 0 };
    reloadCountRef.current = 0;
    video.playbackRate = 1;
    setPlaybackRate(1);
    setAudioTracks([]);
    setSelectedAudio(0);
    setSubtitleTracks([]);
    setSelectedSubtitle(-1);
    setTvCurrentTime(0);
    setTvDuration(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onMeta = () => {
      setIsLoading(false);
      if (currentVideo.startTime > 0)
        video.currentTime = currentVideo.startTime;
      video.play().catch(() => {});
    };

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setLiveError(false);
        setQualityLevels(hls.levels);
        if (currentVideo.startTime > 0)
          video.currentTime = currentVideo.startTime;
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        setAudioTracks([...hls.audioTracks]);
        setSelectedAudio(Math.max(0, hls.audioTrack));
      });
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, d) =>
        setSelectedAudio(d.id),
      );
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () =>
        setSubtitleTracks([...hls.subtitleTracks]),
      );
      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_e, d) =>
        setSelectedSubtitle(d.id),
      );
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (!d.fatal) return;
        const rec = hlsRecoveryRef.current;
        const isSessionExpired = d.response?.code === 403 || d.response?.code === 401;

        if (d.type === Hls.ErrorTypes.MEDIA_ERROR && rec.mediaRetries < 2) {
          rec.mediaRetries++;
          hls.recoverMediaError();
        } else if (
          d.type === Hls.ErrorTypes.NETWORK_ERROR &&
          !isSessionExpired &&
          rec.networkRetries < 3
        ) {
          // Transient network blip — retry without reinitialising
          rec.networkRetries++;
          hls.startLoad();
        } else if (currentVideo?.type === "live") {
          // 403/401 = session expired, or retries exhausted: full HLS reinit
          if (reloadCountRef.current >= 1) {
            setError("Stream unavailable. The server rejected the connection.");
            setIsLoading(false);
          } else {
            reloadCountRef.current++;
            setLiveError(true);
            setIsLoading(true);
            autoReloadTimerRef.current = setTimeout(reloadStream, 1500);
          }
        } else {
          setError(`Stream error: ${d.type}`);
          setIsLoading(false);
        }
      });
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", onMeta, { once: true });
    }

    if (currentVideo.type !== "live") {
      addToWatchHistory({
        ...currentVideo,
        currentTime: currentVideo.startTime || 0,
      });
    }

    if (isTV) showTvControls();

    return () => {
      clearTimeout(autoReloadTimerRef.current);
      stopProgress();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener("loadedmetadata", onMeta);
    };
  }, [currentVideo?.url, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentVideo) lastUrlRef.current = null;
  }, [currentVideo]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;

    const onPlay = () => {
      setTvPaused(false);
      clearInterval(progressRef.current);
      progressRef.current = setInterval(() => {
        if (video && !video.paused && currentVideo) {
          setTvCurrentTime(video.currentTime);
          updateWatchProgress(
            currentVideo.streamId,
            currentVideo.type,
            video.currentTime,
            Number.isFinite(video.duration) ? video.duration : 0,
          );
        }
      }, 1000);
    };
    const onPause = () => {
      setTvPaused(true);
      if (currentVideo)
        updateWatchProgress(
          currentVideo.streamId,
          currentVideo.type,
          video.currentTime,
          Number.isFinite(video.duration) ? video.duration : 0,
        );
    };
    const onDurationChange = () => {
      if (Number.isFinite(video.duration)) setTvDuration(video.duration);
    };
    const onTimeUpdate = () => setTvCurrentTime(video.currentTime);
    const onError = () => {
      if (!hlsRef.current) {
        if (currentVideo?.type === "live") {
          if (reloadCountRef.current >= 1) {
            setError("Stream unavailable. The server rejected the connection.");
            setIsLoading(false);
          } else {
            reloadCountRef.current++;
            setLiveError(true);
            setIsLoading(true);
            autoReloadTimerRef.current = setTimeout(reloadStream, 1500);
          }
        } else {
          setError("Failed to load video");
          setIsLoading(false);
        }
      }
    };
    const onWait = () => setIsLoading(true);
    const onCanPlay = () => { setIsLoading(false); setLiveError(false); };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("error", onError);
    video.addEventListener("waiting", onWait);
    video.addEventListener("canplay", onCanPlay);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("error", onError);
      video.removeEventListener("waiting", onWait);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, [currentVideo, updateWatchProgress]);

  // Keyboard shortcuts (desktop + TV remote)
  useEffect(() => {
    const onKey = (e) => {
      if (!currentVideo || !videoRef.current) return;
      const video = videoRef.current;
      const k = e.keyCode || e.which;

      if (isTV) showTvControls();

      // Block D-pad UP/DOWN from moving browser focus to overlay buttons on TV
      if (isTV && (k === 38 || k === 40)) {
        e.preventDefault();
        return;
      }

      // TV remote-specific keys
      if (TV_KEYS.BACK.has(k)) {
        e.preventDefault();
        handleClose();
        return;
      }
      if (k === TV_KEYS.PLAY) {
        e.preventDefault();
        video.play();
        return;
      }
      if (k === TV_KEYS.PAUSE) {
        e.preventDefault();
        video.pause();
        return;
      }
      if (k === TV_KEYS.FF) {
        e.preventDefault();
        video.currentTime += 30;
        return;
      }
      if (k === TV_KEYS.REW) {
        e.preventDefault();
        video.currentTime -= 30;
        return;
      }

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case " ":
        case "k":
          e.preventDefault();
          e.stopPropagation();
          video.paused ? video.play() : video.pause();
          break;
        case "f":
          e.preventDefault();
          document.fullscreenElement
            ? document.exitFullscreen()
            : video.requestFullscreen();
          break;
        case "Escape":
          if (!isTV) handleClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          video.currentTime -= 10;
          break;
        case "ArrowRight":
          e.preventDefault();
          video.currentTime += 10;
          break;
        case "ArrowUp":
          e.preventDefault();
          if (!isTV) video.volume = Math.min(1, video.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!isTV) video.volume = Math.max(0, video.volume - 0.1);
          break;
        case "[": {
          e.preventDefault();
          const i = SPEEDS.indexOf(video.playbackRate);
          const r = SPEEDS[Math.max(0, (i < 0 ? SPEEDS.indexOf(1) : i) - 1)];
          video.playbackRate = r;
          setPlaybackRate(r);
          break;
        }
        case "]": {
          e.preventDefault();
          const i = SPEEDS.indexOf(video.playbackRate);
          const r =
            SPEEDS[
              Math.min(SPEEDS.length - 1, (i < 0 ? SPEEDS.indexOf(1) : i) + 1)
            ];
          video.playbackRate = r;
          setPlaybackRate(r);
          break;
        }
        default:
          break;
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [currentVideo, handleClose, showTvControls]);

  // Close dropdowns on outside click (web only)
  useEffect(() => {
    if (isTV) return;
    if (!openMenu) return;
    const onClick = (e) => {
      if (
        ![qualityRef, speedRef, audioRef, subtitleRef, aspectRef].some((r) =>
          r.current?.contains(e.target),
        )
      ) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [openMenu]);

  // Next episode helpers
  const getNextEpisode = useCallback(() => {
    if (
      !currentVideo ||
      currentVideo.type !== "series" ||
      !currentVideo.seriesSeasons
    )
      return null;
    const all = Object.keys(currentVideo.seriesSeasons)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((s) =>
        [...(currentVideo.seriesSeasons[String(s)] || [])]
          .sort((a, b) => Number(a.episode_num) - Number(b.episode_num))
          .map((ep) => ({ ...ep, seasonNum: String(s) })),
      );
    const idx = all.findIndex(
      (ep) => String(ep.id) === String(currentVideo.streamId),
    );
    if (idx < 0 || idx >= all.length - 1) return null;
    const next = all[idx + 1];
    return { episode: next, seasonNum: next.seasonNum };
  }, [currentVideo]);

  const handleNextEpisode = useCallback(() => {
    const next = getNextEpisode();
    if (!next) return;
    const { episode, seasonNum } = next;
    const url = iptvApi.buildStreamUrl(
      "series",
      episode.id,
      episode.container_extension || "mp4",
    );
    const ep = String(episode.episode_num).padStart(2, "0");
    const sn = String(seasonNum).padStart(2, "0");
    playVideo({
      type: "series",
      streamId: String(episode.id),
      seriesId: currentVideo.seriesId,
      seriesName: currentVideo.seriesName,
      name: `${currentVideo.seriesName} - S${sn}E${ep}`,
      url,
      seasonNum,
      episodeNum: episode.episode_num,
      seriesSeasons: currentVideo.seriesSeasons,
    });
  }, [getNextEpisode, currentVideo, playVideo]);

  const getLevelLabel = (level, levels) => {
    if (!level.height) return `${Math.round(level.bitrate / 1000)}k`;
    return levels.filter((l) => l.height === level.height).length > 1
      ? `${level.height}p (${Math.round(level.bitrate / 1000)}k)`
      : `${level.height}p`;
  };

  const getVideoStyle = () => {
    const base = { ...S.video };
    if (aspectRatio === "16:9")
      return {
        ...base,
        width: "auto",
        height: "100%",
        maxWidth: "100%",
        aspectRatio: "16/9",
        objectFit: "fill",
      };
    if (aspectRatio === "4:3")
      return {
        ...base,
        width: "auto",
        height: "100%",
        maxWidth: "100%",
        aspectRatio: "4/3",
        objectFit: "fill",
      };
    if (aspectRatio === "fill") return { ...base, objectFit: "cover" };
    if (aspectRatio === "stretch") return { ...base, objectFit: "fill" };
    return base;
  };

  if (!currentVideo) return null;

  const nextEpisode = getNextEpisode();
  const pct =
    tvDuration > 0 ? Math.min((tvCurrentTime / tvDuration) * 100, 100) : 0;

  const liveToast = liveError && (
    <div
      style={{
        position: "absolute",
        bottom: isTV ? 48 : 16,
        right: isTV ? 48 : 16,
        backgroundColor: "rgba(233,69,96,0.92)",
        color: "#fff",
        padding: isTV ? "12px 22px" : "8px 14px",
        borderRadius: isTV ? 10 : 8,
        fontSize: isTV ? 18 : 13,
        fontWeight: 600,
        zIndex: 30,
      }}
    >
      Stream error — reloading...
    </div>
  );

  // ── TV render ───────────────────────────────────────────────────────────────
  if (isTV) {
    return (
      <div style={TV.overlay}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />

        {/* Controls overlay */}
        <div style={TV.controls(tvControlsVisible)} onClick={showTvControls}>
          {/* Top bar */}
          <div style={TV.topBar}>
            <button style={TV.closeBtn} tabIndex={-1} onClick={handleClose}>
              ✕
            </button>
            <span style={TV.title}>{currentVideo.name}</span>
            {nextEpisode && (
              <button style={TV.nextBtn} tabIndex={-1} onClick={handleNextEpisode}>
                {`Next ▶ S${String(nextEpisode.seasonNum).padStart(2, "0")}E${String(nextEpisode.episode.episode_num).padStart(2, "0")}`}
              </button>
            )}
          </div>

          {/* Center — play/pause icon */}
          <div style={TV.center}>
            {isLoading ? (
              <div
                style={{
                  width: 64,
                  height: 64,
                  border: "5px solid rgba(255,255,255,0.2)",
                  borderTopColor: "#e94560",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            ) : (
              <span style={TV.playIcon}>{tvPaused ? "▶" : "⏸"}</span>
            )}
          </div>

          {/* Bottom bar — progress + time */}
          <div style={TV.bottomBar}>
            {currentVideo.type !== "live" && (
              <>
                <div
                  style={TV.progressTrack}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    if (videoRef.current && tvDuration > 0)
                      videoRef.current.currentTime = ratio * tvDuration;
                  }}
                >
                  <div style={TV.progressFill(pct)} />
                </div>
                <div style={TV.timeRow}>
                  <span>{fmtTime(tvCurrentTime)}</span>
                  <span style={TV.seekHint}>
                    ◀◀ -10s · OK: play/pause · +10s ▶▶
                  </span>
                  <span>{fmtTime(tvDuration)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ ...S.errorOverlay, zIndex: 20 }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              Failed to load stream
            </p>
            <p style={{ margin: 0, color: "#888", fontSize: 18 }}>{error}</p>
            <div style={{ display: "flex", gap: 16 }}>
              <button
                style={{
                  ...TV.closeBtn,
                  borderRadius: 10,
                  width: "auto",
                  padding: "14px 32px",
                  fontSize: 18,
                  background: "rgba(255,255,255,0.15)",
                }}
                onClick={handleRetry}
              >
                Retry
              </button>
              <button
                style={{
                  ...TV.closeBtn,
                  borderRadius: 10,
                  width: "auto",
                  padding: "14px 32px",
                  fontSize: 18,
                }}
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {liveToast}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Web/desktop render ──────────────────────────────────────────────────────
  const currentQualityLabel =
    selectedLevel === -1
      ? "Auto"
      : getLevelLabel(qualityLevels[selectedLevel], qualityLevels);

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <button style={S.closeBtn} onClick={handleClose} title="Close (Esc)">
          ✕
        </button>
        <span style={S.title}>{currentVideo.name}</span>

        <div style={S.dropdown} ref={speedRef}>
          <button style={S.btn} onClick={() => setOpenMenu((m) => m === "speed" ? null : "speed")}>
            ▶ {playbackRate}x
          </button>
          {openMenu === "speed" && (
            <div style={S.menu}>
              {SPEEDS.map((r) => (
                <button
                  key={r}
                  style={S.menuItem(playbackRate === r)}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.playbackRate = r;
                    }
                    setPlaybackRate(r);
                    setOpenMenu(null);
                  }}
                >
                  {r}x{r === 1 ? " (Normal)" : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        {audioTracks.length > 1 && (
          <div style={S.dropdown} ref={audioRef}>
            <button style={S.btn} onClick={() => setOpenMenu((m) => m === "audio" ? null : "audio")}>
              ♪ {audioTracks[selectedAudio]?.name || "Audio"}
            </button>
            {openMenu === "audio" && (
              <div style={S.menu}>
                {audioTracks.map((t, i) => (
                  <div
                    key={t.id ?? i}
                    style={S.menuItem(selectedAudio === i)}
                    onClick={() => {
                      if (hlsRef.current) {
                        hlsRef.current.audioTrack = i;
                      }
                      setSelectedAudio(i);
                      setOpenMenu(null);
                    }}
                  >
                    {t.name || `Track ${i + 1}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {subtitleTracks.length > 0 && (
          <div style={S.dropdown} ref={subtitleRef}>
            <button style={S.btn} onClick={() => setOpenMenu((m) => m === "subtitle" ? null : "subtitle")}>
              CC{" "}
              {selectedSubtitle === -1
                ? "Off"
                : subtitleTracks[selectedSubtitle]?.name ||
                  `Track ${selectedSubtitle + 1}`}
            </button>
            {openMenu === "subtitle" && (
              <div style={S.menu}>
                <button
                  style={S.menuItem(selectedSubtitle === -1)}
                  onClick={() => {
                    if (hlsRef.current) {
                      hlsRef.current.subtitleTrack = -1;
                    }
                    setSelectedSubtitle(-1);
                    setOpenMenu(null);
                  }}
                >
                  Off
                </button>
                {subtitleTracks.map((t, i) => (
                  <button
                    key={t.id ?? i}
                    style={S.menuItem(selectedSubtitle === i)}
                    onClick={() => {
                      if (hlsRef.current) {
                        hlsRef.current.subtitleTrack = i;
                      }
                      setSelectedSubtitle(i);
                      setOpenMenu(null);
                    }}
                  >
                    {t.name || `Track ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={S.dropdown} ref={aspectRef}>
          <button style={S.btn} onClick={() => setOpenMenu((m) => m === "aspect" ? null : "aspect")}>
            ⊡ {aspectRatio === "default" ? "Aspect" : aspectRatio}
          </button>
          {openMenu === "aspect" && (
            <div style={S.menu}>
              {ASPECT_RATIOS.map(({ value, label }) => (
                <button
                  key={value}
                  style={S.menuItem(aspectRatio === value)}
                  onClick={() => {
                    setAspectRatio(value);
                    setOpenMenu(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {qualityLevels.length > 1 && (
          <div style={S.dropdown} ref={qualityRef}>
            <button style={S.btn} onClick={() => setOpenMenu((m) => m === "quality" ? null : "quality")}>
              ⚙ {currentQualityLabel}
            </button>
            {openMenu === "quality" && (
              <div style={S.menu}>
                <button
                  style={S.menuItem(selectedLevel === -1)}
                  onClick={() => {
                    if (hlsRef.current) {
                      hlsRef.current.currentLevel = -1;
                    }
                    setSelectedLevel(-1);
                    setOpenMenu(null);
                  }}
                >
                  Auto
                </button>
                {[...qualityLevels]
                  .map((l, i) => ({ l, i }))
                  .sort((a, b) => (b.l.height || 0) - (a.l.height || 0))
                  .map(({ l, i }) => (
                    <button
                      key={`${l.height}-${l.bitrate}`}
                      style={S.menuItem(selectedLevel === i)}
                      onClick={() => {
                        if (hlsRef.current) {
                          hlsRef.current.currentLevel = i;
                        }
                        setSelectedLevel(i);
                        setOpenMenu(null);
                      }}
                    >
                      {getLevelLabel(l, qualityLevels)}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {nextEpisode && (
          <button
            style={S.nextBtn}
            onClick={handleNextEpisode}
            title={`Next: S${String(nextEpisode.seasonNum).padStart(2, "0")}E${String(nextEpisode.episode.episode_num).padStart(2, "0")}`}
          >
            Next ▶
          </button>
        )}
      </div>

      <div style={S.videoWrapper}>
        <video
          ref={videoRef}
          controls={!isLoading}
          autoPlay
          playsInline
          crossOrigin="anonymous"
          style={getVideoStyle()}
        >
          <track kind="captions" />
        </video>
        {isLoading && (
          <div style={S.loadingOverlay}>
            <div
              style={{
                width: 40,
                height: 40,
                border: "4px solid rgba(255,255,255,0.2)",
                borderTopColor: "#e94560",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ margin: 0 }}>Loading stream...</p>
          </div>
        )}
        {error && (
          <div style={S.errorOverlay}>
            <p style={{ margin: 0, fontSize: 16 }}>Failed to load stream</p>
            <p style={{ margin: 0, color: "#888", fontSize: 13 }}>{error}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={S.btn} onClick={handleRetry}>
                Retry
              </button>
              <button style={S.btn} onClick={handleClose}>
                Close
              </button>
            </div>
          </div>
        )}
        {liveToast}
      </div>

      <div style={S.footer}>
        Space/K: Play/Pause · F: Fullscreen · ←→: Seek · ↑↓: Volume · [ ]: Speed
        · Esc: Close
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
