import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const TYPE_GRADIENT = {
  live:    "linear-gradient(160deg, #1a3a5c 0%, #0d1f33 100%)",
  movies:  "linear-gradient(160deg, #3a1a2e 0%, #1f0d1a 100%)",
  series:  "linear-gradient(160deg, #1a3a2e 0%, #0d1f19 100%)",
  default: "linear-gradient(160deg, #2a2a3a 0%, #1a1a2e 100%)",
};

const historyIcon = (type) => ({ live: "📺", movie: "🎬", movies: "🎬", series: "📺" })[type] || "▶️";

const NfPoster = ({ item, onRemove, children }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const grad = TYPE_GRADIENT[item.type] || TYPE_GRADIENT.default;
  return (
    <div className="nf-card-poster" style={{ background: grad }}>
      {item.poster && !imgFailed
        ? <img src={item.poster} alt={item.name} className="nf-card-poster-img" onError={() => setImgFailed(true)} />
        : <span className="nf-card-icon">{historyIcon(item.type)}</span>}
      <div className="nf-card-overlay"><span className="nf-play-btn">▶</span></div>
      {onRemove && (
        <button type="button" className="nf-remove-btn" title="Remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>
      )}
      {children}
    </div>
  );
};

NfPoster.propTypes = {
  item: PropTypes.shape({
    type: PropTypes.string,
    name: PropTypes.string,
    poster: PropTypes.string,
  }).isRequired,
  onRemove: PropTypes.func,
  children: PropTypes.node,
};

NfPoster.defaultProps = { onRemove: null, children: null };

const PosterCard = ({ item, fallback, onClick }) => {
  const imageUrl = item.cover || item.stream_icon || item.backdrop_path || item.poster || item.cover_big;
  const [failed, setFailed] = useState(false);
  const poster = imageUrl && !failed
    ? <img src={imageUrl} alt={item.name} onError={() => setFailed(true)} />
    : <div className="series-poster-fallback">{fallback}</div>;
  return (
    <button type="button" className="series-card" onClick={onClick}>
      <div className="series-poster">{poster}</div>
      <div className="series-info">
        <div className="series-title">{item.name}</div>
        {item.rating && <div className="series-rating">{item.rating} ⭐</div>}
      </div>
    </button>
  );
};

