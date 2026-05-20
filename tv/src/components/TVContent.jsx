import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";
import TVLoader from "./TVLoader";
import PropTypes from "prop-types";

const COLS = 5;

const TVContent = forwardRef(function TVContent({ onFocusSidebar }, ref) {
  const {
    contentType,
    users,
    activeUserId,
    isLoading,
    setIsLoading,
    playVideo,
    watchHistory,
    removeFromWatchHistory,
    setChannels,
  } = useApp();

  const [view, setView] = useState("items");
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [currentSeries, setCurrentSeries] = useState(null);
  const [seriesSeasons, setSeriesSeasons] = useState({});
  const [gridFocusIdx, setGridFocusIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const itemRefs = useRef([]);
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const getDisplayItems = () => {
    if (view === "categories") return categories;
    if (view === "episodes") return [];
    if (contentType === "history") return watchHistory;
    return items;
  };

  const displayItems = getDisplayItems();

  const episodeList =
    view === "episodes"
      ? Object.keys(seriesSeasons)
          .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
          .flatMap((s) =>
            (seriesSeasons[s] || []).map((ep) => ({ ...ep, seasonNum: s }))
          )
      : [];

  const allItems = view === "episodes" ? episodeList : displayItems;

  const filteredItems = searchQuery.trim()
    ? allItems.filter((item) => {
        const name = (item.name || item.category_name || "").toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : allItems;

  useImperativeHandle(ref, () => ({
    focusFirst() {
      setGridFocusIdx(0);
      itemRefs.current[0]?.focus();
    },
    focusSearch() {
      searchRef.current?.focus();
    },
  }));

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, filteredItems.length);
  }, [filteredItems.length]);

  useEffect(() => {
    setGridFocusIdx(0);
    setView("items");
    setCategories([]);
    setItems([]);
    setCurrentSeries(null);
    setSeriesSeasons({});
    setSearchQuery("");
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, activeUserId]);

  const loadContent = async () => {
    if (contentType === "history") return;
    if (!activeUserId) return;

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
        setItems(formatted);
        setView("items");
      } else if (contentType === "movies") {
        const cats = await iptvApi.getVODCategories();
        setCategories([{ category_id: "", category_name: "All" }, ...(cats || [])]);
        setView("categories");
      } else if (contentType === "series") {
        const cats = await iptvApi.getSeriesCategories();
        setCategories([{ category_id: "", category_name: "All" }, ...(cats || [])]);
        setView("categories");
      }
    } catch (err) {
      console.error("[TVContent] loadContent:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = async (cat) => {
    setIsLoading(true);
    try {
      let data = [];
      if (contentType === "movies") {
        data = await iptvApi.getVODStreams(cat.category_id || undefined);
      } else if (contentType === "series") {
        data = await iptvApi.getSeries(cat.category_id || undefined);
      }
      setItems(data || []);
      setView("items");
      setSearchQuery("");
      setGridFocusIdx(0);
      itemRefs.current[0]?.focus();
    } catch (err) {
      console.error("[TVContent] handleCategorySelect:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeriesSelect = async (item) => {
    setIsLoading(true);
    try {
      const info = await iptvApi.getSeriesInfo(item.series_id);
      setSeriesSeasons(info.episodes || {});
      setCurrentSeries({ id: item.series_id, name: item.name });
      setView("episodes");
      setSearchQuery("");
      setGridFocusIdx(0);
      itemRefs.current[0]?.focus();
    } catch (err) {
      console.error("[TVContent] handleSeriesSelect:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemSelect = useCallback(
    (item) => {
      if (view === "categories") {
        handleCategorySelect(item);
        return;
      }

      switch (contentType) {
        case "live":
          playVideo({
            type: "live",
            streamId: item.stream_id || item.id,
            name: item.name,
            url: item.url,
          });
          break;
        case "movies":
          playVideo({
            type: "movies",
            streamId: item.stream_id,
            name: item.name,
            url: iptvApi.buildStreamUrl("movie", item.stream_id, item.container_extension || "mp4"),
          });
          break;
        case "series":
          handleSeriesSelect(item);
          break;
        case "history":
          playVideo({ ...item, startTime: item.currentTime || 0 });
          break;
        default:
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, contentType, playVideo]
  );

  const handleEpisodeSelect = useCallback(
    (episode) => {
      const streamUrl = iptvApi.buildStreamUrl(
        "series",
        episode.id,
        episode.container_extension || "mp4"
      );
      const sNum = String(episode.seasonNum).padStart(2, "0");
      const epNum = String(episode.episode_num).padStart(2, "0");
      playVideo({
        type: "series",
        streamId: episode.id,
        seriesId: currentSeries.id,
        seriesName: currentSeries.name,
        name: `${currentSeries.name} — S${sNum}E${epNum}`,
        url: streamUrl,
        seasonNum: episode.seasonNum,
        episodeNum: episode.episode_num,
        seriesSeasons,
      });
    },
    [currentSeries, seriesSeasons, playVideo]
  );

  const handleBack = useCallback(() => {
    if (view === "episodes") {
      setView("items");
      setCurrentSeries(null);
      setSeriesSeasons({});
    } else if (view === "items" && contentType !== "live") {
      setView("categories");
      setItems([]);
    } else {
      onFocusSidebar();
    }
    setSearchQuery("");
    setGridFocusIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, contentType, onFocusSidebar]);

  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setGridFocusIdx(0);
        itemRefs.current[0]?.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSearchQuery("");
        setGridFocusIdx(0);
        itemRefs.current[0]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onFocusSidebar();
      }
    },
    [onFocusSidebar]
  );

  const handleKeyDown = useCallback(
    (e, idx) => {
      const total = filteredItems.length;
      if (total === 0) return;

      switch (e.key) {
        case "ArrowRight": {
          e.preventDefault();
          const next = Math.min(idx + 1, total - 1);
          setGridFocusIdx(next);
          itemRefs.current[next]?.focus();
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (idx % COLS === 0) {
            onFocusSidebar();
          } else {
            const prev = idx - 1;
            setGridFocusIdx(prev);
            itemRefs.current[prev]?.focus();
          }
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const next = Math.min(idx + COLS, total - 1);
          setGridFocusIdx(next);
          itemRefs.current[next]?.focus();
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = idx - COLS;
          if (prev >= 0) {
            setGridFocusIdx(prev);
            itemRefs.current[prev]?.focus();
          } else {
            searchRef.current?.focus();
          }
          break;
        }
        case "Enter": {
          e.preventDefault();
          if (view === "episodes") {
            handleEpisodeSelect(filteredItems[idx]);
          } else {
            handleItemSelect(filteredItems[idx]);
          }
          break;
        }
        case "Escape":
        case "Backspace": {
          e.preventDefault();
          handleBack();
          break;
        }
        default:
      }
    },
    [filteredItems, view, onFocusSidebar, handleItemSelect, handleEpisodeSelect, handleBack]
  );

  const getContentTitle = () => {
    if (view === "episodes") return currentSeries?.name || "Episodes";
    if (view === "categories") return contentType === "movies" ? "🎬 Movies" : "📺 Series";
    switch (contentType) {
      case "live": return "📺 Live TV";
      case "movies": return "🎬 Movies";
      case "series": return "📺 Series";
      case "history": return "🕘 History";
      default: return "";
    }
  };

  const formatProgress = (item) => {
    if (!item.currentTime || item.currentTime <= 0) return null;
    return item.duration > 0 ? Math.round((item.currentTime / item.duration) * 100) : null;
  };

  const formatRelativeTime = (dateString) => {
    const diffMs = Date.now() - new Date(dateString);
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getCardIcon = (item, isCat, isEp) => {
    if (isCat) return "📁";
    if (contentType === "live") return "📺";
    if (contentType === "movies") return "🎬";
    if (contentType === "series" && !isEp) return "📺";
    if (contentType === "history") {
      return item.type === "movies" ? "🎬" : "📺";
    }
    return "▶";
  };

  const getEmptyMessage = (userId, query) => {
    if (!userId) return "Connect an IPTV account to get started";
    if (query) return "No results found";
    return "No content found";
  };

  const renderCard = (item, idx) => {
    const isHistory = contentType === "history" && view !== "categories" && view !== "episodes";
    const isCat = view === "categories";
    const isEp = view === "episodes";
    const progress = isHistory ? formatProgress(item) : null;

    const icon = getCardIcon(item, isCat, isEp);
    const name = isEp
      ? `E${String(item.episode_num).padStart(2, "0")} — ${item.title || "Untitled"}`
      : item.name || item.category_name;

    return (
      <button
        key={item.id || item.stream_id || item.series_id || item.category_id || idx}
        ref={(el) => (itemRefs.current[idx] = el)}
        type="button"
        className="tv-card"
        tabIndex={-1}
        onKeyDown={(e) => handleKeyDown(e, idx)}
        onClick={() =>
          view === "episodes" ? handleEpisodeSelect(item) : handleItemSelect(item)
        }
        onFocus={() => setGridFocusIdx(idx)}
      >
        <span className="tv-card-icon">{icon}</span>
        <span className="tv-card-name">{name}</span>
        {isHistory && item.seasonNum && item.episodeNum && (
          <span className="tv-card-meta">
            S{item.seasonNum}E{item.episodeNum}
          </span>
        )}
        {isHistory && (
          <span className="tv-card-meta">{formatRelativeTime(item.watchedAt)}</span>
        )}
        {progress !== null && (
          <div className="tv-progress">
            <div className="tv-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        {isHistory && (
          <button
            type="button"
            className="tv-card-remove"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              removeFromWatchHistory(item.id);
            }}
          >
            ✕
          </button>
        )}
      </button>
    );
  };

  return (
    <div ref={containerRef} className="tv-content">
      {isLoading && <TVLoader message="Loading content…" />}

      <div className="tv-content-header">
        {view === "episodes" && (
          <button type="button" className="tv-back-btn" onClick={handleBack}>
            ← Back
          </button>
        )}
        <h1 className="tv-content-title">{getContentTitle()}</h1>
        {view === "episodes" && currentSeries && (
          <span className="tv-content-subtitle">{currentSeries.name}</span>
        )}
      </div>

      <div className="tv-search-bar">
        <input
          ref={searchRef}
          type="search"
          className="tv-input tv-search-input"
          placeholder="🔍 Search…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          tabIndex={-1}
        />
        {searchQuery && (
          <span className="tv-search-count">{filteredItems.length} results</span>
        )}
      </div>

      {!isLoading && filteredItems.length === 0 && (
        <div className="tv-empty">{getEmptyMessage(activeUserId, searchQuery)}</div>
      )}

      <div className="tv-grid">
        {filteredItems.map((item, idx) => renderCard(item, idx))}
      </div>
    </div>
  );
});

TVContent.propTypes = {
  onFocusSidebar: PropTypes.func.isRequired,
};

export default TVContent;
