import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useApp } from "../context/AppContext";
import iptvApi from "../services/iptvApi";

const itemShape = PropTypes.shape({
  stream_icon: PropTypes.string,
  cover: PropTypes.string,
  backdrop_path: PropTypes.string,
  poster: PropTypes.string,
  cover_big: PropTypes.string,
  name: PropTypes.string,
  rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
});

const PosterCard = ({ item, icon, onClick }) => {
  const imageUrl =
    item.stream_icon || item.cover || item.backdrop_path ||
    item.poster || item.cover_big;
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button type="button" className="series-card" onClick={onClick}>
      <div className="series-poster">
        {imageUrl && !imgFailed ? (
          <img src={imageUrl} alt={item.name} onError={() => setImgFailed(true)} />
        ) : (
          <div className="series-poster-fallback">{icon}</div>
        )}
      </div>
      <div className="series-info">
        <div className="series-title">{item.name}</div>
        {item.rating && <div className="series-rating">{item.rating} ⭐</div>}
      </div>
    </button>
  );
};

PosterCard.propTypes = { item: itemShape.isRequired, icon: PropTypes.string.isRequired, onClick: PropTypes.func.isRequired };

const MoviesContent = () => {
  const {
    movieCategories, setMovieCategories,
    movies, setMovies,
    users, activeUserId,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedMovie, setSelectedMovie] = useState(null);

  const loadAll = useCallback(async () => {
    const user = users.find((u) => u.id === activeUserId);
    if (!user) return;
    iptvApi.setCredentials(user.host, user.username, user.password);
    setLoading(true);
    try {
      const [cats, allMovies] = await Promise.all([
        iptvApi.getVODCategories(),
        iptvApi.getAllVODStreams(),
      ]);
      setMovieCategories(cats || []);
      setMovies(allMovies || []);
    } catch (err) {
      console.error("Error loading movies:", err);
    } finally {
      setLoading(false);
    }
  }, [users, activeUserId, setMovieCategories, setMovies]);

  useEffect(() => {
    if (activeUserId && movies.length === 0) loadAll();
  }, [activeUserId, movies.length, loadAll]);

  const filtered = useMemo(() => {
    let list = movies;
    if (categoryFilter !== "all") {
      list = list.filter((m) => String(m.category_id) === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name?.toLowerCase().includes(q));
    }
    return list;
  }, [movies, categoryFilter, search]);

  const handleMovieClick = async (movie) => {
    setSelectedMovie(movie);
    const streamUrl = iptvApi.buildStreamUrl("movie", movie.stream_id, movie.container_extension || "mp4");
    try {
      await globalThis.electron.openInVLC(streamUrl, { name: movie.name });
    } catch (err) {
      console.error("Error opening VLC:", err);
      // eslint-disable-next-line no-alert
      alert("Failed to open VLC. Make sure VLC is installed.");
    } finally {
      setSelectedMovie(null);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading movies…</p>
      </div>
    );
  }

  if (!activeUserId) {
    return (
      <div className="empty-state">
        <p>No movie categories found</p>
        <p className="hint">Connect to an IPTV service to load movies</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 10, padding: "12px 16px", background: "#2d2d2d", flexShrink: 0 }}>
        <input
          type="search"
          placeholder="Search movies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #4d4d4d", background: "#1a1a1a", color: "#fff", fontSize: 14 }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #4d4d4d", background: "#1a1a1a", color: "#fff", fontSize: 14, minWidth: 180 }}
        >
          <option value="all">All Categories ({movies.length})</option>
          {movieCategories.map((c) => (
            <option key={c.category_id} value={String(c.category_id)}>{c.category_name}</option>
          ))}
        </select>
        <button type="button" className="btn btn-secondary" onClick={loadAll} style={{ flexShrink: 0 }}>↺ Refresh</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div className="empty-state"><p>No movies found</p></div>
        ) : (
          <div className="series-grid">
            {filtered.map((movie) => (
              <div key={movie.stream_id} style={{ opacity: selectedMovie?.stream_id === movie.stream_id ? 0.6 : 1 }}>
                <PosterCard item={movie} icon="🎬" onClick={() => handleMovieClick(movie)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoviesContent;
