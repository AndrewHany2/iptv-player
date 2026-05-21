import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const itemShape = PropTypes.shape({
  cover: PropTypes.string,
  stream_icon: PropTypes.string,
  backdrop_path: PropTypes.string,
  poster: PropTypes.string,
  cover_big: PropTypes.string,
  name: PropTypes.string,
  rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
});

const PosterCard = ({ item, onClick }) => {
  const imageUrl =
    item.cover || item.stream_icon || item.backdrop_path ||
    item.poster || item.cover_big;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button type="button" className="series-card" onClick={onClick}>
      <div className="series-poster">
        {imageUrl && !imgFailed ? (
          <img src={imageUrl} alt={item.name} onError={() => setImgFailed(true)} />
        ) : (
          <div className="series-poster-fallback">📺</div>
        )}
      </div>
      <div className="series-info">
        <div className="series-title">{item.name}</div>
        {item.rating && <div className="series-rating">{item.rating} ⭐</div>}
      </div>
    </button>
  );
};
PosterCard.propTypes = { item: itemShape.isRequired, onClick: PropTypes.func.isRequired };

const SeriesContent = () => {
  const {
    seriesCategories, setSeriesCategories,
    series, setSeries,
    currentSeries, setCurrentSeries,
    seriesSeasons, setSeriesSeasons,
    users, activeUserId,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [view, setView] = useState("series"); // 'series' | 'episodes'

  const loadAll = useCallback(async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    iptvApi.setCredentials(user.host, user.username, user.password);
    setLoading(true);
    try {
      const [cats, allSeries] = await Promise.all([
        iptvApi.getSeriesCategories(),
        iptvApi.getAllSeries(),
      ]);
      setSeriesCategories(cats || []);
      setSeries(allSeries || []);
    } catch (err) {
      console.error("Error loading series:", err);
    } finally {
      setLoading(false);
    }
  }, [users, activeUserId, setSeriesCategories, setSeries]);

  useEffect(() => {
    if (activeUserId && series.length === 0) loadAll();
  }, [activeUserId, series.length, loadAll]);

  const filtered = useMemo(() => {
    let list = series;
    if (categoryFilter !== "all") {
      list = list.filter((s) => String(s.category_id) === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name?.toLowerCase().includes(q));
    }
    return list;
  }, [series, categoryFilter, search]);

  const openSeries = async (show) => {
    setLoading(true);
    try {
      const info = await iptvApi.getSeriesInfo(show.series_id);
      setSeriesSeasons(info.episodes || {});
      setCurrentSeries({ id: show.series_id, name: show.name });
      setView("episodes");
    } catch (err) {
      console.error("Error loading episodes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView("series");
    setSeriesSeasons({});
    setCurrentSeries(null);
  };

  const getEpisodeNumber = (episode) => {
    if (episode.title) {
      const match = episode.title.match(/S\d+E(\d+)/i) || episode.title.match(/E(\d+)/i);
      if (match?.[1]) return match[1];
    }
    return episode.episode_num;
  };

  const handleEpisodeClick = async (episode, seasonNum) => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    const streamUrl = iptvApi.buildStreamUrl("series", episode.id, episode.container_extension || "mp4");
    const epNum = getEpisodeNumber(episode);
    const name = `${currentSeries.name} - S${String(seasonNum).padStart(2, "0")}E${String(epNum).padStart(2, "0")}`;
    try {
      await globalThis.electron.openInVLC(streamUrl, { name });
    } catch (err) {
      console.error("Error opening VLC:", err);
      // eslint-disable-next-line no-alert
      alert("Failed to open VLC. Make sure VLC is installed.");
    }
  };

  // ── Episodes view ──────────────────────────────────────────────────────────
  if (view === "episodes") {
    const seasons = Object.keys(seriesSeasons).sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
    return (
      <div className="items-list">
        <button type="button" className="back-button" onClick={handleBack}>← Back to Series</button>
        {seasons.length === 0 ? (
          <div className="empty-state"><p>No episodes found</p></div>
        ) : (
          seasons.map((seasonNum) => (
            <div key={seasonNum} style={{ marginBottom: 20 }}>
              <h3 style={{ padding: "10px 15px", background: "#3d3d3d", borderRadius: 6, marginBottom: 5 }}>
                Season {seasonNum}
              </h3>
              {seriesSeasons[seasonNum].map((episode) => (
                <button key={episode.id} type="button" className="item-card"
                  onClick={() => handleEpisodeClick(episode, seasonNum)}>
                  <div className="item-title">
                    ▶️ Episode {getEpisodeNumber(episode)}: {episode.title || "Untitled"}
                  </div>
                  {episode.info?.duration && <div className="item-info">{episode.info.duration}</div>}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    );
  }

  // ── Poster grid view ───────────────────────────────────────────────────────
  if (loading) {
    return <div className="empty-state"><p>Loading series…</p></div>;
  }

  if (!activeUserId) {
    return (
      <div className="empty-state">
        <p>No series found</p>
        <p className="hint">Connect to an IPTV service to load series</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "#2d2d2d", flexShrink: 0 }}>
        <input
          type="search"
          placeholder="Search series…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #4d4d4d", background: "#1a1a1a", color: "#fff", fontSize: 14 }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #4d4d4d", background: "#1a1a1a", color: "#fff", fontSize: 14, minWidth: 180 }}
        >
          <option value="all">All Categories ({series.length})</option>
          {seriesCategories.map((c) => (
            <option key={c.category_id} value={String(c.category_id)}>{c.category_name}</option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary" onClick={loadAll} style={{ flexShrink: 0 }}>↺ Refresh</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><p>No series found</p></div>
        ) : (
          <div className="series-grid">
            {filtered.map((show) => (
              <PosterCard key={show.series_id} item={show} onClick={() => openSeries(show)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesContent;
