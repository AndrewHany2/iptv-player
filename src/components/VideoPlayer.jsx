import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const PROXY_BASE = "http://localhost:5000";

const PROXY_ROUTE = {
  live: "/proxy/live",
  movies: "/proxy/movie",
  series: "/proxy/series",
};

const VideoPlayer = () => {
  const { currentVideo, closeVideo, updateWatchProgress, addToWatchHistory, playVideo } =
    useApp();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const lastVideoUrlRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const qualityMenuRef = useRef(null);

  // Build proxied URL using the correct route for the content type
  const getProxiedUrl = useCallback((url, type) => {
    if (type === "live") {
      return url; // Do not use proxy for live
    }
    const route = PROXY_ROUTE[type] || "/proxy/live";
    return `${PROXY_BASE}${route}?url=${encodeURIComponent(url)}`;
  }, []);

  // Stop progress tracking
  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Handle close - save progress before closing
  const handleClose = useCallback(() => {
    const video = videoRef.current;
    if (video && currentVideo) {
      updateWatchProgress(
        currentVideo.streamId,
        currentVideo.type,
        video.currentTime,
        video.duration || 0,
      );
    }
    stopProgressTracking();
    closeVideo();
  }, [currentVideo, updateWatchProgress, stopProgressTracking, closeVideo]);

  // Initialize HLS player - only when video URL changes
  useEffect(() => {
    if (!currentVideo || !videoRef.current) return;

    // Prevent re-initialization for the same video
    if (lastVideoUrlRef.current === currentVideo.url) return;
    lastVideoUrlRef.current = currentVideo.url;

    const video = videoRef.current;
    // For live .ts streams, swap to .m3u8 so HLS.js can handle it
    const rawUrl = currentVideo.url;
    const url =
      currentVideo.type === "live" && rawUrl.endsWith(".ts")
        ? rawUrl.replace(/\.ts$/, ".m3u8")
        : rawUrl;
    const proxiedUrl = getProxiedUrl(url, currentVideo.type);
    const isHls = url.includes(".m3u8");

    setIsLoading(true);
    setError(null);
    setQualityLevels([]);
    setSelectedLevel(-1);
    setShowQualityMenu(false);

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onLoadedMetadata = () => {
      setIsLoading(false);
      if (currentVideo.startTime && currentVideo.startTime > 0) {
        video.currentTime = currentVideo.startTime;
      }
      video.play().catch(console.error);
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

      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setQualityLevels(hls.levels);
        if (currentVideo.startTime && currentVideo.startTime > 0) {
          video.currentTime = currentVideo.startTime;
        }
        video.play().catch(console.error);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError(`Stream error: ${data.type}`);
          setIsLoading(false);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = proxiedUrl;
      video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    } else {
      video.src = proxiedUrl;
      video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    }

    // Only save VOD (movies/series) to watch history — not live channels
    if (currentVideo.type !== "live") {
      addToWatchHistory({
        ...currentVideo,
        currentTime: currentVideo.startTime || 0,
      });
    }

    // Cleanup on unmount or video change
    return () => {
      stopProgressTracking();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo?.url]);

  // Reset lastVideoUrlRef when player closes
  useEffect(() => {
    if (!currentVideo) {
      lastVideoUrlRef.current = null;
    }
  }, [currentVideo]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;

    const handlePlay = () => {
      // Start progress tracking
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = setInterval(() => {
        if (video && !video.paused && currentVideo) {
          updateWatchProgress(
            currentVideo.streamId,
            currentVideo.type,
            video.currentTime,
            video.duration || 0,
          );
        }
      }, 10000); // Save every 10 seconds
    };

    const handlePause = () => {
      if (currentVideo) {
        updateWatchProgress(
          currentVideo.streamId,
          currentVideo.type,
          video.currentTime,
          video.duration || 0,
        );
      }
    };

    const handleError = () => {
      setError("Failed to load video");
      setIsLoading(false);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [currentVideo, updateWatchProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentVideo) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          e.stopPropagation();
          if (video.paused) video.play();
          else video.pause();
          break;
        case "f":
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else video.requestFullscreen();
          break;
        case "Escape":
          handleClose();
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
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        default:
      }
    };

    // Use capture phase so we intercept space BEFORE Chromium's
    // native <video controls> handler fires, preventing double-toggle.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [currentVideo, handleClose]);

  // Close quality menu when clicking outside
  useEffect(() => {
    if (!showQualityMenu) return;
    const handleClickOutside = (e) => {
      if (qualityMenuRef.current && !qualityMenuRef.current.contains(e.target)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showQualityMenu]);

  const handleQualityChange = useCallback((levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setSelectedLevel(levelIndex);
      setShowQualityMenu(false);
    }
  }, []);

  // Label for a quality level. Shows bitrate alongside if multiple levels share the same height.
  const getLevelLabel = (level, levels) => {
    if (!level.height) return `${Math.round(level.bitrate / 1000)}k`;
    const sameHeight = levels.filter((l) => l.height === level.height);
    if (sameHeight.length > 1) return `${level.height}p (${Math.round(level.bitrate / 1000)}k)`;
    return `${level.height}p`;
  };

  const currentQualityLabel =
    selectedLevel === -1 ? "Auto" : getLevelLabel(qualityLevels[selectedLevel], qualityLevels);

  // Find the next episode for series content.
  // Builds a flat sorted list (season asc → episode_num asc) across all seasons,
  // finds the current episode by streamId, and returns the immediately next entry.
  const getNextEpisode = useCallback(() => {
    if (
      !currentVideo ||
      currentVideo.type !== "series" ||
      !currentVideo.seriesSeasons
    )
      return null;

    const { seriesSeasons } = currentVideo;

    // Flatten all seasons into one ordered list
    const allEpisodes = Object.keys(seriesSeasons)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((sNum) =>
        [...(seriesSeasons[String(sNum)] || [])]
          .sort((a, b) => Number(a.episode_num) - Number(b.episode_num))
          .map((ep) => ({ ...ep, seasonNum: String(sNum) })),
      );

    const currentIdx = allEpisodes.findIndex(
      (ep) => String(ep.id) === String(currentVideo.streamId),
    );

    if (currentIdx === -1 || currentIdx >= allEpisodes.length - 1) return null;

    const next = allEpisodes[currentIdx + 1];
    return { episode: next, seasonNum: next.seasonNum };
  }, [currentVideo]);

  const handleNextEpisode = useCallback(() => {
    const next = getNextEpisode();
    if (!next) return;

    const { episode, seasonNum } = next;
    const streamUrl = iptvApi.buildStreamUrl(
      "series",
      episode.id,
      episode.container_extension || "mp4",
    );
    const epNum = String(episode.episode_num).padStart(2, "0");
    const sNum = String(seasonNum).padStart(2, "0");
    const episodeName = `${currentVideo.seriesName} - S${sNum}E${epNum}`;

    playVideo({
      type: "series",
      streamId: episode.id,
      seriesId: currentVideo.seriesId,
      seriesName: currentVideo.seriesName,
      name: episodeName,
      url: streamUrl,
      seasonNum: seasonNum,
      episodeNum: episode.episode_num,
      seriesSeasons: currentVideo.seriesSeasons,
    });
  }, [getNextEpisode, currentVideo, playVideo]);

  const nextEpisode = getNextEpisode();

  if (!currentVideo) return null;

  return (
    <div className="video-player-overlay">
      <div className="video-player-container">
        <div className="video-player-header">
          <span className="video-title">{currentVideo.name}</span>
          {qualityLevels.length > 1 && (
            <div className="quality-selector" ref={qualityMenuRef}>
              <button
                type="button"
                className="quality-btn"
                onClick={() => setShowQualityMenu((prev) => !prev)}
              >
                ⚙ {currentQualityLabel}
              </button>
              {showQualityMenu && (
                <div className="quality-menu">
                  <div
                    className={`quality-option ${selectedLevel === -1 ? "active" : ""}`}
                    onClick={() => handleQualityChange(-1)}
                  >
                    Auto
                  </div>
                  {[...qualityLevels]
                    .map((level, idx) => ({ level, idx }))
                    .sort((a, b) => (b.level.height || 0) - (a.level.height || 0))
                    .map(({ level, idx }) => (
                      <div
                        key={idx}
                        className={`quality-option ${selectedLevel === idx ? "active" : ""}`}
                        onClick={() => handleQualityChange(idx)}
                      >
                        {getLevelLabel(level, qualityLevels)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          {nextEpisode && (
            <button
              type="button"
              className="next-episode-btn"
              onClick={handleNextEpisode}
              title={`Next: S${String(nextEpisode.seasonNum).padStart(2, "0")}E${String(nextEpisode.episode.episode_num).padStart(2, "0")} – ${nextEpisode.episode.title || ""}`}
            >
              Next ▶
            </button>
          )}
          <button
            type="button"
            className="close-button"
            onClick={handleClose}
            title="Close (Esc)"
          >
            X
          </button>
        </div>

        <div className="video-wrapper">
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            crossOrigin="anonymous"
            className="video-element"
          />

          {isLoading && (
            <div className="video-loading">
              <div className="spinner"></div>
              <p>Loading stream...</p>
            </div>
          )}

          {error && (
            <div className="video-error">
              <p>Failed to load stream</p>
              <p className="error-details">{error}</p>
              <button type="button" onClick={handleClose}>
                Close
              </button>
            </div>
          )}
        </div>

        <div className="video-player-info">
          <span className="keyboard-hints">
            Space: Play/Pause | F: Fullscreen | Arrows: Seek/Volume | Esc: Close
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
