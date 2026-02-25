import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";

/**
 * Format a date string to relative time (e.g., "2h ago", "3d ago")
 */
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
};

/**
 * Format seconds to human-readable time (e.g., "1h 23m", "45m")
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Calculate progress percentage
 */
const calculateProgress = (currentTime, duration) => {
  if (!duration || duration === 0) return 0;
  return Math.min(Math.round((currentTime / duration) * 100), 100);
};

/**
 * Get icon for content type
 */
const getContentIcon = (type) => {
  const icons = {
    live: "📺",
    movie: "🎬",
    movies: "🎬",
    series: "📺",
  };
  return icons[type] || "▶️";
};

/**
 * Get display label for content type
 */
const getContentLabel = (item) => {
  if (item.type === "series" && item.seasonNum && item.episodeNum) {
    return `S${item.seasonNum}E${item.episodeNum}`;
  }
  return item.type;
};

const ContinueWatching = ({ onItemClick }) => {
  const { watchHistory } = useApp();

  if (watchHistory.length === 0) {
    return null;
  }

  return (
    <div className="continue-watching">
      <h2 className="section-title">Continue Watching</h2>
      <div className="continue-watching-grid">
        {watchHistory.slice(0, 10).map((item) => {
          const progress = calculateProgress(
            item.currentTime || 0,
            item.duration || 0,
          );
          const hasProgress =
            item.currentTime && item.duration && item.currentTime > 0;

          return (
            <div
              key={item.id}
              className="continue-watching-card"
              onClick={() => onItemClick(item)}
            >
              <div className="continue-icon">{getContentIcon(item.type)}</div>
              <div className="continue-info">
                <div className="continue-title">{item.name}</div>
                <div className="continue-meta">
                  <span className="continue-type">{getContentLabel(item)}</span>
                  <span className="continue-time">
                    {formatRelativeTime(item.watchedAt)}
                  </span>
                </div>
                {hasProgress && (
                  <div className="continue-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {formatDuration(item.currentTime)} /{" "}
                      {formatDuration(item.duration)} ({progress}%)
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

ContinueWatching.propTypes = {
  onItemClick: PropTypes.func.isRequired,
};

export default ContinueWatching;
