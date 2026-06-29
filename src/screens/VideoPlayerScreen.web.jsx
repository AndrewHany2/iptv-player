import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import { usePlatform } from "../platform";
import { createHlsDriver } from "../playback/drivers/hlsDriver";
import { useResilientPlayback } from "../playback/useResilientPlayback";

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

// Map an hls.js level height to a quality-cap ladder value (see backoff.js
// QUALITY_CAPS). Used so a manual quality pick sets the hook's manualCap, which
// the recovery machine treats as the *best* quality auto-downgrade may restore
// to — auto-downgrade can drop below the user's pick but never exceed it.
function heightToCap(height) {
  if (!height) return "auto";
  if (height >= 1080) return "1080";
  if (height >= 720) return "720";
  if (height >= 480) return "480";
  return "data-saver";
}

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
    backgroundColor: "rgba(108, 92, 231,0.9)",
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
    backgroundColor: "rgba(108, 92, 231,0.9)",
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
    backgroundColor: "#1B2236",
    border: "1px solid #28324E",
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
    color: active ? "#6C5CE7" : "#7A86A8",
    fontWeight: active ? 700 : 400,
    backgroundColor: active ? "rgba(108, 92, 231,0.12)" : "transparent",
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
    background: "rgba(108, 92, 231,0.9)",
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
    background: "rgba(108, 92, 231,0.9)",
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
    background: "#6C5CE7",
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
  const { isTV } = usePlatform();
  const {
    currentVideo,
    closeVideo,
    updateWatchProgress,
    addToWatchHistory,
    playVideo,
    flushProgress,
  } = useApp();

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressRef = useRef(null);
  const controlsTimerRef = useRef(null);

  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [openMenu, setOpenMenu] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioTracks, setAudioTracks] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(0);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState(-1);
  const [aspectRatio, setAspectRatio] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("lumen_settings") || "{}").defaultAspect || "default";
    } catch { return "default"; }
  });

  // TV-specific state
  const [tvControlsVisible, setTvControlsVisible] = useState(true);
  const [tvPaused, setTvPaused] = useState(false);
  const [tvCurrentTime, setTvCurrentTime] = useState(0);
  const [tvDuration, setTvDuration] = useState(0);

  const isLive = currentVideo?.type === "live";

  // User-pinned quality ceiling fed to the recovery machine. A manual quality
  // pick sets this (mapped from the chosen level's height); auto-downgrade may
  // drop below it but never restore above it. 'auto' = no ceiling.
  const [manualCap, setManualCap] = useState("auto");

  // Menu refs (outside-click dismissal, web only)
  const qualityRef = useRef(null);
  const speedRef = useRef(null);
  const audioRef = useRef(null);
  const subtitleRef = useRef(null);
  const aspectRef = useRef(null);

  const stopProgress = useCallback(() => {
    clearInterval(progressRef.current);
    progressRef.current = null;
  }, []);

  // (Re)create the hls.js engine instance for a source and wire the listeners
  // that populate the quality / audio / subtitle menus. The driver calls this
  // at the start of every load()/RELOAD so the instance is fresh and exists
  // before loadSource — independent of React effect ordering. The bespoke
  // recovery (reloadCount / liveError / recoverMediaError) is gone; the shared
  // machine owns retries via driver.load.
  const ensureHls = useCallback(
    (url) => {
      if (!videoRef.current) return null;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // TVs (esp. webOS) have far less memory/CPU headroom — keep buffers small
      // and cap the rendered level to the player size so we don't OOM or stall.
      // enableWorker stays on; note: some older webOS builds break with workers,
      // disable there if playback fails to start.
      const hls = new Hls(
        isTV
          ? {
              enableWorker: true,
              lowLatencyMode: false,
              backBufferLength: 30,
              maxBufferLength: 30,
              maxMaxBufferLength: 30,
              maxBufferSize: 30 * 1000 * 1000,
              capLevelToPlayerSize: true,
            }
          : {
              enableWorker: true,
              lowLatencyMode: false,
              backBufferLength: 90,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
            },
      );
      hlsRef.current = hls;
      hls.on(Hls.Events.MANIFEST_PARSED, () => setQualityLevels(hls.levels));
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        setAudioTracks([...hls.audioTracks]);
        setSelectedAudio(Math.max(0, hls.audioTrack));
      });
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, d) => setSelectedAudio(d.id));
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () =>
        setSubtitleTracks([...hls.subtitleTracks]),
      );
      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_e, d) =>
        setSelectedSubtitle(d.id),
      );
      return hls;
    },
    [isTV],
  );

  // ── Resilient playback: the shared recovery brain drives load / retries /
  // backoff / quality-downgrade / offline / fatal. We hand it an hlsDriver that
  // resolves the <video> element lazily (videoRef getter) and the live hls.js
  // instance (getHls). Building it with getters — rather than the concrete
  // element — keeps the driver non-null from the first render, so the hook's
  // load effect (which fires on the same commit, after the ref is attached) sees
  // a valid driver and a live element. The driver is stable for the session.
  const driver = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createHlsDriver(() => videoRef.current, {
      isTV,
      getHls: () => hlsRef.current,
      ensureHls,
    });
  }, [isTV, ensureHls]);

  const source = useMemo(
    () => (currentVideo ? { uri: currentVideo.url } : null),
    [currentVideo?.url],
  );

  const playback = useResilientPlayback({
    driver,
    source,
    isLive,
    startTime: currentVideo?.startTime || 0,
    manualCap,
    // AUTH-refresh hook. The recovery machine calls this once on a 401/403 before
    // retrying; re-loading the same signed URL forces a fresh handshake. A real
    // credential-refresh would live in AppContext (out of scope here).
    refreshCredentials: () => {},
  });

  const isLoading = playback.status === "idle" || playback.status === "loading";
  const isRecovering = playback.isRecovering;
  const isFatal = playback.isFatal;
  const fatalReason = playback.fatalReason;

  const handleRetry = useCallback(() => {
    playback.retry();
  }, [playback]);

  const handleClose = useCallback(() => {
    const video = videoRef.current;
    if (video && currentVideo) {
      updateWatchProgress(
        currentVideo.streamId,
        currentVideo.type,
        video.currentTime,
        Number.isFinite(video.duration) ? video.duration : 0,
      );
      // Don't rely on the 5s debounce — push the position synchronously so
      // closing immediately after seeking still persists resume.
      flushProgress();
    }
    stopProgress();
    closeVideo();
  }, [currentVideo, updateWatchProgress, flushProgress, stopProgress, closeVideo]);

  // Show TV controls and restart hide timer
  const showTvControls = useCallback(() => {
    setTvControlsVisible(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(
      () => setTvControlsVisible(false),
      4000,
    );
  }, []);

  // ── Per-source reset + watch-history + teardown ─────────────────────────────
  // The resilient-playback hook owns the actual load/seek/play and recovery
  // RELOADs; the hls.js engine instance is (re)created on demand by ensureHls
  // (invoked from the driver's load). This effect only resets per-stream UI
  // state, records watch history, and tears the engine down on source change /
  // unmount.
  useEffect(() => {
    if (!currentVideo || !videoRef.current) return undefined;

    const video = videoRef.current;

    // Reset per-stream UI state.
    setQualityLevels([]);
    setSelectedLevel(-1);
    setOpenMenu(null);
    setManualCap("auto");
    video.playbackRate = 1;
    setPlaybackRate(1);
    setAudioTracks([]);
    setSelectedAudio(0);
    setSubtitleTracks([]);
    setSelectedSubtitle(-1);
    setTvCurrentTime(0);
    setTvDuration(0);

    if (currentVideo.type !== "live") {
      addToWatchHistory({
        ...currentVideo,
        currentTime: currentVideo.startTime || 0,
      });
    }

    if (isTV) showTvControls();

    return () => {
      stopProgress();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentVideo?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Video event listeners — progress writes, TV transport state, time mirroring.
  // Loading / error / reconnecting are owned by the recovery hook now, so this
  // listener no longer touches them (no onError reload, no onWait/onCanPlay
  // loading toggles).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return undefined;

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

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [currentVideo, updateWatchProgress]);

  // Flush progress on teardown — tab hide / app backgrounding is the most
  // common resume-loss case (the unmount cleanup never runs on a hard kill).
  // Push the current position via updateWatchProgress + the synchronous flush.
  useEffect(() => {
    if (!currentVideo) return undefined;
    const flushNow = () => {
      const video = videoRef.current;
      if (video) {
        updateWatchProgress(
          currentVideo.streamId,
          currentVideo.type,
          video.currentTime,
          Number.isFinite(video.duration) ? video.duration : 0,
        );
      }
      flushProgress();
    };
    const onVisibility = () => {
      if (document.hidden) flushNow();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushNow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushNow);
    };
  }, [currentVideo, updateWatchProgress, flushProgress]);

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
    if (isTV) return undefined;
    if (!openMenu) return undefined;
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

  // Next-episode auto-advance — fire when the media reaches its end.
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

  // Auto-advance to the next episode when playback ends (series only).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return undefined;
    const onEnded = () => {
      if (currentVideo.type === "series" && getNextEpisode()) handleNextEpisode();
    };
    video.addEventListener("ended", onEnded);
    return () => video.removeEventListener("ended", onEnded);
  }, [currentVideo, getNextEpisode, handleNextEpisode]);

  const getLevelLabel = (level, levels) => {
    if (!level.height) return `${Math.round(level.bitrate / 1000)}k`;
    return levels.filter((l) => l.height === level.height).length > 1
      ? `${level.height}p (${Math.round(level.bitrate / 1000)}k)`
      : `${level.height}p`;
  };

  // Apply a manual quality pick: set the hls level directly (preserving the
  // original behavior) AND set the hook's manualCap so auto-downgrade never
  // restores above the user's chosen quality. levelIdx === -1 means Auto.
  const handleSelectLevel = useCallback((levelIdx) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIdx;
    }
    setSelectedLevel(levelIdx);
    if (levelIdx === -1) {
      setManualCap("auto");
    } else {
      const lvl = qualityLevels[levelIdx];
      setManualCap(heightToCap(lvl?.height));
    }
    setOpenMenu(null);
  }, [qualityLevels]);

  const getVideoStyle = useMemo(() => {
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
  }, [aspectRatio]);

  // Persist aspect-ratio choice to localStorage (lumen_settings.defaultAspect).
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("lumen_settings") || "{}");
      if (s.defaultAspect !== aspectRatio) {
        localStorage.setItem(
          "lumen_settings",
          JSON.stringify({ ...s, defaultAspect: aspectRatio }),
        );
      }
    } catch { /* ignore */ }
  }, [aspectRatio]);

  // Memoize so we don't recompute the next-episode lookup on every render
  // (e.g. each 1s progress tick). getNextEpisode is stable per currentVideo.
  const nextEpisode = useMemo(() => getNextEpisode(), [getNextEpisode]);

  if (!currentVideo) return null;

  const pct =
    tvDuration > 0 ? Math.min((tvCurrentTime / tvDuration) * 100, 100) : 0;

  // Reconnecting toast — driven by the recovery machine's recovering/buffering
  // status. Preserves the previous "Stream error — reloading..." idiom.
  const liveToast = isRecovering && !isFatal && (
    <div
      style={{
        position: "absolute",
        bottom: isTV ? 48 : 16,
        right: isTV ? 48 : 16,
        backgroundColor: "rgba(108, 92, 231,0.92)",
        color: "#fff",
        padding: isTV ? "12px 22px" : "8px 14px",
        borderRadius: isTV ? 10 : 8,
        fontSize: isTV ? 18 : 13,
        fontWeight: 600,
        zIndex: 30,
      }}
    >
      Reconnecting…
    </div>
  );

  const fatalMessage =
    fatalReason === "GONE"
      ? "This stream is no longer available."
      : fatalReason === "AUTH_EXPIRED"
        ? "Stream unavailable. The server rejected the connection."
        : "The stream could not be played.";

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
                  borderTopColor: "#6C5CE7",
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
        {isFatal && (
          <div style={{ ...S.errorOverlay, zIndex: 20 }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
              Failed to load stream
            </p>
            <p style={{ margin: 0, color: "#7A86A8", fontSize: 18 }}>{fatalMessage}</p>
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
                  onClick={() => handleSelectLevel(-1)}
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
                      onClick={() => handleSelectLevel(i)}
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
          style={getVideoStyle}
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
                borderTopColor: "#6C5CE7",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ margin: 0 }}>Loading stream...</p>
          </div>
        )}
        {isFatal && (
          <div style={S.errorOverlay}>
            <p style={{ margin: 0, fontSize: 16 }}>Failed to load stream</p>
            <p style={{ margin: 0, color: "#7A86A8", fontSize: 13 }}>{fatalMessage}</p>
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
