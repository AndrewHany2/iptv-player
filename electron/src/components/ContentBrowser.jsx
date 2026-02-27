import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import Loader from "./Loader";

const ContentBrowser = () => {
  const {
    contentType,
    setContentType,
    searchQuery,
    setSearchQuery,
    users,
    activeUserId,
    channels,
    setChannels,
    isLoading,
    setIsLoading,
    playVideo,
    watchHistory,
    removeFromWatchHistory,
  } = useApp();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [, setCurrentCategory] = useState(null);
  const [currentSeries, setCurrentSeries] = useState(null);
  const [seriesSeasons, setSeriesSeasons] = useState({});
  const [view, setView] = useState("categories"); // 'categories', 'items', 'episodes'
  const [epgCache, setEpgCache] = useState({}); // stream_id → current program title

  // Load categories when content type changes
  useEffect(() => {
    if (contentType === "history") return;
    if (activeUserId) {
      loadCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, activeUserId]);

  const loadCategories = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    setIsLoading(true);
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);

      let categoriesData = [];

      if (contentType === "live") {
        // For live TV, load channels directly
        const channelsData = await iptvApi.getLiveStreams();
        const formattedChannels = channelsData.map((ch) => {
          return {
            name: ch.name,
            // Always use m3u8 for live - Chromium can't play raw MPEG-TS
            url: iptvApi.buildStreamUrl("live", ch.stream_id, "m3u8"),
            id: ch.stream_id,
            stream_id: ch.stream_id,
            category: ch.category_name || "Uncategorized",
            logo: ch.stream_icon || null,
          };
        });
        setChannels(formattedChannels);

        // Group by category
        const grouped = formattedChannels.reduce((acc, ch) => {
          const cat = ch.category || "Uncategorized";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(ch);
          return acc;
        }, {});

        categoriesData = Object.keys(grouped).map((name) => ({
          category_id: name,
          category_name: name,
          count: grouped[name].length,
        }));
      } else if (contentType === "movies") {
        categoriesData = await iptvApi.getVODCategories();
      } else if (contentType === "series") {
        categoriesData = await iptvApi.getSeriesCategories();
      }

      setCategories(categoriesData || []);
      setView("categories");
      setItems([]);
      setCurrentCategory(null);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = async (category) => {
    setCurrentCategory(category);
    setIsLoading(true);

    try {
      let itemsData = [];

      if (contentType === "live") {
        // Filter channels by category
        itemsData = channels.filter(
          (ch) => (ch.category || "Uncategorized") === category.category_name,
        );
      } else if (contentType === "movies") {
        itemsData = await iptvApi.getVODStreams(category.category_id);
      } else if (contentType === "series") {
        itemsData = await iptvApi.getSeries(category.category_id);
      }

      setItems(itemsData || []);
      setView("items");
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Decode EPG title — some servers base64-encode it
   */
  const decodeEpgTitle = (title) => {
    try {
      return atob(title);
    } catch {
      return title;
    }
  };

  /**
   * Fetch short EPG for a live channel on hover (cached)
   */
  const fetchEpg = async (streamId) => {
    if (epgCache[streamId] !== undefined) return;
    // Mark as loading to avoid duplicate requests
    setEpgCache((prev) => ({ ...prev, [streamId]: null }));
    try {
      const data = await iptvApi.getShortEpg(streamId, 1);
      const listing = data?.epg_listings?.[0];
      const title = listing ? decodeEpgTitle(listing.title) : "";
      setEpgCache((prev) => ({ ...prev, [streamId]: title }));
    } catch {
      setEpgCache((prev) => ({ ...prev, [streamId]: "" }));
    }
  };

  /**
   * Play live channel in native player
   */
  const playLiveChannel = (item) => {
    playVideo({
      type: "live",
      streamId: item.stream_id || item.id,
      name: item.name,
      url: item.url,
    });
  };

  /**
   * Play movie in native player
   */
  const playMovie = (item) => {
    const streamUrl = iptvApi.buildStreamUrl(
      "movie",
      item.stream_id,
      item.container_extension || "mp4",
    );

    playVideo({
      type: "movies",
      streamId: item.stream_id,
      name: item.name,
      url: streamUrl,
    });
  };

  /**
   * Load series episodes
   */
  const loadSeriesEpisodes = async (item) => {
    setIsLoading(true);
    try {
      const info = await iptvApi.getSeriesInfo(item.series_id);
      setSeriesSeasons(info.episodes || {});
      setCurrentSeries({ id: item.series_id, name: item.name });
      setView("episodes");
    } catch (error) {
      console.error("Error loading episodes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle item click based on content type
   */
  const handleItemClick = async (item) => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    switch (contentType) {
      case "live":
        playLiveChannel(item);
        break;
      case "movies":
        playMovie(item);
        break;
      case "series":
        await loadSeriesEpisodes(item);
        break;
      default:
    }
  };

  /**
   * Helper function to extract episode number from title
   */
  const getEpisodeNumber = (episode) => {
    let episodeNum = episode.episode_num;
    if (episode.title) {
      // Match patterns like "S01E00", "S1E1", "E00", etc.
      const match =
        episode.title.match(/S\d+E(\d+)/i) || episode.title.match(/E(\d+)/i);
      if (match && match[1]) {
        episodeNum = match[1]; // Get the episode number (already a string with leading zeros)
      }
    }
    return episodeNum;
  };

  /**
   * Play series episode in native player
   */
  const handleEpisodeClick = (episode, seasonNum) => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;

    const streamUrl = iptvApi.buildStreamUrl(
      "series",
      episode.id,
      episode.container_extension || "mp4",
    );
    const episodeNum = getEpisodeNumber(episode);
    const episodeName = `${currentSeries.name} - S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;

    playVideo({
      type: "series",
      streamId: episode.id,
      seriesId: currentSeries.id,
      seriesName: currentSeries.name,
      name: episodeName,
      url: streamUrl,
      seasonNum: seasonNum,
      episodeNum: episodeNum,
      seriesSeasons: seriesSeasons,
    });
  };

  /**
   * Resume playback from history
   */
  const handleHistoryClick = (item) => {
    playVideo({
      ...item,
      startTime: item.currentTime || 0,
    });
  };

  const handleBack = () => {
    if (view === "episodes") {
      setView("items");
      setCurrentSeries(null);
      setSeriesSeasons({});
    } else if (view === "items") {
      setView("categories");
      setItems([]);
      setCurrentCategory(null);
    }
  };

  const getContentTypeLabel = () => {
    switch (contentType) {
      case "live":
        return "📺 Live TV";
      case "movies":
        return "🎬 Movies";
      case "series":
        return "📺 Series";
      case "history":
        return "🕘 History";
      default:
        return "Content";
    }
  };

  const getHistoryIcon = (type) => {
    const icons = { live: "📺", movie: "🎬", movies: "🎬", series: "📺" };
    return icons[type] || "▶️";
  };

  const getHistoryLabel = (item) => {
    if (item.type === "series" && item.seasonNum && item.episodeNum) {
      return `S${item.seasonNum}E${item.episodeNum}`;
    }
    return item.type;
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredCategories = categories.filter((cat) =>
    cat.category_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredHistory = watchHistory.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="content-browser">
      {isLoading && <Loader message="Loading content..." />}

      {/* Content Type Selector */}
      <div className="content-type-selector">
        <button
          type="button"
          className={`type-btn ${contentType === "live" ? "active" : ""}`}
          onClick={() => setContentType("live")}
        >
          📺 Live TV
        </button>
        <button
          type="button"
          className={`type-btn ${contentType === "movies" ? "active" : ""}`}
          onClick={() => setContentType("movies")}
        >
          🎬 Movies
        </button>
        <button
          type="button"
          className={`type-btn ${contentType === "series" ? "active" : ""}`}
          onClick={() => setContentType("series")}
        >
          📺 Series
        </button>
        <button
          type="button"
          className={`type-btn ${contentType === "history" ? "active" : ""}`}
          onClick={() => setContentType("history")}
        >
          🕘 History
        </button>
      </div>

      {/* Search Bar */}
      {contentType !== "history" && (
        <div className="search-bar">
          <input
            type="text"
            placeholder={`🔍 Search ${getContentTypeLabel()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {/* Content Area */}
      <div className="content-area">
        {/* History Tab */}
        {contentType === "history" && (
          <div className="history-view">
            <div className="history-header">
              <input
                type="text"
                placeholder="🔍 Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <p>No watch history yet</p>
                <p className="hint">Start watching something to see it here</p>
              </div>
            ) : (
              <div className="continue-watching-grid">
                {filteredHistory.map((item) => {
                  const progress =
                    item.duration > 0
                      ? Math.min(
                          Math.round((item.currentTime / item.duration) * 100),
                          100,
                        )
                      : null;
                  const hasProgress = item.currentTime > 0;

                  return (
                    <div
                      key={item.id}
                      className="continue-watching-card"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <button
                        type="button"
                        className="history-remove-btn"
                        title="Remove from history"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchHistory(item.id);
                        }}
                      >
                        ✕
                      </button>
                      <div className="continue-icon">
                        {getHistoryIcon(item.type)}
                      </div>
                      <div className="continue-info">
                        <div className="continue-title">{item.name}</div>
                        <div className="continue-meta">
                          <span className="continue-type">
                            {getHistoryLabel(item)}
                          </span>
                          <span className="continue-time">
                            {formatRelativeTime(item.watchedAt)}
                          </span>
                        </div>
                        {hasProgress && (
                          <div className="continue-progress">
                            {progress !== null ? (
                              <>
                                <div className="progress-bar">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <div className="progress-text">{progress}%</div>
                              </>
                            ) : (
                              <div className="progress-text">
                                {Math.floor(item.currentTime / 60)}m {Math.floor(item.currentTime % 60)}s
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {contentType !== "history" && view === "categories" && (
          <div className="categories-grid">
            {filteredCategories.length === 0 ? (
              <div className="empty-state">
                <p>No categories found</p>
                <p className="hint">
                  Connect to an IPTV service to load content
                </p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.category_id}
                  className="category-card"
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="category-icon">📁</div>
                  <div className="category-name">{category.category_name}</div>
                  {category.count && (
                    <div className="category-count">{category.count} items</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {contentType !== "history" && view === "items" && (
          <div className="items-view">
            <button type="button" className="back-button" onClick={handleBack}>
              ← Back to Categories
            </button>
            <div className="items-grid">
              {filteredItems.length === 0 ? (
                <div className="empty-state">
                  <p>No items found</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.stream_id || item.series_id || item.id}
                    className="item-card"
                    onClick={() => handleItemClick(item)}
                    onMouseEnter={() =>
                      contentType === "live" &&
                      fetchEpg(item.stream_id || item.id)
                    }
                  >
                    <div className="item-icon">
                      {contentType === "live"
                        ? "📺"
                        : contentType === "movies"
                          ? "🎬"
                          : "📺"}
                    </div>
                    <div className="item-name">{item.name}</div>
                    {contentType === "live" &&
                      epgCache[item.stream_id || item.id] && (
                        <div className="item-epg">
                          ▶ {epgCache[item.stream_id || item.id]}
                        </div>
                      )}
                    {item.rating && (
                      <div className="item-rating">{item.rating} ⭐</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {contentType !== "history" && view === "episodes" && (
          <div className="episodes-view">
            <button type="button" className="back-button" onClick={handleBack}>
              ← Back to Series
            </button>
            <h2 className="series-title">{currentSeries?.name}</h2>
            <div className="seasons-list">
              {Object.keys(seriesSeasons)
                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                .map((seasonNum) => (
                  <div key={seasonNum} className="season-section">
                    <h3 className="season-title">Season {seasonNum}</h3>
                    <div className="episodes-grid">
                      {seriesSeasons[seasonNum].map((episode) => (
                        <div
                          key={episode.id}
                          className="episode-card"
                          onClick={() => handleEpisodeClick(episode, seasonNum)}
                        >
                          <div className="episode-number">
                            E{getEpisodeNumber(episode)}
                          </div>
                          <div className="episode-title">
                            {episode.title || "Untitled"}
                          </div>
                          {episode.info?.duration && (
                            <div className="episode-duration">
                              {episode.info.duration}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentBrowser;
