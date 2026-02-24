import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import iptvApi from "../services/iptvApi";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Content type state
  const [contentType, setContentType] = useState("live"); // 'live', 'movies', 'series'

  // Live TV state
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [currentChannelIndex, setCurrentChannelIndex] = useState(-1);

  // Users state
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);

  // VOD state
  const [movieCategories, setMovieCategories] = useState([]);
  const [movies, setMovies] = useState([]);
  const [currentMovieCategory, setCurrentMovieCategory] = useState(null);

  const [seriesCategories, setSeriesCategories] = useState([]);
  const [series, setSeries] = useState([]);
  const [currentSeriesCategory, setCurrentSeriesCategory] = useState(null);
  const [currentSeries, setCurrentSeries] = useState(null);
  const [seriesSeasons, setSeriesSeasons] = useState({});

  // Watch history state
  const [watchHistory, setWatchHistory] = useState([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Video playback state
  const [currentVideo, setCurrentVideo] = useState(null);

  // Watch history functions
  const loadWatchHistory = () => {
    try {
      const saved = localStorage.getItem("iptv_watch_history");
      if (saved) {
        setWatchHistory(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Error loading watch history:", err);
    }
  };

  const saveWatchHistory = (history) => {
    try {
      localStorage.setItem("iptv_watch_history", JSON.stringify(history));
    } catch (err) {
      console.error("Error saving watch history:", err);
    }
  };

  /**
   * Determines if a history entry should be filtered out based on the new item
   * Implements smart grouping for series (one entry per series)
   * @param {Object} historyItem - Existing history entry
   * @param {Object} newItem - New item being added
   * @returns {boolean} True if the history item should be kept
   */
  const shouldKeepHistoryItem = (historyItem, newItem) => {
    // For series: remove any previous episode from the same series
    if (newItem.type === "series" && historyItem.type === "series") {
      // Primary: Compare by seriesId (most reliable)
      if (newItem.seriesId && historyItem.seriesId) {
        return historyItem.seriesId !== newItem.seriesId;
      }
      // Fallback: Compare by series name
      if (newItem.seriesName && historyItem.seriesName) {
        return historyItem.seriesName !== newItem.seriesName;
      }
      // Last resort: Compare by streamId (old behavior)
      return historyItem.streamId !== newItem.streamId;
    }

    // For movies and live TV: remove exact same stream
    return !(
      historyItem.type === newItem.type &&
      historyItem.streamId === newItem.streamId
    );
  };

  /**
   * Add or update an item in watch history
   * For series, replaces previous episodes from the same series
   * For movies/live, replaces the exact same stream
   * @param {Object} item - Watch history item to add
   */
  const addToWatchHistory = (item) => {
    const newEntry = {
      ...item,
      watchedAt: new Date().toISOString(),
      id: `${item.type}_${item.streamId || item.id}_${Date.now()}`,
      currentTime: item.currentTime || 0,
      duration: item.duration || 0,
    };

    // Filter out duplicates using smart grouping logic
    const filteredHistory = watchHistory.filter((h) =>
      shouldKeepHistoryItem(h, item),
    );

    // Add new entry at the beginning and limit to 20 items
    const newHistory = [newEntry, ...filteredHistory].slice(0, 20);

    setWatchHistory(newHistory);
    saveWatchHistory(newHistory);
  };

  const updateWatchProgress = (streamId, type, currentTime, duration) => {
    const updatedHistory = watchHistory.map((item) => {
      if (item.streamId === streamId && item.type === type) {
        return {
          ...item,
          currentTime,
          duration,
          watchedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    setWatchHistory(updatedHistory);
    saveWatchHistory(updatedHistory);
  };

  /**
   * Play video in native player
   * @param {Object} video - Video to play { url, name, type, streamId, startTime, ... }
   */
  const playVideo = (video) => {
    setCurrentVideo(video);
  };

  /**
   * Close the native video player
   */
  const closeVideo = () => {
    setCurrentVideo(null);
  };

  // Load saved data on mount
  useEffect(() => {
    loadSavedUsers();
    loadSavedChannels();
    loadWatchHistory();
  }, []);

  // Auto-save users and activeUserId to localStorage
  useEffect(() => {
    if (users.length > 0) {
      saveUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, activeUserId]);

  // Auto-save channels to localStorage
  useEffect(() => {
    if (channels.length > 0) {
      saveChannels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels]);

  // Auto-sync active user
  useEffect(() => {
    if (activeUserId) {
      syncActiveUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  // Filter channels based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChannels(channels);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredChannels(
        channels.filter((ch) => ch.name.toLowerCase().includes(query)),
      );
    }
  }, [searchQuery, channels]);

  const loadSavedUsers = () => {
    try {
      const saved = localStorage.getItem("iptv_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUsers(parsed.users || []);
        setActiveUserId(parsed.activeUserId || null);
      }
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  const loadSavedChannels = () => {
    try {
      const saved = localStorage.getItem("iptv_channels");
      if (saved) {
        setChannels(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Error loading channels:", err);
    }
  };

  const saveUsers = () => {
    try {
      localStorage.setItem(
        "iptv_users",
        JSON.stringify({
          users,
          activeUserId,
        }),
      );
    } catch (err) {
      console.error("Error saving users:", err);
    }
  };

  const saveChannels = () => {
    try {
      localStorage.setItem("iptv_channels", JSON.stringify(channels));
    } catch (err) {
      console.error("Error saving channels:", err);
    }
  };

  const syncActiveUser = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    // Set credentials in the API service
    iptvApi.setCredentials(user.host, user.username, user.password);
  };

  const value = {
    // Content type
    contentType,
    setContentType,

    // Live TV
    channels,
    setChannels,
    filteredChannels,
    currentChannelIndex,
    setCurrentChannelIndex,

    // Users
    users,
    setUsers,
    activeUserId,
    setActiveUserId,
    saveUsers,

    // VOD
    movieCategories,
    setMovieCategories,
    movies,
    setMovies,
    currentMovieCategory,
    setCurrentMovieCategory,
    seriesCategories,
    setSeriesCategories,
    series,
    setSeries,
    currentSeriesCategory,
    setCurrentSeriesCategory,
    currentSeries,
    setCurrentSeries,
    seriesSeasons,

    // Watch History
    watchHistory,
    addToWatchHistory,
    updateWatchProgress,
    setSeriesSeasons,

    // Video Playback
    currentVideo,
    playVideo,
    closeVideo,

    // UI
    searchQuery,
    setSearchQuery,
    isLoading,
    setIsLoading,
    error,
    setError,

    // Actions
    saveChannels,
    loadSavedUsers,
    loadSavedChannels,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
