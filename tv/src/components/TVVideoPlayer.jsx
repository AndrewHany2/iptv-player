import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

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

  const stopProgress = useCallback(() => {
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = null;
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const handleClose = useCallback(() => {
    const video = videoRef.current;
    if (video && currentVideo) {
      updateWatchProgress(
        currentVideo.streamId,
        currentVideo.type,
        video.currentTime,
        Number.isFinite(video.duration) ? video.duration : 0
      );
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
    const url =
      currentVideo.type === "live" && rawUrl.endsWith(".ts")
        ? rawUrl.replace(/\.ts$/, ".m3u8")
        : rawUrl;
    const isHls = url.includes(".m3u8");

    setIsLoading(true);
    setError(null);
    setIsPaused(false);
    setCurrentTime(0);
    setDuration(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onMetadata = () => {
      setIsLoading(false);
      if (currentVideo.startTime > 0) video.currentTime = currentVideo.startTime;
      video.play().catch(console.error);
    };

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (currentVideo.startTime > 0) video.currentTime = currentVideo.startTime;
        video.play().catch(console.error);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setError("Stream error: " + data.type);
          setIsLoading(false);
        }
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
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener("loadedmetadata", onMetadata);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.url]);

  useEffect(() => {
    if (!currentVideo) lastUrlRef.current = null;
  }, [currentVideo]);

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
          updateWatchProgress(
            currentVideo.streamId,
            currentVideo.type,
            video.currentTime,
            Number.isFinite(video.duration) ? video.duration : 0
          );
        }
      }, 10000);
    };
    const onPause = () => {
      setIsPaused(true);
      if (currentVideo) {
        updateWatchProgress(
          currentVideo.streamId,
          currentVideo.type,
          video.currentTime,
          Number.isFinite(video.duration) ? video.duration : 0
        );
      }
    };
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
    };
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

  // Keyboard handling
  useEffect(() => {
    const onKey = (e) => {
      if (!currentVideo) return;
      const video = videoRef.current;
      if (!video) return;

      showControlsTemporarily();

      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          if (video.paused) video.play();
          else video.pause();
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
        case "ArrowLeft": {
          e.preventDefault();
          const newTime = Math.max(0, video.currentTime - 10);
          video.currentTime = newTime;
          setSeekDelta(-10);
          setTimeout(() => setSeekDelta(null), 800);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (Number.isFinite(video.duration)) {
            const newTime = Math.min(video.duration, video.currentTime + 10);
            video.currentTime = newTime;
          } else {
            video.currentTime += 10;
          }
          setSeekDelta(+10);
          setTimeout(() => setSeekDelta(null), 800);
          break;
        }
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        default:
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [currentVideo, handleClose, showControlsTemporarily]);

  // Show controls on mount
  useEffect(() => {
    if (currentVideo) showControlsTemporarily();
  }, [currentVideo, showControlsTemporarily]);

  const getNextEpisode = useCallback(() => {
    if (!currentVideo || currentVideo.type !== "series" || !currentVideo.seriesSeasons) return null;
    const allEps = Object.keys(currentVideo.seriesSeasons)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((s) =>
        [...(currentVideo.seriesSeasons[String(s)] || [])]
          .sort((a, b) => Number(a.episode_num) - Number(b.episode_num))
          .map((ep) => ({ ...ep, seasonNum: String(s) }))
      );
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
      type: "series",
      streamId: next.id,
      seriesId: currentVideo.seriesId,
      seriesName: currentVideo.seriesName,
      name: `${currentVideo.seriesName} — S${sNum}E${epNum}`,
      url,
      seasonNum: next.seasonNum,
      episodeNum: next.episode_num,
      seriesSeasons: currentVideo.seriesSeasons,
    });
  }, [getNextEpisode, currentVideo, playVideo]);

  const formatTime = (s) => {
    if (!Number.isFinite(s) || s <= 0) return "";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const nextEp = getNextEpisode();

  if (!currentVideo) return null;

  return (
    <div className="tv-player" onClick={showControlsTemporarily}>
      <video
        ref={videoRef}
        className="tv-player-video"
        autoPlay
        playsInline
        crossOrigin="anonymous"
      />

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
          <button type="button" className="tv-btn tv-btn-primary" onClick={handleClose}>
            Close
          </button>
        </div>
      )}

      {seekDelta && (
        <div className="tv-seek-indicator">
          {seekDelta > 0 ? `+${seekDelta}s ▶▶` : `◀◀ ${seekDelta}s`}
        </div>
      )}

      <div className={`tv-player-controls ${showControls ? "visible" : ""}`}>
        <div className="tv-player-top">
          <span className="tv-player-title">{currentVideo.name}</span>
          <div className="tv-player-actions">
            {nextEp && (
              <button type="button" className="tv-player-btn" onClick={handleNextEpisode}>
                Next ▶
              </button>
            )}
            <button type="button" className="tv-player-btn tv-player-close" onClick={handleClose}>
              ✕ Close
            </button>
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
          Enter: Play/Pause &nbsp;|&nbsp;
          ← → Seek 10s &nbsp;|&nbsp;
          ↑ ↓ Volume &nbsp;|&nbsp;
          Esc: Close
        </div>
      </div>
    </div>
  );
};

export default TVVideoPlayer;
