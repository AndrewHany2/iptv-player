import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useApp } from "../context/AppContext";

const PROXY_BASE = "http://localhost:5000";

const PROXY_ROUTE = {
  live: "/proxy/live",
  movies: "/proxy/movie",
  series: "/proxy/series",
};

const VideoPlayer = () => {
  const { currentVideo, closeVideo, updateWatchProgress, addToWatchHistory } =
    useApp();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const lastVideoUrlRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

    // Add to watch history once
    addToWatchHistory({
      ...currentVideo,
      currentTime: currentVideo.startTime || 0,
    });

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

  if (!currentVideo) return null;

  return (
    <div className="video-player-overlay">
      <div className="video-player-container">
        <div className="video-player-header">
          <span className="video-title">{currentVideo.name}</span>
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