PosterCard.propTypes = {
  item: PropTypes.shape({
    cover: PropTypes.string, stream_icon: PropTypes.string,
    backdrop_path: PropTypes.string, poster: PropTypes.string,
    cover_big: PropTypes.string, name: PropTypes.string,
    rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  fallback: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

const ContentBrowser = () => {
  const {
    contentType, setContentType,
    searchQuery, setSearchQuery,
    users, activeUserId,
    setChannels,
    isLoading, setIsLoading,
    isSyncing,
    playVideo,
    watchHistory, removeFromWatchHistory,
  } = useApp();

  const [categories, setCategories] = useState([]);
  const [liveItems, setLiveItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); // { id, name }
  const [categoryItems, setCategoryItems] = useState([]);
  const [currentSeries, setCurrentSeries] = useState(null);
  const [seriesSeasons, setSeriesSeasons] = useState({});
  const [view, setView] = useState("categories");
  const [epgCache, setEpgCache] = useState({});

  useEffect(() => {
    if (contentType === "history") return;
    if (activeUserId) {
      setSelectedCategory(null);
      setCategoryItems([]);
      setView(contentType === "live" ? "items" : "categories");
      loadContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, activeUserId]);

  const loadContent = async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    setIsLoading(true);
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);

      if (contentType === "live") {
        const channelsData = await iptvApi.getLiveStreams();
        const formatted = channelsData.map((ch) => ({
          name: ch.name,
          url: iptvApi.buildStreamUrl("live", ch.stream_id, "m3u8"),
          id: ch.stream_id,
          stream_id: ch.stream_id,
          logo: ch.stream_icon || null,
        }));
        setChannels(formatted);
        setLiveItems(formatted);
      } else if (contentType === "movies") {
        const cats = await iptvApi.getVODCategories();
        setCategories(cats || []);
      } else if (contentType === "series") {
        const cats = await iptvApi.getSeriesCategories();
        setCategories(cats || []);
      }
    } catch (err) {
      console.error("Error loading content:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openCategory = async (cat) => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    setIsLoading(true);
    setSelectedCategory({ id: cat.category_id, name: cat.category_name });
    setCategoryItems([]);
    setView("items");
    try {
      iptvApi.setCredentials(user.host, user.username, user.password);
      let items = [];
      if (contentType === "movies") {
        items = cat.category_id === "all"
          ? await iptvApi.getAllVODStreams()
          : await iptvApi.getVODStreams(cat.category_id);
      } else if (contentType === "series") {
        items = cat.category_id === "all"
          ? await iptvApi.getAllSeries()
          : await iptvApi.getSeries(cat.category_id);
      }
      setCategoryItems(items || []);
    } catch (err) {
      console.error("Error loading category content:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const decodeEpgTitle = (title) => {
    try { return atob(title); } catch { return title; }
  };

  const fetchEpg = async (streamId) => {
    if (epgCache[streamId] !== undefined) return;
    setEpgCache((prev) => ({ ...prev, [streamId]: null }));
    try {
      const data = await iptvApi.getShortEpg(streamId, 1);
      const listing = data?.epg_listings?.[0];
      setEpgCache((prev) => ({ ...prev, [streamId]: listing ? decodeEpgTitle(listing.title) : "" }));
    } catch {
      setEpgCache((prev) => ({ ...prev, [streamId]: "" }));
    }
  };

  const loadSeriesEpisodes = async (item) => {
    setIsLoading(true);
    try {
      const info = await iptvApi.getSeriesInfo(item.series_id);
      setSeriesSeasons(info.episodes || {});
      const poster = item.cover || item.stream_icon || item.backdrop_path || item.poster || item.cover_big || null;
      setCurrentSeries({ id: item.series_id, name: item.name, poster });
      setView("episodes");
    } catch (err) {
      console.error("Error loading episodes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = async (item) => {
    if (!users.some((u) => u.id === activeUserId)) return;
    if (contentType === "live") {
      playVideo({ type: "live", streamId: item.stream_id || item.id, name: item.name, url: item.url });
    } else if (contentType === "movies") {
      const poster = item.cover || item.stream_icon || item.backdrop_path || item.poster || item.cover_big || null;
      playVideo({
        type: "movies", streamId: item.stream_id, name: item.name, poster,
        url: iptvApi.buildStreamUrl("movie", item.stream_id, item.container_extension || "mp4"),
      });
    } else if (contentType === "series") {
      await loadSeriesEpisodes(item);
    }
  };

  const getEpisodeNumber = (episode) => {
    if (episode.title) {
      const match = episode.title.match(/S\d+E(\d+)/i) || episode.title.match(/E(\d+)/i);
      if (match?.[1]) return match[1];
    }
    return episode.episode_num;
  };

  const handleEpisodeClick = (episode, seasonNum) => {
    if (!users.some((u) => u.id === activeUserId)) return;
    const episodeNum = getEpisodeNumber(episode);
    playVideo({
      type: "series", streamId: episode.id,
      seriesId: currentSeries.id, seriesName: currentSeries.name,
      name: `${currentSeries.name} - S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`,
      url: iptvApi.buildStreamUrl("series", episode.id, episode.container_extension || "mp4"),
      poster: currentSeries.poster || null,
      seasonNum, episodeNum, seriesSeasons,
    });
  };

  const handleHistoryClick = (item) => playVideo({ ...item, startTime: item.currentTime || 0 });

  const getHistoryLabel = (item) => {
    if (item.type === "series" && item.seasonNum && item.episodeNum) return `S${item.seasonNum}E${item.episodeNum}`;
    return item.type;
  };

  const formatRelativeTime = (dateString) => {
    const diffMs = Date.now() - new Date(dateString);
    const m = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMs / 3600000);
    const d = Math.floor(diffMs / 86400000);
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const getContentTypeLabel = () =>
    ({ live: "📺 Live TV", movies: "🎬 Movies", series: "📺 Series", history: "🕘 History" })[contentType] || "Content";

  const q = searchQuery.toLowerCase();
  const filteredHistory = watchHistory.filter((i) => i.name.toLowerCase().includes(q));
  const filteredLive = liveItems.filter((i) => i.name.toLowerCase().includes(q));
  const filteredCategories = categories.filter((cat) =>
    cat.category_name.toLowerCase().includes(q)
  );
  const filteredCategoryItems = categoryItems.filter((i) => i.name.toLowerCase().includes(q));

  const fallback = contentType === "movies" ? "🎬" : "📺";

  // ── Skeletons ──────────────────────────────────────────────────────────────
  const skeletonCategoryCards = Array.from({ length: 12 }, (_, i) => (
    <div key={i} className="skeleton-category-card">
      <div className="skeleton skeleton-category-icon" />
      <div className="skeleton skeleton-category-name" />
      <div className="skeleton skeleton-category-count" />
    </div>
  ));

  const skeletonPosterCards = Array.from({ length: 18 }, (_, i) => (
    <div key={i} className="skeleton-poster-card">
      <div className="skeleton-poster-image"><div className="skeleton" /></div>
      <div className="skeleton-poster-info">
        <div className="skeleton skeleton-poster-title" />
        <div className="skeleton skeleton-poster-sub" />
      </div>
    </div>
  ));

  const skeletonItemCards = Array.from({ length: 20 }, (_, i) => (
    <div key={i} className="skeleton-item-card">
      <div className="skeleton skeleton-item-icon" />
      <div className="skeleton skeleton-item-name" />
    </div>
  ));

  // ── Section bodies ─────────────────────────────────────────────────────────

  // Unique series from history (deduplicated by seriesId)
  const uniqueSeries = Object.values(
    watchHistory
      .filter((i) => i.type === "series" && i.seriesId)
      .reduce((acc, i) => { acc[i.seriesId] = acc[i.seriesId] || i; return acc; }, {})
  );

  // Unique movies from history (deduplicated by streamId)
  const uniqueMovies = Object.values(
    watchHistory
      .filter((i) => i.type === "movies" && i.streamId)
      .reduce((acc, i) => { acc[i.streamId] = acc[i.streamId] || i; return acc; }, {})
  );

  const exploreItems = [...uniqueSeries, ...uniqueMovies];

  const handleExploreClick = async (item) => {
    if (item.type === "series") {
      setContentType("series");
      await loadSeriesEpisodes({ series_id: item.seriesId, name: item.seriesName || item.name, poster: item.poster });
    } else {
      handleHistoryClick(item);
    }
  };

  let historyBody;
  if (filteredHistory.length === 0) {
    historyBody = (
      <div className="empty-state">
        <p>No watch history yet</p>
        <p className="hint">Start watching something to see it here</p>
      </div>
    );
  } else {
    historyBody = (
      <>
        <div className="nf-row">
          <h2 className="nf-row-title">Continue Watching</h2>
          <div className="nf-scroll">
            {filteredHistory.map((item) => {
              const pct = item.duration > 0
                ? Math.min(Math.round((item.currentTime / item.duration) * 100), 100)
                : null;
              return (
                <button key={item.id} type="button" className="nf-card"
                  onClick={() => handleHistoryClick(item)}>
                  <NfPoster item={item} onRemove={() => removeFromWatchHistory(item.id)}>
                    {pct !== null && (
                      <div className="nf-progress-bar">
                        <div className="nf-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </NfPoster>
                  <div className="nf-card-info">
                    <div className="nf-card-title">{item.name}</div>
                    <div className="nf-card-meta">
                      <span className="nf-card-badge">{getHistoryLabel(item)}</span>
                      <span className="nf-card-time">{formatRelativeTime(item.watchedAt)}</span>
                    </div>
                    {pct !== null && <div className="nf-card-pct">{pct}% watched</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {exploreItems.length > 0 && (
          <div className="nf-row">
            <h2 className="nf-row-title">Explore More</h2>
            <div className="nf-scroll">
              {exploreItems.map((item) => (
                <button key={`explore-${item.seriesId || item.streamId}`} type="button"
                  className="nf-card" onClick={() => handleExploreClick(item)}>
                  <NfPoster item={item} />
                  <div className="nf-card-info">
                    <div className="nf-card-title">{item.seriesName || item.name}</div>
                    <div className="nf-card-meta">
                      <span className="nf-card-badge">{item.type === "series" ? "Series" : "Movie"}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  let liveBody;
  if (isLoading) {
    liveBody = <div className="items-grid">{skeletonItemCards}</div>;
  } else if (filteredLive.length === 0) {
    liveBody = <div className="empty-state"><p>No channels found</p><p className="hint">Connect to an IPTV service to load channels</p></div>;
  } else {
    liveBody = (
      <div className="items-grid">
        {filteredLive.map((item) => (
          <button key={item.stream_id || item.id} type="button" className="item-card"
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => fetchEpg(item.stream_id || item.id)}>
            <div className="item-icon">📺</div>
            <div className="item-name">{item.name}</div>
            {epgCache[item.stream_id || item.id] && (
              <div className="item-epg">▶ {epgCache[item.stream_id || item.id]}</div>
            )}
          </button>
        ))}
      </div>
    );
  }

  let categoriesBody;
  if (isLoading) {
    categoriesBody = <div className="categories-grid">{skeletonCategoryCards}</div>;
  } else if (filteredCategories.length === 0) {
    categoriesBody = <div className="empty-state"><p>No categories found</p><p className="hint">Connect to an IPTV service to load content</p></div>;
  } else {
    categoriesBody = (
      <div className="categories-grid">
        {!q && (
          <button type="button" className="category-card"
            onClick={() => openCategory({ category_id: "all", category_name: "All" })}>
            <div className="category-icon">📂</div>
            <div className="category-name">All</div>
          </button>
        )}
        {filteredCategories.map((cat) => (
          <button key={cat.category_id} type="button" className="category-card"
            onClick={() => openCategory(cat)}>
            <div className="category-icon">📁</div>
            <div className="category-name">{cat.category_name}</div>
          </button>
        ))}
      </div>
    );
  }

  let categoryItemsBody;
  if (isLoading) {
    categoryItemsBody = <div className="series-grid">{skeletonPosterCards}</div>;
  } else if (filteredCategoryItems.length === 0) {
    categoryItemsBody = <div className="empty-state"><p>No items found</p></div>;
  } else {
    categoryItemsBody = (
      <div className="series-grid">
        {filteredCategoryItems.map((item) => (
          <PosterCard key={item.stream_id || item.series_id}
            item={item} fallback={fallback} onClick={() => handleItemClick(item)} />
        ))}
      </div>
    );
  }

  const isVOD = contentType === "movies" || contentType === "series";

  if (isSyncing) {
    return (
      <div className="sync-loading">
        <div className="auth-spinner" />
        <p>Syncing your data…</p>
      </div>
    );
  }

  return (
    <div className="content-browser">
      <div className="content-type-selector">
        {[
          { key: "live", label: "📺 Live TV" },
          { key: "movies", label: "🎬 Movies" },
          { key: "series", label: "📺 Series" },
          { key: "history", label: "🕘 History" },
        ].map(({ key, label }) => (
          <button key={key} type="button"
            className={`type-btn ${contentType === key ? "active" : ""}`}
            onClick={() => { setContentType(key); setSearchQuery(""); }}>
            {label}
          </button>
        ))}
      </div>

      {contentType !== "history" && (
        <div className="search-bar">
          <input type="text" placeholder={`🔍 Search ${getContentTypeLabel()}...`}
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input" />
        </div>
      )}

      <div className="content-area">

        {contentType === "history" && (
          <div className="history-view">
            <div className="nf-search">
              <input type="text" placeholder="🔍 Search history..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input" />
            </div>
            {historyBody}
          </div>
        )}

        {contentType === "live" && view === "items" && liveBody}

        {isVOD && view === "categories" && categoriesBody}

        {isVOD && view === "items" && (
          <div className="items-view">
            <button type="button" className="back-button"
              onClick={() => { setView("categories"); setSelectedCategory(null); setCategoryItems([]); setSearchQuery(""); }}>
              ← Back to Categories
            </button>
            <h2 className="series-title" style={{ marginBottom: "16px" }}>{selectedCategory?.name}</h2>
            {categoryItemsBody}
          </div>
        )}

        {view === "episodes" && (
          <div className="episodes-view">
            <button type="button" className="back-button"
              onClick={() => { setView("items"); setCurrentSeries(null); setSeriesSeasons({}); }}>
              ← Back
            </button>
            <h2 className="series-title">{currentSeries?.name}</h2>
            {isLoading ? (
              <div className="series-grid">{skeletonPosterCards}</div>
            ) : (
              <div className="seasons-list">
                {Object.keys(seriesSeasons)
                  .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
                  .map((seasonNum) => (
                    <div key={seasonNum} className="season-section">
                      <h3 className="season-title">Season {seasonNum}</h3>
                      <div className="episodes-grid">
                        {seriesSeasons[seasonNum].map((episode) => (
                          <button key={episode.id} type="button" className="episode-card"
                            onClick={() => handleEpisodeClick(episode, seasonNum)}>
                            <div className="episode-number">E{getEpisodeNumber(episode)}</div>
                            <div className="episode-title">{episode.title || "Untitled"}</div>
                            {episode.info?.duration && (
                              <div className="episode-duration">{episode.info.duration}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ContentBrowser;
